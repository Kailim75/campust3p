import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Mail, StickyNote, CalendarPlus, CreditCard, FileText, Award,
  Phone, SquareUser, FileCheck, Star, MoreHorizontal, Plus, Sparkles,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useState } from "react";

export interface ApprenantHeaderActionsProps {
  isSmartOFHistorical?: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  hasActiveEnrollment: boolean;
  onEmail: () => void;
  onWhatsApp: () => void;
  onCall: () => void;
  onNote: () => void;
  onAssignSession: () => void;
  onPayment: () => void;
  onGenerateDocument: () => void;
  onExam: () => void;
  onChevalet: () => void;
  onAttestationPresence: () => void;
  onEnquete: () => void;
}

/**
 * Barre d'actions unifiée pour l'en-tête de la fiche apprenant.
 * - Bouton primaire "Nouvelle action" listant toutes les actions.
 * - Raccourcis inline sur desktop (≥ md).
 * - Menu "Plus" pour les actions secondaires.
 * - Garde-fou SmartOF : confirmation avant inscription session.
 * Aucune logique métier : tous les handlers proviennent du parent.
 */
export function ApprenantHeaderActions({
  isSmartOFHistorical,
  hasEmail,
  hasPhone,
  hasActiveEnrollment,
  onEmail,
  onWhatsApp,
  onCall,
  onNote,
  onAssignSession,
  onPayment,
  onGenerateDocument,
  onExam,
  onChevalet,
  onAttestationPresence,
  onEnquete,
}: ApprenantHeaderActionsProps) {
  const [smartofConfirmOpen, setSmartofConfirmOpen] = useState(false);

  const handleAssign = () => {
    if (isSmartOFHistorical) {
      setSmartofConfirmOpen(true);
      return;
    }
    onAssignSession();
  };

  const confirmAssign = () => {
    setSmartofConfirmOpen(false);
    onAssignSession();
  };

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {/* Bouton primaire — Nouvelle action */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="default" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" /> Nouvelle action
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Communication</DropdownMenuLabel>
            <DropdownMenuItem onClick={onEmail} disabled={!hasEmail}>
              <Mail className="h-4 w-4 mr-2" /> Envoyer un email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onWhatsApp} disabled={!hasPhone}>
              <SiWhatsapp className="h-4 w-4 mr-2" /> WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCall} disabled={!hasPhone}>
              <Phone className="h-4 w-4 mr-2" /> Appeler
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNote}>
              <StickyNote className="h-4 w-4 mr-2" /> Ajouter une note
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Parcours</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleAssign}>
              <CalendarPlus className="h-4 w-4 mr-2" /> Inscrire à une session
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPayment}>
              <CreditCard className="h-4 w-4 mr-2" /> Ajouter un paiement
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onGenerateDocument}>
              <FileText className="h-4 w-4 mr-2" /> Générer un document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExam}>
              <Award className="h-4 w-4 mr-2" /> Planifier un examen
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Outils</DropdownMenuLabel>
            <DropdownMenuItem onClick={onChevalet}>
              <SquareUser className="h-4 w-4 mr-2" /> Chevalet
            </DropdownMenuItem>
            {hasActiveEnrollment && (
              <DropdownMenuItem onClick={onAttestationPresence}>
                <FileCheck className="h-4 w-4 mr-2" /> Attestation de présence
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onEnquete}>
              <Star className="h-4 w-4 mr-2" /> Envoyer enquête
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Raccourcis inline — desktop only (≥ md) */}
        <div className="hidden md:flex items-center gap-1.5 flex-wrap">
          {hasEmail && (
            <Button size="sm" variant="outline" className="text-xs" onClick={onEmail}>
              <Mail className="h-3 w-3 mr-1" /> Email
            </Button>
          )}
          {hasPhone && (
            <Button
              size="sm" variant="outline"
              className="text-xs text-success border-success/20 hover:bg-success/5"
              onClick={onWhatsApp}
            >
              <SiWhatsapp className="h-3 w-3 mr-1" /> WhatsApp
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs" onClick={onNote}>
            <StickyNote className="h-3 w-3 mr-1" /> Note
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={handleAssign}>
            <CalendarPlus className="h-3 w-3 mr-1" /> Inscrire
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={onPayment}>
            <CreditCard className="h-3 w-3 mr-1" /> Paiement
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={onGenerateDocument}>
            <FileText className="h-3 w-3 mr-1" /> Document
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={onExam}>
            <Award className="h-3 w-3 mr-1" /> Examen
          </Button>
        </div>

        {/* Menu "Plus" — actions secondaires */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs" aria-label="Plus d'actions">
              <MoreHorizontal className="h-3 w-3 mr-1" /> Plus
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {/* Sur mobile, on rend aussi les actions principales pour rester accessibles */}
            <div className="md:hidden">
              {hasEmail && (
                <DropdownMenuItem onClick={onEmail}>
                  <Mail className="h-4 w-4 mr-2" /> Email
                </DropdownMenuItem>
              )}
              {hasPhone && (
                <DropdownMenuItem onClick={onWhatsApp}>
                  <SiWhatsapp className="h-4 w-4 mr-2" /> WhatsApp
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onNote}>
                <StickyNote className="h-4 w-4 mr-2" /> Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAssign}>
                <CalendarPlus className="h-4 w-4 mr-2" /> Inscrire session
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPayment}>
                <CreditCard className="h-4 w-4 mr-2" /> Paiement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onGenerateDocument}>
                <FileText className="h-4 w-4 mr-2" /> Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExam}>
                <Award className="h-4 w-4 mr-2" /> Examen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>
            {hasPhone && (
              <DropdownMenuItem onClick={onCall}>
                <Phone className="h-4 w-4 mr-2" /> Appeler
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onChevalet}>
              <SquareUser className="h-4 w-4 mr-2" /> Chevalet
            </DropdownMenuItem>
            {hasActiveEnrollment && (
              <DropdownMenuItem onClick={onAttestationPresence}>
                <FileCheck className="h-4 w-4 mr-2" /> Attestation présence
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onEnquete}>
              <Star className="h-4 w-4 mr-2" /> Enquête satisfaction
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Garde-fou SmartOF — confirmation avant nouvelle inscription */}
      <AlertDialog open={smartofConfirmOpen} onOpenChange={setSmartofConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contact historique SmartOF</AlertDialogTitle>
            <AlertDialogDescription>
              Ce contact est un ancien apprenant importé de SmartOF. Confirmez-vous
              qu'il revient pour une nouvelle formation&nbsp;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAssign}>
              Oui, l'inscrire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
