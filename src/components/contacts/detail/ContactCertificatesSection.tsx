import { Award, Copy, Check, FileText, XCircle, AlertTriangle, MoreVertical, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { useContactCertificates, useAttestationCertificates, CertificateStatus } from "@/hooks/useAttestationCertificates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ContactCertificatesSectionProps {
  contactId: string;
}

const statusConfig: Record<CertificateStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  generated: { label: "Valide", variant: "default", icon: <Check className="h-3 w-3" /> },
  cancelled: { label: "Annulé", variant: "secondary", icon: <XCircle className="h-3 w-3" /> },
  revoked: { label: "Révoqué", variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> },
};

export function ContactCertificatesSection({ contactId }: ContactCertificatesSectionProps) {
  const { data: certificates, isLoading } = useContactCertificates(contactId);
  const { revokeCertificateAsync, cancelCertificateAsync, isRevoking, isCancelling } = useAttestationCertificates();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{ type: 'revoke' | 'cancel'; certificateId: string } | null>(null);
  const [reason, setReason] = useState("");

  const copyToClipboard = async (numeroCertificat: string, id: string) => {
    try {
      await navigator.clipboard.writeText(numeroCertificat);
      setCopiedId(id);
      toast.success("Numéro de certificat copié");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleAction = async () => {
    if (!actionDialog) return;
    
    try {
      if (actionDialog.type === 'revoke') {
        await revokeCertificateAsync({ certificateId: actionDialog.certificateId, reason });
      } else {
        await cancelCertificateAsync({ certificateId: actionDialog.certificateId, reason });
      }
      setActionDialog(null);
      setReason("");
    } catch (error) {
      console.error('Erreur action certificat:', error);
    }
  };

  const handleDownload = (documentUrl: string, numeroCertificat: string) => {
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = `certificat_${numeroCertificat}.pdf`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!certificates || certificates.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Award className="h-4 w-4" />
          Certificats d'attestation
        </h3>
        <div className="space-y-2 mt-2">
          {certificates.map((cert) => {
            const status = (cert.status as CertificateStatus) || 'generated';
            const config = statusConfig[status];
            const isActive = status === 'generated';

            return (
              <div
                key={cert.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isActive ? 'bg-muted/50' : 'bg-muted/20 opacity-75'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className={`text-sm font-mono font-semibold truncate ${
                      isActive ? 'text-primary' : 'text-muted-foreground line-through'
                    }`}>
                      {cert.numero_certificat}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(cert.numero_certificat, cert.id)}
                    >
                      {copiedId === cert.id ? (
                        <Check className="h-3 w-3 text-primary" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                    <Badge variant={config.variant} className="flex items-center gap-1 text-xs">
                      {config.icon}
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>
                      Émis le {format(new Date(cert.date_emission), "dd/MM/yyyy", { locale: fr })}
                    </span>
                    {cert.session && (
                      <>
                        <span>•</span>
                        <span className="truncate">{cert.session.nom}</span>
                      </>
                    )}
                    {cert.revoked_at && (
                      <>
                        <span>•</span>
                        <span className="text-destructive">
                          {status === 'revoked' ? 'Révoqué' : 'Annulé'} le {format(new Date(cert.revoked_at), "dd/MM/yyyy", { locale: fr })}
                        </span>
                      </>
                    )}
                  </div>
                  {cert.revocation_reason && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Motif : {cert.revocation_reason}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Badge variant="secondary" className="text-xs">
                    {cert.type_attestation === "mobilite" ? "Mobilité" : 
                     cert.type_attestation === "competences" ? "Compétences" : "Formation"}
                  </Badge>
                  
                  {cert.document_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDownload(cert.document_url!, cert.numero_certificat)}
                      title="Télécharger le document"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {isActive && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setActionDialog({ type: 'cancel', certificateId: cert.id })}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Annuler
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setActionDialog({ type: 'revoke', certificateId: cert.id })}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Révoquer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog?.type === 'revoke' 
                ? 'Révoquer ce certificat ?' 
                : 'Annuler ce certificat ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog?.type === 'revoke'
                ? 'Cette action est irréversible. Le certificat sera marqué comme révoqué et ne sera plus valide.'
                : 'Le certificat sera marqué comme annulé. Cette action peut être utilisée en cas d\'erreur lors de la génération.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Motif (optionnel)</Label>
            <Textarea
              id="reason"
              placeholder="Indiquez la raison de cette action..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking || isCancelling}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isRevoking || isCancelling}
              className={actionDialog?.type === 'revoke' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {(isRevoking || isCancelling) ? 'En cours...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
