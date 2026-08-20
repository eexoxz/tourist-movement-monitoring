# Tourist Movement Monitoring

Prototype web application for consent-based tourist movement tracking, route visualization, administrator monitoring, and explainable travel recommendation.

The current implementation runs locally with browser storage so the main project flow is usable without Firebase credentials. The data shape is ready to move into Firebase Authentication and Firestore once the Firebase project is created.

Demo accounts:

- Tourist: `tourist@example.com` / `tourist123`
- Nature tourist: `nature@example.com` / `nature123`
- Tourism Administrator: `admin@tourism.local` / `admin123`

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

Project roadmap:

- See `PROJECT_CHECKLIST.md` for the staged completion checklist based on the DPP.
