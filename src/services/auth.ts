import { getFirebaseServices, isFirebaseConfigured } from "./firebaseClient";

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
  return credential.user;
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
