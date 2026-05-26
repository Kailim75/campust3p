import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { HelpCenterDrawer } from "./HelpCenterDrawer";

/**
 * Bouton flottant "?" — ouvre le centre d'aide contextuel.
 * Masqué sur les pages publiques (auth, signature, enquête, etc.).
 */
const HIDDEN_ON = [
  "/auth",
  "/reset-password",
  "/signature",
  "/enquete",
  "/certificat",
  "/install",
  "/landing",
  "/presentation",
  "/mentions-legales",
  "/politique-confidentialite",
  "/flyer",
  "/reserver",
];

export function HelpFloatingButton() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 print:hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="default"
              onClick={() => setOpen(true)}
              className="h-11 w-11 rounded-full shadow-lg hover:shadow-xl transition-shadow"
              aria-label="Ouvrir le centre d'aide"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Aide & raccourcis</TooltipContent>
        </Tooltip>
      </div>
      <HelpCenterDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
