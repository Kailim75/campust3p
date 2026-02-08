import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Download,
  Award,
  ClipboardList,
  FileCheck,
  File,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface LearnerDocumentsTabProps {
  contactId: string;
}

const DOCUMENT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof FileText; color: string }
> = {
  inscription: {
    label: "Fiche d'inscription",
    icon: ClipboardList,
    color: "text-blue-500",
  },
  entree_sortie: {
    label: "Fiche entrée/sortie",
    icon: FileCheck,
    color: "text-green-500",
  },
  test_positionnement: {
    label: "Test de positionnement",
    icon: FileText,
    color: "text-orange-500",
  },
  attestation: {
    label: "Attestation",
    icon: Award,
    color: "text-primary",
  },
  autre: {
    label: "Document",
    icon: File,
    color: "text-muted-foreground",
  },
};

export function LearnerDocumentsTab({ contactId }: LearnerDocumentsTabProps) {
  // Fetch pedagogical documents
  const { data: pedagogicalDocs = [], isLoading: loadingPedago } = useQuery({
    queryKey: ["learner-pedagogical-docs", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedagogical_documents")
        .select("*")
        .eq("contact_id", contactId)
        .eq("status", "actif")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });

  // Fetch attestation certificates
  const { data: certificates = [], isLoading: loadingCerts } = useQuery({
    queryKey: ["learner-certificates", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attestation_certificates")
        .select(`
          *,
          session:sessions(nom, formation_type)
        `)
        .eq("contact_id", contactId)
        .eq("status", "generated")
        .order("date_emission", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });

  const isLoading = loadingPedago || loadingCerts;

  const handleDownload = async (filePath: string, fileName: string, bucket: string) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Document téléchargé");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const allDocuments = [
    ...pedagogicalDocs.map((doc: any) => ({
      id: doc.id,
      type: "pedagogical" as const,
      documentType: doc.document_type,
      name: doc.file_name,
      filePath: doc.file_path,
      bucket: "pedagogie",
      date: doc.created_at,
      notes: doc.notes as string | undefined,
      numero: undefined as string | undefined,
    })),
    ...certificates.map((cert: any) => ({
      id: cert.id,
      type: "certificate" as const,
      documentType: "attestation",
      name: `Attestation - ${cert.session?.nom || cert.type_attestation}`,
      filePath: cert.document_url,
      bucket: "generated-documents",
      date: cert.date_emission,
      numero: cert.numero_certificat as string,
      notes: undefined as string | undefined,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allDocuments.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Aucun document disponible"
        description="Vos documents de formation apparaîtront ici une fois générés."
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Mes documents ({allDocuments.length})
      </h2>

      <div className="grid gap-3">
        {allDocuments.map((doc) => {
          const config = DOCUMENT_TYPE_CONFIG[doc.documentType] || DOCUMENT_TYPE_CONFIG.autre;
          const Icon = config.icon;

          return (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(doc.date), "dd MMMM yyyy", { locale: fr })}
                        {doc.numero && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {doc.numero}
                          </Badge>
                        )}
                      </div>
                      {doc.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {doc.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc.filePath, doc.name, doc.bucket)}
                    disabled={!doc.filePath}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Télécharger</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
