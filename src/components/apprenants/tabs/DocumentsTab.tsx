// ═══════════════════════════════════════════════════════════════
// DocumentsTab — Block-based document view for learner
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { useActiveEnrollment } from "@/hooks/useActiveEnrollment";
import { ContactDocumentsTab } from "@/components/contacts/detail/ContactDocumentsTab";
import { LearnerDocumentBlockList } from "@/components/documents/LearnerDocumentBlockList";
import { ContratConduiteButton } from "@/components/conduite/ContratConduiteButton";
import { useCentreContext } from "@/contexts/CentreContext";
import { useContactConduiteProduct } from "@/hooks/useContactConduiteProduct";
import { Badge } from "@/components/ui/badge";
import { Car } from "lucide-react";

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

export function DocumentsTab({
  contactId,
  contactPrenom,
  contactNom,
  contactEmail,
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

  const contactName = [contactPrenom, contactNom].filter(Boolean).join(" ") || "Apprenant";

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

  const { centreId } = useCentreContext();
  const { data: detectedConduite } = useContactConduiteProduct(contactId);

  return (
    <div className="space-y-4">
      {centreId && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {detectedConduite && (
            <Badge variant="secondary" className="gap-1.5">
              <Car className="h-3 w-3" />
              Produit facturé : {detectedConduite.produit.intitule}
              {detectedConduite.facture_numero && ` · ${detectedConduite.facture_numero}`}
            </Badge>
          )}
          <ContratConduiteButton
            contactId={contactId}
            centreId={centreId}
            initialFiliere={detectedConduite?.filiere}
            factureId={detectedConduite?.facture_id}
            factureLigneId={detectedConduite?.facture_ligne_id}
            initialPrixTtc={detectedConduite?.prix_ttc}
            initialMontantPaye={detectedConduite?.montant_paye}
            initialResteAPayer={detectedConduite?.reste_a_payer}
            lockFiliere={!!detectedConduite}
            label={detectedConduite ? "Générer le contrat de formation pratique" : "Générer contrat accompagnement conduite"}
          />
        </div>
      )}
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
            documents={uploadedDocs as any}
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
