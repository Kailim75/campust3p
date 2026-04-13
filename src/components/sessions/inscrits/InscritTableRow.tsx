import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { TableCell, TableRow } from "@/components/ui/table";
import { EnvoiStatusBadge } from "@/components/documents/EnvoiStatusBadge";
import {
  Eye, Send, Trash2, FileDown, FileText, Edit, Receipt,
  CheckCircle2, XCircle, Clock, Award, ArrowRightLeft,
} from "lucide-react";
import type { FactureWithDetails } from "@/hooks/useFactures";
import type { DocumentType } from "@/hooks/useDocumentGenerator";
import { INSCRIPTION_STATUTS, getUrgency, type InscritRow, type ExamResult } from "./inscrits-types";

interface InscritTableRowProps {
  inscrit: InscritRow;
  selected: boolean;
  onToggleSelect: (contactId: string) => void;
  facture: FactureWithDetails | undefined;
  examResult: ExamResult | undefined;
  sessionDateFin: string | null | undefined;
  latestEnvoi: { statut: string; date_envoi: string; document_name: string } | null;
  onStatutChange: (inscriptionId: string, statut: string) => void;
  onExamToggle: (contactId: string, type: "theorie" | "pratique", current: string | null, formation: string) => void;
  onGenerateDocument: (type: DocumentType, contact: any) => void;
  onSendDocs: (contact: any) => void;
  onCreateFacture: (contactId: string) => void;
  onEditFacture: (facture: FactureWithDetails) => void;
  onViewFacture: (factureId: string) => void;
  onTransfer: (contactId: string, name: string) => void;
  onViewContact: (contactId: string) => void;
  onRemove: (contactId: string) => void;
  sessionFormationType?: string;
}

export function InscritTableRow({
  inscrit,
  selected,
  onToggleSelect,
  facture,
  examResult,
  sessionDateFin,
  latestEnvoi,
  onStatutChange,
  onExamToggle,
  onGenerateDocument,
  onSendDocs,
  onCreateFacture,
  onEditFacture,
  onViewFacture,
  onTransfer,
  onViewContact,
  onRemove,
  sessionFormationType,
}: InscritTableRowProps) {
  const urgency = getUrgency(inscrit, facture, examResult, sessionDateFin);
  const paidPercent = facture ? (facture.total_paye / Number(facture.montant_total)) * 100 : 0;
  const contact = inscrit.contact;

  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(inscrit.contact_id)}
        />
      </TableCell>
      <TableCell className="font-medium">
        {contact?.prenom} {contact?.nom}
      </TableCell>
      {/* CMA Statut */}
      <TableCell className="hidden sm:table-cell">
        <Select
          value={inscrit.statut}
          onValueChange={(value) => onStatutChange(inscrit.id, value)}
        >
          <SelectTrigger className="h-7 w-[130px] text-xs" onClick={(e) => e.stopPropagation()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INSCRIPTION_STATUTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${s.class}`}>
                  {s.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      {/* Théorie */}
      <TableCell className="hidden lg:table-cell text-center">
        <ExamCycleButton
          value={examResult?.theorie ?? null}
          label="Théorie"
          onClick={() => {
            const current = examResult?.theorie ?? null;
            const next = current === null ? "admis" : current === "admis" ? "ajourne" : null;
            onExamToggle(inscrit.contact_id, "theorie", next, contact?.formation || sessionFormationType || "VTC");
          }}
        />
      </TableCell>
      {/* Pratique */}
      <TableCell className="hidden lg:table-cell text-center">
        <ExamCycleButton
          value={examResult?.pratique ?? null}
          label="Pratique"
          onClick={() => {
            const current = examResult?.pratique ?? null;
            const next = current === null ? "admis" : current === "admis" ? "ajourne" : null;
            onExamToggle(inscrit.contact_id, "pratique", next, contact?.formation || sessionFormationType || "VTC");
          }}
        />
      </TableCell>
      {/* Département */}
      <TableCell className="hidden lg:table-cell text-center">
        {examResult?.departement ? (
          <Badge variant="outline" className="text-[10px] font-mono">{examResult.departement}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      {/* Facture */}
      <TableCell className="hidden md:table-cell">
        {facture ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onViewFacture(facture.id)}
                className="flex flex-col gap-1 text-left hover:opacity-80 transition-opacity"
              >
                <span className="font-mono text-xs">{facture.numero_facture}</span>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        paidPercent >= 100 ? "bg-success" : paidPercent > 0 ? "bg-warning" : "bg-destructive"
                      }`}
                      style={{ width: `${Math.min(paidPercent, 100)}%` }}
                    />
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1 py-0 ${
                      facture.statut === "payee" ? "border-success text-success" :
                      facture.statut === "partiel" ? "border-warning text-warning" :
                      facture.statut === "impayee" ? "border-destructive text-destructive" : ""
                    }`}
                  >
                    {facture.statut}
                  </Badge>
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{facture.total_paye.toFixed(2)}€ / {Number(facture.montant_total).toFixed(2)}€</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      {/* Dernière comm */}
      <TableCell className="hidden lg:table-cell">
        {latestEnvoi ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col gap-0.5 cursor-default">
                <EnvoiStatusBadge statut={latestEnvoi.statut} size="sm" />
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(latestEnvoi.date_envoi), "dd/MM", { locale: fr })}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs font-medium">{latestEnvoi.document_name}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(latestEnvoi.date_envoi), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      {/* Urgency */}
      <TableCell className="hidden lg:table-cell text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${
              urgency.level === "red" ? "bg-destructive" :
              urgency.level === "yellow" ? "bg-warning" : "bg-success"
            }`} />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{urgency.reasons.join(", ")}</p>
          </TooltipContent>
        </Tooltip>
      </TableCell>
      {/* Actions */}
      <TableCell>
        <div className="flex gap-1">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Générer un document">
                    <FileDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Générer un document</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onGenerateDocument("attestation", contact)}>
                <Award className="h-4 w-4 mr-2" /> Attestation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGenerateDocument("convention", contact)}>
                <FileText className="h-4 w-4 mr-2" /> Convention
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGenerateDocument("convocation", contact)}>
                <FileText className="h-4 w-4 mr-2" /> Convocation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => onSendDocs(contact)} aria-label="Envoyer des documents">
                <Send className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Envoyer des documents</TooltipContent>
          </Tooltip>

          {facture ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditFacture(facture)} aria-label="Modifier la facture">
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modifier la facture</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCreateFacture(inscrit.contact_id)} aria-label="Créer une facture">
                  <Receipt className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Créer une facture</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-info" onClick={() => onTransfer(inscrit.contact_id, `${contact?.prenom} ${contact?.nom}`)} aria-label="Transférer">
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Transférer vers une autre session</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewContact(inscrit.contact_id)} aria-label="Voir la fiche contact">
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voir la fiche contact</TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onRemove(inscrit.contact_id)}
            aria-label="Supprimer l'inscription"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/* ── Exam cycle button ── */
function ExamCycleButton({ value, label, onClick }: { value: string | null; label: string; onClick: () => void }) {
  const icon = value === "admis"
    ? <CheckCircle2 className="h-4 w-4 text-success" />
    : value === "ajourne"
    ? <XCircle className="h-4 w-4 text-destructive" />
    : <Clock className="h-3.5 w-3.5 text-muted-foreground" />;

  const tip = value === "admis"
    ? `${label} : Admis — Cliquer pour Ajourné`
    : value === "ajourne"
    ? `${label} : Ajourné — Cliquer pour réinitialiser`
    : `${label} : En attente — Cliquer pour Admis`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="p-1 rounded hover:bg-muted transition-colors mx-auto flex" onClick={onClick}>
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
