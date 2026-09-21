import { afterEach, describe, expect, it, vi } from "vitest";
import { createTouristCheckInUrl, createTouristPassUrl, getShareableAppOrigin, isLocalOnlyQrOrigin } from "./checkInDeepLink";

describe("tourist QR deep links", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("marks localhost QR links as local-only during development", () => {
    const localLocation = {
      hostname: "127.0.0.1",
      origin: "http://127.0.0.1:4175",
      port: "4175",
      protocol: "http:",
    } as Location;

    expect(getShareableAppOrigin(localLocation)).toBe("http://127.0.0.1:4175");
    expect(isLocalOnlyQrOrigin(localLocation)).toBe(true);
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

  it("creates a dedicated check-in URL for attraction QR passes", () => {
    const url = new URL(createTouristCheckInUrl("batu-caves", "MYP-ABC123"));

    expect(url.origin).toBe("http://localhost:4175");
    expect(url.pathname).toBe("/check-in");
    expect(url.searchParams.get("checkin")).toBe("batu-caves");
    expect(url.searchParams.get("pass")).toBe("MYP-ABC123");
  });

  it("uses a configured public app URL when the app is deployed", () => {
    vi.stubEnv("VITE_PUBLIC_APP_URL", "https://tourism.example.com/app/home");

    const url = new URL(createTouristCheckInUrl("batu-caves", "MYP-ABC123"));

    expect(url.origin).toBe("https://tourism.example.com");
    expect(url.pathname).toBe("/check-in");
  });

  it("creates a profile URL for profile-only tourist passes", () => {
    const url = new URL(createTouristPassUrl("MYP-ABC123"));

    expect(url.pathname).toBe("/app/profile");
    expect(url.searchParams.get("pass")).toBe("MYP-ABC123");
  });
});
