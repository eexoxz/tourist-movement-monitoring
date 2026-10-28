import { describe, expect, it } from "vitest";
import { destinations } from "../data/destinations";
import {
  addDestinationRecord,
  deleteDestinationRecord,
  destinationCategories,
  filterAdminDestinations,
  updateDestinationRecord,
  validateDestination,
} from "./destinationManagement";

describe("destination management service", () => {
  it("combines state, category and search, including legacy city-based state records", () => {
    const records = [
      { ...destinations[0], id: "a", state: "Penang" as const, city: "George Town", category: "food" as const, name: "Local cafe" },
      { ...destinations[0], id: "b", state: undefined, city: "Ipoh", category: "food" as const, name: "Local cafe" },
      { ...destinations[0], id: "c", state: "Penang" as const, city: "George Town", category: "heritage" as const, name: "Heritage museum" },
    ];
    expect(filterAdminDestinations(records, "", "all", "Penang").map((place) => place.id)).toEqual(["a", "c"]);
    expect(filterAdminDestinations(records, " CAFE ", "food", "Penang").map((place) => place.id)).toEqual(["a"]);
    expect(filterAdminDestinations(records, "Perak", "all", "all").map((place) => place.id)).toEqual(["b"]);
    expect(filterAdminDestinations(records, "cafe", "heritage", "Penang")).toEqual([]);
    expect(filterAdminDestinations(records, "", "all", "all")).toHaveLength(3);
  });
  it("validates destination category and coordinates", () => {
    expect(destinationCategories).toContain("heritage");
    expect(
      validateDestination({
        name: "Test Destination",
        city: "Kuala Lumpur",
        category: "invalid",
        latitude: 3.1,
        longitude: 101.7,
        description: "A valid destination description.",
      }).error
    ).toContain("category");
    expect(
      validateDestination({
        name: "Test Destination",
        city: "Kuala Lumpur",
        category: "cultural",
        latitude: 120,
        longitude: 101.7,
        description: "A valid destination description.",
      }).error
    ).toContain("latitude");
  });

  it("adds a valid destination record", () => {
    const result = addDestinationRecord(destinations, {
      name: "National Textile Museum",
      city: "Kuala Lumpur",
      category: "cultural",
      latitude: 3.1467,
      longitude: 101.6942,
      description: "Museum focused on Malaysian textile heritage.",
      averageVisitMinutes: 75,
      openingHours: "Daily, 9:00 AM to 5:00 PM",
      feeNote: "Ticket counter may apply for special galleries.",
      visitTips: "Visit earlier in the day\nPair with Merdeka Square",
      imageUrl: "https://example.com/textile-museum.jpg",
      imageAlt: "National Textile Museum exterior",
    });

    expect(result.error).toBeUndefined();
    expect(result.destination?.name).toBe("National Textile Museum");
    expect(result.destination?.openingHours).toBe("Daily, 9:00 AM to 5:00 PM");
    expect(result.destination?.visitTips).toEqual(["Visit earlier in the day", "Pair with Merdeka Square"]);
    expect(result.destination?.imageUrl).toBe("https://example.com/textile-museum.jpg");
    expect(result.destination?.imageAlt).toBe("National Textile Museum exterior");
    expect(result.destinations).toHaveLength(destinations.length + 1);
  });

  it("rejects duplicate destination records in the same city", () => {
    const result = addDestinationRecord(destinations, {
      name: "Merdeka Square",
      city: "Kuala Lumpur",
      category: "heritage",
      latitude: 3.1478,
      longitude: 101.6937,
      description: "Duplicate destination attempt.",
    });

    expect(result.error).toContain("already exists");
  });

  it("updates an existing destination record", () => {
    const result = updateDestinationRecord(destinations, {
      ...destinations[0],
      averageVisitMinutes: 65,
      description: "Updated heritage destination description.",
      feeNote: "Public square access is free.",
    });

    expect(result.error).toBeUndefined();
    expect(result.destination?.averageVisitMinutes).toBe(65);
    expect(result.destination?.feeNote).toBe("Public square access is free.");
    expect(result.destination?.visitorStory).toBeUndefined();
    expect(updateDestinationRecord(destinations, { ...destinations[0], averageVisitMinutes: 66 }).destination?.visitorStory).toEqual(destinations[0].visitorStory);
    expect(result.destinations?.find((destination) => destination.id === destinations[0].id)?.averageVisitMinutes).toBe(65);
  });

  it("deletes destination records while keeping at least one destination", () => {
    const result = deleteDestinationRecord(destinations, destinations[0].id);
    const blocked = deleteDestinationRecord([destinations[0]], destinations[0].id);

    expect(result.error).toBeUndefined();
    expect(result.destinations).toHaveLength(destinations.length - 1);
    expect(blocked.error).toContain("At least one");
  });
});
