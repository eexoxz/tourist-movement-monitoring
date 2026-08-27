import { getFirebaseServices, isFirebaseConfigured } from "./firebaseClient";
import type { User as FirebaseUser } from "firebase/auth";
import type { User } from "../types";

let persistenceSetup: Promise<void> | null = null;

async function ensureLocalPersistence() {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  if (!persistenceSetup) {
    persistenceSetup = import("firebase/auth").then(async ({ browserLocalPersistence, setPersistence }) => {
      await setPersistence(services.auth, browserLocalPersistence);
    });
  }

  await persistenceSetup;
  return services;
}

export async function signInWithConfiguredProvider(email: string, password: string) {
  const services = await ensureLocalPersistence();
  if (!services) {
    return null;
  }

  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const credential = await signInWithEmailAndPassword(services.auth, email, password);
  return credential.user;
}

export async function registerWithConfiguredProvider(email: string, password: string) {
  const services = await ensureLocalPersistence();
  if (!services) {
    return null;
  }

  const { createUserWithEmailAndPassword } = await import("firebase/auth");
  const credential = await createUserWithEmailAndPassword(services.auth, email, password);
  await sendVerificationEmail(credential.user);
  return credential.user;
}

export async function getConfiguredAuthState() {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  const { onAuthStateChanged } = await import("firebase/auth");
  return new Promise<FirebaseUser | null>((resolve) => {
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(
      services.auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      () => {
        unsubscribe();
        resolve(null);
      }
    );
  });
}

export async function getConfiguredUserRecord(uid: string): Promise<User | null> {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  const { doc, getDoc } = await import("firebase/firestore");
  const snapshot = await getDoc(doc(services.db, "users", uid));
  if (!snapshot.exists()) {
    return null;
  }

  return { ...(snapshot.data() as Omit<User, "password">), id: snapshot.id, password: "" };
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

export async function sendPasswordResetToConfiguredProvider(email: string) {
  const services = getFirebaseServices();
  if (!services) {
    return false;
  }

  const { sendPasswordResetEmail } = await import("firebase/auth");
  await sendPasswordResetEmail(services.auth, email);
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
