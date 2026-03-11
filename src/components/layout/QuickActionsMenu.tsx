import { useState, useEffect } from "react";
import { 
  Plus, 
  X, 
  UserPlus, 
  Calendar, 
  CreditCard, 
  FileText,
  Send,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export type QuickAction = 
  | "contact" 
  | "session" 
  | "paiement" 
  | "document" 
  | "communication"
  | "inscription";

interface QuickActionsMenuProps {
  onAction: (action: QuickAction) => void;
}

const actions = [
  { 
    id: "contact" as const, 
    label: "Nouvel apprenant", 
    icon: UserPlus, 
    color: "bg-primary text-primary-foreground hover:bg-primary/90",
    shortcut: "N"
  },
  { 
    id: "session" as const, 
    label: "Nouvelle session", 
    icon: Calendar, 
    color: "bg-info text-info-foreground hover:bg-info/90",
    shortcut: "S"
  },
  { 
    id: "inscription" as const, 
    label: "Inscrire un stagiaire", 
    icon: GraduationCap, 
    color: "bg-success text-success-foreground hover:bg-success/90",
    shortcut: "I"
  },
  { 
    id: "paiement" as const, 
    label: "Enregistrer paiement", 
    icon: CreditCard, 
    color: "bg-warning text-warning-foreground hover:bg-warning/90",
    shortcut: "P"
  },
  { 
    id: "document" as const, 
    label: "Nouveau document", 
    icon: FileText, 
    color: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    shortcut: "D"
  },
  { 
    id: "communication" as const, 
    label: "Envoyer message", 
    icon: Send, 
    color: "bg-accent text-accent-foreground hover:bg-accent/90",
    shortcut: "M"
  },
];

export function QuickActionsMenu({ onAction }: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: QuickAction) => {
    onAction(action);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        const action = actions.find(a => a.shortcut.toLowerCase() === e.key.toLowerCase());
        if (action) {
          e.preventDefault();
          handleAction(action.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB and Menu Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
        {/* Action Items */}
        <AnimatePresence>
          {isOpen && (
            <>
              {actions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: { delay: index * 0.05 }
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: 20, 
                    scale: 0.8,
                    transition: { delay: (actions.length - index) * 0.03 }
                  }}
                  className="flex items-center gap-3"
                >
                  {/* Label */}
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 + 0.1 } }}
                    className="px-3 py-1.5 bg-card rounded-lg shadow-lg text-sm font-medium whitespace-nowrap border border-border"
                  >
                    {action.label}
                    <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-muted rounded opacity-60">
                      ⌘{action.shortcut}
                    </kbd>
                  </motion.span>
                  
                  {/* Action Button */}
                  <Button
                    size="icon"
                    className={cn(
                      "h-12 w-12 rounded-full shadow-lg transition-all duration-200 hover:scale-110",
                      action.color
                    )}
                    onClick={() => handleAction(action.id)}
                  >
                    <action.icon className="h-5 w-5" />
                  </Button>
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.div
          animate={{ rotate: isOpen ? 135 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-xl transition-all duration-300",
              isOpen 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                : "btn-gradient hover:shadow-2xl hover:scale-105"
            )}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </Button>
        </motion.div>
      </div>
    </>
  );
}
