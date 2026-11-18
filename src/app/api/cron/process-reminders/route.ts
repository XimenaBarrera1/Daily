import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { setVapidDetails, sendNotification } from 'web-push';
import { sendEmail, getTaskReminderTemplate, getEventReminderTemplate } from '@/lib/email/resend';
import { Language } from '@/types';

// Helper to check if current time is within user's quiet hours
function isInQuietHours(currentTimeStr: string, quietStart?: string | null, quietEnd?: string | null): boolean {
  if (!quietStart || !quietEnd) return false;
  // Quiet hours like "22:00" to "07:00"
  if (quietStart > quietEnd) {
    return currentTimeStr >= quietStart || currentTimeStr <= quietEnd;
  }
  return currentTimeStr >= quietStart && currentTimeStr <= quietEnd;
}

export async function GET(request: NextRequest) {
  return handleReminderProcessing(request);
}

export async function POST(request: NextRequest) {
  return handleReminderProcessing(request);
}

async function handleReminderProcessing(request: NextRequest) {
  // 1. Authorization check
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && cronSecret !== 'tempo_super_secret_cron_token_change_in_production') {
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const nowUtc = new Date().toISOString();

  try {
    // 2. Fetch pending reminders due up to now
    const { data: reminders, error: remindersError } = await supabase
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
      .eq('status', 'pending')
      .lte('scheduled_at', nowUtc)
      .limit(50);

    if (remindersError) {
      console.error('[Cron] Error fetching reminders:', remindersError);
      return NextResponse.json({ error: remindersError.message }, { status: 500 });
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending reminders due' });
    }

    // Configure Web Push VAPID if available
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@tempo.app';

    if (vapidPublic && vapidPrivate) {
      setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    }

    const results = {
      processed: reminders.length,
      sent: 0,
      failed: 0,
    };

    // 3. Process each reminder
    for (const reminder of reminders) {
      try {
        // Fetch user profile and preferences
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', reminder.user_id)
          .single();

        const userLang: Language = (profile?.preferred_language as Language) || 'es';
        const isEs = userLang === 'es';

        // Check quiet hours
        const userDate = new Date();
        const currentTimeStr = `${String(userDate.getHours()).padStart(2, '0')}:${String(userDate.getMinutes()).padStart(2, '0')}`;
        const quiet = isInQuietHours(currentTimeStr, profile?.quiet_hours_start, profile?.quiet_hours_end);

        // Derive content from linked task or event
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

        // A. In-App Notification (Always record unless explicit failure)
        await supabase.from('notifications').insert({
          user_id: reminder.user_id,
          title,
          body,
          type: 'reminder',
          related_task_id: reminder.task_id,
          related_event_id: reminder.event_id,
          is_read: false,
        });

        // B. Browser Push Notification
        if (profile?.push_reminders_enabled !== false && !quiet && vapidPublic && vapidPrivate) {
          const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', reminder.user_id);

          if (subs && subs.length > 0) {
            for (const sub of subs) {
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              };

              try {
                await sendNotification(
                  pushSubscription,
                  JSON.stringify({
                    title,
                    body,
                    url: targetUrl,
                    tag: `reminder-${reminder.id}`,
                  })
                );
              } catch (pushErr: any) {
                // If subscription expired or was cancelled, remove from DB
                if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                  await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
              }
            }
          }
        }

        // C. Email Reminder (if enabled for user and email channel requested)
        if (profile?.email_reminders_enabled !== false && (reminder.channel === 'all' || reminder.channel === 'email')) {
          // Fetch user's email from auth.users
          const { data: authUser } = await supabase.auth.admin.getUserById(reminder.user_id);
          const email = authUser?.user?.email;

          if (email) {
            let emailTemplate = task
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

        // Mark reminder as successfully sent
        await supabase
          .from('reminders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);

        results.sent++;
      } catch (err: any) {
        console.error(`[Cron] Error processing reminder ${reminder.id}:`, err);
        await supabase
          .from('reminders')
          .update({
            status: 'failed',
            error_message: err.message || 'Unknown processing error',
          })
          .eq('id', reminder.id);

        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (globalErr: any) {
    console.error('[Cron] Fatal error:', globalErr);
    return NextResponse.json({ error: globalErr.message }, { status: 500 });
  }
}
