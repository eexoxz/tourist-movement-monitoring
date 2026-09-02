# Firebase Schema

This schema supports the DPP prototype with Firebase Authentication and Firestore while keeping the local browser-storage mode available for development.

## Collections

| Collection | Document ID | Purpose |
| --- | --- | --- |
| `users` | Firebase Auth UID for Firebase users | Tourist/admin profile, role, email, display name, creation date |
| `tourist_profiles` | Tourist user ID | Public tourist profile details without passwords |
| `tourist_preferences` | Tourist user ID | Travel preferences, expected tourist profile, pace, group type, and accessibility preference |
| `location_consents` | Consent record ID | Location consent state for each tourist |
| `trip_sessions` | Trip session ID | Active/completed tourist trip sessions |
| `movement_records` | Movement point ID | Tourist owner, latitude, longitude, accuracy, timestamp, source, and trip link |
| `destination_categories` | Category ID | Category metadata for the Malaysian destination catalogue |
| `destinations` | Destination ID | Malaysian destination catalogue used by maps and recommendations |
| `ai_analyses` | Trip ID | K-Means cluster, Decision Tree profile, silhouette score, explanation path |
| `recommendations` | Recommendation ID | Generated destination suggestions for a tourist |
| `sos_alerts` | SOS alert ID | Tourist SOS assistance requests, status, timestamp, and latest available location reference |
| `incident_reports` | Incident report ID | Tourist-submitted lost item, accident, suspicious activity, medical, or general help reports |
| `attraction_checkins` | Check-in ID | Tourist attraction check-in/check-out records linked to a destination and optional active trip |
| `geofences` | Geofence ID | Local safe, dense, or restricted tourist monitoring zones used for warning logic without adding another API |

## Role Model

Tourist users can read and update their own profile, consent, trips, movement records, attraction check-ins, SOS requests, and incident reports. Signed-in users can read geofence warning zones. Tourism administrators can read tourist movement summaries, update safety case status, and manage destination, analysis, recommendation, and geofence records.

New Firebase tourist accounts use the Firebase Auth UID as the `users` document ID. Admin accounts should be created by manually setting a trusted `users/{uid}` document with `role: "admin"` after the Firebase Auth account exists.

## Migration Notes

The app still works without Firebase credentials by using local browser storage. When Firebase is configured, the storage adapter writes the same app data into structured Firestore collections. If an older `prototype/appData` document exists, the adapter reads it once and migrates it into the collection layout. Older collection names from early development (`consents`, `trips`, `movementPoints`, `analyses`) are still read as fallback collections, but new saves use the DPP-aligned names above.

The local demo account passwords are never written into Firestore. Firebase-backed user records store `authUid`, `name`, `email`, `role`, and `createdAt`. Tourist profile and preference records are split into `tourist_profiles` and `tourist_preferences` so the Firestore database view matches the project data model.

## Deployment Files

`firebase.json` points Firebase CLI deployments to `firestore.rules` and `firestore.indexes.json`. The rules require authentication, restrict tourist records by owner, allow administrators to review safety cases, and reserve destination/analysis/recommendation writes for administrator accounts.
