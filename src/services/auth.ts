import { getFirebaseServices, isFirebaseConfigured } from "./firebaseClient";
import type { User as FirebaseUser } from "firebase/auth";
import type { User } from "../types";
import { shareServerRead } from "./serverRead";

async function ensurePersistence(rememberSession: boolean) {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  const { browserLocalPersistence, browserSessionPersistence, setPersistence } = await import("firebase/auth");
  await setPersistence(services.auth, rememberSession ? browserLocalPersistence : browserSessionPersistence);
  return services;
}

export async function signInWithConfiguredProvider(email: string, password: string, rememberSession = false) {
  const services = await ensurePersistence(rememberSession);
  if (!services) {
    return null;
  }

  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const credential = await signInWithEmailAndPassword(services.auth, email, password);
  return credential.user;
}

export async function registerWithConfiguredProvider(email: string, password: string) {
  const services = await ensurePersistence(false);
  if (!services) {
    return null;
  }

  const { createUserWithEmailAndPassword } = await import("firebase/auth");
  const credential = await createUserWithEmailAndPassword(services.auth, email, password);
  const verificationSent = await sendVerificationEmail(credential.user).catch(() => false);
  return { user: credential.user, verificationSent };
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

export async function subscribeConfiguredSessionEnd(userId: string, onSessionEnd: () => void) {
  const services = getFirebaseServices();
  if (!services) return () => {};
  const { onAuthStateChanged } = await import("firebase/auth");
  return onAuthStateChanged(services.auth, (user) => { if (!user || user.uid !== userId) onSessionEnd(); }, onSessionEnd);
}

export async function getConfiguredUserRecord(uid: string): Promise<User | null> {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  const { doc, getDocFromServer: getDoc } = await import("firebase/firestore");
  const snapshot = await shareServerRead(services.db, services.auth.currentUser?.uid ?? uid, `doc:users/${uid}`, () => getDoc(doc(services.db, "users", uid)));
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
