import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { setVapidDetails, sendNotification } from 'web-push';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@tempo.app';

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json(
        { error: 'VAPID keys not configured on server. See .env.example' },
        { status: 400 }
      );
    }

    setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    if (subsError || !subs || subs.length === 0) {
      return NextResponse.json(
        { error: 'No active push subscriptions found for this account. Please enable notifications first.' },
        { status: 404 }
      );
    }

    let sentCount = 0;
    const payload = JSON.stringify({
      title: 'Tempo — Prueba / Test',
      body: '¡Tus notificaciones están funcionando perfectamente!',
      url: '/notifications',
      tag: 'test-notification',
    });

    for (const sub of subs) {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
        sentCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
