'use client';

// Helper to convert base64 VAPID key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isPushNotificationSupported(): Promise<boolean> {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

export async function isPushSubscriptionSynced(): Promise<boolean> {
  if (!(await isPushNotificationSupported()) || Notification.permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return false;

    const response = await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.subscribed === true;
  } catch (error) {
    console.warn('Could not verify push subscription:', error);
    return false;
  }
}

export async function getNotificationPermissionState(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return await navigator.serviceWorker.getRegistration('/') || registration;
  } catch (error) {
    console.warn('Service worker registration note:', error);
    return null;
  }
}

export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          ...options,
        });
        return true;
      }
    }
  } catch (swErr) {
    console.warn('ServiceWorker showNotification note:', swErr);
  }

  try {
    new Notification(title, {
      icon: '/icons/icon-192.png',
      ...options,
    });
    return true;
  } catch (notifErr) {
    console.warn('Native window Notification note:', notifErr);
    return false;
  }
}

export async function subscribeToPushNotifications(locale: 'es' | 'en' = 'es'): Promise<{
  success: boolean;
  error?: string;
  isPushServiceBlocked?: boolean;
}> {
  try {
    if (!(await isPushNotificationSupported())) {
      return {
        success: false,
        error: locale === 'es'
          ? 'Las notificaciones no están soportadas en este navegador.'
          : 'Notifications are not supported in this browser.',
      };
    }

    let permission: NotificationPermission = Notification.permission;
    if (permission !== 'granted') {
      try {
        permission = await Notification.requestPermission();
      } catch (permErr) {
        console.warn('Notification permission error:', permErr);
        permission = 'denied';
      }
    }

    if (permission !== 'granted') {
      return {
        success: false,
        error: locale === 'es'
          ? 'El permiso de notificaciones fue denegado en tu navegador.'
          : 'Notification permission was denied in your browser.',
      };
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      return {
        success: false,
        error: locale === 'es'
          ? 'No se pudo registrar el Service Worker del sitio.'
          : 'The site Service Worker could not be registered.',
      };
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey || vapidPublicKey.length < 10) {
      return {
        success: false,
        error: locale === 'es'
          ? 'Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY para activar avisos push.'
          : 'NEXT_PUBLIC_VAPID_PUBLIC_KEY must be configured to enable push alerts.',
      };
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    let subscription: PushSubscription | null = null;
    try {
      if (registration.pushManager) {
        subscription = await registration.pushManager.getSubscription();
      }
    } catch (getErr) {
      console.warn('getSubscription note:', getErr);
    }

    if (!subscription && registration.pushManager) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      } catch (subErr: any) {
        console.warn('PushManager subscribe note:', subErr?.message || subErr);
        const isAbort = subErr?.name === 'AbortError' || (subErr?.message && subErr.message.includes('push service error'));
        
        if (isAbort) {
          return {
            success: false,
            isPushServiceBlocked: true,
            error: locale === 'es'
              ? 'El servicio Push remoto del navegador no respondió. DAILY puede mostrar alertas del sistema mientras esté abierto y tengas permiso; para recibirlas con DAILY cerrado, activa Push en un navegador compatible (en Brave, habilita los servicios de Google para mensajería Push).'
              : 'The browser remote Push service did not respond. DAILY can show system alerts while it is open and permission is granted; to receive alerts while DAILY is closed, enable Push in a compatible browser.',
          };
        }
        return {
          success: false,
          error: subErr?.message || 'Error subscribing to remote push.',
        };
      }
    }

    if (!subscription) {
      return {
        success: false,
        error: locale === 'es' ? 'El navegador no generó una suscripción push.' : 'The browser did not create a push subscription.',
      };
    }

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        deviceLabel: navigator.userAgent.slice(0, 50),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || (locale === 'es'
          ? 'El servidor no pudo guardar la suscripción de este dispositivo.'
          : 'The server could not save this device subscription.'),
      };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('subscribeToPushNotifications error:', err);
    return {
      success: false,
      error: err?.message || 'Error subscribing to notifications.',
    };
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error unsubscribing:', err);
    return false;
  }
}
