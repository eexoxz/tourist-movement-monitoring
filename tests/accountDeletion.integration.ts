import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, setDoc, terminate, writeBatch, type Firestore } from "firebase/firestore";

if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8088" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9098") throw new Error("Account removal tests require isolated local Auth and Firestore emulators");
const state = vi.hoisted(() => ({ services: null as unknown }));
vi.mock("../src/services/firebaseClient", () => ({ getFirebaseServices: () => state.services }));
import { deleteOwnAccount, hasAccountDeletion, privateAccountCollections } from "../src/services/accountDeletion";

const projectId = "demo-tourist-security";
const app = initializeApp({ projectId, apiKey: "local-emulator-only", authDomain: `${projectId}.firebaseapp.com` }, "account-removal-test");
const auth = getAuth(app), store = getFirestore(app);
connectAuthEmulator(auth, "http://127.0.0.1:9098", { disableWarnings: true });
connectFirestoreEmulator(store, "127.0.0.1", 8088);
state.services = { auth, db: store };
let environment: RulesTestEnvironment;
const password = "EmulatorOnly123!";
const callbacks = (clearLocal = () => {}) => ({ onStarted: () => {}, onPhase: () => {}, clearLocal });

beforeAll(async () => { environment = await initializeTestEnvironment({ projectId, firestore: { host: "127.0.0.1", port: 8088, rules: readFileSync("firestore.rules", "utf8") } }); });
beforeEach(async () => { await signOut(auth); await environment.clearFirestore(); });
afterAll(async () => { await terminate(store); await deleteApp(app); await environment?.cleanup(); });

async function seed(email: string, large = false) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    const batch = writeBatch(db);
    for (const name of ["users", "tourist_profiles", "tourist_preferences"]) {
      batch.set(doc(db, name, user.uid), { id: user.uid, userId: user.uid, authUid: user.uid, role: "tourist", email });
      batch.set(doc(db, name, "other"), { userId: "other", role: "tourist" });
    }
    for (const name of privateAccountCollections) {
      batch.set(doc(db, name, "owned"), { userId: user.uid, value: "private" });
      batch.set(doc(db, name, "other"), { userId: "other", value: "keep" });
    }
    batch.set(doc(db, "destinations/shared"), { name: "Shared catalogue location" });
    if (large) for (let index = 0; index < 205; index++) batch.set(doc(db, "movement_records", `point-${index}`), { userId: user.uid, tripId: "trip" });
    await batch.commit();
  });
  return user;
}

describe("real SDK account removal in local emulators", () => {
  it("removes owned data and Auth, then successfully re-registers the SAME email", async () => {
    const email = `reuse-${crypto.randomUUID()}@example.test`, user = await seed(email, true);
    await deleteOwnAccount(user.uid, password, callbacks());
    expect(auth.currentUser).toBeNull();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore() as unknown as Firestore;
      for (const name of privateAccountCollections) expect((await getDocs(collection(db, name))).docs.map((row) => row.data().userId)).toEqual(["other"]);
      for (const name of ["users", "tourist_profiles", "tourist_preferences"]) expect((await getDoc(doc(db, name, user.uid))).exists()).toBe(false);
      expect((await getDoc(doc(db, "destinations/shared"))).exists()).toBe(true);
      expect(Object.keys((await getDoc(doc(db, "account_deletions", user.uid))).data()!).sort()).toEqual(["startedAt", "version"]);
    });
    await expect(signInWithEmailAndPassword(auth, email, password)).rejects.toBeDefined();
    const replacement = await createUserWithEmailAndPassword(auth, email, password);
    expect(replacement.user.uid).not.toBe(user.uid);
    await expect(setDoc(doc(store, "users", replacement.user.uid), { id: replacement.user.uid, userId: replacement.user.uid, authUid: replacement.user.uid, role: "tourist" })).resolves.toBeUndefined();
  });
  it("rejects a wrong password before locking or removing records", async () => {
    const user = await seed(`wrong-${crypto.randomUUID()}@example.test`);
    await expect(deleteOwnAccount(user.uid, "wrong-password", callbacks())).rejects.toBeDefined();
    expect(await hasAccountDeletion(user.uid)).toBe(false);
    expect((await getDoc(doc(store, "users", user.uid))).exists()).toBe(true);
    await deleteOwnAccount(user.uid, password, callbacks());
  });
  it("resumes from a signed-in account whose profile was already removed", async () => {
    const email = `resume-${crypto.randomUUID()}@example.test`, user = await seed(email);
    await expect(deleteOwnAccount(user.uid, password, callbacks(() => { throw new Error("simulated local cleanup failure"); }))).rejects.toMatchObject({ code: "local" });
    expect(auth.currentUser?.uid).toBe(user.uid); expect(await hasAccountDeletion(user.uid)).toBe(true);
    await signOut(auth); await signInWithEmailAndPassword(auth, email, password);
    expect(await hasAccountDeletion(user.uid)).toBe(true);
    await deleteOwnAccount(user.uid, password, callbacks());
    expect(auth.currentUser).toBeNull();
  });
});
