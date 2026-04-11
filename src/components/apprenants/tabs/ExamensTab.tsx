import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, parseISO, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Award, CalendarClock, Check, Copy, FileText, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const RESULTAT_BADGES: Record<string, { label: string; className: string }> = {
  admis: { label: "Admis", className: "bg-success/15 text-success" },
  ajourne: { label: "Ajourné", className: "bg-destructive/15 text-destructive" },
  absent: { label: "Absent", className: "bg-warning/15 text-warning" },
  en_attente: { label: "En attente", className: "bg-info/15 text-info" },
};

const STATUT_BADGES: Record<string, { label: string; className: string }> = {
  planifie: { label: "Planifié", className: "bg-info/10 text-info" },
  passe: { label: "Passé", className: "bg-muted text-muted-foreground" },
  reussi: { label: "Réussi", className: "bg-success/10 text-success" },
  echoue: { label: "Échoué", className: "bg-destructive/10 text-destructive" },
  absent: { label: "Absent", className: "bg-warning/10 text-warning" },
  reporte: { label: "Reporté", className: "bg-muted text-muted-foreground" },
};

const TYPE_FORMATION_OPTIONS = ["TAXI", "VTC", "VMDTR"] as const;

type ExamenT3PRow = Database["public"]["Tables"]["examens_t3p"]["Row"];
type ExamenT3PInsert = Database["public"]["Tables"]["examens_t3p"]["Insert"];
type ExamenT3PUpdate = Database["public"]["Tables"]["examens_t3p"]["Update"];
type FormationOption = (typeof TYPE_FORMATION_OPTIONS)[number];

interface ExamensTabProps {
  contactId: string;
  formation: string | null;
}

function resolveFormationType(formation: string | null): FormationOption {
  const normalized = formation?.toUpperCase() ?? "";
  if (normalized.includes("VMDTR") || normalized.includes("MOTO")) return "VMDTR";
  if (normalized.includes("VTC")) return "VTC";
  return "TAXI";
}

function formatExamDate(value: string | null): string {
  return value ? format(parseISO(value), "dd/MM/yyyy", { locale: fr }) : "—";
}

export function ExamensTab({ contactId, formation }: ExamensTabProps) {
  const queryClient = useQueryClient();
  const defaultFormationType = useMemo(() => resolveFormationType(formation), [formation]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    type_formation: FormationOption;
    date_examen: string;
    numero_dossier: string;
  }>({
    type_formation: defaultFormationType,
    date_examen: "",
    numero_dossier: "",
  });
  const [editingDossier, setEditingDossier] = useState<string | null>(null);
  const [editDossierValue, setEditDossierValue] = useState("");

  const { data: examens = [], isLoading } = useQuery({
    queryKey: ["apprenant-examens", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examens_t3p")
        .select("*")
        .eq("contact_id", contactId)
        .order("date_examen", { ascending: false });
      if (error) throw error;
      return (data || []) as ExamenT3PRow[];
    },
  });

  const stats = useMemo(() => {
    const today = startOfToday();
    const planned = examens.filter((exam) => exam.statut === "planifie" || isAfter(parseISO(exam.date_examen), today)).length;
    const admitted = examens.filter((exam) => exam.resultat === "admis" || exam.statut === "reussi").length;
    const dossiers = examens.filter((exam) => Boolean(exam.numero_dossier)).length;

    return {
      total: examens.length,
      planned,
      admitted,
      dossiers,
    };
  }, [examens]);

  const createExamen = useMutation({
    mutationFn: async () => {
      const payload: ExamenT3PInsert = {
        contact_id: contactId,
        type_formation: formData.type_formation,
        date_examen: formData.date_examen,
        numero_dossier: formData.numero_dossier.trim() || null,
        resultat: "en_attente",
        statut: "planifie",
      };
      const { error } = await supabase.from("examens_t3p").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenant-examens", contactId] });
      toast.success("Examen planifié");
      setShowForm(false);
      setFormData({
        type_formation: defaultFormationType,
        date_examen: "",
        numero_dossier: "",
      });
    },
    onError: () => toast.error("Erreur lors de la planification"),
  });

  const updateDossier = useMutation({
    mutationFn: async ({ id, numero_dossier }: { id: string; numero_dossier: string | null }) => {
      const payload: ExamenT3PUpdate = { numero_dossier };
      const { error } = await supabase
        .from("examens_t3p")
        .update(payload)
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

  const openPlanningForm = () => {
    setFormData((previous) => ({
      ...previous,
      type_formation: defaultFormationType,
    }));
    setShowForm((previous) => !previous);
  };

  if (isLoading) return <Skeleton className="h-[220px] rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Award className="h-4 w-4 text-primary" />
            Examens T3P
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Suivi des passages théoriques, numéros de dossier et résultats pour ce dossier apprenant.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={openPlanningForm}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Planifier
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">examen{stats.total > 1 ? "s" : ""} enregistré{stats.total > 1 ? "s" : ""}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">À venir</p>
          <p className="mt-1 text-2xl font-bold text-info">{stats.planned}</p>
          <p className="mt-1 text-xs text-muted-foreground">planifié{stats.planned > 1 ? "s" : ""} ou encore à passer</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Validés</p>
          <p className="mt-1 text-2xl font-bold text-success">{stats.admitted}</p>
          <p className="mt-1 text-xs text-muted-foreground">résultat{stats.admitted > 1 ? "s" : ""} admis</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">N° dossier</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.dossiers}</p>
          <p className="mt-1 text-xs text-muted-foreground">renseigné{stats.dossiers > 1 ? "s" : ""} sur {stats.total || 0}</p>
        </Card>
      </div>

      {showForm && (
        <Card className="space-y-3 border-primary/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarClock className="h-4 w-4 text-primary" />
            Planifier un examen
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs">Formation</Label>
              <Select
                value={formData.type_formation}
                onValueChange={(value) => setFormData((previous) => ({ ...previous, type_formation: value as FormationOption }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Type de formation" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_FORMATION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                className="h-9"
                value={formData.date_examen}
                onChange={(event) => setFormData((previous) => ({ ...previous, date_examen: event.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">N° dossier</Label>
              <Input
                className="h-9"
                placeholder="Ex : T3P-2026-001"
                value={formData.numero_dossier}
                onChange={(event) => setFormData((previous) => ({ ...previous, numero_dossier: event.target.value }))}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Cet onglet suit les examens T3P théoriques. Le résultat sera ajouté ensuite quand l’examen aura été passé.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!formData.date_examen || createExamen.isPending}
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

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Formation</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  N° dossier
                </span>
              </TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Résultat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {examens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Aucun examen enregistré
                </TableCell>
              </TableRow>
            ) : (
              examens.map((exam) => {
                const resultat = RESULTAT_BADGES[exam.resultat || ""] || RESULTAT_BADGES.en_attente;
                const statut = STATUT_BADGES[exam.statut] || STATUT_BADGES.planifie;
                const isEditing = editingDossier === exam.id;

                return (
                  <TableRow key={exam.id}>
                    <TableCell className="text-sm">{formatExamDate(exam.date_examen)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {exam.type_formation}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", statut.className)}>
                        {statut.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            className="h-7 w-32 text-xs"
                            value={editDossierValue}
                            onChange={(event) => setEditDossierValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") handleSaveEdit(exam.id);
                              if (event.key === "Escape") setEditingDossier(null);
                            }}
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleSaveEdit(exam.id)}
                            disabled={updateDossier.isPending}
                          >
                            <Check className="h-3 w-3 text-success" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingDossier(null)}>
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <div className="group flex items-center gap-1">
                          {exam.numero_dossier ? (
                            <>
                              <span className="font-mono text-xs text-foreground">{exam.numero_dossier}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={() => handleCopyDossier(exam.numero_dossier!)}
                              >
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">Non renseigné</span>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
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
                      <Badge variant="outline" className={cn("text-xs", resultat.className)}>
                        {resultat.label}
                      </Badge>
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
