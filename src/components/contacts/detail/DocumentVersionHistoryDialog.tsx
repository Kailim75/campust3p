import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  History, 
  Download, 
  RotateCcw,
  User,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface VersionEntry {
  id: string;
  version: number;
  action: string;
  date: string;
  user?: string;
  changes?: string[];
  metadata?: Record<string, any>;
}

interface DocumentVersionHistoryDialogProps {
  document: {
    id: string;
    nom: string;
    source: string;
    originalData: any;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentVersionHistoryDialog({
  document,
  open,
  onOpenChange,
}: DocumentVersionHistoryDialogProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Build version history from available data
  const versions: VersionEntry[] = [];
  
  if (document.source === "certificate") {
    const cert = document.originalData;
    
    // Creation entry
    versions.push({
      id: `${cert.id}-creation`,
      version: 1,
      action: "Création",
      date: cert.date_emission || cert.created_at,
      user: cert.emis_par,
      changes: ["Attestation générée"],
    });
    
    // Check for modifications in metadata
    if (cert.metadata?.lastModified) {
      versions.push({
        id: `${cert.id}-modified`,
        version: 2,
        action: "Modification",
        date: cert.metadata.lastModified,
        changes: ["Données mises à jour"],
        metadata: cert.metadata,
      });
    }
    
    // Check for revocation/cancellation
    if (cert.revoked_at) {
      versions.push({
        id: `${cert.id}-revoked`,
        version: versions.length + 1,
        action: cert.status === "revoked" ? "Révocation" : "Annulation",
        date: cert.revoked_at,
        user: cert.revoked_by,
        changes: [cert.revocation_reason || "Aucun motif spécifié"],
      });
    }
  } else if (document.source === "pedagogical") {
    const doc = document.originalData;
    
    versions.push({
      id: `${doc.id}-v${doc.version}`,
      version: doc.version || 1,
      action: "Version courante",
      date: doc.created_at,
      user: doc.created_by,
      changes: [`Document ${doc.status === "actif" ? "actif" : "archivé"}`],
    });
  } else {
    const doc = document.originalData;
    
    versions.push({
      id: `${doc.id}-creation`,
      version: 1,
      action: "Upload",
      date: doc.created_at,
      changes: ["Document ajouté"],
    });
    
    if (doc.updated_at && doc.updated_at !== doc.created_at) {
      versions.push({
        id: `${doc.id}-updated`,
        version: 2,
        action: "Modification",
        date: doc.updated_at,
        changes: ["Métadonnées mises à jour"],
      });
    }
  }
  
  // Sort by date descending
  versions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const handleRestore = async (versionId: string) => {
    setIsRestoring(true);
    try {
      // For now, just show a toast - actual restore logic would depend on document type
      toast.info("Fonctionnalité de restauration en cours de développement");
    } catch (error) {
      toast.error("Erreur lors de la restauration");
    } finally {
      setIsRestoring(false);
    }
  };
  
  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "création":
      case "upload":
        return <FileText className="h-4 w-4 text-primary" />;
      case "modification":
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case "révocation":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "annulation":
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action.toLowerCase()) {
      case "création":
      case "upload":
        return "default";
      case "modification":
        return "secondary";
      case "révocation":
        return "destructive";
      case "annulation":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des versions
          </DialogTitle>
          <DialogDescription>
            Historique et modifications de "{document.nom}"
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4 py-4">
            {versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun historique disponible</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />
                
                <div className="space-y-4">
                  {versions.map((version, index) => (
                    <div key={version.id} className="relative flex gap-4">
                      {/* Timeline dot */}
                      <div className="relative z-10 shrink-0 w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center">
                        {getActionIcon(version.action)}
                      </div>
                      
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getActionBadgeVariant(version.action)}>
                                {version.action}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                v{version.version}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {format(new Date(version.date), "dd MMM yyyy à HH:mm", { locale: fr })}
                              </span>
                            </div>
                            
                            {version.user && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>Par {version.user}</span>
                              </div>
                            )}
                          </div>
                          
                          {index > 0 && version.action !== "Révocation" && version.action !== "Annulation" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(version.id)}
                              disabled={isRestoring}
                              className="shrink-0"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restaurer
                            </Button>
                          )}
                        </div>
                        
                        {version.changes && version.changes.length > 0 && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {version.changes.map((change, i) => (
                              <p key={i} className="flex items-start gap-1">
                                <span className="text-primary">•</span>
                                {change}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <Separator />
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
