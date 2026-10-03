import { useEffect } from "react";
import { X } from "lucide-react";
import type { Locale } from "../services/i18n";
import { uiText } from "../services/uiText";

export type NotificationTone = "success" | "error" | "info" | "warning";

export type AppNotification = {
  id: string;
  tone: NotificationTone;
  title: string;
  message?: string;
  browser?: boolean;
};

export type NotifyFn = (notification: Omit<AppNotification, "id">) => void;

export function ToastViewport({ notifications, onDismiss, locale }: { notifications: AppNotification[]; onDismiss: (id: string) => void; locale: Locale }) {
  useEffect(() => {
    if (notifications.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      onDismiss(notifications[0].id);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [notifications, onDismiss]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <section className="toast-stack" aria-live="polite" aria-label={uiText(locale, "Application notifications")}>
      {notifications.map((notification) => (
        <article className={`toast toast-${notification.tone}`} key={notification.id}>
          <div>
            <strong>{uiText(locale, notification.title)}</strong>
            {notification.message && <p>{uiText(locale, notification.message)}</p>}
          </div>
          <button type="button" onClick={() => onDismiss(notification.id)} title={uiText(locale, "Dismiss notification")} aria-label={uiText(locale, "Dismiss notification")}>
            <X size={16} />
          </button>
        </article>
      ))}
    </section>
  );
}
