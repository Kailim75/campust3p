import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Car, User, Clock, MapPin, Trash2, Edit, AlertTriangle } from "lucide-react";
import { useCreneauxConduite, useDeleteCreneau, type CreneauConduiteWithDetails } from "@/hooks/useCreneauxConduite";
import { useFormateursTable } from "@/hooks/useFormateurs";
import { useActiveVehicules } from "@/hooks/useVehicules";
import { CreneauFormDialog } from "./CreneauFormDialog";
import { format, startOfWeek, endOfWeek, addWeeks, addDays, isSameDay, parseISO, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statutColors: Record<string, string> = {
  disponible: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  reserve: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  confirme: "bg-primary/10 text-primary",
  en_cours: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  termine: "bg-muted text-muted-foreground",
  annule: "bg-destructive/10 text-destructive",
  absent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const statutLabels: Record<string, string> = {
  disponible: "Disponible",
  reserve: "Réservé",
  confirme: "Confirmé",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
  absent: "Absent",
};

const typeLabels: Record<string, string> = {
  conduite: "Conduite",
  code: "Code",
  examen_blanc: "Examen blanc",
  evaluation: "Évaluation",
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7h to 19h

export function PlanningPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingCreneau, setEditingCreneau] = useState<CreneauConduiteWithDetails | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [filterFormateur, setFilterFormateur] = useState<string>("all");
  const [filterVehicule, setFilterVehicule] = useState<string>("all");

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: creneaux, isLoading } = useCreneauxConduite({
    dateDebut: format(weekStart, "yyyy-MM-dd"),
    dateFin: format(weekEnd, "yyyy-MM-dd"),
    formateurId: filterFormateur !== "all" ? filterFormateur : undefined,
    vehiculeId: filterVehicule !== "all" ? filterVehicule : undefined,
  });
  const { data: formateurs } = useFormateursTable();
  const { data: vehicules } = useActiveVehicules();
  const deleteCreneau = useDeleteCreneau();

  const handleNewCreneau = (date?: Date) => {
    setEditingCreneau(null);
    setSelectedDate(date);
    setFormOpen(true);
  };

  const handleEdit = (creneau: CreneauConduiteWithDetails) => {
    setEditingCreneau(creneau);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteCreneau.mutate(deleteId);
      setDeleteId(null);
    }
  };

  // Stats
  const stats = useMemo(() => {
    if (!creneaux) return { total: 0, disponibles: 0, reserves: 0, termines: 0 };
    return {
      total: creneaux.length,
      disponibles: creneaux.filter(c => c.statut === "disponible").length,
      reserves: creneaux.filter(c => ["reserve", "confirme"].includes(c.statut)).length,
      termines: creneaux.filter(c => c.statut === "termine").length,
    };
  }, [creneaux]);

  const getCreneauxForDay = (day: Date) =>
    creneaux?.filter(c => isSameDay(parseISO(c.date_creneau), day)) || [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Planning Conduite"
        subtitle="Gérez les créneaux de conduite, affectez les formateurs et véhicules"
        onAddClick={() => handleNewCreneau()}
        addLabel="Nouveau créneau"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Cette semaine</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.disponibles}</p>
          <p className="text-xs text-muted-foreground">Disponibles</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.reserves}</p>
          <p className="text-xs text-muted-foreground">Réservés</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{stats.termines}</p>
          <p className="text-xs text-muted-foreground">Terminés</p>
        </CardContent></Card>
      </div>

      {/* Filters + Week navigation */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(d => addWeeks(d, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentWeek(new Date())} className="text-sm">
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(d => addWeeks(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="font-medium text-sm">
          {format(weekStart, "d MMM", { locale: fr })} — {format(weekEnd, "d MMM yyyy", { locale: fr })}
        </span>

        <div className="ml-auto flex gap-2">
          <Select value={filterFormateur} onValueChange={setFilterFormateur}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Formateur" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les formateurs</SelectItem>
              {formateurs?.filter(f => f.actif).map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nom} {f.prenom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterVehicule} onValueChange={setFilterVehicule}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Véhicule" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les véhicules</SelectItem>
              {vehicules?.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.marque} {v.modele}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Views */}
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar"><CalendarIcon className="h-4 w-4 mr-1" />Calendrier</TabsTrigger>
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1" />Liste</TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar">
          {isLoading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {weekDays.map(day => {
                const dayCreneaux = getCreneauxForDay(day);
                const dayIsToday = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "border rounded-lg min-h-[200px] p-2",
                      dayIsToday && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-center">
                        <p className="text-[10px] uppercase text-muted-foreground">
                          {format(day, "EEE", { locale: fr })}
                        </p>
                        <p className={cn(
                          "text-lg font-bold",
                          dayIsToday && "text-primary"
                        )}>
                          {format(day, "d")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleNewCreneau(day)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {dayCreneaux.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleEdit(c)}
                          className={cn(
                            "w-full text-left p-1.5 rounded text-[11px] leading-tight transition-colors hover:ring-1 hover:ring-primary/50",
                            statutColors[c.statut] || "bg-muted"
                          )}
                        >
                          <div className="font-semibold">
                            {c.heure_debut.slice(0, 5)}-{c.heure_fin.slice(0, 5)}
                          </div>
                          {c.contact && (
                            <div className="truncate">{c.contact.prenom} {c.contact.nom}</div>
                          )}
                          {c.formateur && (
                            <div className="truncate opacity-70">{c.formateur.prenom} {c.formateur.nom}</div>
                          )}
                          {c.vehicule && (
                            <div className="truncate opacity-60">{c.vehicule.immatriculation}</div>
                          )}
                        </button>
                      ))}
                      {dayCreneaux.length === 0 && (
                        <p className="text-[10px] text-muted-foreground text-center py-4">—</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : !creneaux?.length ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              Aucun créneau cette semaine
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {creneaux.map(c => (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 flex items-center gap-4">
                    {/* Date/time */}
                    <div className="text-center min-w-[80px]">
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(c.date_creneau), "EEE d MMM", { locale: fr })}
                      </p>
                      <p className="font-bold text-sm">
                        {c.heure_debut.slice(0, 5)} - {c.heure_fin.slice(0, 5)}
                      </p>
                    </div>

                    {/* Badge statut */}
                    <Badge variant="outline" className={cn("text-[10px]", statutColors[c.statut])}>
                      {statutLabels[c.statut]}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {typeLabels[c.type_seance]}
                    </Badge>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      {c.contact ? (
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium truncate">{c.contact.prenom} {c.contact.nom}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">Créneau libre</span>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {c.formateur && <span>🧑‍🏫 {c.formateur.prenom} {c.formateur.nom}</span>}
                        {c.vehicule && <span>🚗 {c.vehicule.immatriculation}</span>}
                        {c.lieu_depart && <span><MapPin className="h-3 w-3 inline" /> {c.lieu_depart}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(c)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <CreneauFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        creneau={editingCreneau}
        defaultDate={selectedDate}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce créneau ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
