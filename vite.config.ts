import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/react/") ||
            id.includes("react-dom") ||
            id.includes("react-router") ||
            id.includes("@tanstack/react-query") ||
            id.includes("scheduler")
          ) {
            return "react-vendor";
          }

          if (id.includes("@supabase/")) {
            return "supabase-vendor";
          }

          if (id.includes("recharts") || id.includes("victory-vendor") || id.includes("d3-")) {
            return "charts-vendor";
          }

          if (id.includes("jspdf")) {
            return "jspdf-vendor";
          }

          if (id.includes("html2canvas")) {
            return "html2canvas-vendor";
          }

          if (
            id.includes("docxtemplater") ||
            id.includes("pizzip") ||
            id.includes("jszip")
          ) {
            return "docx-vendor";
          }

          if (id.includes("xlsx")) {
            return "xlsx-vendor";
          }

          if (id.includes("@hello-pangea/dnd")) {
            return "dnd-vendor";
          }

          if (id.includes("@radix-ui/") || id.includes("cmdk") || id.includes("vaul")) {
            return "ui-vendor";
          }

          if (id.includes("date-fns")) {
            return "date-vendor";
          }
        },
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "robots.txt"],
      selfDestroying: false,
      manifest: {
        name: "T3P Campus CRM",
        short_name: "T3P CRM",
        description: "CRM pour centre de formation Taxi/VTC",
        start_url: "/",
        display: "standalone",
        background_color: "#FFFFFF",
        theme_color: "#1A4E8A",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MiB
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
