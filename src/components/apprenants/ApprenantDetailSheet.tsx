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
import { ApprenantQuickView } from "./ApprenantQuickView";

interface ApprenantDetailSheetProps {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApprenantDetailSheet({ contactId, open, onOpenChange }: ApprenantDetailSheetProps) {
  const { data: contact, isLoading } = useContact(contactId);
  const isMobile = useIsMobile();

  if (!open) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh] overflow-hidden">
          <div className="overflow-y-auto max-h-[88vh]">
            <ApprenantQuickView
              contact={contact ?? null}
              isLoading={isLoading}
              onClose={() => onOpenChange(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[420px] p-0 overflow-hidden">
        <ApprenantQuickView
          contact={contact ?? null}
          isLoading={isLoading}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
