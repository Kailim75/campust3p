export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    // Browser doesn't support notifications
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function showNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Handle click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}

export function canShowNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}
