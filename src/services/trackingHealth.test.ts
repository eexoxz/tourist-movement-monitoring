import { describe, expect, it } from "vitest";
import type { MovementPoint } from "../types";
import { getTrackingHealth, gpsStaleAfterMs } from "./trackingHealth";

const now = Date.parse("2026-10-17T10:00:00Z");
const fix = (age = 0, source: MovementPoint["source"] = "browser") => ({ source, recordedAt: new Date(now - age).toISOString() } as MovementPoint);
const state = { listening: true, visible: true, now };

describe("honest GPS health", () => {
  it("does not confuse a running watch with receiving fixes", () => {
    expect(getTrackingHealth(state)).toBe("waiting");
    expect(getTrackingHealth({ ...state, fix: fix(0, "demo") })).toBe("waiting");
    expect(getTrackingHealth({ ...state, fix: fix() })).toBe("receiving");
  });
  it("ages even a stationary fix and recovers on the next browser update", () => {
    expect(getTrackingHealth({ ...state, fix: fix(gpsStaleAfterMs) })).toBe("receiving");
    expect(getTrackingHealth({ ...state, fix: fix(gpsStaleAfterMs + 1) })).toBe("stale");
    expect(getTrackingHealth({ ...state, fix: fix(1000) })).toBe("receiving");
  });
  it("distinguishes paused, background and errors without claiming background tracking stopped", () => {
    expect(getTrackingHealth({ ...state, listening: false, visible: false, attention: true })).toBe("paused");
    expect(getTrackingHealth({ ...state, visible: false, attention: true, fix: fix() })).toBe("background");
    expect(getTrackingHealth({ ...state, attention: true, fix: fix() })).toBe("attention");
  });
  it("rejects invalid and implausibly future timestamps", () => {
    expect(getTrackingHealth({ ...state, fix: { ...fix(), recordedAt: "invalid" } })).toBe("waiting");
    expect(getTrackingHealth({ ...state, fix: fix(-60001) })).toBe("waiting");
  });
});
