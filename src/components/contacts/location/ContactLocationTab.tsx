import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  FileSignature, 
  Calendar, 
  Euro,
  ChevronRight,
  Car,
  Package,
  FileText,
  PenLine,
  CheckCircle2,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  useContactContrats, 
  useSendContratForSignature,
  contratStatutConfig, 
  contratTypeLabels,
  type ContratLocation 
} from "@/hooks/useContratsLocation";
import { ContratFormDialog } from "./ContratFormDialog";
import { ContratSignatureDialog } from "./ContratSignatureDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ContactLocationTabProps {
  contactId: string;
}

export function ContactLocationTab({ contactId }: ContactLocationTabProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingContrat, setEditingContrat] = useState<ContratLocation | null>(null);
  const [signingContrat, setSigningContrat] = useState<ContratLocation | null>(null);
  const { data: contrats = [], isLoading } = useContactContrats(contactId);
  const sendForSignature = useSendContratForSignature();

  const handleResend = (contratId: string) => {
    sendForSignature.mutate({ contratId });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Contrats de Location
        </h3>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nouveau contrat
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : contrats.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileSignature className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Aucun contrat de location</p>
          <p className="text-sm mt-1">Créez un contrat pour louer un véhicule ou du matériel</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-3">
            {contrats.map((contrat) => (
              <ContratCard 
                key={contrat.id} 
                contrat={contrat} 
                onClick={() => setEditingContrat(contrat)}
                onSign={() => setSigningContrat(contrat)}
                onResend={() => handleResend(contrat.id)}
                isResending={sendForSignature.isPending}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <ContratFormDialog
        contactId={contactId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {editingContrat && (
        <ContratFormDialog
          contactId={contactId}
          contrat={editingContrat}
          open={!!editingContrat}
          onOpenChange={(open) => !open && setEditingContrat(null)}
          onOpenSignature={() => {
            setSigningContrat(editingContrat);
            setEditingContrat(null);
          }}
        />
      )}

      {signingContrat && (
        <ContratSignatureDialog
          contrat={signingContrat}
          open={!!signingContrat}
          onOpenChange={(open) => !open && setSigningContrat(null)}
        />
      )}
    </div>
  );
}

interface ContratCardProps {
  contrat: ContratLocation;
  onClick: () => void;
  onSign: () => void;
  onResend: () => void;
  isResending: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  vehicule: Car,
  materiel: Package,
  autre: FileText,
};

function ContratCard({ contrat, onClick, onSign, onResend, isResending }: ContratCardProps) {
  const statusConfig = contratStatutConfig[contrat.statut];
  const TypeIcon = typeIcons[contrat.type_contrat] || FileText;
  const canSign = contrat.statut === "envoye" || contrat.statut === "brouillon";
  const canResend = contrat.statut === "envoye" || contrat.statut === "brouillon";

  const handleSignClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSign();
  };

  const handleResendClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onResend();
  };

  return (
    <div 
      className="p-4 border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <TypeIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{contrat.numero_contrat}</p>
            <p className="text-xs text-muted-foreground">{contratTypeLabels[contrat.type_contrat]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", statusConfig.class)}>
            {statusConfig.label}
          </Badge>
          {contrat.statut === "signe" && (
            <CheckCircle2 className="h-4 w-4 text-success" />
          )}
          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Object */}
      <p className="text-sm mb-2 line-clamp-1">{contrat.objet_location}</p>

      {/* Vehicle info if applicable */}
      {contrat.vehicules && (
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Car className="h-3 w-3" />
          {contrat.vehicules.marque} {contrat.vehicules.modele} - {contrat.vehicules.immatriculation}
        </p>
      )}

      {/* Dates and amount */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(contrat.date_debut), "dd/MM/yyyy")} - {format(new Date(contrat.date_fin), "dd/MM/yyyy")}
          </span>
          <span className="flex items-center gap-1">
            <Euro className="h-3 w-3" />
            {contrat.montant_mensuel.toFixed(2)}€/mois
          </span>
        </div>
        
        <div className="flex gap-1">
          {canResend && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 gap-1"
              onClick={handleResendClick}
              disabled={isResending}
            >
              <Send className="h-3 w-3" />
              {isResending ? "..." : contrat.statut === "envoye" ? "Renvoyer" : "Envoyer"}
            </Button>
          )}
          {canSign && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 gap-1"
              onClick={handleSignClick}
            >
              <PenLine className="h-3 w-3" />
              Signer
            </Button>
          )}
        </div>
      </div>

      {/* Signature info */}
      {contrat.statut === "signe" && contrat.date_signature && (
        <p className="text-xs text-success mt-2 flex items-center gap-1">
          <PenLine className="h-3 w-3" />
          Signé le {format(new Date(contrat.date_signature), "dd/MM/yyyy à HH:mm", { locale: fr })}
        </p>
      )}
    </div>
  );
}
