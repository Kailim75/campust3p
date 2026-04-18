import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";
import { Kbd, isMac } from "@/components/ui/kbd";
import { shortcutGroups } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Renders a key, replacing ⌘ with "Ctrl" on non-Mac. */
function renderKey(key: string): string {
  if (key === "⌘" && !isMac()) return "Ctrl";
  return key;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" aria-label="Liste des raccourcis clavier">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </DialogTitle>
          <DialogDescription>
            Naviguez et créez plus vite avec ces raccourcis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {group.title}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <Kbd>{renderKey(key)}</Kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">
                              {group.title.startsWith("Navigation") || group.title.startsWith("Création") ? "puis" : "+"}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Appuyez sur <Kbd>Esc</Kbd> pour fermer
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
