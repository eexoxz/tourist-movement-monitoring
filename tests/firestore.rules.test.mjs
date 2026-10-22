import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";

// Never fall back to the real project when an emulator is unavailable.
if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8088") throw new Error("Run npm run test:rules against the isolated emulator.");
let environment;
const db = (uid) => uid ? environment.authenticatedContext(uid).firestore() : environment.unauthenticatedContext().firestore();
const recentDb = (uid, age = 0) => environment.authenticatedContext(uid, { auth_time: Math.floor(Date.now() / 1000) - age }).firestore();
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

describe("self-service account removal", () => {
  const lock = (store, uid = "alice") => setDoc(doc(store, "account_deletions", uid), { version: 1, startedAt: serverTimestamp() });
  it("requires recent authentication and disallows admins or other users starting deletion", async () => {
    await assertFails(lock(db("alice")));
    await assertFails(lock(recentDb("alice", 600)));
    await assertFails(lock(recentDb("bob")));
    await assertFails(lock(recentDb("admin")));
    await assertFails(lock(recentDb("admin"), "admin"));
    await assertFails(lock(db()));
    await assertSucceeds(lock(recentDb("alice")));
  });
  it("keeps the minimal lock private, immutable and free of profile fields", async () => {
    const store = recentDb("alice");
    await assertFails(setDoc(doc(store, "account_deletions/alice"), { version: 1, startedAt: serverTimestamp(), email: "private@example.test" }));
    await lock(store);
    await assertSucceeds(getDoc(doc(store, "account_deletions/alice")));
    await assertFails(getDoc(doc(db("bob"), "account_deletions/alice")));
    await assertFails(getDocs(collection(store, "account_deletions")));
    await assertFails(updateDoc(doc(store, "account_deletions/alice"), { version: 2 }));
    await assertFails(deleteDoc(doc(store, "account_deletions/alice")));
  });
  it("allows owner-only profile removal only after locking and leaves shared places untouched", async () => {
    const store = recentDb("alice");
    for (const name of ["users", "tourist_profiles", "tourist_preferences"]) {
      await assertFails(deleteDoc(doc(store, name, "alice")));
      await assertFails(deleteDoc(doc(db("admin"), name, "alice")));
    }
    await lock(store);
    for (const name of ["tourist_profiles", "tourist_preferences", "users"]) {
      await assertFails(deleteDoc(doc(store, name, "bob")));
      await assertSucceeds(deleteDoc(doc(store, name, "alice")));
      await assertSucceeds(deleteDoc(doc(store, name, "alice")));
    }
    await assertSucceeds(setDoc(doc(db("admin"), "destinations/shared"), { latitude: 5.4, longitude: 100.3 }));
    await assertFails(deleteDoc(doc(store, "destinations/shared")));
    await assertFails(setDoc(doc(store, "users/alice"), own));
    await assertFails(setDoc(doc(db("admin"), "users/alice"), own));
  });
  it("allows paged cleanup while blocking old-session creates and updates", async () => {
    const store = recentDb("alice"); await lock(store);
    for (const [name, fixture] of Object.entries(recordFixtures)) {
      await assertSucceeds(getDocs(query(collection(store, name), where("userId", "==", "alice"), limit(100))));
      await assertFails(setDoc(doc(store, name, "late"), { ...fixture, id: "late", userId: "alice" }));
      await assertFails(setDoc(doc(db("admin"), name, "late-admin"), { ...fixture, id: "late-admin", userId: "alice" }));
      await assertFails(updateDoc(doc(store, name, "alice-record"), { updatedAt: "late" }));
      await assertFails(deleteDoc(doc(store, name, "bob-record")));
      await assertSucceeds(deleteDoc(doc(store, name, "alice-record")));
    }
  });
  it("hard-deletes only the locked owner's itinerary and blocks draft resurrection", async () => {
    const plan = { id: "itinerary-removal", userId: "alice", title: "Plan", startDate: "", days: 1, notes: "", stops: [], revision: 1, deletedAt: "", createdAt: "now", updatedAt: "now" };
    const store = recentDb("alice");
    await assertSucceeds(setDoc(doc(store, "tourist_itineraries", plan.id), plan));
    await assertFails(deleteDoc(doc(store, "tourist_itineraries", plan.id)));
    await lock(store);
    await assertFails(updateDoc(doc(store, "tourist_itineraries", plan.id), { revision: 2 }));
    await assertFails(deleteDoc(doc(recentDb("bob"), "tourist_itineraries", plan.id)));
    await assertSucceeds(deleteDoc(doc(store, "tourist_itineraries", plan.id)));
    await assertFails(setDoc(doc(store, "tourist_itineraries", plan.id), plan));
  });
  it("cleans a 100-document page within Firestore rule access limits", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const batch = writeBatch(context.firestore());
      for (let index = 0; index < 100; index++) batch.set(doc(context.firestore(), "movement_records", `page-${index}`), { userId: "alice", tripId: "trip", latitude: 5.4, longitude: 100.3 });
      await batch.commit();
    });
    const store = recentDb("alice"); await lock(store);
    const rows = await getDocs(query(collection(store, "movement_records"), where("userId", "==", "alice"), limit(100)));
    const batch = writeBatch(store); rows.forEach((row) => batch.delete(row.ref));
    await assertSucceeds(batch.commit());
  });
  it("permits the admin's 15-owner sync transaction within rule access limits", async () => {
    const store = db("admin");
    const refs = Array.from({ length: 15 }, (_, index) => doc(store, "recommendations", `admin-sync-${index}`));
    await assertSucceeds(runTransaction(store, async (transaction) => {
      await Promise.all(refs.map((ref) => transaction.get(ref)));
      refs.forEach((ref, index) => transaction.set(ref, { id: ref.id, userId: `owner-${index}`, destinationId: "temple" }));
    }));
  });
});

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

describe("action-scoped cloud workflows", () => {
  it("keeps archived modern and legacy trips readable by admins without deleting movement", async () => {
    for (const name of ["trip_sessions", "trips"]) {
      await assertSucceeds(updateDoc(doc(db("alice"), name, "alice-record"), { hiddenFromHistoryAt: "2026-10-22T01:00:00Z", status: "completed" }));
      assert.equal((await getDoc(doc(db("admin"), name, "alice-record"))).data().hiddenFromHistoryAt, "2026-10-22T01:00:00Z");
      await assertFails(updateDoc(doc(db("bob"), name, "alice-record"), { hiddenFromHistoryAt: "forged" }));
    }
    assert.equal((await getDoc(doc(db("admin"), "movement_records/alice-record"))).exists(), true);
  });
  it("permits an owner to finish a legacy trip and start a separate modern trip", async () => {
    const store = db("alice");
    await assertSucceeds(runTransaction(store, async (transaction) => {
      const modern = doc(store, "trip_sessions", "alice-record");
      const legacy = doc(store, "trips", "alice-record");
      const next = doc(store, "trip_sessions", "fresh-after-legacy");
      await Promise.all([transaction.get(modern), transaction.get(legacy), transaction.get(next)]);
      transaction.update(legacy, { status: "completed", endedAt: "2026-10-21T01:00:00Z" });
      transaction.set(next, { id: next.id, userId: "alice", status: "active", startedAt: "2026-10-21T01:00:00Z" });
    }));
    assert.equal((await getDoc(doc(store, "trips/alice-record"))).data().status, "completed");
    await assertFails(updateDoc(doc(db("bob"), "trips/alice-record"), { status: "completed" }));
  });
  it("delivers a tourist's new movement point to an admin session without refreshing", async () => {
    let stop;
    let timer;
    try {
      const received = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Admin did not receive movement")), 10000);
        stop = onSnapshot(collection(db("admin"), "movement_records"), { includeMetadataChanges: true }, (snapshot) => {
          if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites && snapshot.docs.some((record) => record.id === "phone-live-point")) resolve();
        }, reject);
      });
      await assertSucceeds(setDoc(doc(db("alice"), "movement_records", "phone-live-point"), { id: "phone-live-point", userId: "alice", tripId: "alice-trip", latitude: 5.42, longitude: 100.32 }));
      await received;
    } finally { clearTimeout(timer); stop?.(); }
  });
  it("supports authenticated read-before-create transactions without exposing another user's existing records", async () => {
    for (const name of ["location_consents", "trip_sessions", "movement_records", "ai_analyses", "recommendations", "incident_reports"]) {
      const store = db("alice");
      const ref = doc(store, name, "fresh-record");
      await assertSucceeds(runTransaction(store, async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) transaction.set(ref, { ...recordFixtures[name], id: "fresh-record", userId: "alice" });
      }));
      await assertFails(getDoc(doc(db("bob"), name, "fresh-record")));
      await assertFails(getDoc(doc(db(), name, "missing")));
    }
  });
  it("retains both a phone's stop action and a desktop rename", async () => {
    const store = db("alice");
    const ref = doc(store, "trip_sessions", "alice-record");
    const edit = (patch) => {
      const client = db("alice");
      return runTransaction(client, async (transaction) => {
        const reference = doc(client, "trip_sessions", "alice-record");
        const snapshot = await transaction.get(reference);
        if (snapshot.exists()) transaction.update(reference, patch);
      });
    };
    await Promise.all([edit({ label: "A renamed visit" }), edit({ status: "completed", endedAt: "2026-10-17T10:00:00Z" })]);
    const saved = (await getDoc(ref)).data();
    assert.equal(saved.label, "A renamed visit");
    assert.equal(saved.status, "completed");
    assert.equal(saved.endedAt, "2026-10-17T10:00:00Z");
  });
  it("reserves incident status and officer notes for admins", async () => {
    const touristRef = doc(db("alice"), "incident_reports", "alice-record");
    await assertFails(updateDoc(touristRef, { status: "resolved" }));
    await assertFails(updateDoc(touristRef, { adminNote: "Forged response" }));
    await assertFails(setDoc(doc(db("alice"), "incident_reports", "forged"), { id: "forged", userId: "alice", type: "lost-item", status: "resolved" }));
    await assertSucceeds(updateDoc(doc(db("admin"), "incident_reports", "alice-record"), { status: "reviewing", adminNote: "Reviewed by monitoring officer" }));
    await assertSucceeds(updateDoc(touristRef, { description: "Updated report details" }));
    assert.equal((await getDoc(touristRef)).data().adminNote, "Reviewed by monitoring officer");
  });
});

describe("private editable itineraries", () => {
  const plan = { id: "itinerary-test", userId: "alice", title: "A planned visit", startDate: "2026-10-17", days: 2, notes: "Private planning notes", stops: [], revision: 1, deletedAt: "", createdAt: "2026-10-17T00:00:00Z", updatedAt: "2026-10-17T00:00:00Z" };
  const create = () => setDoc(doc(db("alice"), "tourist_itineraries", plan.id), plan);
  it("supports the real read-before-create transaction and owner-scoped query", async () => {
    const store = db("alice");
    const reference = doc(store, "tourist_itineraries", plan.id);
    await assertSucceeds(runTransaction(store, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) transaction.set(reference, plan);
    }));
    const results = await assertSucceeds(getDocs(query(collection(db("alice"), "tourist_itineraries"), where("userId", "==", "alice"))));
    assert.equal(results.size, 1);
  });
  it("keeps another tourist and admins out of private planning notes", async () => {
    await create();
    await assertFails(getDoc(doc(db("bob"), "tourist_itineraries", plan.id)));
    await assertFails(getDoc(doc(db("admin"), "tourist_itineraries", plan.id)));
    await assertFails(getDocs(collection(db("alice"), "tourist_itineraries")));
    await assertFails(getDoc(doc(db(), "tourist_itineraries", "missing")));
  });
  it("rejects forged ownership, ID changes and unbounded payloads", async () => {
    await assertFails(setDoc(doc(db("bob"), "tourist_itineraries", plan.id), plan));
    for (const patch of [{ id: "other-id" }, { days: 15 }, { days: 0 }, { notes: "x".repeat(1001) }, { title: "x".repeat(81) }, { stops: Array(41).fill({}) }, { revision: 5 }, { secretField: "unexpected" }]) {
      await assertFails(setDoc(doc(db("alice"), "tourist_itineraries", plan.id), { ...plan, ...patch }));
    }
    await create();
    await assertFails(updateDoc(doc(db("alice"), "tourist_itineraries", plan.id), { userId: "bob", revision: 2 }));
    await assertFails(updateDoc(doc(db("alice"), "tourist_itineraries", plan.id), { createdAt: "changed", revision: 2 }));
  });
  it("requires sequential versions and rejects stale updates", async () => {
    await create();
    const ref = doc(db("alice"), "tourist_itineraries", plan.id);
    await assertSucceeds(updateDoc(ref, { title: "Phone edit", revision: 2 }));
    await assertFails(setDoc(ref, { ...plan, title: "Stale desktop", revision: 2 }));
    assert.equal((await getDoc(ref)).data().title, "Phone edit");
  });
  it("prevents a deleted itinerary being resurrected by a delayed save", async () => {
    await create();
    const ref = doc(db("alice"), "tourist_itineraries", plan.id);
    await assertSucceeds(updateDoc(ref, { deletedAt: "2026-10-17T01:00:00Z", revision: 2 }));
    await assertFails(setDoc(ref, { ...plan, revision: 3 }));
    await assertFails(deleteDoc(ref));
  });
  it("allows only one of two concurrent editors to save the same base revision", async () => {
    await create();
    const edit = (title) => {
      const store = db("alice");
      return runTransaction(store, async (transaction) => {
        const ref = doc(store, "tourist_itineraries", plan.id);
        const snapshot = await transaction.get(ref);
        if (snapshot.data().revision !== 1) throw new Error("conflict");
        transaction.set(ref, { ...plan, title, revision: 2 });
      });
    };
    const results = await Promise.allSettled([edit("Phone edit"), edit("Desktop edit")]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  });
  it("delivers a saved itinerary to a second owner session without a refresh", async () => {
    let stop;
    let timer;
    try {
      const received = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Itinerary was not received")), 10000);
        stop = onSnapshot(query(collection(db("alice"), "tourist_itineraries"), where("userId", "==", "alice"), where("deletedAt", "==", "")), { includeMetadataChanges: true }, (snapshot) => {
          if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites && snapshot.docs.some((entry) => entry.id === plan.id)) resolve();
        }, reject);
      });
      await create();
      await received;
    } finally { clearTimeout(timer); stop?.(); }
  });
});

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
