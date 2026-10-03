import { describe, expect, it } from "vitest";
import { getEmergencyMapUrl, getNearbyEmergencyServices } from "./emergencyServices";

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

  it("selects the listed Air Itam station near Kek Lok Si instead of a distant city station", () => {
    const police = getNearbyEmergencyServices({ latitude: 5.3996, longitude: 100.2736 }).find((service) => service.kind === "police");
    expect(police?.id).toBe("police-penang-air-itam");
    expect(police?.distanceKm).toBeLessThan(1);
    expect(police?.address).toContain("Jalan Paya Terubong");
    expect(police?.sourceUrl).toContain("rmp.gov.my");
  });

  it("does not send tourists to a distant station when local coverage is missing", () => {
    expect(getNearbyEmergencyServices({ latitude: 6.12, longitude: 100.37 })).toEqual([]);
    expect(getNearbyEmergencyServices({ latitude: 0, longitude: 0 })).toEqual([]);
  });

  it("rejects invalid location values", () => {
    for (const point of [{ latitude: NaN, longitude: 100 }, { latitude: 5, longitude: Infinity }, { latitude: 91, longitude: 100 }, { latitude: 5, longitude: 181 }]) {
      expect(getNearbyEmergencyServices(point)).toEqual([]);
    }
  });

  it("keeps multiple service results ordered and within local range", () => {
    const services = getNearbyEmergencyServices({ latitude: 5.4, longitude: 100.28 }, 3);
    expect(services.every((service) => service.distanceKm <= 50)).toBe(true);
    const police = services.filter((service) => service.kind === "police");
    expect(police[0].id).toBe("police-penang-air-itam");
    expect(police[0].distanceKm).toBeLessThan(police[1].distanceKm);
  });

  it("builds destination-only map links without transmitting the tourist location", () => {
    const station = getNearbyEmergencyServices({ latitude: 5.4, longitude: 100.28 })[0];
    expect(getEmergencyMapUrl(station)).toContain("mlat=5.4027364");
    const url = new URL(getEmergencyMapUrl(station, true));
    expect(url.hostname).toBe("www.openstreetmap.org");
    expect(url.searchParams.get("to")).toBe("5.4027364,100.278253");
    expect(url.searchParams.has("from")).toBe(false);
    expect(url.hash).toBe("#map=16/5.4027364/100.278253");
  });
});
