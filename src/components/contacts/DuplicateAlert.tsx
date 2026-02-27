import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { DuplicateContact } from "@/hooks/useDuplicateCheck";

interface DuplicateAlertProps {
  duplicates: DuplicateContact[];
}

const matchLabels: Record<string, string> = {
  email: "Même email",
  nom_prenom_naissance: "Nom + prénom + date de naissance identiques",
  nom_prenom: "Nom + prénom similaires",
};

export function DuplicateAlert({ duplicates }: DuplicateAlertProps) {
  if (duplicates.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-warning/50 bg-warning/10 text-warning-foreground">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning font-semibold">
        {duplicates.length === 1 ? "Doublon potentiel détecté" : `${duplicates.length} doublons potentiels détectés`}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        {duplicates.map((d) => (
          <div key={d.id} className="flex items-center gap-2 text-sm">
            <span className="font-medium">{d.prenom} {d.nom}</span>
            {d.email && <span className="text-muted-foreground">({d.email})</span>}
            {d.formation && <Badge variant="outline" className="text-xs">{d.formation}</Badge>}
            <Badge variant="secondary" className="text-xs bg-warning/20 text-warning">
              {matchLabels[d.match_type] || d.match_type}
            </Badge>
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-1">
          Vérifiez qu'il ne s'agit pas d'un contact déjà existant avant de continuer.
        </p>
      </AlertDescription>
    </Alert>
  );
}
