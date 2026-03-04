import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, Circle, XCircle, Upload, Send, Mail, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useContactDocuments } from "@/hooks/useContactDocuments";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

// CMA required documents
const CMA_PIECES = [
  { type: "cni", label: "Pièce d'identité (recto/verso)" },
  { type: "permis_b", label: "Permis de conduire (recto/verso)" },
  { type: "attestation_domicile", label: "Justificatif de domicile < 3 mois" },
  { type: "photo", label: "Photo d'identité" },
];

interface CMATabProps {
  contactId: string;
  contactPrenom: string;
  contactEmail: string | null;
  formation: string | null;
}

export function CMATab({ contactId, contactPrenom, contactEmail, formation }: CMATabProps) {
  const { data: documents = [], isLoading } = useContactDocuments(contactId);
  const queryClient = useQueryClient();

  const docsMap = useMemo(() => {
    const map = new Map<string, { id: string; date: string; commentaires: string | null }>();
    documents.forEach((d: any) => {
      if (!map.has(d.type_document)) {
        map.set(d.type_document, { id: d.id, date: d.created_at, commentaires: d.commentaires });
      }
    });
    return map;
  }, [documents]);

  const pieces = CMA_PIECES.map(p => ({
    ...p,
    received: docsMap.has(p.type),
    doc: docsMap.get(p.type),
  }));

  const receivedCount = pieces.filter(p => p.received).length;
  const progressPct = Math.round((receivedCount / pieces.length) * 100);
  const missingPieces = pieces.filter(p => !p.received);

  // Mark doc as received (create placeholder)
  const markReceived = useMutation({
    mutationFn: async ({ type, label }: { type: string; label: string }) => {
      const { error } = await supabase.from("contact_documents").insert({
        contact_id: contactId,
        type_document: type,
        nom: label,
        file_path: `cma/${type}_${Date.now()}`,
        commentaires: "Reçu — marqué manuellement (CMA)",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-documents", contactId] });
      toast.success("Document marqué comme reçu");
    },
  });

  // Build email body for missing docs
  const missingDocsEmailBody = missingPieces.map(p => `- ${p.label}`).join('%0A');
  const emailHref = `mailto:${contactEmail || ''}?subject=Documents CMA manquants — ${contactPrenom}&body=Bonjour ${contactPrenom},%0A%0APour compléter votre dossier CMA, il nous manque les documents suivants :%0A%0A${missingDocsEmailBody}%0A%0AMerci de nous les transmettre dans les meilleurs délais.%0A%0ACordialement,%0AT3P Campus`;

  if (isLoading) return <Skeleton className="h-[300px] rounded-xl" />;

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Dossier CMA</p>
            <p className="text-xs text-muted-foreground">
              {receivedCount}/{pieces.length} pièces reçues
            </p>
          </div>
          <Badge variant="outline" className={cn(
            "text-xs",
            progressPct === 100 ? "bg-success/15 text-success" :
            progressPct >= 50 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
          )}>
            {progressPct === 100 ? "Complet" : `${progressPct}%`}
          </Badge>
        </div>
        <Progress value={progressPct} className="h-2" />
      </Card>

      {/* Quick actions */}
      {missingPieces.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {contactEmail && (
            <Button size="sm" variant="outline" className="text-xs" asChild>
              <a href={emailHref}>
                <Mail className="h-3 w-3 mr-1" /> Email docs manquants
              </a>
            </Button>
          )}
          {contactEmail && (
            <Button size="sm" variant="outline" className="text-xs" asChild>
              <a href={`mailto:${contactEmail}?subject=Relance dossier CMA — ${contactPrenom}&body=Bonjour ${contactPrenom},%0A%0ANous revenons vers vous concernant votre dossier CMA. Il manque encore ${missingPieces.length} document(s).%0A%0AMerci de les transmettre rapidement.%0A%0ACordialement,%0AT3P Campus`}>
                <Send className="h-3 w-3 mr-1" /> Relance CMA
              </a>
            </Button>
          )}
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-2">
        {pieces.map((piece) => (
          <div
            key={piece.type}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border bg-card transition-colors",
              piece.received ? "border-success/20" : "border-border hover:bg-muted/30"
            )}
          >
            {piece.received ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", piece.received ? "text-foreground" : "text-muted-foreground")}>
                {piece.label}
              </p>
              {piece.doc?.date && (
                <p className="text-[10px] text-muted-foreground">
                  Reçu le {format(parseISO(piece.doc.date), "dd/MM/yyyy", { locale: fr })}
                </p>
              )}
            </div>
            {piece.received ? (
              <Badge variant="outline" className="text-[10px] bg-success/15 text-success">Reçu</Badge>
            ) : (
              <div className="flex gap-1">
                <Button
                  size="sm" variant="outline"
                  className="h-7 text-[10px] text-success border-success/30"
                  disabled={markReceived.isPending}
                  onClick={() => markReceived.mutate({ type: piece.type, label: piece.label })}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Reçu
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CMA status info */}
      <Card className="p-4 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <FileText className="h-3 w-3 inline mr-1" />
          Le statut CMA est déterminé automatiquement par la complétude des pièces obligatoires.
          {progressPct === 100 
            ? " Le dossier est complet et prêt pour soumission."
            : ` Il manque ${missingPieces.length} pièce(s) obligatoire(s).`
          }
        </p>
      </Card>
    </div>
  );
}
