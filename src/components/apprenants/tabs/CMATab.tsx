import { useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckCircle2, Circle, Upload, Send, Mail, FileText, Clock, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useContactDocuments } from "@/hooks/useContactDocuments";
import { useContactHistorique } from "@/hooks/useContactHistorique";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { CMA_PIECES, CMA_DOC_LABELS } from "@/lib/cma-constants";
import { createAutoNote, deleteAutoNote } from "@/lib/aujourdhui-actions";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import { useEmailComposer } from "@/hooks/useEmailComposer";

interface CMATabProps {
  contactId: string;
  contactPrenom: string;
  contactEmail: string | null;
  formation: string | null;
}

export function CMATab({ contactId, contactPrenom, contactEmail, formation }: CMATabProps) {
  const { data: documents = [], isLoading } = useContactDocuments(contactId);
  const { data: historique = [] } = useContactHistorique(contactId);
  const queryClient = useQueryClient();
  const { composerProps, openComposer } = useEmailComposer();

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
  const totalPieces = pieces.length;
  const progressPct = Math.round((receivedCount / totalPieces) * 100);
  const missingPieces = pieces.filter(p => !p.received);

  // Last CMA relance from [AUTO] notes
  const lastRelance = useMemo(() => {
    const cmaAutoNotes = historique
      .filter((h: any) => h.titre?.startsWith("[AUTO]") && h.titre?.includes("CMA"))
      .sort((a: any, b: any) => new Date(b.date_echange).getTime() - new Date(a.date_echange).getTime());
    return cmaAutoNotes[0] || null;
  }, [historique]);

  const alreadyRelancedToday = lastRelance && isToday(new Date(lastRelance.date_echange));

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["contact-documents", contactId] });
    queryClient.invalidateQueries({ queryKey: ["contact-historique", contactId] });
    queryClient.invalidateQueries({ queryKey: ["aujourdhui-inbox"] });
  }, [queryClient, contactId]);

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
      invalidate();
      toast.success("Document marqué comme reçu");
    },
  });

  // Action handlers with auto-note
  const handleRelanceDocs = async () => {
    const missingList = missingPieces.map(p => CMA_DOC_LABELS[p.type] || p.label).join(", ");
    openComposer({
      recipients: [{ id: contactId, email: contactEmail || "", prenom: contactPrenom, nom: "" }],
      defaultSubject: `Documents CMA manquants — ${contactPrenom}`,
      defaultBody: `Bonjour ${contactPrenom},\n\nPour compléter votre dossier CMA, il nous manque les documents suivants :\n\n${missingPieces.map(p => `- ${p.label}`).join('\n')}\n\nMerci de nous les transmettre dans les meilleurs délais.\n\nCordialement,\nT3P Campus`,
      autoNoteCategory: "cma_relance_docs",
      autoNoteExtra: `Docs manquants: ${missingList}`,
      onSuccess: invalidate,
    });
  };

  const handleRelanceCMA = async () => {
    openComposer({
      recipients: [{ id: contactId, email: contactEmail || "", prenom: contactPrenom, nom: "" }],
      defaultSubject: `Relance dossier CMA — ${contactPrenom}`,
      defaultBody: `Bonjour ${contactPrenom},\n\nNous revenons vers vous concernant votre dossier CMA. Il manque encore ${missingPieces.length} document(s).\n\nMerci de les transmettre rapidement.\n\nCordialement,\nT3P Campus`,
      autoNoteCategory: "cma_relance",
      autoNoteExtra: `${missingPieces.length} pièce(s) manquante(s)`,
      onSuccess: invalidate,
    });
  };

  if (isLoading) return <Skeleton className="h-[300px] rounded-xl" />;

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Dossier CMA</p>
            <p className="text-xs text-muted-foreground">
              {receivedCount}/{totalPieces} pièces reçues
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

      {/* Last relance info */}
      {lastRelance && (
        <div className="flex items-center gap-2 px-1">
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Dernière relance : {format(new Date(lastRelance.date_echange), "dd/MM à HH:mm", { locale: fr })}
          </span>
          {alreadyRelancedToday && (
            <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/20">
              Déjà relancé aujourd'hui
            </Badge>
          )}
        </div>
      )}

      {/* Quick actions */}
      {missingPieces.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {contactEmail && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={!!alreadyRelancedToday}
                      onClick={handleRelanceDocs}
                    >
                      <Mail className="h-3 w-3 mr-1" /> Relance docs ({missingPieces.length})
                    </Button>
                  </span>
                </TooltipTrigger>
                {alreadyRelancedToday && (
                  <TooltipContent>
                    <p>Déjà relancé aujourd'hui</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          {contactEmail && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={!!alreadyRelancedToday}
                      onClick={handleRelanceCMA}
                    >
                      <Send className="h-3 w-3 mr-1" /> Relance CMA
                    </Button>
                  </span>
                </TooltipTrigger>
                {alreadyRelancedToday && (
                  <TooltipContent>
                    <p>Déjà relancé aujourd'hui</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* Missing docs chips */}
      {missingPieces.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          <span className="text-xs text-muted-foreground mr-1">Manquants :</span>
          {missingPieces.map(p => (
            <Badge key={p.type} variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
              ✗ {CMA_DOC_LABELS[p.type] || p.label}
            </Badge>
          ))}
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
          Le statut CMA est déterminé automatiquement par la complétude des {totalPieces} pièces obligatoires.
          {progressPct === 100 
            ? " Le dossier est complet et prêt pour soumission."
            : ` Il manque ${missingPieces.length} pièce(s) obligatoire(s).`
          }
        </p>
      </Card>
      <EmailComposerModal {...composerProps} />
    </div>
  );
}
