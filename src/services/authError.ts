import { cloudRecoveryText } from "./cloudRecoveryCopy";
import { isCloudQuotaError } from "./serverRead";
export type AuthErrorField = "email" | "password" | "credentials";

function authCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") return error.code;
  return error instanceof Error ? error.message.match(/auth\/[a-z-]+/)?.[0] : undefined;
}

export function authErrorField(error: unknown): AuthErrorField | undefined {
  const code = authCode(error);
  if (["auth/invalid-email", "auth/user-not-found", "auth/email-already-in-use"].includes(code ?? "")) return "email";
  if (["auth/wrong-password", "auth/weak-password"].includes(code ?? "")) return "password";
  if (["auth/invalid-credential", "auth/invalid-login-credentials"].includes(code ?? "")) return "credentials";
}

export function friendlyAuthError(error: unknown, fallback: string) {
  const code = authCode(error);
  if (isCloudQuotaError(error)) return cloudRecoveryText("en", "quotaDetail");
  if (code === "auth/network-request-failed") return "Connection failed. Check your internet connection and try again.";

  if (code === "auth/invalid-email") {
    return "Enter a valid email address.";
  }

  if (code === "auth/user-not-found") return "This email address is not registered. Create an account to continue.";
  if (code === "auth/wrong-password") return "Incorrect password. Try again or reset your password.";
  if (code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
    return "Sign-in failed. Check your email address or reset your password.";
  }

  if (code === "auth/email-already-in-use") {
    return "This email is already registered. Log in or resend the verification email.";
  }

  if (code === "auth/too-many-requests") {
    return "Too many attempts. Wait a bit before trying again.";
  }

  if (code === "auth/weak-password") {
    return "Password must be at least 6 characters.";
  }

  return fallback;
}
