import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, runTransaction, setDoc, updateDoc, where } from "firebase/firestore";

// Never fall back to the real project when an emulator is unavailable.
if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8088") throw new Error("Run npm run test:rules against the isolated emulator.");
let environment;
const db = (uid) => uid ? environment.authenticatedContext(uid).firestore() : environment.unauthenticatedContext().firestore();
const own = { id: "alice", userId: "alice", authUid: "alice", role: "tourist", name: "Alice test" };
const other = { id: "bob", userId: "bob", authUid: "bob", role: "tourist", name: "Bob test" };
const recordFixtures = {
  location_consents: { granted: true },
  trip_sessions: { status: "active" },
  movement_records: { tripId: "alice-trip", latitude: 5.4, longitude: 100.3 },
  ai_analyses: { tripId: "alice-trip" },
  recommendations: { destinationId: "temple" },
  sos_alerts: { status: "open" },
  incident_reports: { status: "open", type: "lost-item" },
  attraction_checkins: { status: "checked-in", destinationId: "temple" },
  consents: { granted: true },
  trips: { status: "active" },
  movementPoints: { tripId: "alice-trip", latitude: 5.4, longitude: 100.3 },
  analyses: { tripId: "alice-trip" },
};

before(async () => {
  environment = await initializeTestEnvironment({ projectId: "demo-tourist-security", firestore: {
    host: "127.0.0.1", port: 8088, rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
  } });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const store = context.firestore();
    const writes = [
      setDoc(doc(store, "users/alice"), own), setDoc(doc(store, "users/bob"), other),
      setDoc(doc(store, "users/admin"), { id: "admin", authUid: "admin", role: "admin" }),
    ];
    for (const name of ["tourist_profiles", "tourist_preferences"]) {
      writes.push(setDoc(doc(store, name, "alice"), own), setDoc(doc(store, name, "bob"), other));
    }
    for (const [name, data] of Object.entries(recordFixtures)) {
      writes.push(setDoc(doc(store, name, "alice-record"), { ...data, id: "alice-record", userId: "alice" }));
      writes.push(setDoc(doc(store, name, "bob-record"), { ...data, id: "bob-record", userId: "bob" }));
    }
    await Promise.all(writes);
  });
});
after(async () => { await environment?.cleanup(); });

describe("identity and role isolation", () => {
  it("allows an owner profile save and rejects cross-user profile access", async () => {
    await assertSucceeds(updateDoc(doc(db("alice"), "users/alice"), { name: "Updated test" }));
    await assertFails(getDoc(doc(db("alice"), "users/bob")));
    await assertFails(setDoc(doc(db("alice"), "users/bob"), own));
  });
  it("rejects self-granted admin roles", async () => {
    await assertFails(updateDoc(doc(db("alice"), "users/alice"), { role: "admin" }));
    await assertFails(setDoc(doc(db("mallory"), "users/mallory"), { id: "mallory", authUid: "mallory", role: "admin" }));
    await assertFails(setDoc(doc(db("alice"), "destinations/attack"), { latitude: 5, longitude: 100 }));
  });
  it("does not allow a user's document to claim another identity", async () => {
    await assertFails(updateDoc(doc(db("alice"), "users/alice"), { id: "bob" }));
    await assertFails(updateDoc(doc(db("alice"), "users/alice"), { userId: "bob" }));
  });
  for (const name of ["tourist_profiles", "tourist_preferences"]) describe(name, () => {
    it("allows normal owner saves and admin review", async () => {
      await assertSucceeds(setDoc(doc(db("alice"), name, "alice"), { ...own, name: "Updated test" }));
      await assertSucceeds(getDoc(doc(db("admin"), name, "bob")));
      await assertSucceeds(updateDoc(doc(db("admin"), name, "bob"), { name: "Reviewed test" }));
    });
    it("denies another tourist's data", async () => {
      await assertFails(getDoc(doc(db("alice"), name, "bob")));
    });
    it("denies taking over an existing document by forging the replacement owner", async () => {
      await assertFails(setDoc(doc(db("alice"), name, "bob"), own));
    });
    it("denies creating documents under another user's path", async () => {
      await assertFails(setDoc(doc(db("alice"), name, "charlie"), own));
    });
    it("denies changing owner aliases on one's own path", async () => {
      await assertFails(setDoc(doc(db("alice"), name, "alice"), other));
    });
    it("denies storing an admin role in tourist profile data", async () => {
      await assertFails(updateDoc(doc(db("alice"), name, "alice"), { role: "admin" }));
    });
  });
});

describe("owned movement and support records", () => {
  it("delivers a phone transaction to another signed-in owner's live visit query", async () => {
    const phone = db("alice");
    const desktop = db("alice");
    const reference = doc(phone, "attraction_checkins", "phone-qr-visit");
    let stop;
    let timer;
    try {
      const received = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Desktop did not receive the visit")), 10000);
        stop = onSnapshot(query(collection(desktop, "attraction_checkins"), where("userId", "==", "alice")), { includeMetadataChanges: true }, (snapshot) => {
          if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites && snapshot.docs.some((visit) => visit.id === reference.id && visit.data().status === "checked-in")) resolve();
        }, reject);
      });
      await assertSucceeds(runTransaction(phone, async (transaction) => {
        const existing = await transaction.get(reference);
        if (!existing.exists()) transaction.set(reference, { id: reference.id, userId: "alice", destinationId: "temple", status: "checked-in", checkedInAt: "2026-10-17T00:00:00Z" });
      }));
      await received;
      await assertSucceeds(getDoc(doc(db("admin"), "attraction_checkins", reference.id)));
      await assertFails(getDoc(doc(db("bob"), "attraction_checkins", reference.id)));
    } finally {
      clearTimeout(timer);
      stop?.();
    }
  });
  for (const name of ["attraction_checkins", "sos_alerts"]) it(`allows the app's read-before-create transaction in ${name}`, async () => {
    const store = db("alice");
    const reference = doc(store, name, "transaction-new");
    await assertSucceeds(runTransaction(store, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) transaction.set(reference, { ...recordFixtures[name], id: "transaction-new", userId: "alice" });
    }));
    await assertSucceeds(getDoc(doc(db("admin"), name, "transaction-new")));
    await assertFails(getDoc(doc(db("bob"), name, "transaction-new")));
    await assertFails(getDoc(doc(db(), name, "missing")));
  });
  for (const [name, fixture] of Object.entries(recordFixtures)) describe(name, () => {
    it("allows owner queries and creates, and admin reads", async () => {
      await assertSucceeds(getDocs(query(collection(db("alice"), name), where("userId", "==", "alice"))));
      await assertSucceeds(setDoc(doc(db("alice"), name, "new"), { ...fixture, id: "new", userId: "alice" }));
      await assertSucceeds(updateDoc(doc(db("alice"), name, "alice-record"), fixture));
      await assertSucceeds(getDoc(doc(db("admin"), name, "bob-record")));
    });
    it("denies cross-user reads, overwrites, deletes and unfiltered lists", async () => {
      const target = doc(db("alice"), name, "bob-record");
      await assertFails(getDoc(target));
      await assertFails(setDoc(target, { ...fixture, id: "bob-record", userId: "alice" }));
      await assertFails(deleteDoc(target));
      await assertFails(getDocs(collection(db("alice"), name)));
    });
    it("denies conflicting userId/authUid aliases on create", async () => {
      await assertFails(setDoc(doc(db("alice"), name, "forged"), { ...fixture, id: "forged", userId: "bob", authUid: "alice" }));
    });
    it("denies transferring owner or record identity on update", async () => {
      const ownRecord = doc(db("alice"), name, "alice-record");
      await assertFails(updateDoc(ownRecord, { userId: "bob", authUid: "alice" }));
      await assertFails(updateDoc(ownRecord, { id: "bob-record" }));
    });
    it("denies anonymous access", async () => {
      await assertFails(getDoc(doc(db(), name, "alice-record")));
      await assertFails(setDoc(doc(db(), name, "new"), { ...fixture, id: "new", userId: "alice" }));
    });
  });
  it("allows checkout but not forged approval or reopening a checked-out visit", async () => {
    const visit = doc(db("alice"), "attraction_checkins/alice-record");
    await assertFails(updateDoc(visit, { reviewStatus: "linked", reviewedBy: "alice" }));
    await assertSucceeds(updateDoc(visit, { status: "checked-out", checkedOutAt: "2026-10-17T12:00:00Z" }));
    await assertFails(updateDoc(visit, { status: "checked-in" }));
  });
  it("allows SOS closure but protects the officer response and terminal state", async () => {
    const alert = doc(db("alice"), "sos_alerts/alice-record");
    await assertFails(updateDoc(alert, { adminNote: "Forged officer response" }));
    await assertSucceeds(updateDoc(alert, { status: "resolved", closureReason: "cancelled", closedBy: "alice", resolvedAt: "2026-10-17T12:00:00Z" }));
    await assertFails(updateDoc(alert, { status: "open" }));
  });
  it("keeps destination and geofence management admin-only", async () => {
    const destination = { latitude: 5.4, longitude: 100.3 };
    await assertSucceeds(setDoc(doc(db("admin"), "destinations/temple"), destination));
    await assertFails(updateDoc(doc(db("alice"), "destinations/temple"), { latitude: 6 }));
    await assertSucceeds(setDoc(doc(db("admin"), "geofences/zone"), { ...destination, type: "safe" }));
    await assertFails(updateDoc(doc(db("alice"), "geofences/zone"), { type: "restricted" }));
  });
});
