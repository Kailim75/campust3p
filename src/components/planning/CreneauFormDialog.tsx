import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { useFormateursTable } from "@/hooks/useFormateurs";
import { useActiveVehicules } from "@/hooks/useVehicules";
import { useContacts, type Contact } from "@/hooks/useContacts";
import { useCreateCreneau, useUpdateCreneau, useCheckConflicts, type CreneauConduiteWithDetails } from "@/hooks/useCreneauxConduite";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreneauFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creneau?: CreneauConduiteWithDetails | null;
  defaultDate?: Date;
}

export function CreneauFormDialog({ open, onOpenChange, creneau, defaultDate }: CreneauFormDialogProps) {
  const { data: formateurs } = useFormateursTable();
  const { data: vehicules } = useActiveVehicules();
  const { data: contacts } = useContacts();
  const createCreneau = useCreateCreneau();
  const updateCreneau = useUpdateCreneau();
  const checkConflicts = useCheckConflicts();

  const [date, setDate] = useState<Date | undefined>(defaultDate || new Date());
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [heureFin, setHeureFin] = useState("10:00");
  const [formateurId, setFormateurId] = useState<string>("none");
  const [vehiculeId, setVehiculeId] = useState<string>("none");
  const [contactId, setContactId] = useState<string>("none");
  const [typeSeance, setTypeSeance] = useState("conduite");
  const [statut, setStatut] = useState("disponible");
  const [lieuDepart, setLieuDepart] = useState("");
  const [commentaires, setCommentaires] = useState("");
  const [conflicts, setConflicts] = useState<any[]>([]);

  const isEditing = !!creneau;

  useEffect(() => {
    if (creneau) {
      setDate(new Date(creneau.date_creneau));
      setHeureDebut(creneau.heure_debut.slice(0, 5));
      setHeureFin(creneau.heure_fin.slice(0, 5));
      setFormateurId(creneau.formateur_id || "none");
      setVehiculeId(creneau.vehicule_id || "none");
      setContactId(creneau.contact_id || "none");
      setTypeSeance(creneau.type_seance);
      setStatut(creneau.statut);
      setLieuDepart(creneau.lieu_depart || "");
      setCommentaires(creneau.commentaires || "");
    } else {
      setDate(defaultDate || new Date());
      setHeureDebut("09:00");
      setHeureFin("10:00");
      setFormateurId("none");
      setVehiculeId("none");
      setContactId("none");
      setTypeSeance("conduite");
      setStatut("disponible");
      setLieuDepart("");
      setCommentaires("");
      setConflicts([]);
    }
  }, [creneau, open, defaultDate]);

  // Check conflicts when key fields change
  useEffect(() => {
    if (!date || !heureDebut || !heureFin) return;
    if (formateurId === "none" && vehiculeId === "none" && contactId === "none") {
      setConflicts([]);
      return;
    }

    const timer = setTimeout(() => {
      checkConflicts.mutate({
        date: format(date, "yyyy-MM-dd"),
        heureDebut,
        heureFin,
        formateurId: formateurId !== "none" ? formateurId : undefined,
        vehiculeId: vehiculeId !== "none" ? vehiculeId : undefined,
        contactId: contactId !== "none" ? contactId : undefined,
        excludeId: creneau?.id,
      }, {
        onSuccess: (data) => setConflicts(data || []),
        onError: () => setConflicts([]),
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [date, heureDebut, heureFin, formateurId, vehiculeId, contactId]);

  const handleSubmit = () => {
    if (!date) return;

    const payload = {
      date_creneau: format(date, "yyyy-MM-dd"),
      heure_debut: heureDebut,
      heure_fin: heureFin,
      formateur_id: formateurId !== "none" ? formateurId : null,
      vehicule_id: vehiculeId !== "none" ? vehiculeId : null,
      contact_id: contactId !== "none" ? contactId : null,
      type_seance: typeSeance,
      statut,
      lieu_depart: lieuDepart || null,
      commentaires: commentaires || null,
    };

    if (isEditing) {
      updateCreneau.mutate({ id: creneau.id, ...payload } as any, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createCreneau.mutate(payload as any, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const activeContacts = contacts || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le créneau" : "Nouveau créneau de conduite"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conflicts warning */}
          {conflicts.length > 0 && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg space-y-1">
              <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Conflits détectés !</span>
              </div>
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs text-destructive/80">
                  {c.conflict_type === "formateur" && "🧑‍🏫"}
                  {c.conflict_type === "vehicule" && "🚗"}
                  {c.conflict_type === "apprenant" && "🎓"}
                  {" "}{c.conflict_label} — {c.conflict_heure_debut?.slice(0,5)}-{c.conflict_heure_fin?.slice(0,5)}
                </p>
              ))}
            </div>
          )}

          {/* Date */}
          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : "Sélectionner"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Horaires */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Début</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div>
              <Label>Fin</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>

          {/* Type de séance */}
          <div>
            <Label>Type de séance</Label>
            <Select value={typeSeance} onValueChange={setTypeSeance}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conduite">Conduite</SelectItem>
                <SelectItem value="code">Code</SelectItem>
                <SelectItem value="examen_blanc">Examen blanc</SelectItem>
                <SelectItem value="evaluation">Évaluation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Formateur */}
          <div>
            <Label>Formateur</Label>
            <Select value={formateurId} onValueChange={setFormateurId}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {formateurs?.filter(f => f.actif).map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nom} {f.prenom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Véhicule */}
          <div>
            <Label>Véhicule</Label>
            <Select value={vehiculeId} onValueChange={setVehiculeId}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {vehicules?.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.marque} {v.modele} ({v.immatriculation})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Apprenant (searchable) */}
          <div>
            <Label>Apprenant</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", contactId === "none" && "text-muted-foreground")}>
                  {contactId !== "none"
                    ? (() => { const c = activeContacts.find(ct => ct.id === contactId); return c ? `${c.nom} ${c.prenom}` : "Libre (réservable)"; })()
                    : "Libre (réservable)"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher un apprenant..." />
                  <CommandList>
                    <CommandEmpty>Aucun apprenant trouvé.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="libre-reservable" onSelect={() => setContactId("none")}>
                        <Check className={cn("mr-2 h-4 w-4", contactId === "none" ? "opacity-100" : "opacity-0")} />
                        Libre (réservable)
                      </CommandItem>
                      {activeContacts.map(c => (
                        <CommandItem key={c.id} value={`${c.nom} ${c.prenom}`} onSelect={() => setContactId(c.id)}>
                          <Check className={cn("mr-2 h-4 w-4", contactId === c.id ? "opacity-100" : "opacity-0")} />
                          {c.nom} {c.prenom}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Statut */}
          {isEditing && (
            <div>
              <Label>Statut</Label>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="reserve">Réservé</SelectItem>
                  <SelectItem value="confirme">Confirmé</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="termine">Terminé</SelectItem>
                  <SelectItem value="annule">Annulé</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Lieu de départ */}
          <div>
            <Label>Lieu de départ</Label>
            <Input value={lieuDepart} onChange={e => setLieuDepart(e.target.value)} placeholder="Adresse de prise en charge" />
          </div>

          {/* Commentaires */}
          <div>
            <Label>Commentaires</Label>
            <Textarea value={commentaires} onChange={e => setCommentaires(e.target.value)} placeholder="Notes..." rows={2} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              disabled={!date || createCreneau.isPending || updateCreneau.isPending}
            >
              {isEditing ? "Mettre à jour" : "Créer le créneau"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
