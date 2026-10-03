import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { loadLocale, saveLocale } from "./services/i18n";
import { loadLocaleCatalog } from "./services/localeCatalog";

async function startApp() {
  try {
    await loadLocaleCatalog(loadLocale());
  } catch {
    saveLocale("en");
  }
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void startApp();
