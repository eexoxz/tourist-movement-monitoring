import { emergencyServices, type EmergencyService, type EmergencyServiceKind } from "../data/emergencyServices";
import type { MovementPoint } from "../types";
import { distanceKm } from "./geo";

export type NearbyEmergencyService = EmergencyService & {
  distanceKm: number;
};

const servicePriority: EmergencyServiceKind[] = ["police", "hospital", "fire"];
const servicesByKind = servicePriority.map((kind) => ({
  kind,
  services: emergencyServices.filter((service) => service.kind === kind),
}));

function withDistance(point: Pick<MovementPoint, "latitude" | "longitude">, service: EmergencyService): NearbyEmergencyService {
  return {
    ...service,
    distanceKm: Number(distanceKm(point, service).toFixed(1)),
  };
}

export function getNearbyEmergencyServices(point: Pick<MovementPoint, "latitude" | "longitude"> | undefined, limitPerKind = 1) {
  if (!point) {
    return [];
  }

  return servicesByKind.flatMap(({ services }) => {
    if (limitPerKind <= 1) {
      const nearest = services.reduce<NearbyEmergencyService | null>((currentNearest, service) => {
        const candidate = withDistance(point, service);
        return !currentNearest || candidate.distanceKm < currentNearest.distanceKm ? candidate : currentNearest;
      }, null);

      return nearest ? [nearest] : [];
    }

    return services
      .map((service) => withDistance(point, service))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limitPerKind);
  });
}
