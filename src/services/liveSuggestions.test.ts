import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { DestinationDemand, User } from "../types";
import { getLiveNearbySuggestion } from "./liveSuggestions";

const tourist: User = {
  id: "tourist-test",
  name: "Tourist",
  email: "tourist@example.com",
  password: "",
  role: "tourist",
  travelPreferences: ["heritage"],
  trackingSuggestionMode: "balanced",
  trackingSuggestionRadiusKm: 2,
  createdAt: new Date().toISOString(),
};

describe("live nearby suggestions", () => {
  it("suggests a nearby destination instead of a far away popular one", () => {
    const kekLokSi = initialData.destinations.find((destination) => destination.name === "Kek Lok Si Temple");
    const klcc = initialData.destinations.find((destination) => destination.name === "KLCC Park");

    expect(kekLokSi).toBeTruthy();
    expect(klcc).toBeTruthy();

    const demand: DestinationDemand[] = [
      {
        destinationId: klcc!.id,
        movementPointCount: 999,
        uniqueTouristCount: 220,
        recentPointCount: 300,
        approachSignalCount: 100,
        approachingTouristCount: 80,
        popularityScore: 1000,
        tier: "high",
      },
    ];

    const suggestion = getLiveNearbySuggestion({
      point: { latitude: kekLokSi!.latitude + 0.003, longitude: kekLokSi!.longitude + 0.003 },
      destinations: initialData.destinations,
      demand,
      user: tourist,
    });

    expect(suggestion?.destination.id).toBe(kekLokSi!.id);
  });

  it("does not suggest anything when tracking suggestions are disabled", () => {
    const destination = initialData.destinations[0];
    const suggestion = getLiveNearbySuggestion({
      point: destination,
      destinations: initialData.destinations,
      demand: [],
      user: { ...tourist, trackingSuggestionMode: "off" },
    });

    expect(suggestion).toBeNull();
  });
});
