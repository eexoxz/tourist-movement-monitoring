import { afterEach, describe, expect, it, vi } from "vitest";
import { getBrowserNotificationPermission, requestBrowserNotificationPermission, showBrowserNotification } from "./browserNotifications";

const input = { title: "Safety warning", message: "Stay inside the safe area", tone: "warning" as const };
function browser(permission: NotificationPermission = "granted", mobile = false) {
  const close = vi.fn();
  const focus = vi.fn();
  const instance = { close, onclick: undefined as (() => void) | undefined };
  const NotificationMock = vi.fn(function () {
    if (mobile) throw new TypeError("Use ServiceWorkerRegistration.showNotification");
    return instance;
  });
  Object.assign(NotificationMock, { permission, requestPermission: vi.fn().mockResolvedValue(permission) });
  vi.stubGlobal("Notification", NotificationMock);
  vi.stubGlobal("window", { Notification: NotificationMock, focus, isSecureContext: true, location: { href: "https://example.com/app/history" } });
  vi.stubGlobal("navigator", {});
  return { NotificationMock, instance, focus, close };
}
afterEach(() => vi.unstubAllGlobals());

describe("open-app browser alerts", () => {
  it("does not request permission or send anything on unsupported browsers", async () => {
    vi.stubGlobal("window", {});
    expect(getBrowserNotificationPermission()).toBe("unsupported");
    expect(await requestBrowserNotificationPermission()).toBe("unsupported");
    expect(await showBrowserNotification(input)).toBe(false);
  });
  it("does not send a notification without explicit permission", async () => {
    const { NotificationMock } = browser("denied");
    expect(await showBrowserNotification(input)).toBe(false);
    expect(NotificationMock).not.toHaveBeenCalled();
  });
  it("safely handles a rejected permission request", async () => {
    const { NotificationMock } = browser("default");
    Object.assign(NotificationMock, { requestPermission: vi.fn().mockRejectedValue(new Error("blocked")) });
    expect(await requestBrowserNotificationPermission()).toBe("unsupported");
  });
  it("shows desktop notifications and focuses the app when clicked", async () => {
    const { instance, focus, close } = browser();
    expect(await showBrowserNotification(input)).toBe(true);
    instance.onclick!();
    expect(focus).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
  it("uses a worker when the mobile constructor is unavailable", async () => {
    browser("granted", true);
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const register = vi.fn().mockResolvedValue({ active: {}, showNotification });
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    expect(await showBrowserNotification(input)).toBe(true);
    expect(register).toHaveBeenCalledWith("/notification-worker.js", { scope: "/" });
    expect(showNotification).toHaveBeenCalledWith(input.title, expect.objectContaining({ body: input.message, data: { url: "https://example.com/app/history" } }));
  });
  it("falls back to the already displayed in-app alert when worker delivery fails", async () => {
    browser("granted", true);
    vi.stubGlobal("navigator", { serviceWorker: { register: vi.fn().mockRejectedValue(new Error("offline")) } });
    expect(await showBrowserNotification(input)).toBe(false);
  });

  it("waits for the first worker installation before showing a mobile alert", async () => {
    browser("granted", true);
    let stateChanged!: () => void;
    const worker = { state: "installing", addEventListener: vi.fn((_name, listener) => { stateChanged = listener; }), removeEventListener: vi.fn() };
    const showNotification = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { serviceWorker: { register: vi.fn().mockResolvedValue({ installing: worker, showNotification }) } });
    const delivery = showBrowserNotification(input);
    await Promise.resolve();
    expect(showNotification).not.toHaveBeenCalled();
    worker.state = "activated";
    stateChanged();
    expect(await delivery).toBe(true);
    expect(worker.removeEventListener).toHaveBeenCalledWith("statechange", stateChanged);
  });

  it("bounds the wait for a mobile worker that never activates", async () => {
    vi.useFakeTimers();
    try {
      browser("granted", true);
      const worker = { state: "installing", addEventListener: vi.fn(), removeEventListener: vi.fn() };
      const showNotification = vi.fn();
      vi.stubGlobal("navigator", { serviceWorker: { register: vi.fn().mockResolvedValue({ installing: worker, showNotification }) } });
      const delivery = showBrowserNotification(input);
      await vi.advanceTimersByTimeAsync(5000);
      expect(await delivery).toBe(false);
      expect(showNotification).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it("does not attempt worker delivery from an insecure phone URL", async () => {
    browser("granted", true);
    Object.defineProperty(window, "isSecureContext", { value: false });
    const register = vi.fn();
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    expect(await showBrowserNotification(input)).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });
});
