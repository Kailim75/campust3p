// ═══════════════════════════════════════════════════════════════
// ContratConduiteDialog — Wizard de génération du contrat
// produit autonome (Taxi / VTC), sans session.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Car, FileText } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useContact } from "@/hooks/useContact";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import {
  useContratConduiteTemplate,
  useCreateContratConduite,
  renderContratConduiteHtml,
  type ContratConduiteCreateParams,
} from "@/hooks/useContratConduite";
import {
  getProduitConduiteByFiliere,
  type FiliereConduite,
} from "@/lib/documents/conduite/produitsCatalogue";
import { validateContratConduite } from "@/lib/documents/conduite/contratConduiteValidator";
import { ContratConduitePreview } from "./ContratConduitePreview";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  centreId: string;
  initialFiliere?: FiliereConduite;
  factureId?: string | null;
  factureLigneId?: string | null;
  initialPrixTtc?: number;
  initialMontantPaye?: number;
  initialResteAPayer?: number;
  lockFiliere?: boolean;
}

export function ContratConduiteDialog({
  open,
  onOpenChange,
  contactId,
  centreId,
  initialFiliere,
  factureId,
  factureLigneId,
  initialPrixTtc,
  initialMontantPaye,
  initialResteAPayer,
  lockFiliere,
}: Props) {
  const [filiere, setFiliere] = useState<FiliereConduite>(initialFiliere ?? "taxi");
  const [prixTtc, setPrixTtc] = useState<number>(initialPrixTtc ?? 0);
  const [montantPaye, setMontantPaye] = useState<number>(initialMontantPaye ?? 0);
  const [justification, setJustification] = useState("");
  const [dateConduite, setDateConduite] = useState("");
  const [dateExamen, setDateExamen] = useState("");
  const [lieuRdv, setLieuRdv] = useState("");
  const [accompagnateur, setAccompagnateur] = useState("");

  const { data: contact } = useContact(contactId);
  const { centreFormation } = useCentreFormation();
  const { data: template, isLoading: tplLoading } = useContratConduiteTemplate(filiere);
  const createMut = useCreateContratConduite();

  // Reset prix on filière change (only when not driven by an invoice)
  useEffect(() => {
    if (initialPrixTtc != null) return;
    setPrixTtc(getProduitConduiteByFiliere(filiere).prix_ttc);
    setJustification("");
  }, [filiere, initialPrixTtc]);

  const resteAPayer = useMemo(() => {
    if (initialResteAPayer != null && initialMontantPaye === montantPaye && initialPrixTtc === prixTtc) {
      return initialResteAPayer;
    }
    return Math.max(0, Math.round((prixTtc - montantPaye) * 100) / 100);
  }, [prixTtc, montantPaye, initialResteAPayer, initialMontantPaye, initialPrixTtc]);

  const validation = useMemo(
    () => validateContratConduite({ filiere, prix_ttc: prixTtc, justification_prix: justification }),
    [filiere, prixTtc, justification]
  );

  const params: ContratConduiteCreateParams = {
    contactId,
    centreId,
    filiere,
    prix_ttc: prixTtc,
    montant_paye: montantPaye,
    reste_a_payer: resteAPayer,
    facture_id: factureId ?? null,
    facture_ligne_id: factureLigneId ?? null,
    date_conduite: dateConduite || null,
    date_examen: dateExamen || null,
    lieu_rdv: lieuRdv || null,
    accompagnateur: accompagnateur || null,
    justification_prix: justification || null,
    contactData: contact
      ? {
          nom: contact.nom,
          prenom: contact.prenom,
          email: contact.email,
          telephone: (contact as any).telephone,
          adresse: (contact as any).adresse,
          code_postal: (contact as any).code_postal,
          ville: (contact as any).ville,
        }
      : null,
    centreData: centreFormation
      ? {
          raison_sociale: (centreFormation as any).raison_sociale ?? (centreFormation as any).nom,
          adresse: (centreFormation as any).adresse,
          siret: (centreFormation as any).siret,
          numero_da: (centreFormation as any).numero_da,
          email: (centreFormation as any).email,
          telephone: (centreFormation as any).telephone,
        }
      : null,
  };

  const previewHtml = useMemo(() => {
    if (!template?.body_html) return null;
    return renderContratConduiteHtml(template.body_html, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.body_html, filiere, prixTtc, montantPaye, resteAPayer, dateConduite, dateExamen, lieuRdv, accompagnateur, contact]);

  const handleGenerate = async () => {
    if (!template?.id) return;
    await createMut.mutateAsync({
      ...params,
      templateId: template.id,
      renderedHtml: previewHtml ?? undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Contrat d'accompagnement à la conduite
          </DialogTitle>
          <DialogDescription>
            Produit autonome — non rattaché à une session de formation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Filière</Label>
              <ToggleGroup
                type="single"
                value={filiere}
                onValueChange={(v) => v && setFiliere(v as FiliereConduite)}
                className="justify-start"
              >
                <ToggleGroupItem value="taxi">Taxi — 249 €</ToggleGroupItem>
                <ToggleGroupItem value="vtc">VTC — 190 €</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div>
              <Label htmlFor="prix">Prix TTC (€)</Label>
              <Input
                id="prix"
                type="number"
                min={0}
                step="0.01"
                value={prixTtc}
                onChange={(e) => setPrixTtc(Number(e.target.value))}
              />
            </div>

            {validation.priceAlert && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Écart de prix détecté</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    Prix catalogue : <strong>{validation.expectedPrice} €</strong>. Une justification est obligatoire.
                  </p>
                  <Textarea
                    placeholder="Justification (ex: geste commercial, remise partenaire…)"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                  />
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="date_c">Date conduite</Label>
                <Input id="date_c" type="date" value={dateConduite} onChange={(e) => setDateConduite(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="date_e">Date examen</Label>
                <Input id="date_e" type="date" value={dateExamen} onChange={(e) => setDateExamen(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="lieu">Lieu de rendez-vous</Label>
              <Input id="lieu" value={lieuRdv} onChange={(e) => setLieuRdv(e.target.value)} placeholder="ex: Centre d'examen de Versailles" />
            </div>
            <div>
              <Label htmlFor="acc">Accompagnateur / formateur</Label>
              <Input id="acc" value={accompagnateur} onChange={(e) => setAccompagnateur(e.target.value)} />
            </div>

            {!tplLoading && !template && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Template manquant</AlertTitle>
                <AlertDescription>
                  Aucun template publié de type <code>contrat_conduite</code> pour la filière {filiere.toUpperCase()}.
                  Créez-le dans Template Studio avant d'utiliser cette fonctionnalité.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <Label className="mb-2 block flex items-center gap-1">
              <FileText className="h-4 w-4" /> Aperçu
            </Label>
            <ContratConduitePreview html={previewHtml} loading={tplLoading} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!template?.id || !validation.ok || createMut.isPending}
          >
            {createMut.isPending ? "Génération…" : "Générer le contrat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
