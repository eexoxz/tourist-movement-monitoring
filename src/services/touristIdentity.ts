import type { User } from "../types";

export function normalizeIdentity(value = "") {
  return value.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function hasTouristIdentity(user: Pick<User, "nationality" | "passportNumber">) {
  return Boolean(user.nationality?.trim()) && /^[A-Z0-9]{5,20}$/.test(normalizeIdentity(user.passportNumber));
}
