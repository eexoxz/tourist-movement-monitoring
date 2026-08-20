# Firebase Schema

This schema supports the DPP prototype with Firebase Authentication and Firestore while keeping the local browser-storage mode available for development.

## Collections

| Collection | Document ID | Purpose |
| --- | --- | --- |
| `users` | Firebase Auth UID for Firebase users | Tourist/admin profile, role, email, display name, creation date |
| `consents` | Consent record ID | Location consent state for each tourist |
| `trips` | Trip session ID | Active/completed tourist trip sessions |
| `movementPoints` | Movement point ID | Latitude, longitude, accuracy, timestamp, source, and trip link |
| `destinations` | Destination ID | Malaysian destination catalogue used by maps and recommendations |
| `analyses` | Trip ID | K-Means cluster, Decision Tree profile, silhouette score, explanation path |
| `recommendations` | Recommendation ID | Generated destination suggestions for a tourist |

## Role Model

Tourist users can read and update their own profile, consent, trips, and movement records. Tourism administrators can read tourist movement summaries and manage destination, analysis, and recommendation records.

New Firebase tourist accounts use the Firebase Auth UID as the `users` document ID. Admin accounts should be created by manually setting a trusted `users/{uid}` document with `role: "admin"` after the Firebase Auth account exists.

## Migration Notes

The app still works without Firebase credentials by using local browser storage. When Firebase is configured, the storage adapter writes the same app data into structured Firestore collections. If an older `prototype/appData` document exists, the adapter reads it once and migrates it into the collection layout.

The local demo account passwords are never written into Firestore. Firebase-backed user records store `authUid`, `name`, `email`, `role`, and `createdAt`.

## Deployment Files

`firebase.json` points Firebase CLI deployments to `firestore.rules` and `firestore.indexes.json`. The rules require authentication, restrict tourist records by owner, and reserve destination/analysis/recommendation writes for administrator accounts.
