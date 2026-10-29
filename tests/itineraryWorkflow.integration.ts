import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDocFromServer, setDoc, type Firestore } from "firebase/firestore";
import type { Itinerary, User } from "../src/types";

if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8088") throw new Error("Itinerary checks require the isolated local Firestore emulator");
const state = vi.hoisted(() => ({ services: null as unknown }));
vi.mock("../src/services/firebaseClient", () => ({ isFirebaseConfigured: () => true, getFirebaseServices: () => state.services }));
import { addItineraryStop, createItinerary } from "../src/services/itineraries";
import { saveItinerary, subscribeItineraries, deleteItinerary } from "../src/services/itineraryStorage";
import { initialData } from "../src/data/demoData";

let environment: RulesTestEnvironment;
const alice = { id: "alice", role: "tourist" } as User;
let firstDevice: Firestore, secondDevice: Firestore;
const useDevice = (db: Firestore) => { state.services = { db, auth: { currentUser: { uid: "alice" } } }; };
beforeAll(async () => {
  environment = await initializeTestEnvironment({ projectId: "demo-tourist-itinerary", firestore: { host: "127.0.0.1", port: 8088, rules: readFileSync("firestore.rules", "utf8") } });
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    for (const id of ["alice", "bob"]) await setDoc(doc(db, "users", id), { id, role: "tourist" });
  });
  firstDevice = environment.authenticatedContext("alice", { email_verified: true }).firestore() as unknown as Firestore;
  secondDevice = environment.authenticatedContext("alice", { email_verified: true }).firestore() as unknown as Firestore;
});
afterAll(async () => environment?.cleanup());

describe("saved itinerary workflows with real Firebase SDK clients", () => {
  it("syncs a schedule to another device, protects concurrent edits and keeps deletion terminal", async () => {
    let seen: Itinerary[] = [];
    useDevice(secondDevice);
    const stop = await subscribeItineraries(alice, (plans) => { seen = plans; }, (error?: unknown) => { throw error; });
    try {
      const draft = addItineraryStop(createItinerary("alice", "Penang day out"), initialData.destinations[0], 1);
      draft.stops[0] = { ...draft.stops[0], arrivalTime: "09:00", departureTime: "10:30", note: "Meet at the entrance" };
      useDevice(firstDevice);
      const saved = await saveItinerary(draft, alice);
      await expect.poll(() => seen[0]?.stops[0].arrivalTime).toBe("09:00");
      expect(seen[0].stops[0]).toMatchObject({ departureTime: "10:30", note: "Meet at the entrance" });
      const stale = structuredClone(seen[0]);
      const updated = await saveItinerary({ ...saved, title: "Updated itinerary" }, alice);
      useDevice(secondDevice);
      await expect(saveItinerary({ ...stale, notes: "Older edit" }, alice)).rejects.toMatchObject({ code: "conflict" });
      useDevice(firstDevice);
      await deleteItinerary(updated, alice);
      await expect.poll(() => seen.length).toBe(0);
      await expect(saveItinerary(updated, alice)).rejects.toMatchObject({ code: "conflict" });
    } finally { stop(); }
  });
  it("accepts legacy unscheduled plans but rejects invalid schedules and other-user reads", async () => {
    useDevice(firstDevice);
    const legacy = addItineraryStop(createItinerary("alice", "Older plan"), initialData.destinations[0], 1);
    const saved = await saveItinerary(legacy, alice);
    expect((await getDocFromServer(doc(secondDevice, "tourist_itineraries", saved.id))).data()?.stops[0].arrivalTime).toBeUndefined();
    for (const times of [{ arrivalTime: "09:00", departureTime: "" }, { arrivalTime: "15:00", departureTime: "12:00" }]) {
      await expect(saveItinerary({ ...saved, stops: [{ ...saved.stops[0], ...times }] }, alice)).rejects.toMatchObject({ code: "invalid" });
    }
    const bob = environment.authenticatedContext("bob", { email_verified: true }).firestore() as unknown as Firestore;
    await expect(getDocFromServer(doc(bob, "tourist_itineraries", saved.id))).rejects.toMatchObject({ code: "permission-denied" });
  });
});
