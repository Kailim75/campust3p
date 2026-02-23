import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, FileWarning, Upload, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContactDocuments } from "@/hooks/useContactDocuments";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

// Required docs per formation type
const COMMON_DOCS = [
  { type: "cni", label: "Carte d'identité" },
  { type: "casier_b3", label: "Extrait casier B3" },
  { type: "certificat_medical", label: "Certificat médical" },
  { type: "photo", label: "Photo d'identité" },
  { type: "attestation_domicile", label: "Justificatif de domicile" },
  { type: "permis_b", label: "Permis B (3 ans min)" },
  { type: "psc1", label: "PSC1" },
  { type: "ants", label: "ANTS" },
];

const VTC_DOCS = [{ type: "justificatif_vtc", label: "Justificatif CPAM VTC" }];
const VMDTR_DOCS = [
  { type: "certificat_medical", label: "Certificat médical ATSU" },
  { type: "autre", label: "Formation ATSU" },
];

const STATUT_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string; badgeClass: string }> = {
  valide: { icon: CheckCircle2, color: "text-success", label: "Validé", badgeClass: "bg-success/15 text-success" },
  recu: { icon: Clock, color: "text-info", label: "Reçu", badgeClass: "bg-info/15 text-info" },
  attendu: { icon: FileWarning, color: "text-muted-foreground", label: "Attendu", badgeClass: "bg-muted text-muted-foreground" },
  refuse: { icon: XCircle, color: "text-destructive", label: "Refusé", badgeClass: "bg-destructive/15 text-destructive" },
};

interface DossierTabProps {
  contactId: string;
  formation: string | null;
}

export function DossierTab({ contactId, formation }: DossierTabProps) {
  const { data: documents = [] } = useContactDocuments(contactId);
  const queryClient = useQueryClient();

  const requiredDocs = useMemo(() => {
    const docs = [...COMMON_DOCS];
    if (formation === "VTC" || formation === "ACC VTC") docs.push(...VTC_DOCS);
    if (formation === "VMDTR") docs.push(...VMDTR_DOCS);
    return docs;
  }, [formation]);

  // Map existing docs by type
  const docsMap = useMemo(() => {
    const map = new Map<string, { statut: string; date?: string; id: string }>();
    documents.forEach((d: any) => {
      // Keep the most recent doc of each type
      if (!map.has(d.type_document) || d.type_document) {
        map.set(d.type_document, {
          statut: d.type_document ? "recu" : "attendu", // simplified - real status from DB
          date: d.created_at,
          id: d.id,
        });
      }
    });
    return map;
  }, [documents]);

  const validated = requiredDocs.filter((d) => docsMap.has(d.type)).length;
  const progressPct = requiredDocs.length > 0 ? Math.round((validated / requiredDocs.length) * 100) : 0;

  const updateDocStatut = useMutation({
    mutationFn: async ({ docId, statut }: { docId: string; statut: string }) => {
      const { error } = await supabase
        .from("contact_documents")
        .update({ commentaires: `Statut: ${statut}` })
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact_documents", contactId] });
      toast.success("Document mis à jour");
    },
  });

  // Mark a missing document as "received" by creating a placeholder entry
  const markAsReceived = useMutation({
    mutationFn: async ({ typeDocument, label }: { typeDocument: string; label: string }) => {
      const { error } = await supabase
        .from("contact_documents")
        .insert({
          contact_id: contactId,
          type_document: typeDocument,
          nom: label,
          file_path: `manual/${typeDocument}_${Date.now()}`,
          commentaires: "Statut: recu — marqué manuellement",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact_documents", contactId] });
      toast.success("Document marqué comme reçu");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  // Send a reminder for a missing document
  const sendRappel = useMutation({
    mutationFn: async ({ typeDocument, label }: { typeDocument: string; label: string }) => {
      const { error } = await supabase
        .from("contact_historique")
        .insert({
          contact_id: contactId,
          type: "rappel",
          titre: `Rappel document : ${label}`,
          contenu: `Rappel envoyé pour le document manquant : ${label} (${typeDocument})`,
          date_echange: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact_historique", contactId] });
      toast.success("Rappel enregistré dans l'historique");
    },
    onError: () => toast.error("Erreur lors de l'envoi du rappel"),
  });

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">
            {validated} / {requiredDocs.length} documents validés
          </p>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              progressPct >= 80 ? "bg-success/15 text-success" : progressPct >= 50 ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive"
            )}
          >
            {progressPct}%
          </Badge>
        </div>
        <Progress value={progressPct} className="h-2" />
      </Card>

      {/* Document checklist */}
      <div className="space-y-2">
        {requiredDocs.map((doc) => {
          const existing = docsMap.get(doc.type);
          const statut = existing ? "recu" : "attendu";
          const config = STATUT_CONFIG[statut];
          const Icon = config.icon;

          return (
            <div
              key={doc.type}
              className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
            >
              <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
              <span className="flex-1 text-sm font-medium text-foreground">{doc.label}</span>
              <Badge variant="outline" className={cn("text-[10px]", config.badgeClass)}>
                {config.label}
              </Badge>
              {existing?.date && (
                <span className="text-[10px] text-muted-foreground">
                  {format(parseISO(existing.date), "dd/MM/yy", { locale: fr })}
                </span>
              )}
              <div className="flex gap-1">
                {statut === "attendu" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] text-success border-success/30"
                      disabled={markAsReceived.isPending}
                      onClick={() => markAsReceived.mutate({ typeDocument: doc.type, label: doc.label })}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {markAsReceived.isPending ? "..." : "Reçu"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px]"
                      disabled={sendRappel.isPending}
                      onClick={() => sendRappel.mutate({ typeDocument: doc.type, label: doc.label })}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      {sendRappel.isPending ? "..." : "Rappel"}
                    </Button>
                  </>
                )}
                {statut === "recu" && existing && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] text-success border-success/30"
                      onClick={() => updateDocStatut.mutate({ docId: existing.id, statut: "valide" })}
                    >
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] text-destructive border-destructive/30"
                      onClick={() => updateDocStatut.mutate({ docId: existing.id, statut: "refuse" })}
                    >
                      Refuser
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
