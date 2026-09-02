import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { checkOutFromAttraction, createAttractionCheckIn, getActiveCheckIn, getCheckInDurationMinutes } from "./checkIns";

describe("attraction check-ins", () => {
  it("creates a manual check-in for a tourist attraction", () => {
    const result = createAttractionCheckIn(initialData, {
      userId: "tourist-demo",
      destinationId: initialData.destinations[0].id,
      tripId: "trip-demo-cultural",
      location: { latitude: 3.142, longitude: 101.6894 },
    });

    expect(result.error).toBeUndefined();
    expect(result.checkIn?.status).toBe("checked-in");
    expect(result.data?.checkIns[0].destinationId).toBe(initialData.destinations[0].id);
  });

  it("requires a destination before check-in", () => {
    const result = createAttractionCheckIn(initialData, {
      userId: "tourist-demo",
      destinationId: "",
    });

    expect(result.error).toBe("Choose an attraction before checking in.");
  });

  it("prevents overlapping active check-ins", () => {
    const first = createAttractionCheckIn(initialData, {
      userId: "tourist-demo",
      destinationId: initialData.destinations[0].id,
    });

    const second = createAttractionCheckIn(first.data!, {
      userId: "tourist-demo",
      destinationId: initialData.destinations[1].id,
    });

    expect(second.error).toBe("Check out from your current attraction before checking in somewhere else.");
    expect(getActiveCheckIn(first.data!, "tourist-demo")?.destinationId).toBe(initialData.destinations[0].id);
  });

  it("checks out from an active attraction", () => {
    const first = createAttractionCheckIn(initialData, {
      userId: "tourist-demo",
      destinationId: initialData.destinations[0].id,
    });

    const checkedOut = checkOutFromAttraction(first.data!, first.checkIn!.id);

    expect(checkedOut.error).toBeUndefined();
    expect(checkedOut.checkIn?.status).toBe("checked-out");
    expect(getCheckInDurationMinutes(checkedOut.checkIn!)).toBeGreaterThanOrEqual(0);
  });
});
