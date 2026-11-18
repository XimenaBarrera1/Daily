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
  return typeof window !== 'undefined' && 'Notification' in window;
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
    return registration;
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
      const reg = await navigator.serviceWorker.ready;
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
    if (typeof window === 'undefined' || !('Notification' in window)) {
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
      // In browsers without service worker active, local notifications still work
      return { success: true };
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey || vapidPublicKey.length < 10) {
      return { success: true };
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
              ? 'El servicio Push remoto del navegador no respondió (habitual en Brave o modo incógnito). En Brave, activa "Usar servicios de Google para mensajería push" en Configuración > Privacidad. Las notificaciones nativas de Tempo seguirán funcionando.'
              : 'Remote browser push service did not respond (common in Brave or Incognito mode). In-app notifications in Tempo continue working normally.',
          };
        }
        return {
          success: false,
          error: subErr?.message || 'Error subscribing to remote push.',
        };
      }
    }

    if (subscription) {
      try {
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
          console.warn('Server subscribe response:', data);
        }
      } catch (netErr) {
        console.warn('Push subscription sync to server note:', netErr);
      }
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
