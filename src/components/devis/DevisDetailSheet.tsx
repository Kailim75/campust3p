import { useState } from "react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { 
  Edit, FileCheck, Send, Check, XCircle, User, Calendar, 
  Phone, Mail, FileText, Download, Eye, Loader2, Printer,
  MessageCircle
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatEuro } from "@/lib/formatFinancial";
import { useDevisDetail, useUpdateDevis, type DevisStatut } from "@/hooks/useDevis";
import { usePublishedTemplate } from "@/hooks/usePublishedTemplate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface DevisDetailSheetProps {
  devisId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (devis: any) => void;
  onConvert: (devisId: string) => void;
}

const statusConfig: Record<DevisStatut, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  envoye: { label: "Envoyé", class: "bg-info/10 text-info" },
  accepte: { label: "Accepté", class: "bg-success/10 text-success" },
  refuse: { label: "Refusé", class: "bg-destructive/10 text-destructive" },
  expire: { label: "Expiré", class: "bg-warning/10 text-warning" },
  converti: { label: "Converti", class: "bg-primary/10 text-primary" },
};

const financementLabels: Record<string, string> = {
  personnel: "Personnel",
  entreprise: "Entreprise",
  cpf: "CPF",
  opco: "OPCO",
};

export function DevisDetailSheet({
  devisId, open, onOpenChange, onEdit, onConvert,
}: DevisDetailSheetProps) {
  const { data: devis, isLoading } = useDevisDetail(devisId);
  const updateDevis = useUpdateDevis();
  const { data: publishedTemplate } = usePublishedTemplate("devis");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleUpdateStatut = async (newStatut: DevisStatut) => {
    if (devisId) {
      await updateDevis.mutateAsync({ id: devisId, statut: newStatut });
    }
  };

  const totaux = devis?.lignes?.reduce(
    (acc, ligne) => ({
      ht: acc.ht + Number(ligne.montant_ht),
      tva: acc.tva + Number(ligne.montant_tva),
      ttc: acc.ttc + Number(ligne.montant_ttc),
    }),
    { ht: 0, tva: 0, ttc: 0 }
  ) || { ht: 0, tva: 0, ttc: 0 };

  // Build variables and render template
  const buildDevisVariables = async () => {
    if (!devis) return {};
    const fmt = (n: number) => Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2 });
    const fmtE = (n: number) => fmt(n) + " €";

    const map: Record<string, string> = {
      date_jour: new Date().toLocaleDateString("fr-FR"),
      numero_devis: devis.numero_devis,
      montant_total: fmtE(Number(devis.montant_total)),
      prix_total: fmtE(Number(devis.montant_total)),
      type_financement: financementLabels[devis.type_financement] || devis.type_financement,
      date_emission: devis.date_emission ? new Date(devis.date_emission).toLocaleDateString("fr-FR") : "",
      date_validite: devis.date_validite ? new Date(devis.date_validite).toLocaleDateString("fr-FR") : "",
      statut_devis: statusConfig[devis.statut]?.label || devis.statut,
      commentaires: devis.commentaires || "",
      modalites_paiement: devis.type_financement === "cpf" ? "Prise en charge CPF" : "Règlement selon échéancier du contrat",
    };

    if (devis.contact) {
      map.nom = devis.contact.nom || "";
      map.prenom = devis.contact.prenom || "";
      map.email = devis.contact.email || "";
      map.telephone = (devis.contact as any).telephone || "";
      // Fetch full contact for address
      const { data: fullContact } = await supabase.from("contacts").select("rue, code_postal, ville, civilite").eq("id", devis.contact.id).maybeSingle();
      if (fullContact) {
        map.civilite = fullContact.civilite || "";
        map.adresse = [fullContact.rue, fullContact.code_postal, fullContact.ville].filter(Boolean).join(", ");
        map.adresse_client = map.adresse;
      }
    }

    // Session data via inscription
    if (devis.session_inscription_id) {
      const { data: inscription } = await supabase
        .from("session_inscriptions")
        .select("session:sessions(nom, date_debut, date_fin, duree_heures, formation_type, horaires, lieu)")
        .eq("id", devis.session_inscription_id)
        .maybeSingle();
      const session = (inscription as any)?.session;
      if (session) {
        map.session_nom = session.nom || "";
        map.intitule_formation = session.nom || session.formation_type || "";
        map.formation_type = session.formation_type || "";
        map.session_date_debut = session.date_debut ? new Date(session.date_debut).toLocaleDateString("fr-FR") : "";
        map.session_date_fin = session.date_fin ? new Date(session.date_fin).toLocaleDateString("fr-FR") : "";
        map.duree_heures = String(session.duree_heures || "");
        map.horaires = session.horaires || "";
        map.lieu = session.lieu || "";
      }
    }

    // Build lignes table + individual line variables
    if (devis.lignes && devis.lignes.length > 0) {
      const totalRemise = devis.lignes.reduce((sum, l) => {
        const brut = l.quantite * Number(l.prix_unitaire_ht);
        const net = Number(l.montant_ht || brut * (1 - (l.remise_percent || 0) / 100));
        return sum + (brut - net);
      }, 0);

      // Single-line variables from first line
      const firstLine = devis.lignes[0];
      map.prix_unitaire_ht = fmt(Number(firstLine.prix_unitaire_ht));
      map.montant_remise = fmt(totalRemise);
      map.montant_total_ht = fmt(totaux.ht);
      map.total_ht = fmtE(totaux.ht);
      map.total_tva = fmtE(totaux.tva);
      map.total_ttc = fmtE(totaux.ttc);
      map.tva_percent = String(firstLine.tva_percent || 0);
      map.remise_percent = String(firstLine.remise_percent || 0);

      // Use first line description as intitule_formation fallback
      if (!map.intitule_formation) {
        map.intitule_formation = firstLine.description || "";
      }

      const rows = devis.lignes.map(l =>
        `<tr><td style="border:1px solid #ddd;padding:6px 10px">${l.description}</td><td style="border:1px solid #ddd;padding:6px 10px;text-align:center">${l.quantite}</td><td style="border:1px solid #ddd;padding:6px 10px;text-align:right">${fmtE(Number(l.prix_unitaire_ht))}</td><td style="border:1px solid #ddd;padding:6px 10px;text-align:center">${l.remise_percent || 0}%</td><td style="border:1px solid #ddd;padding:6px 10px;text-align:right">${fmtE(Number(l.montant_ht || l.quantite * Number(l.prix_unitaire_ht)))}</td></tr>`
      ).join("");
      map.lignes_devis = `<table style="width:100%;border-collapse:collapse;margin:12px 0"><thead><tr style="background:#f8fafc"><th style="border:1px solid #ddd;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Description</th><th style="border:1px solid #ddd;padding:8px 10px;text-align:center;font-size:11px;text-transform:uppercase;color:#64748b">Qté</th><th style="border:1px solid #ddd;padding:8px 10px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748b">P.U. HT</th><th style="border:1px solid #ddd;padding:8px 10px;text-align:center;font-size:11px;text-transform:uppercase;color:#64748b">Remise</th><th style="border:1px solid #ddd;padding:8px 10px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748b">Total HT</th></tr></thead><tbody>${rows}</tbody><tfoot><tr style="background:#f1f5f9;font-weight:bold"><td colspan="4" style="border:1px solid #ddd;padding:8px 10px;text-align:right">Total</td><td style="border:1px solid #ddd;padding:8px 10px;text-align:right">${fmtE(totaux.ht)}</td></tr></tfoot></table>`;
    }

    // Fetch centre info
    const { data: centre } = await supabase.from("centre_formation").select("*").limit(1).maybeSingle();
    if (centre) {
      map.centre_nom = centre.nom_commercial || centre.nom_legal || "";
      map.centre_nom_legal = centre.nom_legal || "";
      map.centre_nom_commercial = centre.nom_commercial || "";
      map.centre_siret = centre.siret || "";
      map.centre_nda = centre.nda || "";
      map.centre_adresse = centre.adresse_complete || "";
      map.centre_email = centre.email || "";
      map.centre_telephone = centre.telephone || "";
      map.centre_iban = centre.iban || "";
      map.centre_bic = centre.bic || "";
      map.centre_forme_juridique = centre.forme_juridique || "";
      map.responsable_nom = centre.responsable_legal_nom || "";
      map.responsable_fonction = centre.responsable_legal_fonction || "";
      map.centre_qualiopi_numero = centre.qualiopi_numero || "";
      map.lieu = centre.adresse_complete?.split(",").pop()?.trim() || "";

      // Parse agrements for taxi/vtc/vmdtr
      if (centre.agrements_autres && Array.isArray(centre.agrements_autres)) {
        const agrements = centre.agrements_autres as Array<{ nom?: string; numero?: string; date_obtention?: string; date_expiration?: string }>;
        for (const ag of agrements) {
          const nom = (ag.nom || "").toLowerCase();
          if (nom.includes("vtc") || nom.includes("taxi")) {
            map.agrement_taxi_vtc = ag.numero || "";
            map.agrement_taxi_vtc_date = ag.date_obtention ? new Date(ag.date_obtention).toLocaleDateString("fr-FR") : "";
            map.agrement_taxi_vtc_expiration = ag.date_expiration ? new Date(ag.date_expiration).toLocaleDateString("fr-FR") : "";
          }
          if (nom.includes("vmdtr")) {
            map.agrement_vmdtr = ag.numero || "";
            map.agrement_vmdtr_date = ag.date_obtention ? new Date(ag.date_obtention).toLocaleDateString("fr-FR") : "";
            map.agrement_vmdtr_expiration = ag.date_expiration ? new Date(ag.date_expiration).toLocaleDateString("fr-FR") : "";
          }
        }
      }
    }

    return map;
  };

  const renderDevisTemplate = async (): Promise<string | null> => {
    if (!publishedTemplate) {
      toast.error("Aucun template devis publié dans le Template Studio");
      return null;
    }
    const variables = await buildDevisVariables();
    const rendered = publishedTemplate.template_body.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      if (varName in variables) return variables[varName];
      return "";
    });
    return DOMPurify.sanitize(rendered, { ADD_ATTR: ["style"], ADD_TAGS: ["mark"] });
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const html = await renderDevisTemplate();
      if (html) setPreviewHtml(html);
    } catch (e: any) {
      toast.error("Erreur lors de la prévisualisation");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handlePrint = async () => {
    setIsPreviewing(true);
    try {
      const html = await renderDevisTemplate();
      if (!html) return;
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Devis ${devis?.numero_devis}</title><style>@page{margin:15mm 20mm;size:A4}body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.5;color:#000;max-width:800px;margin:0 auto;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px 8px}th{background:#f5f5f5;font-weight:bold}@media print{body{padding:0}}</style></head><body>${html}<script>setTimeout(()=>{window.print()},300)</script></body></html>`);
      printWindow.document.close();
    } catch (e) {
      toast.error("Erreur lors de l'impression");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownloadHtml = async () => {
    setIsPreviewing(true);
    try {
      const html = await renderDevisTemplate();
      if (!html) return;
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Devis ${devis?.numero_devis}</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px 8px}th{background:#f5f5f5}</style></head><body>${html}</body></html>`;
      const blob = new Blob([fullHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${devis?.numero_devis || "Devis"}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Devis téléchargé");
    } catch (e) {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setIsPreviewing(false);
    }
  };

  const generateDevisPdfBase64 = async (): Promise<string | null> => {
    const html = await renderDevisTemplate();
    if (!html) return null;

    // Create an off-screen container to render the HTML
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;padding:40px;background:#fff;font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;color:#000";
    container.innerHTML = html;
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yOffset = 10;
      let remainingHeight = imgHeight;
      let sourceY = 0;

      while (remainingHeight > 0) {
        if (yOffset !== 10) pdf.addPage();
        const pageImgHeight = Math.min(remainingHeight, pdfHeight - 20);
        // Draw portion of the image
        pdf.addImage(imgData, "JPEG", 10, yOffset, imgWidth, imgHeight, undefined, "FAST", 0);
        if (remainingHeight > pdfHeight - 20) {
          // For multi-page, we shift content - simplified: just clip
          remainingHeight -= (pdfHeight - 20);
          sourceY += (pdfHeight - 20);
        } else {
          remainingHeight = 0;
        }
      }

      const pdfBlob = pdf.output("arraybuffer");
      const base64 = btoa(
        new Uint8Array(pdfBlob).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      return base64;
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleSendEmail = async () => {
    if (!devis?.contact?.email) {
      toast.error("Ce contact n'a pas d'adresse email");
      return;
    }
    setIsSending(true);
    try {
      toast.info("Génération du PDF en cours...");
      const pdfBase64 = await generateDevisPdfBase64();
      if (!pdfBase64) return;

      const emailBody = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <p>Bonjour ${devis.contact.prenom || ""} ${devis.contact.nom || ""},</p>
          <p>Veuillez trouver ci-joint votre devis <strong>${devis.numero_devis}</strong> d'un montant de <strong>${Number(devis.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong>.</p>
          <p>Ce devis est valable jusqu'au ${devis.date_validite ? new Date(devis.date_validite).toLocaleDateString("fr-FR") : "—"}.</p>
          <p>N'hésitez pas à nous contacter pour toute question.</p>
          <p>Cordialement,<br/>L'équipe École T3P</p>
        </div>
      `;

      const { error } = await supabase.functions.invoke("send-automated-emails", {
        body: {
          type: "direct_email",
          to: devis.contact.email,
          subject: `Votre devis ${devis.numero_devis}`,
          html: emailBody,
          contact_id: devis.contact.id,
          attachments: [
            {
              filename: `${devis.numero_devis}.pdf`,
              content: pdfBase64,
              type: "application/pdf",
            },
          ],
        },
      });

      if (error) throw error;
      toast.success(`Devis envoyé en PDF par email à ${devis.contact.email}`);
      if (devis.statut === "brouillon") {
        await updateDevis.mutateAsync({ id: devis.id, statut: "envoye" });
      }
    } catch (e: any) {
      toast.error("Erreur lors de l'envoi par email");
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendWhatsApp = () => {
    const phone = (devis?.contact as any)?.telephone;
    if (!phone) {
      toast.error("Ce contact n'a pas de numéro de téléphone");
      return;
    }
    // Clean phone number
    const cleanPhone = phone.replace(/[\s\-\.]/g, "").replace(/^0/, "33");
    const message = encodeURIComponent(
      `Bonjour ${devis?.contact?.prenom || ""} ${devis?.contact?.nom || ""},\n\nVeuillez trouver votre devis ${devis?.numero_devis} d'un montant de ${Number(devis?.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €.\n\nCe devis est valable jusqu'au ${devis?.date_validite ? new Date(devis.date_validite).toLocaleDateString("fr-FR") : "—"}.\n\nCordialement,\nÉcole T3P`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
    toast.success("Redirection vers WhatsApp...");
    // Auto-mark as sent if still draft
    if (devis?.statut === "brouillon" && devisId) {
      updateDevis.mutateAsync({ id: devisId, statut: "envoye" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !devis ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            Devis non trouvé
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-xl font-display">
                    {devis.numero_devis}
                  </SheetTitle>
                  <SheetDescription>
                    Créé le {format(new Date(devis.created_at), "dd MMMM yyyy", { locale: fr })}
                  </SheetDescription>
                </div>
                <Badge className={cn("text-sm", statusConfig[devis.statut]?.class)}>
                  {statusConfig[devis.statut]?.label}
                </Badge>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Actions */}
              {devis.statut !== "converti" && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(devis)}>
                    <Edit className="h-4 w-4 mr-2" /> Modifier
                  </Button>

                  {devis.statut === "brouillon" && (
                    <Button variant="outline" size="sm" onClick={() => handleUpdateStatut("envoye")}>
                      <Send className="h-4 w-4 mr-2" /> Marquer envoyé
                    </Button>
                  )}

                  {devis.statut === "envoye" && (
                    <>
                      <Button variant="outline" size="sm" className="text-success" onClick={() => handleUpdateStatut("accepte")}>
                        <Check className="h-4 w-4 mr-2" /> Accepté
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleUpdateStatut("refuse")}>
                        <XCircle className="h-4 w-4 mr-2" /> Refusé
                      </Button>
                    </>
                  )}

                  {devis.statut === "accepte" && (
                    <Button size="sm" onClick={() => onConvert(devis.id)}>
                      <FileCheck className="h-4 w-4 mr-2" /> Convertir en facture
                    </Button>
                  )}
                </div>
              )}

              {/* Document Generation Actions */}
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                <p className="w-full text-xs text-muted-foreground font-medium mb-1">📄 Génération document</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={isPreviewing || !publishedTemplate}
                  className="gap-1.5"
                >
                  {isPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                  Aperçu
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  disabled={isPreviewing || !publishedTemplate}
                  className="gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimer / PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadHtml}
                  disabled={isPreviewing || !publishedTemplate}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={isSending}
                      className="gap-1.5"
                    >
                      {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Envoyer
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleSendEmail} disabled={!devis?.contact?.email}>
                      <Mail className="h-4 w-4 mr-2" />
                      Envoyer par email
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSendWhatsApp} disabled={!(devis?.contact as any)?.telephone}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Envoyer par WhatsApp
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {!publishedTemplate && (
                  <p className="w-full text-xs text-muted-foreground mt-1">
                    ⚠️ Publiez un template de type "Devis" dans le Template Studio pour activer la génération.
                  </p>
                )}
              </div>

              {/* Preview area */}
              {previewHtml && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                    <span className="text-xs font-medium text-muted-foreground">Aperçu du devis</span>
                    <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)} className="h-6 text-xs">
                      Fermer
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[400px]">
                    <div
                      className="p-6 bg-background prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </ScrollArea>
                </div>
              )}

              {devis.facture_id && (
                <div className="p-3 bg-primary/10 rounded-lg flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm">Ce devis a été converti en facture</span>
                </div>
              )}

              <Separator />

              {/* Client */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" /> Client
                </h3>
                {devis.contact ? (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="font-medium">{devis.contact.prenom} {devis.contact.nom}</p>
                    {devis.contact.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-3 w-3" /> {devis.contact.email}
                      </p>
                    )}
                    {(devis.contact as any).telephone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3" /> {(devis.contact as any).telephone}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Client non trouvé</p>
                )}
              </div>

              {/* Infos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Financement</p>
                  <p className="font-medium">{financementLabels[devis.type_financement]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Validité</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {devis.date_validite ? format(new Date(devis.date_validite), "dd/MM/yyyy") : "—"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Lignes */}
              <div>
                <h3 className="font-semibold mb-3">Détail du devis</h3>
                {devis.lignes && devis.lignes.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qté</TableHead>
                        <TableHead className="text-right">P.U. HT</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devis.lignes.map((ligne) => (
                        <TableRow key={ligne.id}>
                          <TableCell>{ligne.description}</TableCell>
                          <TableCell className="text-right">{ligne.quantite}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatEuro(Number(ligne.prix_unitaire_ht))}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatEuro(Number(ligne.montant_ht || ligne.quantite * Number(ligne.prix_unitaire_ht)))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">Aucune ligne</p>
                )}

                {/* Totaux */}
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary font-mono">{formatEuro(totaux.ht)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">TVA non applicable — art. 293 B du CGI</p>
                  </div>
                </div>
              </div>

              {/* Commentaires */}
              {devis.commentaires && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Commentaires</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {devis.commentaires}
                    </p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}