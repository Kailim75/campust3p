import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const RESULTAT_BADGES: Record<string, { label: string; emoji: string; className: string }> = {
  admis: { label: "Admis", emoji: "🟢", className: "bg-success/15 text-success" },
  ajourne: { label: "Ajourné", emoji: "🔴", className: "bg-destructive/15 text-destructive" },
  en_attente: { label: "En attente", emoji: "🔵", className: "bg-info/15 text-info" },
};

interface ExamensTabProps {
  contactId: string;
  formation: string | null;
}

export function ExamensTab({ contactId, formation }: ExamensTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ type_examen: "", date_examen: "" });

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
        resultat: "en_attente",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenant-examens", contactId] });
      toast.success("Examen planifié");
      setShowForm(false);
      setFormData({ type_examen: "", date_examen: "" });
    },
    onError: () => toast.error("Erreur lors de la planification"),
  });

  if (isLoading) return <Skeleton className="h-[200px] rounded-xl" />;

  return (
    <div className="space-y-4">
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
          <div className="grid grid-cols-2 gap-3">
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
              <TableHead>Score</TableHead>
              <TableHead>Résultat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!examens || examens.length === 0) ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Aucun examen enregistré
                </TableCell>
              </TableRow>
            ) : (
              examens.map((exam: any) => {
                const resultat = RESULTAT_BADGES[exam.resultat] || RESULTAT_BADGES.en_attente;
                return (
                  <TableRow key={exam.id}>
                    <TableCell className="text-sm">
                      {exam.date_examen ? format(parseISO(exam.date_examen), "dd/MM/yyyy", { locale: fr }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{exam.type_examen}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {exam.score != null ? `${exam.score}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", resultat.className)}>
                        {resultat.emoji} {resultat.label}
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
