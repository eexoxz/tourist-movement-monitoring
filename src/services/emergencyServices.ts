import { emergencyServices, type EmergencyService, type EmergencyServiceKind } from "../data/emergencyServices";
import type { MovementPoint } from "../types";
import { distanceKm } from "./geo";

export type NearbyEmergencyService = EmergencyService & {
  distanceKm: number;
};

const servicePriority: EmergencyServiceKind[] = ["police", "hospital", "fire"];

export function getNearbyEmergencyServices(point: Pick<MovementPoint, "latitude" | "longitude"> | undefined, limitPerKind = 1) {
  if (!point) {
    return [];
  }

  return servicePriority.flatMap((kind) =>
    emergencyServices
      .filter((service) => service.kind === kind)
      .map((service) => ({
        ...service,
        distanceKm: Number(distanceKm(point, service).toFixed(1)),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limitPerKind)
  );
}
