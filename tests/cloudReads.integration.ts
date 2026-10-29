import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import * as firestore from "firebase/firestore";
import type { User } from "../src/types";
import { adminCloudSource, protectedCloudOwnerIds } from "../src/services/cloudReadScope";

if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8088") throw new Error("Cloud read tests require the isolated local Firestore emulator");
let environment: RulesTestEnvironment;
const collections = ["location_consents", "trip_sessions", "movement_records", "ai_analyses", "recommendations", "sos_alerts", "incident_reports", "attraction_checkins"];
const users = [
  { id: "admin", role: "admin", authUid: "admin" },
  { id: "alice", role: "tourist", authUid: "alice" },
  { id: "tourist-seed-001", role: "tourist" },
  { id: "tourist-seed-002", role: "tourist", authUid: "tourist-seed-002" },
] as User[];
const protectedIds = protectedCloudOwnerIds(users);
const adminStore = () => environment.authenticatedContext("admin", { email_verified: true }).firestore() as unknown as firestore.Firestore;
const ids = async (name: string, exceptions = protectedIds) => (await firestore.getDocsFromServer(adminCloudSource(firestore, adminStore(), name, exceptions))).docs.map((row) => row.id).sort();

beforeAll(async () => {
  environment = await initializeTestEnvironment({ projectId: "demo-tourist-read-budget", firestore: { host: "127.0.0.1", port: 8088, rules: readFileSync("firestore.rules", "utf8") } });
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as firestore.Firestore;
    const batch = firestore.writeBatch(db);
    for (const user of users) {
      batch.set(firestore.doc(db, "users", user.id), user);
      // Profiles from older versions may not contain userId.
      for (const name of ["tourist_profiles", "tourist_preferences"]) batch.set(firestore.doc(db, name, user.id), { name: user.id });
    }
    for (const name of collections) for (const [id, userId] of [["real", "alice"], ["sample", "tourist-seed-001"], ["protected", "tourist-seed-002"], ["orphan-real", "real-without-profile"]]) {
      batch.set(firestore.doc(db, name, id), { userId, value: "emulator-only" });
    }
    for (const name of ["trips", "movementPoints", "consents", "analyses"]) batch.set(firestore.doc(db, name, "older"), { value: "ownerless legacy history" });
    batch.set(firestore.doc(db, "destinations", "shared"), { name: "Public place" });
    await batch.commit();
  });
});
afterAll(async () => environment?.cleanup());

describe("quota-saving queries with the real SDK and current security rules", () => {
  it("keeps real and protected accounts, excludes generated activity at source, and retains legacy records", async () => {
    expect(protectedIds).toEqual(["tourist-seed-002"]);
    for (const name of collections) expect(await ids(name)).toEqual(["orphan-real", "protected", "real"]);
    for (const name of ["tourist_profiles", "tourist_preferences"]) expect(await ids(name)).toEqual(["admin", "alice", "tourist-seed-002"]);
    for (const name of ["trips", "movementPoints", "consents", "analyses"]) expect(await ids(name)).toEqual(["older"]);
    expect(await ids("users")).toHaveLength(4);
    expect(await ids("destinations")).toEqual(["shared"]);
    // Never exceed Firestore's disjunction limit or omit genuine exceptions.
    expect(await ids("movement_records", Array.from({ length: 29 }, (_, index) => `exception-${index}`))).toHaveLength(4);
  });
  it("streams newly recorded real movement without downloading generated movement", async () => {
    const db = adminStore(), source = adminCloudSource(firestore, db, "movement_records", protectedIds);
    const seen: string[][] = [];
    let stop: (() => void) | undefined;
    try {
      const first = new Promise<void>((resolve, reject) => { stop = firestore.onSnapshot(source, (snapshot) => { seen.push(snapshot.docs.map((row) => row.id)); resolve(); }, reject); });
      await first;
      expect(seen[0].sort()).toEqual(["orphan-real", "protected", "real"]);
      await environment.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore() as unknown as firestore.Firestore;
        await firestore.setDoc(firestore.doc(db, "movement_records", "new-gps"), { userId: "alice", source: "browser" });
      });
      await expect.poll(() => seen.at(-1), { timeout: 5000 }).toContain("new-gps");
      expect(seen.every((snapshot) => !snapshot.includes("sample"))).toBe(true);
    } finally { stop?.(); }
  });
  it("keeps tourist reads owner-scoped and denies use of the admin query by tourists", async () => {
    const db = environment.authenticatedContext("alice", { email_verified: true }).firestore() as unknown as firestore.Firestore;
    const own = firestore.query(firestore.collection(db, "movement_records"), firestore.where("userId", "==", "alice"));
    expect((await firestore.getDocsFromServer(own)).docs.map((row) => row.id)).toContain("real");
    await expect(firestore.getDocsFromServer(adminCloudSource(firestore, db, "movement_records", protectedIds))).rejects.toMatchObject({ code: "permission-denied" });
  });
});
