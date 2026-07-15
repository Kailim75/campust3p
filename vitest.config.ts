import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Permet de charger le générateur PDF des edge functions (Deno) dans
      // les tests golden : le spécificateur npm: de Deno pointe vers le
      // paquet npm installé localement.
      "npm:jspdf@2.5.2": "jspdf",
    },
  },
});
