import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { setVapidDetails, sendNotification } from 'web-push';
import { sendEmail, getTaskReminderTemplate, getEventReminderTemplate } from '@/lib/email/resend';
import { Language } from '@/types';

function isInQuietHours(currentTimeStr: string, quietStart?: string | null, quietEnd?: string | null): boolean {
  if (!quietStart || !quietEnd) return false;
  if (quietStart > quietEnd) {
    return currentTimeStr >= quietStart || currentTimeStr <= quietEnd;
  }
  return currentTimeStr >= quietStart && currentTimeStr <= quietEnd;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user from session cookie
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const nowUtc = new Date().toISOString();

    // 2. Fetch pending reminders due up to now for this user (or all if requested)
    const { data: reminders, error: remindersError } = await admin
      .from('reminders')
      .select(`
        id,
        user_id,
        task_id,
        event_id,
        schedule_entry_id,
        scheduled_at,
        channel,
        status,
        idempotency_key,
        tasks (
          id,
          title,
          description,
          category,
          priority,
          due_at
        ),
        events (
          id,
          title,
          description,
          category,
          starts_at,
          ends_at
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lte('scheduled_at', nowUtc)
      .limit(50);

    if (remindersError) {
      return NextResponse.json({ error: remindersError.message }, { status: 500 });
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No pending reminders due right now.',
      });
    }

    // Configure Web Push VAPID if available
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@tempo.app';

    if (vapidPublic && vapidPrivate) {
      try {
        setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
      } catch (vapidErr) {
        console.warn('VAPID setup warning:', vapidErr);
      }
    }

    // Fetch user profile
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const userLang: Language = (profile?.preferred_language as Language) || 'es';
    const isEs = userLang === 'es';

    const userDate = new Date();
    const currentTimeStr = `${String(userDate.getHours()).padStart(2, '0')}:${String(userDate.getMinutes()).padStart(2, '0')}`;
    const quiet = isInQuietHours(currentTimeStr, profile?.quiet_hours_start, profile?.quiet_hours_end);

    const results = {
      processed: reminders.length,
      sent: 0,
      failed: 0,
    };

    for (const reminder of reminders) {
      try {
        const task = reminder.tasks as any;
        const event = reminder.events as any;

        let title = 'Tempo';
        let body = isEs ? 'Tienes un recordatorio programado.' : 'You have a scheduled reminder.';
        let targetUrl = '/dashboard';

        if (task) {
          title = isEs ? `Entrega: ${task.title}` : `Deadline: ${task.title}`;
          body = isEs 
            ? `Tu tarea vence pronto (Prioridad: ${task.priority})`
            : `Your task is due soon (Priority: ${task.priority})`;
          targetUrl = '/tasks';
        } else if (event) {
          title = isEs ? `Evento: ${event.title}` : `Event: ${event.title}`;
          body = isEs ? 'Tu compromiso comenzará en breve.' : 'Your event is starting soon.';
          targetUrl = '/calendar';
        }

        // A. Insert in-app notification
        const { error: notificationError } = await admin.from('notifications').insert({
          user_id: user.id,
          title,
          body,
          type: 'reminder',
          related_task_id: reminder.task_id,
          related_event_id: reminder.event_id,
          is_read: false,
        });
        if (notificationError) throw notificationError;

        // B. Push Notification (if enabled and not in quiet hours)
        if (profile?.push_reminders_enabled !== false && !quiet && vapidPublic && vapidPrivate) {
          const { data: subs, error: subscriptionsError } = await admin
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', user.id);
          if (subscriptionsError) throw subscriptionsError;

          if (subs && subs.length > 0) {
            let pushFailure: Error | null = null;
            for (const sub of subs) {
              try {
                await sendNotification(
                  {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                  },
                  JSON.stringify({
                    title,
                    body,
                    url: targetUrl,
                    tag: `reminder-${reminder.id}`,
                  })
                );
              } catch (pushErr: any) {
                if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                  const { error: deleteError } = await admin.from('push_subscriptions').delete().eq('id', sub.id);
                  if (deleteError) throw deleteError;
                }
                console.error(`Push delivery failed for reminder ${reminder.id}:`, pushErr);
                pushFailure = new Error(pushErr.message || 'Browser push delivery failed.');
              }
            }
            if (pushFailure) throw pushFailure;
          }
        }

        // C. Email (if Resend key exists and channel includes email)
        if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('placeholder')) {
          if (profile?.email_reminders_enabled !== false && (reminder.channel === 'all' || reminder.channel === 'email')) {
            const email = user.email;
            if (email) {
              const emailTemplate = task
                ? getTaskReminderTemplate({
                    taskTitle: task.title,
                    dueDateFormatted: task.due_at ? new Date(task.due_at).toLocaleString() : '',
                    category: task.category,
                    priority: task.priority,
                    lang: userLang,
                  })
                : getEventReminderTemplate({
                    eventTitle: event?.title || title,
                    timeRangeFormatted: event?.starts_at ? new Date(event.starts_at).toLocaleString() : '',
                    lang: userLang,
                  });

              await sendEmail({
                to: email,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
              });
            }
          }
        }

        // Mark as sent
        const { error: statusError } = await admin
          .from('reminders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);
        if (statusError) throw statusError;

        results.sent++;
      } catch (remErr: any) {
        console.error(`Error processing reminder ${reminder.id}:`, remErr);
        await admin
          .from('reminders')
          .update({
            status: 'failed',
            error_message: remErr.message || 'Error processing',
          })
          .eq('id', reminder.id);
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (err: any) {
    console.error('API /reminders/process fatal error:', err);
    return NextResponse.json({ error: err.message || 'Fatal error' }, { status: 500 });
  }
}
