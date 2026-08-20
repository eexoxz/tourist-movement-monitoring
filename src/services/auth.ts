import { getFirebaseServices, isFirebaseConfigured } from "./firebaseClient";
import type { User as FirebaseUser } from "firebase/auth";

export async function signInWithConfiguredProvider(email: string, password: string) {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const credential = await signInWithEmailAndPassword(services.auth, email, password);
  return credential.user;
}

export async function registerWithConfiguredProvider(email: string, password: string) {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  const { createUserWithEmailAndPassword } = await import("firebase/auth");
  const credential = await createUserWithEmailAndPassword(services.auth, email, password);
  await sendVerificationEmail(credential.user);
  return credential.user;
}

export async function sendVerificationEmail(user?: FirebaseUser | null) {
  const services = getFirebaseServices();
  const currentUser = services?.auth.currentUser;
  const targetUser = currentUser ?? user;
  if (!targetUser || targetUser.emailVerified) {
    return false;
  }

  const { sendEmailVerification } = await import("firebase/auth");
  await sendEmailVerification(targetUser);
  return true;
}

export async function refreshConfiguredUser() {
  const services = getFirebaseServices();
  const currentUser = services?.auth.currentUser;
  if (!currentUser) {
    return null;
  }

  const { reload } = await import("firebase/auth");
  await reload(currentUser);
  return currentUser;
}

export async function signOutConfiguredProvider() {
  const services = getFirebaseServices();
  if (!services) {
    return;
  }

  const { signOut } = await import("firebase/auth");
  await signOut(services.auth);
}

export function authProviderName() {
  return isFirebaseConfigured() ? "Firebase Authentication" : "Local demo authentication";
}

export function hasConfiguredAuth() {
  return isFirebaseConfigured();
}
