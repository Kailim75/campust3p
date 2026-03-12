import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { useContact } from "@/hooks/useContact";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSheetSize } from "@/hooks/useSheetSize";
import { ApprenantDetailContent } from "./ApprenantDetailContent";
import type { Contact } from "@/hooks/useContacts";
import { cn } from "@/lib/utils";

interface ApprenantDetailSheetProps {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (contact: Contact) => void;
}

export function ApprenantDetailSheet({ contactId, open, onOpenChange, onEdit }: ApprenantDetailSheetProps) {
  const { data: contact, isLoading } = useContact(contactId);
  const isMobile = useIsMobile();
  const { size, setSize, sizeClass } = useSheetSize("contact");

  if (!open) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh] overflow-hidden">
          <div className="overflow-y-auto max-h-[88vh]">
            <ApprenantDetailContent
              contact={contact ?? null}
              isLoading={isLoading}
              onEdit={onEdit}
              onClose={() => onOpenChange(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn(sizeClass, "p-0 overflow-hidden")} >
        <ApprenantDetailContent
          contact={contact ?? null}
          isLoading={isLoading}
          onEdit={onEdit}
          onClose={() => onOpenChange(false)}
          sheetSize={size}
          onSheetSizeChange={setSize}
        />
      </SheetContent>
    </Sheet>
  );
}
