# Tourist Movement Monitoring

Prototype web application for consent-based tourist movement tracking, route visualization, administrator monitoring, configurable movement-based travel planning, and explainable travel recommendation.

The app uses Firebase Authentication and Firestore when configured, with browser storage as a local backup. Without Firebase credentials it runs in a separate local demonstration mode.

Demo accounts:

- Tourist: `tourist@example.com` / `tourist123`
- Nature tourist: `nature@example.com` / `nature123`
- Culture tourist: `culture@example.com` / `culture123`
- Urban tourist: `urban@example.com` / `urban123`
- Tourism Administrator: `admin@tourism.local` / `admin123`

Demo account shortcuts appear only in local mode. With Firebase configured, newly registered tourists verify their email before signing in. "Keep me signed in" selects Firebase's persistent session; unchecked sign-ins use session persistence. The app remembers only an email address, never a password, and removes passwords from older remembered-login entries when opened. Local demo account authentication is not production authentication.

Run locally:

```bash
npm install
npm run dev
```

Open `http://localhost:4175/login` on the same laptop.

If your global npm command is misconfigured, run the Windows helper instead:

```powershell
.\start.bat
```

For phone testing on the same Wi-Fi, run:

```powershell
.\start-mobile.bat
```

Then open the network URL shown in the terminal, for example `http://192.168.50.176:4175/login`.

Use `npm run preview` after a build when you only want to reopen the latest compiled version.

Build check:

```bash
npm run build
```

Automated tests:

```bash
npm test
```

Executable Firestore authorization tests (Node 24 and Java 21 or later):

```bash
npm run test:rules
```

This starts Firebase's local Firestore emulator on `127.0.0.1:8088` with the
isolated `demo-tourist-security` project. Fixtures are synthetic and no production
database is accessed. The suite tests owner access, denied cross-user requests,
identity/role forgery, checkout, SOS closure and administrator actions. CI runs
both test suites. Java is development-only and is not required by app visitors.

Firebase setup:

1. Create a Firebase web app with Authentication and Firestore enabled.
2. Copy `.env.example` to `.env`.
3. Fill in the `VITE_FIREBASE_*` values from the Firebase web app settings.
4. Restart the app.

Without `.env`, the app stays in local prototype mode. With Firebase config, app data is saved to Firestore collections while browser storage remains a local backup. Firebase Email/Password authentication must be enabled, and tourist users must verify their email after registration.

The Firestore collection design, migration notes, rules, and indexes are documented in `docs/firebase-schema.md`. New saves use the DPP-aligned collections `users`, `tourist_profiles`, `tourist_preferences`, `location_consents`, `trip_sessions`, `movement_records`, `destination_categories`, `destinations`, `ai_analyses`, and `recommendations`. Deployable Firebase files are included as `firebase.json`, `firestore.rules`, and `firestore.indexes.json`.

Project roadmap:

- See `PROJECT_CHECKLIST.md` for the staged completion checklist based on the DPP.
