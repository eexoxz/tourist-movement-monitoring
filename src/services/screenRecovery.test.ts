import { afterEach, describe, expect, it, vi } from "vitest";
import { isModuleLoadError, recoverModuleLoad, withStartupTimeout } from "./screenRecovery";

function environment(online = true) {
  const values = new Map<string, string>();
  return { navigator: { onLine: online }, sessionStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) }, location: { reload: vi.fn() } } as unknown as Window;
}
afterEach(() => vi.useRealTimers());
describe("screen load recovery", () => {
  const failure = new TypeError("Failed to fetch dynamically imported module: /assets/old-workspace.js");
  it("reloads a missing deployment chunk once without causing a refresh loop", () => {
    const browser = environment();
    expect(recoverModuleLoad(failure, browser, 1000)).toBe(true);
    expect(recoverModuleLoad(failure, browser, 1001)).toBe(false);
    expect(browser.location.reload).toHaveBeenCalledTimes(1);
    expect(recoverModuleLoad(failure, browser, 121001)).toBe(true);
  });
  it("leaves offline and unrelated render failures on the retry screen", () => {
    expect(recoverModuleLoad(failure, environment(false))).toBe(false);
    expect(recoverModuleLoad(new Error("Invalid profile data"), environment())).toBe(false);
    expect(isModuleLoadError(new TypeError("Importing a module script failed."))).toBe(true);
  });
  it("does not reload automatically if the reload-loop guard cannot be stored", () => {
    const browser = environment();
    browser.sessionStorage.setItem = () => { throw new Error("Storage blocked"); };
    expect(recoverModuleLoad(failure, browser)).toBe(false);
    expect(browser.location.reload).not.toHaveBeenCalled();
  });
  it("bounds a stalled language download and clears its timer on success", async () => {
    vi.useFakeTimers();
    const pending = expect(withStartupTimeout(new Promise(() => {}), 20)).rejects.toThrow("Startup request timed out");
    await vi.advanceTimersByTimeAsync(20);
    await pending;
    expect(await withStartupTimeout(Promise.resolve("ready"))).toBe("ready");
    expect(vi.getTimerCount()).toBe(0);
  });
});
