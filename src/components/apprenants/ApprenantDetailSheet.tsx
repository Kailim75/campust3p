import { useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Archive, ExternalLink, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { useContact } from "@/hooks/useContact";
import { useIsMobile } from "@/hooks/use-mobile";
import { ApprenantDetailContent } from "./ApprenantDetailContent";
import { ContactSheetNavigator } from "./ContactSheetNavigator";
import { useContactSheetNavigation } from "@/hooks/useContactSheetNavigation";

interface ApprenantDetailSheetProps {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (contact: any) => void;
  /** Filtered list ids to allow ↑/↓ navigation between contacts */
  navigationIds?: string[];
  /** Called when the user navigates to another contact (↑ ↓ J K) */
  onNavigate?: (id: string) => void;
}

export function ApprenantDetailSheet({
  contactId,
  open,
  onOpenChange,
  onEdit,
  navigationIds = [],
  onNavigate,
}: ApprenantDetailSheetProps) {
  const { data: contact, isLoading } = useContact(contactId);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL sync : ?contact=<id> ────────────────────────────────────
  useEffect(() => {
    if (open && contactId) {
      if (searchParams.get("contact") !== contactId) {
        const next = new URLSearchParams(searchParams);
        next.set("contact", contactId);
        setSearchParams(next, { replace: true });
      }
    } else if (!open && searchParams.get("contact")) {
      const next = new URLSearchParams(searchParams);
      next.delete("contact");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contactId]);

  // ── Keyboard navigation between contacts (↑ ↓ J K) ───────────────
  const nav = useContactSheetNavigation({
    ids: navigationIds,
    currentId: contactId,
    enabled: open && !!onNavigate && navigationIds.length > 1,
    onChange: (id) => onNavigate?.(id),
  });

  // ── Shortcut: E to edit ──────────────────────────────────────────
  useEffect(() => {
    if (!open || !contact || !onEdit) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        onEdit(contact);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, contact, onEdit]);

  const handleOpenFullPage = useCallback(() => {
    if (!contactId) return;
    onOpenChange(false);
    navigate(`/contacts/${contactId}`);
  }, [contactId, navigate, onOpenChange]);

  if (!open) return null;

  // ── Inner content shared between Sheet & Drawer ──────────────────
  const inner = (
    <div className="flex flex-col h-full">
      {/* Top action bar : full page + edit + navigator */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-1">
          {onEdit && contact && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 gap-1 text-xs"
                    onClick={() => onEdit(contact)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Éditer</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">
                  Éditer la fiche <Kbd className="ml-1">E</Kbd>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 text-xs mr-8"
                onClick={handleOpenFullPage}
                disabled={!contactId}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pleine page</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              Ouvrir la fiche complète
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Navigator (only if list provided) */}
      {navigationIds.length > 1 && onNavigate && (
        <ContactSheetNavigator
          currentIndex={nav.currentIndex}
          total={nav.total}
          hasPrevious={nav.hasPrevious}
          hasNext={nav.hasNext}
          onPrevious={nav.goPrevious}
          onNext={nav.goNext}
        />
      )}

      {/* Archived banner */}
      {contact?.archived && (
        <div
          className="flex items-center gap-2 px-4 py-2 bg-warning/10 border-b border-warning/20 text-xs text-warning-foreground"
          role="status"
        >
          <Archive className="h-3.5 w-3.5 text-warning shrink-0" />
          <span className="font-medium text-warning">Cet apprenant est archivé.</span>
        </div>
      )}

      {/* Detail content */}
      <div className="flex-1 overflow-y-auto">
        <ApprenantDetailContent
          contact={contact ?? null}
          isLoading={isLoading}
          onEdit={onEdit}
          onClose={() => onOpenChange(false)}
        />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className="max-h-[95vh] h-[95vh] overflow-hidden"
          aria-label={contact ? `Fiche de ${contact.prenom} ${contact.nom}` : "Fiche apprenant"}
        >
          {inner}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[640px] lg:max-w-[720px] p-0 overflow-hidden"
        aria-label={contact ? `Fiche de ${contact.prenom} ${contact.nom}` : "Fiche apprenant"}
      >
        {inner}
      </SheetContent>
    </Sheet>
  );
}
