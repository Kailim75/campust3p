// Chargeur pdf.js partagé — version bundlée (pdfjs-dist, cf. package.json),
// chargée paresseusement (import dynamique, même motif que le `await
// import("xlsx")` de SettingsPage.tsx) pour ne payer son coût qu'à l'usage
// réel d'un PDF. Remplace l'ancien chargement à l'exécution depuis
// cdnjs.cloudflare.com (pdf.js 3.11.174 via une balise <script>, exposé en
// global window.pdfjsLib) : dépendance à un tiers non versionnée avec le
// reste du code, non soumise à Content-Security-Policy, et désynchronisée de
// la version pdfjs-dist déjà utilisée ailleurs dans le repo (parseBankPdf.ts).
// Un seul chargeur pour tout le front (pdf-viewer.tsx et documentSigne.ts
// l'importent tous deux).
//
// NB : l'import du module pdfjs-dist lui-même est différé (dynamic import)
// plutôt que statique en tête de fichier : son évaluation référence des API
// navigateur (DOMMatrix) absentes de jsdom, ce qui casserait au chargement
// tout test qui importe transitivement ce module, même sans jamais rendre
// de PDF.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"; // Vite résout en URL (types génériques `*?url` de vite/client)
import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfSource = string | { data: ArrayBuffer | Uint8Array };

let pdfjsLibPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function importPdfjsLib() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjsLib;
}

/**
 * Charge un document PDF via pdf.js (import du module mis en cache après le
 * premier appel).
 */
export async function getPdfDocument(src: PdfSource): Promise<PDFDocumentProxy> {
  if (!pdfjsLibPromise) pdfjsLibPromise = importPdfjsLib();
  const pdfjsLib = await pdfjsLibPromise;
  const params = typeof src === "string" ? { url: src } : src;
  return pdfjsLib.getDocument(params).promise;
}
