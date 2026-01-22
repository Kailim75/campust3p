import { Award, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { useContactCertificates } from "@/hooks/useAttestationCertificates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ContactCertificatesSectionProps {
  contactId: string;
}

export function ContactCertificatesSection({ contactId }: ContactCertificatesSectionProps) {
  const { data: certificates, isLoading } = useContactCertificates(contactId);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!certificates || certificates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Award className="h-4 w-4" />
        Certificats d'attestation
      </h3>
      <div className="space-y-2 mt-2">
        {certificates.map((cert: any) => (
          <div
            key={cert.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-mono font-semibold text-primary truncate">
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
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>
                  Émis le {format(new Date(cert.date_emission), "dd/MM/yyyy", { locale: fr })}
                </span>
                {cert.session && (
                  <>
                    <span>•</span>
                    <span className="truncate">{cert.session.nom}</span>
                  </>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 ml-2">
              {cert.type_attestation === "mobilite" ? "Mobilité" : 
               cert.type_attestation === "competences" ? "Compétences" : "Formation"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
