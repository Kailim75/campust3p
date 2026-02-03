import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, GraduationCap, FileSignature } from "lucide-react";
import { DocumentsFormationTab } from "./DocumentsFormationTab";
import { ContactFacturesTab } from "./ContactFacturesTab";
import { ContactLocationTab } from "../location/ContactLocationTab";

interface Document {
  id: string;
  nom: string;
  type_document: string;
  file_path: string;
  file_size?: number | null;
  date_expiration?: string | null;
  contact_id: string;
}

interface Facture {
  id: string;
  numero_facture: string;
  montant_total: number | string;
  total_paye: number;
  statut: string;
  type_financement: string;
  date_emission?: string | null;
  date_echeance?: string | null;
}

interface ContactAdminTabProps {
  contactId: string;
  contact?: {
    nom: string;
    prenom: string;
    formation?: string | null;
  };
  documents: Document[];
  documentsLoading: boolean;
  documentTypes: { value: string; label: string }[];
  factures: Facture[];
  facturesLoading: boolean;
  onUploadDocument: () => void;
  onDownloadDocument: (filePath: string, filename: string) => void;
  onDeleteDocument: (params: { id: string; filePath: string; contactId: string }) => void;
}

export function ContactAdminTab({
  contactId,
  contact,
  documents,
  documentsLoading,
  documentTypes,
  factures,
  facturesLoading,
  onUploadDocument,
  onDownloadDocument,
  onDeleteDocument,
}: ContactAdminTabProps) {
  const [activeTab, setActiveTab] = useState("documents");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="documents" className="text-xs px-2">
          <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
          <span className="hidden sm:inline">Documents formation</span>
          <span className="sm:hidden">Docs</span>
        </TabsTrigger>
        <TabsTrigger value="factures" className="text-xs px-2">
          <Receipt className="h-3.5 w-3.5 mr-1.5" />
          <span className="hidden sm:inline">Factures</span>
        </TabsTrigger>
        <TabsTrigger value="location" className="text-xs px-2">
          <FileSignature className="h-3.5 w-3.5 mr-1.5" />
          <span className="hidden sm:inline">Location</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="documents">
        <DocumentsFormationTab 
          contactId={contactId} 
          contact={contact}
        />
      </TabsContent>

      <TabsContent value="factures">
        <ContactFacturesTab 
          factures={factures as any} 
          isLoading={facturesLoading} 
        />
      </TabsContent>

      <TabsContent value="location">
        <ContactLocationTab contactId={contactId} />
      </TabsContent>
    </Tabs>
  );
}
