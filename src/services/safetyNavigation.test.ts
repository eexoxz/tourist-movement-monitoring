import { afterEach, describe, expect, it, vi } from "vitest";
import { revealSafetyPanel } from "./safetyNavigation";

function fixture(connected = true) {
  let callback: FrameRequestCallback;
  const cancel = vi.fn();
  vi.stubGlobal("window", { requestAnimationFrame: (next: FrameRequestCallback) => { callback = next; return 42; }, cancelAnimationFrame: cancel });
  const focus = vi.fn();
  const scrollIntoView = vi.fn();
  const panel = { isConnected: connected, open: false, querySelector: () => ({ focus }), scrollIntoView };
  return { panel, focus, scrollIntoView, cancel, element: panel as unknown as HTMLDetailsElement, frame: () => callback(0) };
}

afterEach(() => vi.unstubAllGlobals());

describe("direct safety navigation", () => {
  it("waits for navigation before opening, focusing and scrolling to support", () => {
    const { panel, element, focus, scrollIntoView, frame } = fixture();
    const opened = vi.fn();
    revealSafetyPanel(element, opened);
    expect(panel.open).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
    frame();
    expect(panel.open).toBe(true);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "instant" });
    expect(opened).toHaveBeenCalledOnce();
  });
  it("does not move focus or acknowledge a panel that was unmounted", () => {
    const { element, focus, scrollIntoView, frame } = fixture(false);
    const opened = vi.fn();
    revealSafetyPanel(element, opened);
    frame();
    expect(focus).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(opened).not.toHaveBeenCalled();
  });
  it("cancels the scheduled jump when its navigation effect is cleaned up", () => {
    const { element, cancel } = fixture();
    revealSafetyPanel(element)();
    expect(cancel).toHaveBeenCalledWith(42);
  });
});
