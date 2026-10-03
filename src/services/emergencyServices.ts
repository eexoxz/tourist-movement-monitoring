import { emergencyServices, type EmergencyService, type EmergencyServiceKind } from "../data/emergencyServices";
import type { MovementPoint } from "../types";
import { distanceKm } from "./geo";

export type NearbyEmergencyService = EmergencyService & {
  distanceKm: number;
};

const servicePriority: EmergencyServiceKind[] = ["police", "hospital", "fire"];
export const maxEmergencyDistanceKm = 50;
const servicesByKind = servicePriority.map((kind) => ({
  kind,
  services: emergencyServices.filter((service) => service.kind === kind),
}));

function withDistance(point: Pick<MovementPoint, "latitude" | "longitude">, service: EmergencyService): NearbyEmergencyService {
  return {
    ...service,
    distanceKm: distanceKm(point, service),
  };
}

export function getNearbyEmergencyServices(point: Pick<MovementPoint, "latitude" | "longitude"> | undefined, limitPerKind = 1) {
  if (!isValidSafetyPoint(point)) {
    return [];
  }

  return servicesByKind.flatMap(({ services }) => {
    if (limitPerKind <= 1) {
      const nearest = services.reduce<NearbyEmergencyService | null>((currentNearest, service) => {
        const candidate = withDistance(point, service);
        if (candidate.distanceKm > maxEmergencyDistanceKm) return currentNearest;
        return !currentNearest || candidate.distanceKm < currentNearest.distanceKm ? candidate : currentNearest;
      }, null);

      return nearest ? [{ ...nearest, distanceKm: Number(nearest.distanceKm.toFixed(1)) }] : [];
    }

    return services
      .map((service) => withDistance(point, service))
      .filter((service) => service.distanceKm <= maxEmergencyDistanceKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limitPerKind)
      .map((service) => ({ ...service, distanceKm: Number(service.distanceKm.toFixed(1)) }));
  });
}

export function isValidSafetyPoint(point: Pick<MovementPoint, "latitude" | "longitude"> | undefined): point is Pick<MovementPoint, "latitude" | "longitude"> {
  return Boolean(point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180);
}

export function getEmergencyMapUrl(service: EmergencyService, directions = false) {
  const point = `${service.latitude},${service.longitude}`;
  return directions
    ? `https://www.openstreetmap.org/directions?to=${encodeURIComponent(point)}#map=16/${service.latitude}/${service.longitude}`
    : `https://www.openstreetmap.org/?mlat=${service.latitude}&mlon=${service.longitude}#map=17/${service.latitude}/${service.longitude}`;
}
