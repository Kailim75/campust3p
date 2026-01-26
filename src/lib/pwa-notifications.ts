// PWA Push Notifications Service Worker Integration
import { supabase } from "@/integrations/supabase/client";

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Request notification permission
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.warn("Push notifications are not supported");
    return "denied";
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// Get current permission status
export function getPushPermission(): NotificationPermission | null {
  if (!isPushSupported()) return null;
  return Notification.permission;
}

// Show a local notification (for PWA)
export function showPWANotification(
  title: string,
  options?: NotificationOptions & { 
    onClick?: () => void;
    timeout?: number;
  }
): void {
  if (Notification.permission !== "granted") {
    console.warn("Notification permission not granted");
    return;
  }

  const { onClick, timeout = 5000, ...notificationOptions } = options || {};

  const notification = new Notification(title, {
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    requireInteraction: false,
    ...notificationOptions,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
    onClick?.();
  };

  if (timeout > 0) {
    setTimeout(() => notification.close(), timeout);
  }
}

// Types of notifications we support
export type NotificationType = 
  | "new_inscription"
  | "session_reminder"
  | "document_ready"
  | "exam_result"
  | "payment_received"
  | "alert";

// Notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, { title: string; icon: string }> = {
  new_inscription: {
    title: "Nouvelle inscription",
    icon: "👤",
  },
  session_reminder: {
    title: "Rappel de session",
    icon: "📅",
  },
  document_ready: {
    title: "Document disponible",
    icon: "📄",
  },
  exam_result: {
    title: "Résultat d'examen",
    icon: "📝",
  },
  payment_received: {
    title: "Paiement reçu",
    icon: "💶",
  },
  alert: {
    title: "Alerte",
    icon: "⚠️",
  },
};

// Send a typed notification
export function sendTypedNotification(
  type: NotificationType,
  body: string,
  onClick?: () => void
): void {
  const template = NOTIFICATION_TEMPLATES[type];
  
  showPWANotification(`${template.icon} ${template.title}`, {
    body,
    tag: type,
    onClick,
  });
}

// Subscribe to real-time notifications from Supabase
export function subscribeToRealtimeNotifications(
  userId: string,
  onNotification: (notification: { type: NotificationType; message: string; data?: unknown }) => void
): () => void {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as {
          type: string;
          message: string;
          data?: unknown;
        };
        
        onNotification({
          type: notification.type as NotificationType,
          message: notification.message,
          data: notification.data,
        });

        // Auto-show PWA notification if permission granted
        if (Notification.permission === "granted") {
          sendTypedNotification(
            notification.type as NotificationType,
            notification.message
          );
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

// Check if app is running as installed PWA
export function isInstalledPWA(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}
