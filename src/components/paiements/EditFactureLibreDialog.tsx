import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  useUpdateFacture,
  useAnnulationManuellePermise,
  lireStatutFactureEnBase,
  FactureUpdate,
  FinancementType,
  FactureStatut,
} from "@/hooks/useFactures";
import { useFactureLignes, useUpdateFactureLigne } from "@/hooks/useFactureLignes";
import { useQueryClient } from "@tanstack/react-query";
import { messageErreur } from "@/lib/erreurs";
import {
  demandeConfirmationAnnulation,
  estFactureEmise,
  executerPlanEnregistrement,
  optionsStatutFactureEmise,
  planifierEnregistrementFacture,
} from "@/lib/factures-emises";
import { ConfirmationAnnulationFactureDialog } from "./ConfirmationAnnulationFactureDialog";

interface EditFactureLibreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facture: {
    id: string;
    numero_facture?: string;
    montant_total: number;
    type_financement?: string;
    statut: string;
    commentaires?: string | null;
  } | null;
  contactId: string;
}

const financementOptions: { value: FinancementType; label: string }[] = [
  { value: "personnel", label: "Personnel" },
  { value: "entreprise", label: "Entreprise" },
  { value: "cpf", label: "CPF" },
  { value: "opco", label: "OPCO" },
];

const statutOptions: { value: FactureStatut; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "emise", label: "Émise" },
  { value: "payee", label: "Payée" },
  { value: "partiel", label: "Partiel" },
  { value: "impayee", label: "Impayée" },
  { value: "annulee", label: "Annulée" },
];

export function EditFactureLibreDialog({ open, onOpenChange, facture, contactId }: EditFactureLibreDialogProps) {
  const queryClient = useQueryClient();
  const updateFacture = useUpdateFacture();
  const updateLigne = useUpdateFactureLigne();
  const { data: lignes, isLoading: lignesLoading } = useFactureLignes(facture?.id || null);

  // Facture déjà émise à l'ouverture : contenu figé (D2 du 11/09/2026), seul
  // le statut reste modifiable.
  const lectureSeule = !!facture && estFactureEmise(facture.statut);
  const { data: annulationPermise = true } = useAnnulationManuellePermise(open && lectureSeule);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [montant, setMontant] = useState("");
  const [libelle, setLibelle] = useState("");
  const [financement, setFinancement] = useState<FinancementType>("personnel");
  const [statut, setStatut] = useState<FactureStatut>("emise");
  const [commentaires, setCommentaires] = useState("");
  const [confirmationAnnulation, setConfirmationAnnulation] = useState(false);

  useEffect(() => {
    if (facture && open) {
      setMontant(String(facture.montant_total || ""));
      setFinancement((facture.type_financement as FinancementType) || "personnel");
      setStatut((facture.statut as FactureStatut) || "emise");
      setCommentaires(facture.commentaires || "");
    }
  }, [facture, open]);

  useEffect(() => {
    if (lignes && lignes.length > 0 && open) {
      setLibelle(lignes[0].description || "");
    }
  }, [lignes, open]);

  const enregistrer = async () => {
    if (!facture) return;
    setIsSubmitting(true);
    try {
      let statutEnBase: string;
      try {
        statutEnBase = await lireStatutFactureEnBase(facture.id);
      } catch (error) {
        toast.error(messageErreur(error, "Impossible de relire la facture avant l'enregistrement"));
        return;
      }

      const montantTotal = parseFloat(montant);
      const premiereLigne = lignes && lignes.length > 0 ? lignes[0] : null;
      const plan = planifierEnregistrementFacture({
        numeroFacture: facture.numero_facture,
        statutOuverture: facture.statut,
        statutEnBase,
        valeursFacture: {
          montant_total: montantTotal,
          type_financement: financement,
          statut,
          commentaires: commentaires || null,
        },
        avecLignes: !!premiereLigne,
      });
      if ("message" in plan) {
        toast.error(plan.message);
        return;
      }
      if (plan.etapes.length === 0) {
        toast.info("Aucune modification à enregistrer");
        onOpenChange(false);
        return;
      }

      // Brouillon : première ligne PUIS facture. Émise : { statut } seul.
      await executerPlanEnregistrement(plan, {
        ecrireLignes: async () => {
          if (!premiereLigne) return;
          await updateLigne.mutateAsync({
            id: premiereLigne.id,
            factureId: facture.id,
            description: libelle,
            prix_unitaire_ht: montantTotal,
          });
        },
        ecrireFacture: async (valeurs) => {
          await updateFacture.mutateAsync({ id: facture.id, ...(valeurs as FactureUpdate) });
        },
      });

      queryClient.invalidateQueries({ queryKey: ["apprenant-factures", contactId] });
      queryClient.invalidateQueries({ queryKey: ["apprenant-paiements", contactId] });
      toast.success(lectureSeule && statut === "annulee" ? "Facture annulée" : "Facture mise à jour");
      onOpenChange(false);
    } catch (error) {
      // Le motif est déjà affiché par le hook de mutation (messageErreur).
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facture) return;
    if (!lectureSeule && (!montant || parseFloat(montant) <= 0)) { toast.error("Montant invalide"); return; }
    if (demandeConfirmationAnnulation(facture.statut, statut)) {
      setConfirmationAnnulation(true);
      return;
    }
    await enregistrer();
  };

  const optionsStatut = lectureSeule && facture
    ? optionsStatutFactureEmise(facture.statut, annulationPermise)
    : statutOptions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lectureSeule ? <Lock className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
            {lectureSeule ? "Facture émise" : "Modifier la facture"}
            {facture?.numero_facture && (
              <Badge variant="outline" className="font-mono text-xs">{facture.numero_facture}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {lectureSeule && (
            <Alert>
              <AlertDescription className="text-xs">
                Contenu figé depuis l'émission (libellé, montant, financement, observations). Seul le
                statut peut encore changer. En cas d'erreur, passez-la au statut « Annulée » puis créez
                une nouvelle facture.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label>Libellé *</Label>
            <Input value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="Ex: Forfait accompagnement administratif" disabled={lectureSeule} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Montant HT (€) *</Label>
              <Input type="number" step="0.01" min="0" value={montant} onChange={e => setMontant(e.target.value)} placeholder="0.00" disabled={lectureSeule} />
            </div>
            <div className="space-y-1.5">
              <Label>Financement</Label>
              <Select value={financement} onValueChange={v => setFinancement(v as FinancementType)} disabled={lectureSeule}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {financementOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={statut} onValueChange={v => setStatut(v as FactureStatut)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {optionsStatut.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Commentaires</Label>
            <Textarea value={commentaires} onChange={e => setCommentaires(e.target.value)} placeholder="Notes internes..." rows={2} disabled={lectureSeule} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting || (!lectureSeule && lignesLoading)}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {lectureSeule ? "Enregistrer le statut" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
      <ConfirmationAnnulationFactureDialog
        open={confirmationAnnulation}
        onOpenChange={setConfirmationAnnulation}
        numeroFacture={facture?.numero_facture}
        enCours={isSubmitting}
        onConfirm={() => {
          setConfirmationAnnulation(false);
          void enregistrer();
        }}
      />
    </Dialog>
  );
}
