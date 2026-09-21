import { describe, expect, it } from "vitest";
import { getNearbyEmergencyServices } from "./emergencyServices";

describe("emergencyServices", () => {
  it("returns one nearby prepared contact for each emergency service type", () => {
    const services = getNearbyEmergencyServices({ latitude: 5.4, longitude: 100.31 });

    expect(services).toHaveLength(3);
    expect(services.map((service) => service.kind)).toEqual(["police", "hospital", "fire"]);
    expect(services[0].state).toBe("Penang");
  });

  it("does not guess nearby services without a saved location", () => {
    expect(getNearbyEmergencyServices(undefined)).toEqual([]);
  });
});
