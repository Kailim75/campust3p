import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Award, Pencil, Check, X, Copy, FileText, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { ParcoursExamenCard } from "../ParcoursExamenCard";
import type { FormationTrack } from "@/lib/formation-track";

const RESULTAT_BADGES: Record<string, { label: string; emoji: string; className: string }> = {
  admis: { label: "Admis", emoji: "🟢", className: "bg-success/15 text-success" },
  ajourne: { label: "Ajourné", emoji: "🔴", className: "bg-destructive/15 text-destructive" },
  absent: { label: "Absent", emoji: "🟡", className: "bg-warning/15 text-warning" },
  en_attente: { label: "En attente", emoji: "🔵", className: "bg-info/15 text-info" },
};

const STATUT_BADGES: Record<string, { label: string; className: string }> = {
  planifie: { label: "Planifié", className: "bg-info/10 text-info" },
  passe: { label: "Passé", className: "bg-muted text-muted-foreground" },
  reussi: { label: "Réussi", className: "bg-success/10 text-success" },
  echoue: { label: "Échoué", className: "bg-destructive/10 text-destructive" },
  absent: { label: "Absent", className: "bg-warning/10 text-warning" },
  reporte: { label: "Reporté", className: "bg-muted text-muted-foreground" },
};

interface ExamensTabProps {
  contactId: string;
  formation: string | null;
  /** Parcours de l'apprenant : la formation continue n'a pas d'examen. */
  track?: FormationTrack;
}

export function ExamensTab({ contactId, formation, track }: ExamensTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ type_examen: "", date_examen: "", numero_dossier: "" });
  const [editingDossier, setEditingDossier] = useState<string | null>(null);
  const [editDossierValue, setEditDossierValue] = useState("");

  const { data: examens, isLoading } = useQuery({
    queryKey: ["apprenant-examens", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examens_t3p")
        .select("*")
        .eq("contact_id", contactId)
        .order("date_examen", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createExamen = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("examens_t3p").insert({
        contact_id: contactId,
        type_formation: formData.type_examen || "TAXI",
        date_examen: formData.date_examen,
        numero_dossier: formData.numero_dossier || null,
        resultat: "en_attente",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenant-examens", contactId] });
      toast.success("Examen planifié");
      setShowForm(false);
      setFormData({ type_examen: "", date_examen: "", numero_dossier: "" });
    },
    onError: () => toast.error("Erreur lors de la planification"),
  });

  const updateDossier = useMutation({
    mutationFn: async ({ id, numero_dossier }: { id: string; numero_dossier: string | null }) => {
      const { error } = await supabase
        .from("examens_t3p")
        .update({ numero_dossier } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenant-examens", contactId] });
      toast.success("N° dossier mis à jour");
      setEditingDossier(null);
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  // Rafraîchit tout ce qui dépend du parcours (fiche + hub Aujourd'hui).
  const invalidateParcours = () => {
    queryClient.invalidateQueries({ queryKey: ["apprenant-examens", contactId] });
    queryClient.invalidateQueries({ queryKey: ["apprenant-parcours", contactId] });
    queryClient.invalidateQueries({ queryKey: ["apprenant-theorie-result", contactId] });
    queryClient.invalidateQueries({ queryKey: ["apprenant-pratique-result", contactId] });
    queryClient.invalidateQueries({ queryKey: ["aujourdhui-inbox"] });
  };

  // Saisie du résultat : horodate date_resultat_recu (le jour où le résultat
  // a été vérifié) — c'est ce qui fait sortir le candidat du bloc
  // « Résultats à vérifier » du hub.
  const updateResultat = useMutation({
    mutationFn: async ({ id, resultat, dejaRecu }: { id: string; resultat: string; dejaRecu: string | null }) => {
      const pending = resultat === "en_attente";
      const { error } = await supabase
        .from("examens_t3p")
        .update({
          resultat,
          statut: pending ? "passe" : resultat === "admis" ? "reussi" : resultat === "absent" ? "absent" : "echoue",
          date_resultat_recu: pending ? null : dejaRecu || new Date().toISOString().slice(0, 10),
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateParcours();
      toast.success("Résultat enregistré");
    },
    onError: () => toast.error("Erreur lors de l'enregistrement du résultat"),
  });

  // Convocation CMA à l'épreuve pratique reçue : fait sortir le candidat du
  // bloc « Convocations CMA attendues ».
  const marquerConvocation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("examens_t3p")
        .update({ date_convocation_pratique_recue: new Date().toISOString().slice(0, 10) } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateParcours();
      toast.success("Convocation pratique enregistrée");
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const handleStartEdit = (examId: string, currentValue: string | null) => {
    setEditingDossier(examId);
    setEditDossierValue(currentValue || "");
  };

  const handleSaveEdit = (examId: string) => {
    updateDossier.mutate({ id: examId, numero_dossier: editDossierValue.trim() || null });
  };

  const handleCopyDossier = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("N° dossier copié");
  };

  if (isLoading) return <Skeleton className="h-[200px] rounded-xl" />;

  return (
    <div className="space-y-4">
      {track === "continuing" ? (
        <Card className="p-3 text-xs text-muted-foreground bg-muted/30">
          Formation continue — pas de parcours d'examen : le stagiaire est un
          professionnel en activité, la formation est sanctionnée par une
          attestation et le renouvellement de sa carte professionnelle (5 ans).
        </Card>
      ) : (
        <ParcoursExamenCard contactId={contactId} />
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          Historique des examens
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Planifier
        </Button>
      </div>

      {/* Inline form */}
      {showForm && (
        <Card className="p-4 space-y-3 border-primary/20">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={formData.type_examen} onValueChange={(v) => setFormData((p) => ({ ...p, type_examen: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Type d'examen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="theorique">Théorique</SelectItem>
                  <SelectItem value="pratique">Pratique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                className="h-9"
                value={formData.date_examen}
                onChange={(e) => setFormData((p) => ({ ...p, date_examen: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">N° dossier</Label>
              <Input
                className="h-9"
                placeholder="Ex: T3P-2025-001"
                value={formData.numero_dossier}
                onChange={(e) => setFormData((p) => ({ ...p, numero_dossier: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!formData.date_examen || !formData.type_examen || createExamen.isPending}
              onClick={() => createExamen.mutate()}
            >
              {createExamen.isPending ? "..." : "Enregistrer"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  N° dossier
                </span>
              </TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Résultat</TableHead>
              <TableHead>Suivi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!examens || examens.length === 0) ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucun examen enregistré
                </TableCell>
              </TableRow>
            ) : (
              examens.map((exam: any) => {
                const resultat = RESULTAT_BADGES[exam.resultat] || RESULTAT_BADGES.en_attente;
                const isEditing = editingDossier === exam.id;

                return (
                  <TableRow key={exam.id}>
                    <TableCell className="text-sm">
                      {exam.date_examen ? format(parseISO(exam.date_examen), "dd/MM/yyyy", { locale: fr }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{exam.type_formation}</TableCell>
                    <TableCell className="text-sm">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            className="h-7 text-xs w-32"
                            value={editDossierValue}
                            onChange={(e) => setEditDossierValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(exam.id);
                              if (e.key === "Escape") setEditingDossier(null);
                            }}
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveEdit(exam.id)} disabled={updateDossier.isPending}>
                            <Check className="h-3 w-3 text-success" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingDossier(null)}>
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group">
                          {exam.numero_dossier ? (
                            <>
                              <span className="font-mono text-xs text-foreground">{exam.numero_dossier}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleCopyDossier(exam.numero_dossier)}
                              >
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Non renseigné</span>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleStartEdit(exam.id, exam.numero_dossier)}
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {exam.score != null ? `${exam.score}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={exam.resultat || "en_attente"}
                        onValueChange={(v) =>
                          updateResultat.mutate({ id: exam.id, resultat: v, dejaRecu: exam.date_resultat_recu })
                        }
                        disabled={updateResultat.isPending}
                      >
                        <SelectTrigger className={cn("h-7 w-[130px] text-xs border", resultat.className)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en_attente">🔵 En attente</SelectItem>
                          <SelectItem value="admis">🟢 Admis</SelectItem>
                          <SelectItem value="ajourne">🔴 Ajourné</SelectItem>
                          <SelectItem value="absent">🟡 Absent</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {exam.date_resultat_recu && (
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            Résultat reçu le {format(parseISO(exam.date_resultat_recu), "dd/MM/yy", { locale: fr })}
                          </span>
                        )}
                        {exam.resultat === "admis" &&
                          String(exam.type_formation || "").toLowerCase() !== "pratique" && (
                            exam.date_convocation_pratique_recue ? (
                              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                Convoc. reçue le {format(parseISO(exam.date_convocation_pratique_recue), "dd/MM/yy", { locale: fr })}
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[11px] gap-1 whitespace-nowrap"
                                disabled={marquerConvocation.isPending}
                                onClick={() => marquerConvocation.mutate({ id: exam.id })}
                              >
                                <MailCheck className="h-3 w-3" />
                                Convocation reçue
                              </Button>
                            )
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
