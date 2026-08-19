# Tourist Movement Monitoring

Prototype web application for consent-based tourist movement tracking, route visualization, administrator monitoring, and explainable travel recommendation.

The current implementation runs locally with browser storage so the main project flow is usable without Firebase credentials. The data shape is ready to move into Firebase Authentication and Firestore once the Firebase project is created.

Demo accounts:

- Tourist: `tourist@example.com` / `tourist123`
- Tourism Administrator: `admin@tourism.local` / `admin123`

Run locally:

```bash
pnpm install
pnpm run dev
```

Use `pnpm run preview` after a build when you only want to reopen the latest compiled version.

Build check:

```bash
pnpm run build
```
