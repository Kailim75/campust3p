import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Phone, MessageCircle, FileText, CreditCard, Info } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { openWhatsApp } from "@/lib/phone-utils";
import { cn } from "@/lib/utils";
import type { EnrichedContact } from "@/hooks/useEnrichedContacts";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { getActiveReasons, getActiveReasonLabel, isActiveApprenant } from "@/lib/apprenant-active";

const FORMATION_BADGE: Record<string, string> = {
  TAXI: "badge-soft badge-soft-blue",
  VTC: "badge-soft badge-soft-gray",
  VMDTR: "badge-soft badge-soft-teal",
};

// Normalized pedagogical statuses
function getPedagogicalStatus(statut: string | null): { label: string; className: string } {
  switch (statut) {
    case "En attente de validation":
      return { label: "En attente documents", className: "badge-soft badge-soft-amber" };
    case "En formation théorique":
    case "En formation pratique":
      return { label: "En formation", className: "badge-soft badge-soft-blue" };
    case "Examen T3P programmé":
      return { label: "Examen planifié", className: "badge-soft badge-soft-teal" };
    case "T3P obtenu":
    case "Client":
    case "Bravo":
      return { label: "Diplômé", className: "badge-soft badge-soft-green" };
    case "Abandonné":
      return { label: "Abandon", className: "badge-soft badge-soft-red" };
    default:
      return { label: statut || "—", className: "badge-soft badge-soft-gray" };
  }
}

const PAYMENT_CONFIG: Record<string, { label: string; className: string }> = {
  paye: { label: "Payé", className: "text-emerald-600" },
  partiel: { label: "Partiel", className: "text-amber-600" },
  retard: { label: "En retard", className: "text-destructive font-semibold" },
  attente: { label: "En attente", className: "text-muted-foreground" },
};

interface ApprenantTableRowProps {
  contact: EnrichedContact;
  expertMode: boolean;
  selected: boolean;
  onSelect?: (checked: boolean) => void;
  onClick: () => void;
}

export function ApprenantTableRow({
  contact,
  expertMode,
  selected,
  onSelect,
  onClick,
}: ApprenantTableRowProps) {
  const initials = `${contact.prenom.charAt(0)}${contact.nom.charAt(0)}`.toUpperCase();
  const pedStatus = getPedagogicalStatus(contact.statut);
  const payConfig = PAYMENT_CONFIG[contact.paymentStatus];
  const formationClass = contact.formation
    ? FORMATION_BADGE[contact.formation] || "badge-soft badge-soft-gray"
    : "";
  const activeReasons = getActiveReasons(contact);
  const active = activeReasons.length > 0;

  const sessionLabel = contact.sessionName
    ? contact.sessionDateDebut
      ? `${contact.sessionName}`
      : contact.sessionName
    : "—";

  const sessionSoon =
    contact.sessionDateDebut &&
    differenceInDays(new Date(contact.sessionDateDebut), new Date()) <= 14 &&
    differenceInDays(new Date(contact.sessionDateDebut), new Date()) >= 0;

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0 group"
      style={{ height: "52px" }}
      onClick={onClick}
    >
      {/* Checkbox (expert only) */}
      {expertMode && (
        <TableCell className="w-10 py-2" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect?.(!!checked)}
          />
        </TableCell>
      )}

      {/* Apprenant */}
      <TableCell className="py-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-semibold bg-primary/8 text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm text-foreground truncate max-w-[180px]">
            {contact.prenom} {contact.nom}
          </span>
          {active && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 cursor-help">
                  <Info className="h-2.5 w-2.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs max-w-52">
                <p className="font-medium mb-0.5">Actif car :</p>
                <ul className="list-disc pl-3 space-y-0">
                  {activeReasons.map(r => <li key={r}>{getActiveReasonLabel(r)}</li>)}
                </ul>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>

      {/* Formation */}
      <TableCell className="py-2">
        {contact.formation && (
          <span className={formationClass}>{contact.formation}</span>
        )}
      </TableCell>

      {/* Session */}
      <TableCell className="py-2">
        <span className={cn("text-xs", sessionSoon && "text-amber-600 font-medium")}>
          {sessionLabel}
        </span>
      </TableCell>

      {/* Statut pédagogique */}
      <TableCell className="py-2">
        <span className={pedStatus.className}>{pedStatus.label}</span>
      </TableCell>

      {/* Paiement */}
      <TableCell className="py-2">
        {contact.totalFacture > 0 ? (
          <div className="flex flex-col">
            <span className={cn("text-xs font-mono", payConfig.className)}>
              {contact.totalPaye}€ / {contact.totalFacture}€
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Actions (hover) */}
      <TableCell className="py-2">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {contact.telephone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `tel:${contact.telephone}`;
              }}
              aria-label="Appeler"
            >
              <Phone className="h-3.5 w-3.5" />
            </Button>
          )}
          {contact.telephone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-600"
              onClick={(e) => {
                e.stopPropagation();
                openWhatsApp(contact.telephone);
              }}
              aria-label="WhatsApp"
            >
              <SiWhatsapp className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            aria-label="Voir fiche"
          >
            <FileText className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>

      {/* ─── Expert columns ─── */}
      {expertMode && (
        <>
          {/* Dossier */}
          <TableCell className="py-2">
            {contact.documentsManquants === 0 ? (
              <span className="text-xs text-emerald-600 font-medium">Complet</span>
            ) : (
              <span
                className={cn(
                  "text-xs font-medium",
                  contact.documentsManquants >= 3
                    ? "text-destructive"
                    : "text-amber-600"
                )}
              >
                {contact.documentsManquants} manquant{contact.documentsManquants > 1 ? "s" : ""}
              </span>
            )}
          </TableCell>

          {/* Examen */}
          <TableCell className="py-2">
            {contact.examDate ? (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(contact.examDate), "dd MMM yyyy", { locale: fr })}
                </span>
                {contact.examResultat && (
                  <span
                    className={cn(
                      "text-[10px]",
                      contact.examResultat === "reussi"
                        ? "text-emerald-600"
                        : contact.examResultat === "echoue"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {contact.examResultat === "reussi"
                      ? "Réussi"
                      : contact.examResultat === "echoue"
                      ? "Échoué"
                      : contact.examResultat}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Non planifié</span>
            )}
          </TableCell>

          {/* Progression */}
          <TableCell className="py-2">
            {contact.progressionPercent !== null ? (
              <div className="flex items-center gap-2 min-w-[80px]">
                <Progress value={contact.progressionPercent} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground w-8 text-right">
                  {contact.progressionPercent}%
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>

          {/* Montant total */}
          <TableCell className="py-2 text-xs font-mono text-muted-foreground">
            {contact.totalFacture > 0 ? `${contact.totalFacture}€` : "—"}
          </TableCell>

          {/* Payé */}
          <TableCell className="py-2 text-xs font-mono text-muted-foreground">
            {contact.totalPaye > 0 ? `${contact.totalPaye}€` : "—"}
          </TableCell>

          {/* Reste dû */}
          <TableCell className="py-2">
            {contact.totalFacture > 0 ? (
              <span
                className={cn(
                  "text-xs font-mono",
                  contact.totalFacture - contact.totalPaye > 0
                    ? "text-destructive font-medium"
                    : "text-emerald-600"
                )}
              >
                {Math.max(0, contact.totalFacture - contact.totalPaye)}€
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
