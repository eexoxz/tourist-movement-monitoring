import type { NotificationTone } from "../components/ToastViewport";

export type BrowserNotificationPermission = NotificationPermission | "unsupported";

function waitForActiveWorker(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active) return Promise.resolve();
  const worker = registration.installing ?? registration.waiting;
  if (!worker) return Promise.reject(new Error("Notification worker unavailable"));
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      worker.removeEventListener("statechange", checkState);
      if (error) reject(error);
      else resolve();
    };
    const checkState = () => {
      if (worker.state === "activated") finish();
      else if (worker.state === "redundant") finish(new Error("Notification worker failed"));
    };
    const timer = setTimeout(() => finish(new Error("Notification worker timed out")), 5000);
    worker.addEventListener("statechange", checkState);
    checkState();
  });
}

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (getBrowserNotificationPermission() === "unsupported") {
    return "unsupported";
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return "unsupported";
  }
}

export async function showBrowserNotification(input: { title: string; message?: string; tone: NotificationTone }): Promise<boolean> {
  if (getBrowserNotificationPermission() !== "granted") {
    return false;
  }

  const options: NotificationOptions = {
    body: input.message,
    tag: `tourist-movement-${input.tone}-${input.title}`,
    silent: false,
  };

  try {
    const notification = new Notification(input.title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    // Mobile browsers can require a worker even for alerts sent by an open page.
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || window.isSecureContext === false) return false;
    try {
      const registration = await navigator.serviceWorker.register("/notification-worker.js", { scope: "/" });
      await waitForActiveWorker(registration);
      await registration.showNotification(input.title, { ...options, data: { url: window.location.href } });
      return true;
    } catch {
      return false;
    }
  }
}
