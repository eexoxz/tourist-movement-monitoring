export function revealSafetyPanel(panel: HTMLDetailsElement, onOpened?: () => void) {
  // Navigation resets page scroll; reveal the target after that effect finishes.
  const frame = window.requestAnimationFrame(() => {
    if (!panel.isConnected) return;
    panel.open = true;
    panel.querySelector("summary")?.focus({ preventScroll: true });
    panel.scrollIntoView({ block: "start", behavior: "instant" });
    onOpened?.();
  });
  return () => window.cancelAnimationFrame(frame);
}
