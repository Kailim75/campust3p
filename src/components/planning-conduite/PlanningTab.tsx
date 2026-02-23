import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Plus, CalendarDays, List, ChevronLeft, ChevronRight, Clock, MapPin, Users, User,
} from "lucide-react";
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO,
  startOfMonth, endOfMonth, addMonths, subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { useCreneaux, useCreateCreneau, useUpdateCreneauStatut, useReservations, CreneauConduite } from "@/hooks/usePlanningConduite";
import { CompteRenduModal } from "./CompteRenduModal";
import { CreneauSlideOver } from "./CreneauSlideOver";

const TYPE_COLORS: Record<string, string> = {
  conduite_preventive: "bg-[#2D5016] text-white",
  conduite_ville: "bg-[#F97316] text-white",
  accompagnement_examen: "bg-[#7C3AED] text-white",
};

const TYPE_LABELS: Record<string, string> = {
  conduite_preventive: "Préventive",
  conduite_ville: "Ville",
  accompagnement_examen: "Examen",
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h-20h

export function PlanningTab() {
  const [view, setView] = useState<"semaine" | "liste">("semaine");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCreneau, setSelectedCreneau] = useState<CreneauConduite | null>(null);
  const [compteRenduCreneau, setCompteRenduCreneau] = useState<CreneauConduite | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const dateRange = view === "semaine"
    ? { start: weekStart, end: weekEnd }
    : { start: monthStart, end: monthEnd };

  const { data: creneaux, isLoading } = useCreneaux(dateRange);

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  const navigate = (dir: number) => {
    if (view === "semaine") {
      setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[200px] text-center">
            {view === "semaine"
              ? `${format(weekStart, "d MMM", { locale: fr })} — ${format(weekEnd, "d MMM yyyy", { locale: fr })}`
              : format(currentDate, "MMMM yyyy", { locale: fr })
            }
          </h3>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
            Aujourd'hui
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as any)}>
            <ToggleGroupItem value="semaine" size="sm">
              <CalendarDays className="h-4 w-4 mr-1" /> Semaine
            </ToggleGroupItem>
            <ToggleGroupItem value="liste" size="sm">
              <List className="h-4 w-4 mr-1" /> Liste
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Week view */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[500px] rounded-lg" />
          ))}
        </div>
      ) : view === "semaine" ? (
        <WeekView
          days={weekDays}
          creneaux={creneaux || []}
          onSelectCreneau={setSelectedCreneau}
        />
      ) : (
        <ListView
          creneaux={creneaux || []}
          onSelectCreneau={setSelectedCreneau}
          onCompteRendu={setCompteRenduCreneau}
        />
      )}

      {/* Empty state */}
      {!isLoading && (!creneaux || creneaux.length === 0) && (
        <Card className="p-12 text-center">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">Aucun créneau cette semaine</p>
          <Button className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Créer le premier créneau
          </Button>
        </Card>
      )}

      {/* FAB */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-30"
        onClick={() => setFormOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* New créneau modal */}
      <NewCreneauModal open={formOpen} onOpenChange={setFormOpen} />

      {/* Slide-over detail */}
      <CreneauSlideOver
        creneau={selectedCreneau}
        open={!!selectedCreneau}
        onOpenChange={(open) => !open && setSelectedCreneau(null)}
        onCompteRendu={(c) => { setSelectedCreneau(null); setCompteRenduCreneau(c); }}
      />

      {/* Compte rendu modal */}
      {compteRenduCreneau && (
        <CompteRenduModal
          creneau={compteRenduCreneau}
          open={!!compteRenduCreneau}
          onOpenChange={(open) => !open && setCompteRenduCreneau(null)}
        />
      )}
    </div>
  );
}

// ─── WEEK VIEW ───
function WeekView({
  days,
  creneaux,
  onSelectCreneau,
}: {
  days: Date[];
  creneaux: CreneauConduite[];
  onSelectCreneau: (c: CreneauConduite) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[800px]">
        {/* Header */}
        <div className="border-b border-border" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`text-center text-sm font-medium p-2 border-b border-border ${
              isSameDay(day, new Date()) ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            <div>{format(day, "EEE", { locale: fr })}</div>
            <div className="text-lg font-bold">{format(day, "d")}</div>
          </div>
        ))}

        {/* Time slots */}
        {HOURS.map((hour) => (
          <div key={hour} className="contents">
            <div className="text-xs text-muted-foreground pr-2 pt-1 text-right border-r border-border h-16">
              {hour}h
            </div>
            {days.map((day) => {
              const dayCreneaux = creneaux.filter(
                (c) =>
                  c.date_creneau === format(day, "yyyy-MM-dd") &&
                  parseInt(c.heure_debut?.split(":")[0] || "0") === hour
              );
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="border-b border-r border-border h-16 p-0.5 relative"
                >
                  {dayCreneaux.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onSelectCreneau(c)}
                      className={`w-full text-left p-1 rounded text-[10px] leading-tight truncate cursor-pointer transition-opacity hover:opacity-80 ${
                        c.statut === "annule"
                          ? "bg-muted text-muted-foreground line-through opacity-60"
                          : TYPE_COLORS[c.type_seance] || "bg-muted"
                      }`}
                    >
                      <div className="font-semibold">
                        {TYPE_LABELS[c.type_seance] || c.type_seance}{" "}
                        {c.heure_debut?.slice(0, 5)}-{c.heure_fin?.slice(0, 5)}
                      </div>
                      <div className="truncate">
                        {c.contacts
                          ? `${c.contacts.prenom}`
                          : c.type_seance === "conduite_preventive"
                          ? `0/${c.capacite_max} places`
                          : "Libre"
                        }
                      </div>
                      {c.lieu_depart && (
                        <div className="truncate opacity-80">{c.lieu_depart.split(" ").slice(0, 2).join(" ")}</div>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LIST VIEW ───
function ListView({
  creneaux,
  onSelectCreneau,
  onCompteRendu,
}: {
  creneaux: CreneauConduite[];
  onSelectCreneau: (c: CreneauConduite) => void;
  onCompteRendu: (c: CreneauConduite) => void;
}) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");

  const filtered = creneaux.filter((c) => {
    if (filterType !== "all" && c.type_seance !== filterType) return false;
    if (filterStatut !== "all" && c.statut !== filterStatut) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Type de séance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="conduite_preventive">Conduite préventive</SelectItem>
            <SelectItem value="conduite_ville">Conduite en ville</SelectItem>
            <SelectItem value="accompagnement_examen">Accompagnement examen</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="disponible">Disponible</SelectItem>
            <SelectItem value="reserve">Réservé</SelectItem>
            <SelectItem value="confirme">Confirmé</SelectItem>
            <SelectItem value="annule">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Heure</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Élève(s)</TableHead>
              <TableHead>Lieu</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => onSelectCreneau(c)}>
                <TableCell className="font-medium">
                  {format(parseISO(c.date_creneau), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>{c.heure_debut?.slice(0, 5)} - {c.heure_fin?.slice(0, 5)}</TableCell>
                <TableCell>
                  <Badge className={TYPE_COLORS[c.type_seance] || ""}>
                    {TYPE_LABELS[c.type_seance] || c.type_seance}
                  </Badge>
                </TableCell>
                <TableCell>
                  {c.contacts ? `${c.contacts.prenom} ${c.contacts.nom}` : "—"}
                </TableCell>
                <TableCell className="max-w-[150px] truncate">{c.lieu_depart || "—"}</TableCell>
                <TableCell>
                  <Badge variant={c.statut === "annule" ? "destructive" : "outline"}>
                    {c.statut}
                  </Badge>
                </TableCell>
                <TableCell>
                  {c.statut === "realise" || c.statut === "confirme" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); onCompteRendu(c); }}
                    >
                      📋 CR
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun créneau trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── NEW CRÉNEAU MODAL ───
function NewCreneauModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createCreneau = useCreateCreneau();
  const [type, setType] = useState("conduite_ville");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [heureFin, setHeureFin] = useState("11:00");
  const [lieu, setLieu] = useState("");
  const [capacite, setCapacite] = useState(1);
  const [notes, setNotes] = useState("");

  const handleTypeChange = (val: string) => {
    setType(val);
    setCapacite(val === "conduite_preventive" ? 5 : 1);
  };

  const handleSubmit = () => {
    if (!lieu.trim()) return;
    createCreneau.mutate(
      {
        type_seance: type,
        date_creneau: date,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        lieu_depart: lieu,
        capacite_max: capacite,
        notes_formateur: notes || undefined,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau créneau</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Type de séance</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conduite_preventive">Conduite préventive (collectif)</SelectItem>
                <SelectItem value="conduite_ville">Conduite en ville (individuel)</SelectItem>
                <SelectItem value="accompagnement_examen">Accompagnement examen (individuel)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Heure début</Label>
              <Input type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
            </div>
            <div>
              <Label>Heure fin</Label>
              <Input type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Lieu de RDV</Label>
            <Input value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Adresse du point de départ" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Capacité max</Label>
              <Input type="number" min={1} max={10} value={capacite} onChange={(e) => setCapacite(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Notes formateur (optionnel)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={createCreneau.isPending} className="w-full">
            {createCreneau.isPending ? "Création..." : "Créer le créneau"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
