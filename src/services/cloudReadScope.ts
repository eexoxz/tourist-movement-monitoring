import type { Firestore } from "firebase/firestore";
import type { User } from "../types";
import { isSampleTourist } from "../data/demoData";

const ownerCollections = new Set([
  "location_consents", "trip_sessions", "movement_records", "ai_analyses",
  "recommendations", "sos_alerts", "incident_reports", "attraction_checkins",
]);
const profileCollections = new Set(["tourist_profiles", "tourist_preferences"]);

export function protectedCloudOwnerIds(users: Pick<User, "id" | "role" | "authUid">[]) {
  return [...new Set(users.filter((user) => user.id.startsWith("tourist-seed-") && !isSampleTourist(user as User)).map((user) => user.id))].sort();
}

// Generated demo activity is reconstructed locally by demoDatasetSelection. Avoid
// downloading its old cloud copies; keep genuine accounts even in that namespace.
// Public data and legacy history (which may lack owner fields) stay unfiltered.
type FirestoreQueries = Pick<typeof import("firebase/firestore"), "collection" | "documentId" | "or" | "query" | "where">;

export function adminCloudSource(firestore: FirestoreQueries, db: Firestore, name: string, protectedIds: string[] = []) {
  const { collection, documentId, or, query, where } = firestore;
  const source = collection(db, name);
  if ((!ownerCollections.has(name) && !profileCollections.has(name)) || protectedIds.length > 28) return source;
  const field = profileCollections.has(name) ? documentId() : "userId";
  return query(source, or(
    where(field, "<", "tourist-seed-"),
    where(field, ">=", "tourist-seed."),
    ...protectedIds.map((id) => where(field, "==", id)),
  ));
}
