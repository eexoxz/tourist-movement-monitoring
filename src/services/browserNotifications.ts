import type { NotificationTone } from "../components/ToastViewport";

export type BrowserNotificationPermission = NotificationPermission | "unsupported";

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.requestPermission();
}

export function showBrowserNotification(input: { title: string; message?: string; tone: NotificationTone }) {
  if (getBrowserNotificationPermission() !== "granted") {
    return false;
  }

  const notification = new Notification(input.title, {
    body: input.message,
    tag: `tourist-movement-${input.tone}-${input.title}`,
    badge: undefined,
    icon: undefined,
    silent: false,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  return true;
}
