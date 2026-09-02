import type { AppData, AttractionCheckIn, MovementPoint } from "../types";
import { createId } from "./storage";

export type CheckInLocation = Pick<MovementPoint, "latitude" | "longitude"> | null | undefined;

export function getActiveCheckIn(data: AppData, userId: string) {
  return data.checkIns.find((checkIn) => checkIn.userId === userId && checkIn.status === "checked-in") ?? null;
}

export function createAttractionCheckIn(
  data: AppData,
  input: {
    userId: string;
    destinationId: string;
    tripId?: string;
    location?: CheckInLocation;
  }
) {
  if (!input.destinationId) {
    return { error: "Choose an attraction before checking in." };
  }

  if (getActiveCheckIn(data, input.userId)) {
    return { error: "Check out from your current attraction before checking in somewhere else." };
  }

  const now = new Date().toISOString();
  const checkIn: AttractionCheckIn = {
    id: createId("checkin"),
    userId: input.userId,
    destinationId: input.destinationId,
    tripId: input.tripId,
    status: "checked-in",
    checkedInAt: now,
    latitude: input.location?.latitude,
    longitude: input.location?.longitude,
  };

  return {
    checkIn,
    data: {
      ...data,
      checkIns: [checkIn, ...data.checkIns],
    },
  };
}

export function checkOutFromAttraction(data: AppData, checkInId: string) {
  const now = new Date().toISOString();
  const activeCheckIn = data.checkIns.find((checkIn) => checkIn.id === checkInId);

  if (!activeCheckIn) {
    return { error: "No active check-in was found." };
  }

  if (activeCheckIn.status === "checked-out") {
    return { error: "This attraction visit is already checked out." };
  }

  return {
    checkIn: { ...activeCheckIn, status: "checked-out" as const, checkedOutAt: now },
    data: {
      ...data,
      checkIns: data.checkIns.map((checkIn) => (checkIn.id === checkInId ? { ...checkIn, status: "checked-out" as const, checkedOutAt: now } : checkIn)),
    },
  };
}

export function getCheckInDurationMinutes(checkIn: AttractionCheckIn, now = new Date()) {
  const end = checkIn.checkedOutAt ? new Date(checkIn.checkedOutAt) : now;
  const start = new Date(checkIn.checkedInAt);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}
