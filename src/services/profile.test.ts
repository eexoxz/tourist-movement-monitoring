import { describe, expect, it } from "vitest";
import { formatTravelPreferenceList, getCategoryLabel, getDisplayName, inferExpectedProfileFromPreferences } from "./profile";
import type { User } from "../types";

const baseUser: User = {
  id: "tourist-1",
  name: "Aina Tourist",
  email: "aina@example.com",
  password: "secret1",
  role: "tourist",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("profile service", () => {
  it("uses a preferred display name only when it is not an email fallback", () => {
    expect(getDisplayName(baseUser)).toBe("Aina Tourist");
    expect(getDisplayName({ ...baseUser, name: "aina@example.com" })).toBe("");
    expect(getDisplayName({ ...baseUser, name: "visitor@demo.test" })).toBe("");
  });

  it("infers the strongest tourist profile from travel preferences", () => {
    expect(inferExpectedProfileFromPreferences(["heritage", "cultural", "food"])).toBe("cultural");
    expect(inferExpectedProfileFromPreferences(["nature", "coastal"])).toBe("nature");
    expect(inferExpectedProfileFromPreferences(["urban", "food"])).toBe("urban");
    expect(inferExpectedProfileFromPreferences(["nature", "food"])).toBe("mixed");
    expect(inferExpectedProfileFromPreferences([])).toBe("mixed");
  });

  it("formats preferences with translated category labels", () => {
    expect(formatTravelPreferenceList(["nature", "food"], "en")).toBe("Nature, Food");
    expect(formatTravelPreferenceList([], "en")).toBe("Not set yet");
    expect(getCategoryLabel("coastal")).toBe("Coastal");
  });
});
