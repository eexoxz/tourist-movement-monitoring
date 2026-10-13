export function animateSpotlightMove(track: HTMLDivElement, targetIndex: number, direction: number) {
  const width = track.clientWidth;
  const incoming = track.children[targetIndex] as HTMLElement | undefined;
  const outgoing = track.children[Math.round(track.scrollLeft / width)] as HTMLElement | undefined;
  if (!incoming || !width) return () => undefined;
  const target = incoming.offsetLeft;
  if (!outgoing || incoming === outgoing || typeof incoming.animate !== "function") {
    track.scrollTo({ left: target, behavior: "instant" });
    return () => undefined;
  }

  const previousSnap = track.style.scrollSnapType;
  track.style.scrollSnapType = "none";
  track.scrollTo({ left: target, behavior: "instant" });
  const outgoingStart = target - outgoing.offsetLeft;
  const timing = { duration: 550, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" as const };
  // Animate the two visible panels so wrapping is still a single-width swipe.
  const animations = [
    outgoing.animate([{ transform: `translateX(${outgoingStart}px)` }, { transform: `translateX(${outgoingStart - direction * width}px)` }], timing),
    incoming.animate([{ transform: `translateX(${direction * width}px)` }, { transform: "translateX(0px)" }], timing),
  ];
  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    animations.forEach((animation) => animation.cancel());
    track.style.scrollSnapType = previousSnap;
  };
  void Promise.all(animations.map((animation) => animation.finished)).then(cleanup, cleanup);
  return cleanup;
}
