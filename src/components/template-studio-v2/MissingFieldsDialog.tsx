// ═══════════════════════════════════════════════════════════════
// MissingFieldsDialog — Warns about missing template variables
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, ExternalLink } from "lucide-react";

interface MissingFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingFields: string[];
  templateName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  nom: "Nom", prenom: "Prénom", email: "Email", telephone: "Téléphone",
  date_naissance: "Date de naissance", adresse: "Adresse", ville: "Ville",
  code_postal: "Code postal", rue: "Rue", civilite: "Civilité",
  session_nom: "Nom de session", session_date_debut: "Date début session",
  session_date_fin: "Date fin session", duree_heures: "Durée (heures)",
  formation_type: "Type de formation", lieu: "Lieu", formateur_nom: "Formateur",
  centre_nom: "Nom du centre", centre_siret: "SIRET", centre_nda: "NDA",
  centre_adresse: "Adresse du centre", centre_email: "Email du centre",
  centre_telephone: "Tél. du centre", responsable_nom: "Responsable",
};

export function MissingFieldsDialog({
  open, onOpenChange, missingFields, templateName, onConfirm, onCancel,
}: MissingFieldsDialogProps) {
  const [forceGenerate, setForceGenerate] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Champs manquants
          </DialogTitle>
          <DialogDescription>
            Le template <strong>"{templateName}"</strong> utilise des variables dont la valeur est vide ou absente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {missingFields.map((field) => (
              <Badge key={field} variant="outline" className="text-xs text-warning bg-warning/10 border-warning/20">
                {FIELD_LABELS[field] || field}
              </Badge>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Ces champs apparaîtront vides dans le document généré. Complétez la fiche contact ou session pour un résultat optimal.
          </p>

          <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/50 border">
            <label htmlFor="force-gen" className="text-sm cursor-pointer">
              Générer quand même (admin)
            </label>
            <Switch id="force-gen" checked={forceGenerate} onCheckedChange={setForceGenerate} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Compléter les données
          </Button>
          <Button
            disabled={!forceGenerate}
            onClick={() => { onConfirm(); onOpenChange(false); }}
          >
            Générer quand même
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Utility: extract used variables from template body ──

export function extractTemplateVariables(body: string): string[] {
  const matches = [...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  return [...new Set(matches)];
}

export function findMissingVariables(
  templateBody: string,
  variables: Record<string, string>,
): string[] {
  const used = extractTemplateVariables(templateBody);
  return used.filter((v) => !variables[v] || variables[v].trim() === "");
}
