import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, Save, ExternalLink } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

const PRESENCE_CONFIG: Record<string, { icon: typeof CheckCircle2; label: string; className: string }> = {
  valide: { icon: CheckCircle2, label: "Validé", className: "bg-success/15 text-success" },
  en_cours: { icon: Clock, label: "En cours", className: "bg-info/15 text-info" },
  annule: { icon: XCircle, label: "Annulé", className: "bg-destructive/15 text-destructive" },
  document: { icon: Clock, label: "Document", className: "bg-accent/15 text-accent" },
};

interface FormationTabProps {
  contactId: string;
}

export function FormationTab({ contactId }: FormationTabProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [, setSearchParams] = useSearchParams();

  // Get inscriptions with session details
  const { data: inscriptions, isLoading } = useQuery({
    queryKey: ["apprenant-inscriptions", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_inscriptions")
        .select(`
          id,
          statut,
          date_inscription,
          sessions:session_id (
            id, nom, date_debut, date_fin, formation_type,
            formateurs:formateur_id (nom, prenom)
          )
        `)
        .eq("contact_id", contactId)
        .order("date_inscription", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const updatePresence = useMutation({
    mutationFn: async ({ inscriptionId, presence }: { inscriptionId: string; presence: string }) => {
      const { error } = await supabase
        .from("session_inscriptions")
        .update({ statut: presence })
        .eq("id", inscriptionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenant-inscriptions", contactId] });
      toast.success("Présence mise à jour");
    },
  });

  if (isLoading) return <Skeleton className="h-[300px] rounded-xl" />;

  return (
    <div className="space-y-5">
      {/* Sessions table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Formateur</TableHead>
              <TableHead>Présence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!inscriptions || inscriptions.length === 0) ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Aucune inscription
                </TableCell>
              </TableRow>
            ) : (
              inscriptions.map((ins: any) => {
                const session = ins.sessions;
                const presence = PRESENCE_CONFIG[ins.statut || "en_cours"] || PRESENCE_CONFIG.en_cours;
                const PresenceIcon = presence.icon;
                return (
                  <TableRow key={ins.id} className="group">
                    <TableCell className="font-medium text-sm">
                      <button
                        className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-2 cursor-pointer"
                        onClick={() => {
                          if (session?.id) {
                            setSearchParams({ section: "sessions", sessionId: session.id });
                          }
                        }}
                      >
                        {session?.nom || "—"}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {session?.date_debut ? format(parseISO(session.date_debut), "dd/MM", { locale: fr }) : "—"}
                      {" → "}
                      {session?.date_fin ? format(parseISO(session.date_fin), "dd/MM/yy", { locale: fr }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {session?.formateurs ? `${session.formateurs.prenom} ${session.formateurs.nom}` : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(["valide", "en_cours", "annule"] as const).map((p) => {
                          const cfg = PRESENCE_CONFIG[p];
                          const isActive = ins.statut === p;
                          return (
                            <Button
                              key={p}
                              size="sm"
                              variant={isActive ? "default" : "outline"}
                              className={`h-7 text-[10px] ${isActive ? cfg.className : ""}`}
                              onClick={() => updatePresence.mutate({ inscriptionId: ins.id, presence: p })}
                            >
                              {cfg.label.charAt(0)}
                            </Button>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Notes formateur */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Notes formateur</h3>
        <Textarea
          placeholder="Notes sur la progression de l'apprenant..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
        <Button size="sm" variant="outline">
          <Save className="h-3.5 w-3.5 mr-1" />
          Enregistrer
        </Button>
      </Card>
    </div>
  );
}
