import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Compose un PDF « document signé » : le document RÉELLEMENT signé (rendu tel
 * quel, jamais régénéré — intégrité légale) avec l'image de signature incrustée
 * sur la dernière page. Aucune dépendance nouvelle : rendu via pdf.js (le même
 * chargeur CDN que le visualiseur existant), réassemblage via jsPDF.
 *
 * NB : le PDF produit est « aplati » (pages rendues en image) — c'est le prix à
 * payer sans lib d'édition PDF, et c'est acceptable pour une pièce à archiver.
 */

// Chargeur pdf.js identique à celui de components/ui/pdf-viewer.tsx (même version
// CDN, même global window.pdfjsLib → pas de double chargement).
function loadPdfJs(): Promise<any> {
  const w = window as unknown as { pdfjsLib?: any };
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as unknown as { pdfjsLib: any }).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error("Chargement de pdf.js impossible"));
    document.head.appendChild(script);
  });
}

function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Chargement de l'image de signature impossible"));
    img.src = src;
  });
}

/** Légende d'incrustation. PURE (testable). */
export function legendeSignature(nomComplet: string | null | undefined, dateISO: string | null | undefined): string {
  const nom = (nomComplet || "").trim() || "le signataire";
  let quand = "";
  if (dateISO) {
    const d = new Date(dateISO);
    if (!isNaN(d.getTime())) quand = ` le ${format(d, "d MMMM yyyy 'à' HH:mm", { locale: fr })}`;
  }
  return `Signé électroniquement par ${nom}${quand}`;
}

/** Incruste la signature + la légende en bas à droite d'un canvas de page. */
function incrusterSignature(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  legende: string,
): void {
  const W = canvas.width;
  const H = canvas.height;
  // Zone en bas à droite (là où se trouve « Nom et signature du stagiaire »).
  const zoneW = W * 0.42;
  const zoneX = W - zoneW - W * 0.06;
  const zoneBas = H * 0.94;

  // Cartouche léger.
  const padding = W * 0.012;
  const imgMaxH = H * 0.075;
  const ratio = img.width && img.height ? img.width / img.height : 3;
  let imgH = imgMaxH;
  let imgW = imgH * ratio;
  if (imgW > zoneW) {
    imgW = zoneW;
    imgH = imgW / ratio;
  }
  const imgY = zoneBas - imgH;
  const imgX = zoneX + (zoneW - imgW) / 2;

  const font = Math.round(W * 0.011);
  ctx.save();
  // Fond blanc semi-opaque pour lisibilité par-dessus le fond du PDF.
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(zoneX - padding, imgY - font * 2 - padding, zoneW + padding * 2, imgH + font * 2 + padding * 2);
  // Signature.
  ctx.drawImage(img, imgX, imgY, imgW, imgH);
  // Légende.
  ctx.fillStyle = "#334155";
  ctx.font = `${font}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(legende, zoneX + zoneW / 2, imgY - font * 0.6, zoneW);
  ctx.restore();
}

/**
 * @param docPdf   octets du PDF réellement signé (document_storage_path)
 * @param signatureDataUrl  image de signature (data: ou URL signée)
 * @param legende  texte d'incrustation (voir legendeSignature)
 * @returns Blob du PDF fusionné
 */
export async function composerPdfSigne(
  docPdf: ArrayBuffer,
  signatureDataUrl: string,
  legende: string,
): Promise<Blob> {
  const pdfjsLib = await loadPdfJs();
  const img = await chargerImage(signatureDataUrl);
  const pdf = await pdfjsLib.getDocument({ data: docPdf }).promise;
  const nbPages: number = pdf.numPages;
  const RENDER = 2; // sur-échantillonnage pour une image nette à l'impression

  let out: jsPDF | null = null;
  for (let i = 1; i <= nbPages; i++) {
    const page = await pdf.getPage(i);
    const vpPt = page.getViewport({ scale: 1 }); // dimensions en points PDF
    const vp = page.getViewport({ scale: RENDER });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponible");
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    if (i === nbPages) incrusterSignature(ctx, canvas, img, legende);

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const wPt = vpPt.width;
    const hPt = vpPt.height;
    const orientation = wPt > hPt ? "landscape" : "portrait";
    if (!out) {
      out = new jsPDF({ unit: "pt", format: [wPt, hPt], orientation });
    } else {
      out.addPage([wPt, hPt], orientation);
    }
    out.addImage(imgData, "JPEG", 0, 0, wPt, hPt);
  }

  if (!out) throw new Error("Document vide");
  return out.output("blob");
}
