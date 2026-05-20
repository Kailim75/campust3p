import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShieldCheck, FileCode2, Send, Download, History } from "lucide-react";
import { usePdpTransmissions, type PdpTransmission } from "@/hooks/usePdpTransmissions";
import { useEInvoicingSettings } from "@/hooks/useEInvoicingSettings";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  factureId: string;
  factureStatut: string;
  facturxGeneratedAt: string | null;
  einvoiceStatus: string | null;
  numeroFacture: string;
}

const statutLabels: Record<PdpTransmission["statut"], { label: string; cls: string }> = {
  en_attente: { label: "En attente", cls: "bg-muted text-muted-foreground" },
  envoye: { label: "Envoyé", cls: "bg-info/10 text-info" },
  accepte: { label: "Accepté", cls: "bg-success/10 text-success" },
  rejete: { label: "Rejeté", cls: "bg-destructive/10 text-destructive" },
  erreur: { label: "Erreur", cls: "bg-destructive/10 text-destructive" },
};

/**
 * Sprint 8 — Bloc "Facturation électronique 2026/2027" dans la fiche facture.
 * Permet de générer le XML Factur-X et de transmettre la facture vers la PDP
 * choisie au niveau du centre. La transmission réelle est simulée tant que les
 * credentials PDP ne sont pas configurés.
 */
export function PdpTransmissionPanel({
  factureId,
  factureStatut,
  facturxGeneratedAt,
  einvoiceStatus,
  numeroFacture,
}: Props) {
  const { settings } = useEInvoicingSettings();
  const { data: transmissions = [], generateFacturX, submitPdp, isLoading } =
    usePdpTransmissions(factureId);
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);

  const pdpChoisie = settings.einv_pdp_choice && settings.einv_pdp_choice !== "non_choisie";
  const isDraft = factureStatut === "brouillon";

  const handleGenerate = async () => {
    const res = await generateFacturX.mutateAsync(factureId);
    setXmlPreview(res.xml);
  };

  const handleDownloadXml = () => {
    if (!xmlPreview) return;
    const blob = new Blob([xmlPreview], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facturx_${numeroFacture}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = () => {
    submitPdp.mutate({ id: factureId, pdp_target: settings.einv_pdp_choice });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Facturation électronique 2026/2027</h4>
        {einvoiceStatus && (
          <Badge variant="outline" className="ml-auto text-[10px] uppercase">
            {einvoiceStatus}
          </Badge>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          PDP cible :{" "}
          <span className="font-medium text-foreground">
            {pdpChoisie ? settings.einv_pdp_choice : "Non choisie"}
          </span>
          {!pdpChoisie && (
            <span className="text-warning"> — configurez-la dans Paramètres → Financier.</span>
          )}
        </p>
        <p>
          Factur-X :{" "}
          {facturxGeneratedAt ? (
            <span className="text-success">
              généré le {format(new Date(facturxGeneratedAt), "dd/MM/yyyy HH:mm", { locale: fr })}
            </span>
          ) : (
            <span className="text-muted-foreground">non généré</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="justify-start"
          onClick={handleGenerate}
          disabled={isDraft || generateFacturX.isPending}
        >
          {generateFacturX.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileCode2 className="h-4 w-4 mr-2 text-primary" />
          )}
          Générer le XML Factur-X
        </Button>

        {xmlPreview && (
          <Button variant="ghost" size="sm" className="justify-start" onClick={handleDownloadXml}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger le XML
          </Button>
        )}

        <Button
          variant="default"
          size="sm"
          className="justify-start"
          onClick={handleSubmit}
          disabled={isDraft || !pdpChoisie || submitPdp.isPending}
        >
          {submitPdp.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Transmettre via la PDP
        </Button>

        {isDraft && (
          <p className="text-[11px] text-muted-foreground">
            Émettez d'abord la facture pour activer la transmission.
          </p>
        )}
      </div>

      {transmissions.length > 0 && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Historique des transmissions
            </div>
            <ul className="space-y-1.5">
              {transmissions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between text-xs rounded-md border border-border/50 px-2 py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge className={statutLabels[t.statut]?.cls ?? ""}>
                      {statutLabels[t.statut]?.label ?? t.statut}
                    </Badge>
                    <span className="truncate text-muted-foreground">
                      {t.pdp_target}
                      {t.pdp_reference ? ` · ${t.pdp_reference}` : ""}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {format(new Date(t.created_at), "dd/MM HH:mm", { locale: fr })}
                  </span>
                </li>
              ))}
            </ul>
            {isLoading && (
              <p className="text-[11px] text-muted-foreground">Chargement…</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
