import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList, Handshake, Flag, MapPin, CheckSquare, Lightbulb, FileText, Plus, Pencil,
} from "lucide-react";
import { useRessources, useCreateRessource, useUpdateRessource, RessourceConduite } from "@/hooks/usePlanningConduite";

const CATEGORIE_CONFIG: Record<string, { icon: any; label: string; emoji: string }> = {
  regles_centre: { icon: ClipboardList, label: "Règles du centre", emoji: "📋" },
  regles_formateur: { icon: Handshake, label: "Règles vis-à-vis du formateur", emoji: "🤝" },
  deroulement_examen: { icon: Flag, label: "Déroulement de l'examen pratique", emoji: "🏁" },
  adresses_secteur: { icon: MapPin, label: "Adresses et secteur d'examen", emoji: "📍" },
  checklist_jour_j: { icon: CheckSquare, label: "Checklist jour J", emoji: "✅" },
  conseils_conduite: { icon: Lightbulb, label: "Conseils de conduite", emoji: "💡" },
  documents_apporter: { icon: FileText, label: "Documents à apporter", emoji: "📄" },
};

const DEFAULT_CONTENT: Record<string, string> = {
  regles_centre: `• Être présent 10 min avant l'heure de rendez-vous
• Prévenir au moins 24h à l'avance en cas d'annulation
• Toute séance non annulée dans les délais est décomptée
• Respecter le véhicule (pas de nourriture, propreté)
• Téléphone portable interdit pendant la conduite
• En cas de retard > 15 min, la séance peut être annulée`,
  regles_formateur: `• Tutoiement bienvenu, respect mutuel obligatoire
• Ne pas contester les corrections pendant la conduite
• Poser ses questions avant ou après la séance
• Appliquer les consignes immédiatement, analyser ensuite
• Le formateur a autorité sur le freinage d'urgence`,
  deroulement_examen: `1. Arrivée au centre d'examen 20 min avant
2. Présentation des documents à l'accueil
3. Vérification du véhicule avec l'examinateur
4. Parcours de 45 min en conditions réelles
5. Debriefing immédiat avec l'examinateur
6. Résultat communiqué sur place ou sous 48h`,
  adresses_secteur: `Secteur d'examen : Montrouge / Paris sud

Points clés à maîtriser :
• Rond-point de la Vache Noire — Arcueil
• Carrefour Porte d'Orléans
• Avenue de la République — Montrouge
• Zone stationnement Mairie de Montrouge
• Boulevard périphérique — insertion Porte de Gentilly`,
  checklist_jour_j: `□ CNI ou passeport
□ Convocation d'examen imprimée
□ Attestation formation
□ Attestation médicale valide
□ Arriver 20 min en avance
□ Vêtements confortables
□ Téléphone chargé (éteint pendant l'examen)
□ Avoir mangé et bien dormi`,
  conseils_conduite: `**Conduite défensive**
Anticipez les actions des autres usagers, gardez toujours une distance de sécurité.

**Gestion du stress**
Respirez profondément avant de démarrer. L'examinateur n'est pas là pour vous piéger.

**Technique créneaux**
Repérez bien vos points de repère, tournez le volant à fond et contrôlez vos rétros.

**Priorités**
En cas de doute, laissez la priorité. Mieux vaut attendre que prendre un risque.`,
  documents_apporter: `• CNI ou passeport en cours de validité
• Permis de conduire (catégorie B)
• Convocation d'examen
• Attestation de formation (délivrée par le centre)
• Certificat médical (selon type d'examen)
• Photo d'identité récente`,
};

export function RessourcesTab() {
  const { data: ressources, isLoading } = useRessources();
  const [formOpen, setFormOpen] = useState(false);
  const [editRessource, setEditRessource] = useState<RessourceConduite | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  // Group by category, fill with defaults if empty
  const categories = Object.entries(CATEGORIE_CONFIG);
  const grouped = categories.map(([key, config]) => {
    const items = (ressources || []).filter((r) => r.categorie === key);
    return { key, config, items };
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Ajouter une ressource
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={categories.map(([k]) => k)} className="space-y-2">
        {grouped.map(({ key, config, items }) => (
          <AccordionItem key={key} value={key} className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.emoji}</span>
                <span className="font-semibold">{config.label}</span>
                <Badge variant="outline" className="text-xs">{items.length || 1}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((r) => (
                    <div key={r.id} className="relative group">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {r.contenu}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setEditRessource(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {DEFAULT_CONTENT[key] || "Aucun contenu"}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Create modal */}
      <RessourceFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        ressource={null}
      />

      {/* Edit modal */}
      {editRessource && (
        <RessourceFormModal
          open={!!editRessource}
          onOpenChange={(v) => !v && setEditRessource(null)}
          ressource={editRessource}
        />
      )}
    </div>
  );
}

function RessourceFormModal({
  open,
  onOpenChange,
  ressource,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ressource: RessourceConduite | null;
}) {
  const createRessource = useCreateRessource();
  const updateRessource = useUpdateRessource();
  const isEdit = !!ressource;

  const [titre, setTitre] = useState(ressource?.titre || "");
  const [categorie, setCategorie] = useState(ressource?.categorie || "regles_centre");
  const [contenu, setContenu] = useState(ressource?.contenu || "");
  const [typeContenu, setTypeContenu] = useState(ressource?.type_contenu || "texte");
  const [formationCible, setFormationCible] = useState(ressource?.formation_cible || "tous");
  const [ordre, setOrdre] = useState(ressource?.ordre_affichage || 0);

  const handleSubmit = () => {
    if (!titre.trim() || !contenu.trim()) return;

    if (isEdit) {
      updateRessource.mutate(
        { id: ressource.id, titre, categorie: categorie as any, contenu, type_contenu: typeContenu as any, formation_cible: formationCible as any, ordre_affichage: ordre },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createRessource.mutate(
        { titre, categorie: categorie as any, type_contenu: typeContenu as any, contenu, formation_cible: formationCible as any, ordre_affichage: ordre },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la ressource" : "Nouvelle ressource"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Catégorie</Label>
              <Select value={categorie} onValueChange={setCategorie}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Formation cible</Label>
              <Select value={formationCible} onValueChange={setFormationCible}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous</SelectItem>
                  <SelectItem value="taxi_initial">Taxi initial</SelectItem>
                  <SelectItem value="vtc">VTC</SelectItem>
                  <SelectItem value="vmdtr">VMDTR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Contenu</Label>
            <Textarea value={contenu} onChange={(e) => setContenu(e.target.value)} rows={8} placeholder="Contenu markdown..." />
          </div>
          <div>
            <Label>Ordre d'affichage</Label>
            <Input type="number" value={ordre} onChange={(e) => setOrdre(Number(e.target.value))} className="w-20" />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={createRessource.isPending || updateRessource.isPending}
            className="w-full"
          >
            {isEdit ? "Mettre à jour" : "Ajouter la ressource"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
