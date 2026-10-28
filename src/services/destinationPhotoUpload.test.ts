import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Destination, User } from "../types";

const cloud = vi.hoisted(() => ({ uid: "admin", documents: new Map<string, Record<string, unknown>>(), fail: false, reads: 0 }));
vi.mock("./firebaseClient", () => ({ getFirebaseServices: () => ({ auth: { get currentUser() { return cloud.uid ? { uid: cloud.uid } : null; } }, db: {} }) }));
vi.mock("firebase/firestore", () => {
  const snapshot = (path: string) => ({ exists: () => cloud.documents.has(path), data: () => structuredClone(cloud.documents.get(path)) });
  return {
    doc: (_db: unknown, ...parts: string[]) => parts.join("/"), deleteField: () => "__remove__",
    getDoc: async (path: string) => { cloud.reads++; return snapshot(path); },
    runTransaction: async (_db: unknown, action: (transaction: unknown) => Promise<void>) => {
      const writes: (() => void)[] = [];
      await action({
        get: async (path: string) => snapshot(path),
        set: (path: string, value: Record<string, unknown>) => writes.push(() => cloud.documents.set(path, structuredClone(value))),
        update: (path: string, fields: Record<string, unknown>) => writes.push(() => {
          const value = { ...cloud.documents.get(path) };
          for (const [key, field] of Object.entries(fields)) if (field === "__remove__") delete value[key]; else value[key] = field;
          cloud.documents.set(path, value);
        }),
        delete: (path: string) => writes.push(() => cloud.documents.delete(path)),
      });
      if (cloud.fail) throw new Error("Save rejected");
      writes.forEach((write) => write());
    },
  };
});
import { loadDestinationPhoto, prepareDestinationPhoto, saveDestinationEdit, validDestinationPhoto, validateDestinationPhotoFile } from "./destinationPhotoUpload";
import { destinationPhotoReference } from "./destinationPhoto";

const admin = { id: "admin", authUid: "admin", role: "admin" } as User;
const original = { id: "venue", name: "Local Museum", latitude: 5.4, longitude: 100.3, imageUrl: "https://example.com/old.jpg", imageCredit: { author: "Original photographer" }, activitySummary: { popularityScore: 1 } } as Destination;
const photo = { version: "new-photo", dataUrl: "data:image/jpeg;base64,/9j/AAAA/9k=", width: 640, height: 480 };
beforeEach(() => { cloud.uid = "admin"; cloud.fail = false; cloud.reads = 0; cloud.documents.clear(); cloud.documents.set("destinations/venue", { ...original, activitySummary: { popularityScore: 99 } }); });

describe("destination photograph persistence", () => {
  it("rejects unsupported, empty or oversized inputs and bounded-payload violations", async () => {
    expect(validateDestinationPhotoFile({ type: "image/svg+xml", size: 1000 })).toBe("format");
    for (const size of [0, 8 * 1024 * 1024 + 1]) expect(validateDestinationPhotoFile({ type: "image/jpeg", size })).toBe("size");
    expect(await prepareDestinationPhoto({ type: "image/jpeg", size: 0 } as File)).toEqual({ error: "size" });
    expect(validDestinationPhoto(photo)).toBe(true);
    expect(validDestinationPhoto({ ...photo, dataUrl: "data:image/jpeg;base64,/9j/" + "A".repeat(180000) })).toBe(false);
    expect(validDestinationPhoto({ ...photo, width: 1281 })).toBe(false);
    expect(validDestinationPhoto({ ...photo, dataUrl: "data:image/svg+xml,unsafe" })).toBe(false);
  });
  it("commits the photo and edited destination together, preserving concurrent activity and clearing stale credits", async () => {
    const destination = { ...original, name: "Renamed Museum", imageUrl: destinationPhotoReference(original.id, photo.version), imageCredit: undefined };
    cloud.fail = true;
    await expect(saveDestinationEdit(destination, original, photo, admin)).rejects.toThrow("rejected");
    expect(cloud.documents.get("destinations/venue")?.name).toBe(original.name);
    expect(cloud.documents.has("destinations/venue/photos/current")).toBe(false);
    cloud.fail = false;
    expect(await saveDestinationEdit(destination, original, photo, admin)).toBe(true);
    expect(cloud.documents.get("destinations/venue/photos/current")).toEqual(photo);
    expect(cloud.documents.get("destinations/venue")).toMatchObject({ name: "Renamed Museum", activitySummary: { popularityScore: 99 }, imageUrl: destination.imageUrl });
    expect(cloud.documents.get("destinations/venue")).not.toHaveProperty("imageCredit");
    expect(cloud.documents.get("destinations/venue")).not.toHaveProperty("dataUrl");
  });
  it("blocks session/role mismatches and does not resurrect a deleted destination", async () => {
    cloud.uid = "other";
    expect(await saveDestinationEdit(original, original, undefined, admin)).toBe(false);
    cloud.uid = "admin";
    expect(await saveDestinationEdit(original, original, undefined, { ...admin, role: "tourist" })).toBe(false);
    cloud.documents.delete("destinations/venue");
    await expect(saveDestinationEdit(original, original, undefined, admin)).rejects.toThrow("changed");
    expect(cloud.documents.has("destinations/venue")).toBe(false);
  });
  it("deduplicates visible-image reads and rejects stale versions without loading the catalogue's photos", async () => {
    const data = { ...photo, version: "read-once" };
    cloud.documents.set("destinations/another/photos/current", data);
    const source = destinationPhotoReference("another", data.version);
    expect(await Promise.all([loadDestinationPhoto(source), loadDestinationPhoto(source)])).toEqual([data.dataUrl, data.dataUrl]);
    expect(cloud.reads).toBe(1);
    expect(await loadDestinationPhoto(source)).toBe(data.dataUrl);
    expect(cloud.reads).toBe(1);
    expect(await loadDestinationPhoto(destinationPhotoReference("another", "old-version"))).toBeNull();
  });
});
