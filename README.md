# Tourist Movement Monitoring

Prototype web application for consent-based tourist movement tracking, route visualization, administrator monitoring, and explainable travel recommendation.

The current implementation runs locally with browser storage so the main project flow is usable without Firebase credentials. The data shape is ready to move into Firebase Authentication and Firestore once the Firebase project is created.

Demo accounts:

- Tourist: `tourist@example.com` / `tourist123`
- Nature tourist: `nature@example.com` / `nature123`
- Culture tourist: `culture@example.com` / `culture123`
- Urban tourist: `urban@example.com` / `urban123`
- Tourism Administrator: `admin@tourism.local` / `admin123`

The app intentionally starts at the login/register screen on each page load. A previous browser session is cleared at startup so demonstrations always begin from authentication.

Run locally:

```bash
npm install
npm run dev
```

If your global npm command is misconfigured, run the Windows helper instead:

```powershell
.\start.bat
```

Use `npm run preview` after a build when you only want to reopen the latest compiled version.

Build check:

```bash
npm run build
```

Automated tests:

```bash
npm test
```

Firebase setup:

1. Create a Firebase web app with Authentication and Firestore enabled.
2. Copy `.env.example` to `.env`.
3. Fill in the `VITE_FIREBASE_*` values from the Firebase web app settings.
4. Restart the app.

Without `.env`, the app stays in local prototype mode. With Firebase config, app data is saved to Firestore collections while browser storage remains a local backup.

The Firestore collection design, migration notes, rules, and indexes are documented in `docs/firebase-schema.md`. Deployable Firebase files are included as `firebase.json`, `firestore.rules`, and `firestore.indexes.json`.

Project roadmap:

- See `PROJECT_CHECKLIST.md` for the staged completion checklist based on the DPP.
