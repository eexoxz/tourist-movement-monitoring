import type { AppData, DestinationCategory, User } from "../types";
import { createId } from "./storage";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  authUid?: string;
  travelPreferences?: DestinationCategory[];
  expectedProfile?: User["expectedProfile"];
  tripPace?: User["tripPace"];
  travelGroup?: User["travelGroup"];
  accessibilityPreference?: User["accessibilityPreference"];
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail.includes("..")) {
    return false;
  }

  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(normalizedEmail)) {
    return false;
  }

  const domain = normalizedEmail.split("@")[1];
  const labels = domain.split(".");
  return labels.every((label) => label.length > 0 && !label.startsWith("-") && !label.endsWith("-")) && labels.at(-1)!.length >= 2;
}

export function authenticateLocalUser(data: AppData, email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  return data.users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail && candidate.password === password) ?? null;
}

export function findUserByEmail(data: AppData, email: string) {
  const normalizedEmail = normalizeEmail(email);
  return data.users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail) ?? null;
}

export function validateTouristAccount(data: AppData, input: RegisterInput) {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (name.length < 2) {
    return { error: "Enter a name with at least two characters." };
  }

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (findUserByEmail(data, email)) {
    return { error: "An account with this email already exists." };
  }

  return { name, email, password };
}

export function createTouristAccount(data: AppData, input: RegisterInput) {
  const validation = validateTouristAccount(data, input);
  if (validation.error || !validation.name || !validation.email || !validation.password) {
    return { error: validation.error ?? "Unable to create tourist account." };
  }

  const user: User = {
    id: input.authUid ?? createId("user"),
    authUid: input.authUid,
    name: validation.name,
    email: validation.email,
    password: input.authUid ? "" : validation.password,
    role: "tourist",
    expectedProfile: input.expectedProfile,
    travelPreferences: input.travelPreferences,
    tripPace: input.tripPace,
    travelGroup: input.travelGroup,
    accessibilityPreference: input.accessibilityPreference,
    createdAt: new Date().toISOString(),
  };

  return {
    user,
    data: {
      ...data,
      users: [...data.users, user],
    },
  };
}
