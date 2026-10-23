import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { loadLocale, saveLocale } from "./services/i18n";
import { loadLocaleCatalog } from "./services/localeCatalog";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { installModuleRecovery, withStartupTimeout } from "./services/screenRecovery";
import { recoveryCopy } from "./services/recoveryCopy";

installModuleRecovery();
const App = React.lazy(() => import("./App"));

async function startApp() {
  try {
    await withStartupTimeout(loadLocaleCatalog(loadLocale()));
  } catch {
    saveLocale("en");
  }
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <React.Suspense fallback={<main className="app-recovery" role="status">{recoveryCopy(loadLocale()).loading}</main>}>
          <App />
        </React.Suspense>
      </AppErrorBoundary>
    </React.StrictMode>
  );
}

void startApp();
