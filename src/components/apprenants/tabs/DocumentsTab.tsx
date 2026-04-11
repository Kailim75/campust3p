// ═══════════════════════════════════════════════════════════════
// DocumentsTab — Block-based document view for learner
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, Clock, FileCheck, FileText, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { useActiveEnrollment } from "@/hooks/useActiveEnrollment";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactDocumentsTab } from "@/components/contacts/detail/ContactDocumentsTab";
import { LearnerDocumentBlockList } from "@/components/documents/LearnerDocumentBlockList";

const DOCUMENT_TYPES = [
  { value: "cni", label: "CNI" },
  { value: "permis", label: "Permis" },
  { value: "photo", label: "Photo" },
  { value: "justificatif_domicile", label: "Justificatif domicile" },
  { value: "assr", label: "ASSR" },
  { value: "attestation", label: "Attestation" },
  { value: "autre", label: "Autre" },
];

interface DocumentsTabProps {
  contactId: string;
  contactPrenom?: string;
  contactNom?: string;
  contactEmail?: string | null;
  contactFormation?: string | null;
}

type UploadedDocument = Tables<"contact_documents">;
type GeneratedDocument = Pick<Tables<"generated_documents_v2">, "id" | "status">;

export function DocumentsTab({
  contactId,
  contactPrenom,
  contactNom,
  contactEmail,
  contactFormation,
}: DocumentsTabProps) {
  const [subTab, setSubTab] = useState("generated");

  const { data: enrollment } = useActiveEnrollment(contactId);

  // Fetch contact phone for WhatsApp
  const { data: contact } = useQuery({
    queryKey: ["contact-phone", contactId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("telephone")
        .eq("id", contactId)
        .single();
      return data;
    },
    enabled: !!contactId,
  });

  // Fetch session name
  const { data: session } = useQuery({
    queryKey: ["session-name", enrollment?.session_id],
    queryFn: async () => {
      if (!enrollment?.session_id) return null;
      const { data } = await supabase
        .from("sessions")
        .select("nom, centre_id")
        .eq("id", enrollment.session_id)
        .single();
      return data;
    },
    enabled: !!enrollment?.session_id,
  });

  const { data: uploadedDocs = [], isLoading: loadingUploaded } = useQuery({
    queryKey: ["contact-documents", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_documents")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });

  const { data: generatedStats } = useQuery({
    queryKey: ["generated-documents-summary", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_documents_v2")
        .select("id,status")
        .eq("contact_id", contactId)
        .is("deleted_at", null);

      if (error) throw error;

      const documents = (data ?? []) as GeneratedDocument[];

      return {
        total: documents.length,
        generated: documents.filter((document) => document.status === "generated").length,
        failed: documents.filter((document) => document.status === "failed").length,
      };
    },
    enabled: !!contactId,
  });

  const contactName = [contactPrenom, contactNom].filter(Boolean).join(" ") || "Apprenant";
  const expiringSoonCount = uploadedDocs.filter((document) => {
    if (!document.date_expiration) return false;
    const daysUntilExpiration = Math.ceil((new Date(document.date_expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= 60;
  }).length;
  const uploadedTypeCount = new Set(uploadedDocs.map((document) => document.type_document)).size;

  const handleUploadDownload = async (filePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage.from("contact-documents").download(filePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur de téléchargement");
    }
  };

  const handleDeleteDoc = async ({ id, filePath }: { id: string; filePath: string }) => {
    try {
      await supabase.storage.from("contact-documents").remove([filePath]);
      await supabase.from("contact_documents").delete().eq("id", id);
      toast.success("Document supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documents générés</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{generatedStats?.generated ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {generatedStats?.failed
              ? `${generatedStats.failed} échec${generatedStats.failed > 1 ? "s" : ""} à reprendre`
              : "Prêts à envoyer ou télécharger"}
          </p>
        </Card>
        <Card className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pièces reçues</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{uploadedDocs.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {uploadedTypeCount} type{uploadedTypeCount > 1 ? "s" : ""} de document
          </p>
        </Card>
        <Card className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Échéances proches</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{expiringSoonCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pièces expirées ou à renouveler sous 60 jours
          </p>
        </Card>
        <Card className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contexte</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {session?.nom || "Aucune session active"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {contactFormation || "Formation non renseignée"}
          </p>
        </Card>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Dossier documentaire de {contactName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sépare les documents générés par le CRM et les pièces attendues de l’apprenant pour limiter les oublis.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {generatedStats?.failed ? (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                <AlertCircle className="mr-1 h-3 w-3" />
                {generatedStats.failed} document{generatedStats.failed > 1 ? "s" : ""} en échec
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <FileCheck className="mr-1 h-3 w-3" />
                Génération sous contrôle
              </Badge>
            )}
            {expiringSoonCount > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                <Clock className="mr-1 h-3 w-3" />
                {expiringSoonCount} échéance{expiringSoonCount > 1 ? "s" : ""} proche{expiringSoonCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generated" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Documents générés
          </TabsTrigger>
          <TabsTrigger value="uploaded" className="gap-1.5 text-xs">
            <FolderOpen className="h-3.5 w-3.5" />
            Documents à fournir
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generated" className="mt-4">
          <LearnerDocumentBlockList
            contactId={contactId}
            contactName={contactName}
            contactEmail={contactEmail}
            contactPhone={contact?.telephone}
            sessionId={enrollment?.session_id}
            sessionName={session?.nom}
            centreId={session?.centre_id}
            inscriptionId={enrollment?.id}
          />
        </TabsContent>

        <TabsContent value="uploaded" className="mt-4">
          <ContactDocumentsTab
            documents={uploadedDocs as UploadedDocument[]}
            isLoading={loadingUploaded}
            documentTypes={DOCUMENT_TYPES}
            onUpload={() => toast.info("Upload via la section CMA/Dossier")}
            onDownload={handleUploadDownload}
            onDelete={handleDeleteDoc}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
