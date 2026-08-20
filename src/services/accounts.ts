import type { AppData, User } from "../types";
import { createId } from "./storage";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  authUid?: string;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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
    id: createId("user"),
    authUid: input.authUid,
    name: validation.name,
    email: validation.email,
    password: input.authUid ? "" : validation.password,
    role: "tourist",
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
