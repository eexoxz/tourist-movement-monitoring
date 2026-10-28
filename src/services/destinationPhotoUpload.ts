import type { Destination, User } from "../types";
import { getFirebaseServices } from "./firebaseClient";
import { destinationPhotoReference, storedDestinationPhoto } from "./destinationPhoto";

export type DestinationPhotoUpload = { version: string; dataUrl: string; width: number; height: number };
const maxPhotoCharacters = 180000;
export const maxDestinationPhotoFileBytes = 8 * 1024 * 1024;
const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

export function validateDestinationPhotoFile(file: Pick<File, "type" | "size">) {
  return !imageTypes.includes(file.type) ? "format" : file.size === 0 || file.size > maxDestinationPhotoFileBytes ? "size" : null;
}

export function validDestinationPhoto(photo: DestinationPhotoUpload) {
  return /^[a-zA-Z0-9_-]{1,48}$/.test(photo.version)
    && typeof photo.dataUrl === "string" && photo.dataUrl.length <= maxPhotoCharacters
    && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+$/.test(photo.dataUrl)
    && Number.isInteger(photo.width) && photo.width > 0 && photo.width <= 1280
    && Number.isInteger(photo.height) && photo.height > 0 && photo.height <= 1280;
}

export async function prepareDestinationPhoto(file: File): Promise<{ photo?: DestinationPhotoUpload; error?: "format" | "size" | "prepareFailed" }> {
  const error = validateDestinationPhotoFile(file);
  if (error) return { error };
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 40000000) throw new Error("Image dimensions exceed preview limit");
    let scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image preparation unavailable");
    for (let attempt = 0; attempt < 5; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const photo = { version: crypto.randomUUID(), dataUrl: canvas.toDataURL("image/jpeg", 0.78 - attempt * 0.08), width: canvas.width, height: canvas.height };
      if (validDestinationPhoto(photo)) return { photo };
      scale *= 0.8;
    }
    throw new Error("Image could not fit upload limit");
  } catch { return { error: "prepareFailed" }; }
  finally { URL.revokeObjectURL(source); }
}

function remember(source: string, dataUrl: string) {
  cache.delete(source);
  cache.set(source, dataUrl);
  if (cache.size > 48) cache.delete(cache.keys().next().value!);
  return dataUrl;
}

// Only the Firebase-disabled demonstration uses local photo storage. Production saves never
// fall back to this store, so a failed upload cannot be mistaken for a shared photograph.
function localPhoto(destinationId: string, photo?: DestinationPhotoUpload) {
  return new Promise<DestinationPhotoUpload | undefined>((resolve, reject) => {
    const request = indexedDB.open("tourist-destination-photos", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("photos", photo ? "readwrite" : "readonly");
      const operation = photo ? transaction.objectStore("photos").put(photo, destinationId) : transaction.objectStore("photos").get(destinationId);
      transaction.oncomplete = () => { db.close(); resolve(photo ?? operation.result); };
      transaction.onabort = transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  });
}

export async function storeLocalDestinationPhoto(destination: Destination, photo: DestinationPhotoUpload) {
  if (!validDestinationPhoto(photo) || destination.imageUrl !== destinationPhotoReference(destination.id, photo.version)) throw new Error("Invalid destination photo");
  await localPhoto(destination.id, photo);
  remember(destination.imageUrl, photo.dataUrl);
}

export function loadDestinationPhoto(source: string): Promise<string | null> {
  const reference = storedDestinationPhoto(source);
  if (!reference) return Promise.resolve(null);
  if (cache.has(source)) return Promise.resolve(cache.get(source)!);
  if (pending.has(source)) return pending.get(source)!;
  const task = (async () => {
    const services = getFirebaseServices();
    let photo: DestinationPhotoUpload | undefined;
    if (services) {
      if (!services.auth.currentUser) return null;
      const { doc, getDoc } = await import("firebase/firestore");
      const snapshot = await getDoc(doc(services.db, "destinations", reference.destinationId, "photos", "current"));
      photo = snapshot.exists() ? snapshot.data() as DestinationPhotoUpload : undefined;
    } else photo = await localPhoto(reference.destinationId);
    return photo && photo.version === reference.version && validDestinationPhoto(photo) ? remember(source, photo.dataUrl) : null;
  })().finally(() => pending.delete(source));
  pending.set(source, task);
  return task;
}

export async function saveDestinationEdit(destination: Destination, original: Destination | undefined, photo: DestinationPhotoUpload | undefined, actor: User) {
  if (actor.role !== "admin") return false;
  if (photo && (!validDestinationPhoto(photo) || destination.imageUrl !== destinationPhotoReference(destination.id, photo.version))) return false;
  const services = getFirebaseServices();
  if (!services) { if (photo) await storeLocalDestinationPhoto(destination, photo); return true; }
  const uid = services.auth.currentUser?.uid;
  if (!uid || (actor.id !== uid && actor.authUid !== uid)) return false;
  const { doc, runTransaction, deleteField } = await import("firebase/firestore");
  await runTransaction(services.db, async (transaction) => {
    if (services.auth.currentUser?.uid !== uid) throw new Error("Session changed during save");
    const reference = doc(services.db, "destinations", destination.id);
    const snapshot = await transaction.get(reference);
    if (snapshot.exists() !== Boolean(original)) throw new Error("Destination changed; refresh the catalogue");
    if (original) {
      // Send only this form's edits; concurrent activity summaries remain untouched.
      const fields = new Set([...Object.keys(original), ...Object.keys(destination)]);
      const changes = Object.fromEntries([...fields].filter((key) => key !== "id" && JSON.stringify(original[key as keyof Destination]) !== JSON.stringify(destination[key as keyof Destination])).map((key) => [key, destination[key as keyof Destination] ?? deleteField()]));
      if (Object.keys(changes).length) transaction.update(reference, changes);
    } else transaction.set(reference, JSON.parse(JSON.stringify(destination)));
    if (photo) transaction.set(doc(services.db, "destinations", destination.id, "photos", "current"), photo);
    else if (storedDestinationPhoto(original?.imageUrl) && !storedDestinationPhoto(destination.imageUrl)) transaction.delete(doc(services.db, "destinations", destination.id, "photos", "current"));
  });
  if (photo) remember(destination.imageUrl!, photo.dataUrl);
  return true;
}
