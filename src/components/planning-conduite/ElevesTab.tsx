import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, ChevronRight, Calendar, CheckCircle, Link2 } from "lucide-react";
import { useElevesConduite, useProgression, useCompteRendus } from "@/hooks/usePlanningConduite";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { SendReservationLinkModal } from "./SendReservationLinkModal";

const NIVEAU_BADGES: Record<string, { label: string; className: string }> = {
  debutant: { label: "Débutant", className: "bg-destructive/15 text-destructive" },
  intermediaire: { label: "Intermédiaire", className: "bg-accent/15 text-accent" },
  avance: { label: "Avancé", className: "bg-info/15 text-info" },
  pret_examen: { label: "Prêt examen ✅", className: "bg-success/15 text-success" },
};

export function ElevesTab() {
  const { data: eleves, isLoading } = useElevesConduite();
  const [selectedEleve, setSelectedEleve] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!eleves?.length) {
    return (
      <Card className="p-12 text-center">
        <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-lg font-medium text-muted-foreground">Aucun élève n'a encore réservé</p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {eleves.map((eleve: any) => (
          <EleveCard key={eleve.id} eleve={eleve} onClick={() => setSelectedEleve(eleve)} />
        ))}
      </div>

      {selectedEleve && (
        <EleveDetailSheet
          eleve={selectedEleve}
          open={!!selectedEleve}
          onOpenChange={(v) => !v && setSelectedEleve(null)}
        />
      )}
    </>
  );
}

function EleveCard({ eleve, onClick }: { eleve: any; onClick: () => void }) {
  const prog = eleve.progression;
  const niveauBadge = prog?.niveau_actuel
    ? NIVEAU_BADGES[prog.niveau_actuel] || { label: prog.niveau_actuel, className: "bg-muted" }
    : { label: "Non évalué", className: "bg-muted text-muted-foreground" };

  const initials = `${(eleve.prenom || "?")[0]}${(eleve.nom || "?")[0]}`.toUpperCase();
  const hPrev = Number(prog?.heures_preventive_realisees || 0);
  const hVille = Number(prog?.heures_ville_realisees || 0);
  const examenFait = prog?.accompagnement_examen_fait || false;

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold truncate">{eleve.prenom} {eleve.nom}</h4>
            {eleve.formation && (
              <Badge variant="outline" className="text-[10px]">{eleve.formation}</Badge>
            )}
          </div>
          <Badge variant="outline" className={`text-xs ${niveauBadge.className}`}>
            {niveauBadge.label}
          </Badge>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      </div>

      {/* Progression bars */}
      <div className="mt-3 space-y-2">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
            <span>Conduite préventive</span>
            <span>{hPrev.toFixed(1)}h</span>
          </div>
          <Progress value={Math.min((hPrev / 10) * 100, 100)} className="h-1.5 [&>div]:bg-[#2D5016]" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
            <span>Conduite en ville</span>
            <span>{hVille.toFixed(1)}h</span>
          </div>
          <Progress value={Math.min((hVille / 10) * 100, 100)} className="h-1.5 [&>div]:bg-[#F97316]" />
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Accompagnement examen :</span>
          {examenFait ? (
            <CheckCircle className="h-3.5 w-3.5 text-success" />
          ) : (
            <span>⏳</span>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── DETAIL SHEET ───
function EleveDetailSheet({ eleve, open, onOpenChange }: { eleve: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: progression } = useProgression(eleve.id);
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  // Get all reservations for this student
  const { data: historique } = useQuery({
    queryKey: ["eleve-conduite-historique", eleve.id],
    queryFn: async () => {
      const { data: reservations } = await supabase
        .from("reservations_conduite")
        .select("id, creneau_id, statut, created_at, creneaux_conduite:creneau_id(date_creneau, heure_debut, heure_fin, type_seance, lieu_depart)")
        .eq("apprenant_id", eleve.id)
        .order("created_at", { ascending: false });

      if (!reservations?.length) return [];

      const resIds = reservations.map(r => r.id);
      const { data: crs } = await supabase
        .from("compte_rendu_seance")
        .select("*")
        .in("reservation_id", resIds);

      return reservations.map((r: any) => ({
        ...r,
        compte_rendu: (crs || []).find((cr: any) => cr.reservation_id === r.id) || null,
      }));
    },
  });

  const initials = `${(eleve.prenom || "?")[0]}${(eleve.nom || "?")[0]}`.toUpperCase();
  const niveauBadge = progression?.niveau_actuel
    ? NIVEAU_BADGES[progression.niveau_actuel]
    : { label: "Non évalué", className: "bg-muted" };

  const TYPE_LABELS: Record<string, string> = {
    conduite_preventive: "Préventive",
    conduite_ville: "Ville",
    accompagnement_examen: "Examen",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-bold">{eleve.prenom} {eleve.nom}</h3>
                <div className="flex gap-2 mt-1">
                  {eleve.formation && <Badge variant="outline" className="text-xs">{eleve.formation}</Badge>}
                  <Badge variant="outline" className={`text-xs ${niveauBadge?.className}`}>{niveauBadge?.label}</Badge>
                </div>
                <Button size="sm" variant="outline" className="mt-2" onClick={(e) => { e.stopPropagation(); setLinkModalOpen(true); }}>
                  <Link2 className="h-3.5 w-3.5 mr-1" /> Envoyer le lien de réservation
                </Button>
              </div>
            </div>
          </div>

          {/* Progression */}
          <ScrollArea className="flex-1 p-5">
            <div className="space-y-6">
              {/* Progression section */}
              <div>
                <h4 className="font-semibold mb-3">Progression</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Conduite préventive</span>
                      <span className="font-medium">{Number(progression?.heures_preventive_realisees || 0).toFixed(1)}h</span>
                    </div>
                    <Progress value={Math.min((Number(progression?.heures_preventive_realisees || 0) / 10) * 100, 100)} className="h-2 [&>div]:bg-[#2D5016]" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Conduite en ville</span>
                      <span className="font-medium">{Number(progression?.heures_ville_realisees || 0).toFixed(1)}h</span>
                    </div>
                    <Progress value={Math.min((Number(progression?.heures_ville_realisees || 0) / 10) * 100, 100)} className="h-2 [&>div]:bg-[#F97316]" />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>Accompagnement examen :</span>
                    {progression?.accompagnement_examen_fait ? (
                      <Badge className="bg-success/15 text-success">✅ Réalisé</Badge>
                    ) : (
                      <Badge variant="outline">⏳ À faire</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Historique */}
              <div>
                <h4 className="font-semibold mb-3">Historique des séances</h4>
                {historique?.length ? (
                  <div className="space-y-3">
                    {historique.map((h: any) => {
                      const creneau = h.creneaux_conduite;
                      const cr = h.compte_rendu;
                      return (
                        <Card key={h.id} className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {creneau?.date_creneau ? format(parseISO(creneau.date_creneau), "dd/MM/yyyy") : "—"}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {TYPE_LABELS[creneau?.type_seance] || creneau?.type_seance}
                            </Badge>
                            {cr && (
                              <Badge variant="outline" className={`text-[10px] ${NIVEAU_BADGES[cr.niveau_global]?.className || ""}`}>
                                {NIVEAU_BADGES[cr.niveau_global]?.label || cr.niveau_global}
                              </Badge>
                            )}
                          </div>
                          {cr && (
                            <div className="text-xs text-muted-foreground space-y-1 ml-5">
                              {cr.points_positifs && <p>✅ {cr.points_positifs}</p>}
                              {cr.points_ameliorer && <p>⚠️ {cr.points_ameliorer}</p>}
                              {cr.duree_reelle_minutes && <p>⏱ {cr.duree_reelle_minutes} min</p>}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune séance enregistrée</p>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        <SendReservationLinkModal
          apprenantId={eleve.id}
          apprenantPrenom={eleve.prenom}
          open={linkModalOpen}
          onOpenChange={setLinkModalOpen}
        />
      </SheetContent>
    </Sheet>
  );
}
