import { describe, expect, it } from "vitest";
import { createTouristCheckInUrl, createTouristPassUrl, getShareableAppOrigin } from "./checkInDeepLink";

describe("tourist QR deep links", () => {
  it("does not use localhost for scan-ready phone links", () => {
    expect(
      getShareableAppOrigin({
        hostname: "127.0.0.1",
        origin: "http://127.0.0.1:4175",
        port: "4175",
        protocol: "http:",
      } as Location)
    ).toBe("http://192.168.50.176:4175");
  });

  it("keeps real network origins unchanged", () => {
    expect(
      getShareableAppOrigin({
        hostname: "192.168.50.176",
        origin: "http://192.168.50.176:4175",
        port: "4175",
        protocol: "http:",
      } as Location)
    ).toBe("http://192.168.50.176:4175");
  });

  it("creates a home check-in URL for attraction QR passes", () => {
    const url = new URL(createTouristCheckInUrl("batu-caves", "MYP-ABC123"));

    expect(url.origin).toBe("http://192.168.50.176:4175");
    expect(url.pathname).toBe("/app/home");
    expect(url.searchParams.get("checkin")).toBe("batu-caves");
    expect(url.searchParams.get("pass")).toBe("MYP-ABC123");
  });

  it("creates a profile URL for profile-only tourist passes", () => {
    const url = new URL(createTouristPassUrl("MYP-ABC123"));

    expect(url.pathname).toBe("/app/profile");
    expect(url.searchParams.get("pass")).toBe("MYP-ABC123");
  });
});
