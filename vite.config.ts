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
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      selfDestroying: false,
      manifest: {
        name: "T3P Campus CRM",
        short_name: "T3P CRM",
        description: "CRM pour centre de formation Taxi/VTC",
        start_url: "/",
        display: "standalone",
        background_color: "#FFFFFF",
        theme_color: "#1E462D",
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
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/, /^\/signature/],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => request.mode === "navigate" && url.pathname.startsWith("/signature"),
            handler: "NetworkOnly",
            options: {
              cacheName: "signature-network-only",
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes("SignaturePage-") && url.pathname.endsWith(".js"),
            handler: "NetworkOnly",
            options: {
              cacheName: "signature-chunk-network-only",
            },
          },
          {
            // Ne jamais intercepter l'authentification ni les écritures :
            // seuls les GET de données passent par le cache (NetworkFirst).
            urlPattern: ({ url, request }) =>
              /\.supabase\.co$/i.test(url.hostname) &&
              request.method === "GET" &&
              !url.pathname.startsWith("/auth/"),

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
  build: {
    rollupOptions: {
      output: {
        // Forme fonction (audit 13/08/2026, perf P1) : avec la forme objet,
        // Rollup logeait le helper de préchargement de Vite dans « pdf-vendor »,
        // ce qui forçait le chunk d'entrée à importer statiquement jsPDF /
        // html2canvas / docxtemplater (≈ 1 Mo) et recharts (≈ 400 Ko) au
        // démarrage, alors qu'aucun n'est utile au premier écran. Le helper vit
        // désormais dans react-vendor, chargé au boot de toute façon.
        // Vérification après build : dist/index.html ne doit précharger ni
        // pdf-vendor ni charts-vendor (voir docs/audit/RAPPORT_AUDIT.md §3.5).
        manualChunks(id) {
          if (id.includes("vite/preload-helper")) return "react-vendor";
          if (!id.includes("node_modules")) return undefined;
          const is = (re: RegExp) => re.test(id);
          // Petits helpers partagés par l'entrée ET des vendors lourds (clsx est
          // utilisé par cn() partout, par recharts et par le drag-and-drop) : les
          // fixer ici évite que Rollup les range dans un gros chunk et rende
          // celui-ci eager par ricochet.
          if (is(/[\\/]node_modules[\\/](clsx|tailwind-merge|class-variance-authority|react-is|tiny-invariant|prop-types|@babel[\\/]runtime)[\\/]/)) return "react-vendor";
          if (is(/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/)) return "react-vendor";
          if (is(/[\\/]node_modules[\\/]@radix-ui[\\/]/)) return "radix-vendor";
          if (is(/[\\/]node_modules[\\/](recharts|recharts-scale|react-smooth|victory-vendor|d3-[a-z-]+)[\\/]/)) return "charts-vendor";
          if (is(/[\\/]node_modules[\\/](jspdf|html2canvas|docxtemplater|pizzip|jszip)[\\/]/)) return "pdf-vendor";
          if (is(/[\\/]node_modules[\\/]xlsx[\\/]/)) return "xlsx-vendor";
          if (is(/[\\/]node_modules[\\/]@supabase[\\/]/)) return "supabase-vendor";
          if (is(/[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/)) return "form-vendor";
          if (is(/[\\/]node_modules[\\/]framer-motion[\\/]/)) return "animation-vendor";
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
