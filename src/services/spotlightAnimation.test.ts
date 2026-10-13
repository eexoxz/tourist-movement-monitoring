import { describe, expect, it, vi } from "vitest";
import { animateSpotlightMove } from "./spotlightAnimation";

function fixture(current = 0) {
  const animations = Array.from({ length: 4 }, () => ({ finished: new Promise<void>(() => undefined), cancel: vi.fn() }));
  const children = animations.map((animation, index) => ({ offsetLeft: index * 300, animate: vi.fn(() => animation) }));
  const track = { clientWidth: 300, scrollLeft: current * 300, children, style: { scrollSnapType: "" }, scrollTo: vi.fn() };
  return { track, children, animations, element: track as unknown as HTMLDivElement };
}

describe("spotlight swipe transitions", () => {
  it("slides the outgoing and incoming panels together with a short easing curve", () => {
    const { element, track, children } = fixture();
    animateSpotlightMove(element, 1, 1);
    expect(track.scrollTo).toHaveBeenCalledWith({ left: 300, behavior: "instant" });
    expect(children[0].animate).toHaveBeenCalledWith([{ transform: "translateX(300px)" }, { transform: "translateX(0px)" }], expect.objectContaining({ duration: 550, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }));
    expect(children[1].animate).toHaveBeenCalledWith([{ transform: "translateX(300px)" }, { transform: "translateX(0px)" }], expect.anything());
  });
  it("wraps forward from the last panel using one slide width", () => {
    const { element, children } = fixture(3);
    animateSpotlightMove(element, 0, 1);
    expect(children[3].animate).toHaveBeenCalledWith([{ transform: "translateX(-900px)" }, { transform: "translateX(-1200px)" }], expect.anything());
    expect(children[0].animate).toHaveBeenCalledWith([{ transform: "translateX(300px)" }, { transform: "translateX(0px)" }], expect.anything());
  });
  it("wraps backward with the opposite swipe direction", () => {
    const { element, children } = fixture();
    animateSpotlightMove(element, 3, -1);
    expect(children[0].animate).toHaveBeenCalledWith([{ transform: "translateX(900px)" }, { transform: "translateX(1200px)" }], expect.anything());
    expect(children[3].animate).toHaveBeenCalledWith([{ transform: "translateX(-300px)" }, { transform: "translateX(0px)" }], expect.anything());
  });
  it("restores touch snapping and cancels animations once when interrupted", () => {
    const { element, track, animations } = fixture();
    const cancel = animateSpotlightMove(element, 1, 1);
    expect(track.style.scrollSnapType).toBe("none");
    cancel(); cancel();
    expect(track.style.scrollSnapType).toBe("");
    expect(animations[0].cancel).toHaveBeenCalledTimes(1);
    expect(animations[1].cancel).toHaveBeenCalledTimes(1);
  });
  it("cleans up completed animations and restores native snapping", async () => {
    const { element, track, animations } = fixture();
    animations[0].finished = Promise.resolve();
    animations[1].finished = Promise.resolve();
    animateSpotlightMove(element, 1, 1);
    await Promise.all(animations.slice(0, 2).map((animation) => animation.finished));
    expect(track.style.scrollSnapType).toBe("");
    expect(animations[0].cancel).toHaveBeenCalledOnce();
    expect(animations[1].cancel).toHaveBeenCalledOnce();
  });
  it("does not animate a missing, zero-width or unchanged target", () => {
    const { element, track, children } = fixture();
    animateSpotlightMove(element, 20, 1);
    animateSpotlightMove(element, 0, 1);
    track.clientWidth = 0;
    animateSpotlightMove(element, 1, 1);
    expect(children.every((slide) => slide.animate.mock.calls.length === 0)).toBe(true);
  });
  it("falls back to a normal slide change if animation is unavailable", () => {
    const { element, track, children } = fixture();
    Object.assign(children[1], { animate: undefined });
    animateSpotlightMove(element, 1, 1);
    expect(track.scrollTo).toHaveBeenCalledWith({ left: 300, behavior: "instant" });
  });
});
