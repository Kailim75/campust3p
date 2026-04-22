import { Plus, UserPlus, TrendingUp, Calendar, Receipt, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface GlobalCreateMenuProps {
  onNewContact: () => void;
  onNewProspect: () => void;
  onNavigate: (section: string) => void;
}

/**
 * Unified "+" dropdown in the header.
 * Replaces the floating QuickActionsMenu (FAB) and centralises every
 * creation flow in a single, discoverable place.
 *
 * Items only trigger flows already implemented elsewhere — no new business logic.
 */
export function GlobalCreateMenu({ onNewContact, onNewProspect, onNavigate }: GlobalCreateMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Créer (raccourci N)"
              className="btn-cta flex items-center gap-1 sm:gap-1.5 text-[12px] sm:text-[13px] h-8 sm:h-9 px-2.5 sm:px-3.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Créer</span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Créer (N puis lettre)</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Personnes
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={onNewContact}>
          <UserPlus className="mr-2 h-4 w-4 text-primary" />
          <span className="flex-1">Nouvel apprenant</span>
          <kbd className="text-[10px] font-mono text-muted-foreground">N A</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onNewProspect}>
          <TrendingUp className="mr-2 h-4 w-4 text-primary" />
          <span className="flex-1">Nouveau prospect</span>
          <kbd className="text-[10px] font-mono text-muted-foreground">N P</kbd>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Activité
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onNavigate("sessions")}>
          <Calendar className="mr-2 h-4 w-4 text-primary" />
          <span className="flex-1">Planifier une session</span>
          <kbd className="text-[10px] font-mono text-muted-foreground">N S</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigate("finances")}>
          <Receipt className="mr-2 h-4 w-4 text-primary" />
          <span className="flex-1">Nouvelle facture</span>
          <kbd className="text-[10px] font-mono text-muted-foreground">N F</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigate("automations")}>
          <FileText className="mr-2 h-4 w-4 text-primary" />
          <span className="flex-1">Générer un document</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
