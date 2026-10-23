import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");

          if (normalizedId.includes("node_modules/firebase/firestore") || normalizedId.includes("node_modules/@firebase/firestore")) {
            return "firebase-firestore";
          }

          if (normalizedId.includes("node_modules/firebase/auth") || normalizedId.includes("node_modules/@firebase/auth")) {
            return "firebase-auth";
          }

          if (normalizedId.includes("node_modules/firebase/app") || normalizedId.includes("node_modules/@firebase/app")) {
            return "firebase-app";
          }

          if (normalizedId.includes("node_modules/firebase") || normalizedId.includes("node_modules/@firebase")) {
            return "firebase-core";
          }

          if (normalizedId.includes("node_modules/leaflet")) {
            return "map";
          }

          if (normalizedId.includes("node_modules/lucide-react")) {
            return "icons";
          }

          if (normalizedId.includes("node_modules/react") || normalizedId.includes("node_modules/react-dom")) {
            return "react";
          }

          if (normalizedId.includes("/src/services/i18n.ts") || normalizedId.includes("/src/services/adminI18n.ts")) {
            return "locale-copy";
          }

          if (normalizedId.includes("/src/data/")) {
            return "tourism-data";
          }

          if (
            normalizedId.includes("/src/services/analytics.ts") ||
            normalizedId.includes("/src/services/dashboard.ts") ||
            normalizedId.includes("/src/services/touristManagement.ts")
          ) {
            return "analysis-core";
          }
        },
      },
    },
  },
});
