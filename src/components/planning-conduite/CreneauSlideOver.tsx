import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MapPin, Clock, Users, Pencil, Trash2, ClipboardList, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CreneauConduite, useUpdateCreneauStatut, useReservations, useCreateReservation, useProgression, useCompteRendus, useToggleVisibleEleve } from "@/hooks/usePlanningConduite";
import { useContacts } from "@/hooks/useContacts";
import { useState } from "react";

const TYPE_LABELS: Record<string, string> = {
  conduite_preventive: "Conduite préventive",
  conduite_ville: "Conduite en ville",
  accompagnement_examen: "Accompagnement examen",
};

const NIVEAU_BADGES: Record<string, { label: string; className: string }> = {
  debutant: { label: "Débutant", className: "bg-destructive/15 text-destructive" },
  intermediaire: { label: "Intermédiaire", className: "bg-accent/15 text-accent" },
  avance: { label: "Avancé", className: "bg-info/15 text-info" },
  pret_examen: { label: "Prêt examen ✅", className: "bg-success/15 text-success" },
};

interface Props {
  creneau: CreneauConduite | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCompteRendu: (c: CreneauConduite) => void;
}

export function CreneauSlideOver({ creneau, open, onOpenChange, onCompteRendu }: Props) {
  const updateStatut = useUpdateCreneauStatut();
  const toggleVisible = useToggleVisibleEleve();
  const { data: reservations } = useReservations(creneau?.id);
  const createReservation = useCreateReservation();
  const { data: contacts } = useContacts();
  const [selectedApprenant, setSelectedApprenant] = useState<string>("");

  if (!creneau) return null;

  const isCollectif = creneau.type_seance === "conduite_preventive";
  const apprenantId = creneau.contact_id || reservations?.[0]?.apprenant_id;

  const handleAnnuler = () => {
    updateStatut.mutate({ id: creneau.id, statut: "annule" });
    onOpenChange(false);
  };

  const handleInscrire = () => {
    if (!selectedApprenant) return;
    createReservation.mutate({ creneau_id: creneau.id, apprenant_id: selectedApprenant });
    setSelectedApprenant("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Détails du créneau</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Info */}
          <div className="space-y-3">
            <Badge className={
              creneau.type_seance === "conduite_preventive" ? "bg-[#2D5016] text-white" :
              creneau.type_seance === "conduite_ville" ? "bg-[#F97316] text-white" :
              "bg-[#7C3AED] text-white"
            }>
              {TYPE_LABELS[creneau.type_seance]}
            </Badge>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {format(parseISO(creneau.date_creneau), "EEEE d MMMM yyyy", { locale: fr })}
              {" — "}
              {creneau.heure_debut?.slice(0, 5)} à {creneau.heure_fin?.slice(0, 5)}
            </div>

            {creneau.lieu_depart && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {creneau.lieu_depart}
              </div>
            )}
          </div>

          {/* Collectif: inscriptions */}
          {isCollectif && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Élèves inscrits ({reservations?.length || 0}/{creneau.capacite_max})
              </h4>
              {reservations?.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <span className="text-sm">{(r as any).contacts?.prenom} {(r as any).contacts?.nom}</span>
                  <Badge variant="outline">{r.statut}</Badge>
                </div>
              ))}
              {(reservations?.length || 0) < creneau.capacite_max && (
                <div className="flex gap-2">
                  <Select value={selectedApprenant} onValueChange={setSelectedApprenant}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choisir un élève" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts?.filter(c => !c.archived).slice(0, 50).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.prenom} {c.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleInscrire} disabled={!selectedApprenant}>
                    + Inscrire
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Individuel: student info */}
          {!isCollectif && (
            <div className="space-y-3">
              {creneau.contacts ? (
                <EleveInfo apprenantId={creneau.contacts.id} contact={creneau.contacts} />
              ) : reservations?.[0] ? (
                <EleveInfo apprenantId={reservations[0].apprenant_id} contact={(reservations[0] as any).contacts} />
              ) : (
                <p className="text-sm text-muted-foreground">Aucun élève inscrit</p>
              )}
            </div>
          )}

          {/* Visible élève toggle */}
          {creneau.type_seance !== "accompagnement_examen" && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm cursor-pointer">Visible par les élèves</Label>
              </div>
              <Switch
                checked={!!creneau.visible_eleve}
                onCheckedChange={(checked) => toggleVisible.mutate({ id: creneau.id, visible: checked })}
              />
            </div>
          )}

          {/* Notes formateur */}
          {creneau.notes_formateur && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Notes formateur</p>
              <p className="text-sm">{creneau.notes_formateur}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            {(creneau.statut === "confirme" || creneau.statut === "reserve" || creneau.statut === "realise") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCompteRendu(creneau)}
              >
                <ClipboardList className="h-4 w-4 mr-1" /> Compte rendu
              </Button>
            )}
            {creneau.statut !== "annule" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" /> Annuler
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Annuler ce créneau ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Le créneau sera marqué comme annulé. Les élèves inscrits seront notifiés.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Non</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAnnuler}>Oui, annuler</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EleveInfo({ apprenantId, contact }: { apprenantId: string; contact: any }) {
  const { data: progression } = useProgression(apprenantId);
  const niveauBadge = progression?.niveau_actuel
    ? NIVEAU_BADGES[progression.niveau_actuel] || { label: progression.niveau_actuel, className: "bg-muted" }
    : { label: "Non évalué", className: "bg-muted" };

  return (
    <div className="space-y-2">
      <h4 className="font-medium">{contact?.prenom} {contact?.nom}</h4>
      <Badge variant="outline" className={niveauBadge.className}>{niveauBadge.label}</Badge>
      {progression && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Conduite préventive : {Number(progression.heures_preventive_realisees || 0).toFixed(1)}h</p>
          <p>Conduite ville : {Number(progression.heures_ville_realisees || 0).toFixed(1)}h</p>
          <p>Examen : {progression.accompagnement_examen_fait ? "✅ Fait" : "⏳ À faire"}</p>
        </div>
      )}
    </div>
  );
}
