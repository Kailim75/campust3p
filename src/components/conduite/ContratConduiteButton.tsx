import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Car } from "lucide-react";
import { ContratConduiteDialog } from "./ContratConduiteDialog";
import type { FiliereConduite } from "@/lib/documents/conduite/produitsCatalogue";

interface Props extends Omit<ButtonProps, "onClick"> {
  contactId: string;
  centreId: string;
  initialFiliere?: FiliereConduite;
  factureId?: string | null;
  factureLigneId?: string | null;
  initialPrixTtc?: number;
  initialMontantPaye?: number;
  initialResteAPayer?: number;
  lockFiliere?: boolean;
  label?: string;
}

export function ContratConduiteButton({
  contactId,
  centreId,
  initialFiliere,
  factureId,
  factureLigneId,
  initialPrixTtc,
  initialMontantPaye,
  initialResteAPayer,
  lockFiliere,
  label = "Générer contrat accompagnement conduite",
  ...btnProps
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" {...btnProps} onClick={() => setOpen(true)}>
        <Car className="h-4 w-4 mr-1.5" />
        {label}
      </Button>
      {open && (
        <ContratConduiteDialog
          open={open}
          onOpenChange={setOpen}
          contactId={contactId}
          centreId={centreId}
          initialFiliere={initialFiliere}
          factureId={factureId}
          factureLigneId={factureLigneId}
          initialPrixTtc={initialPrixTtc}
          initialMontantPaye={initialMontantPaye}
          initialResteAPayer={initialResteAPayer}
          lockFiliere={lockFiliere}
        />
      )}
    </>
  );
}
