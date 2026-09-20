import { describe, expect, it } from "vitest";
import { createTouristCheckInUrl, createTouristPassUrl } from "./checkInDeepLink";

describe("tourist QR deep links", () => {
  it("creates a home check-in URL for attraction QR passes", () => {
    const url = new URL(createTouristCheckInUrl("batu-caves", "MYP-ABC123"));

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
