import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2 } from "lucide-react";
import { ContactInfoTab } from "./ContactInfoTab";
import { ContactPartnersTab } from "./ContactPartnersTab";

interface Contact {
  id?: string;
  email?: string | null;
  telephone?: string | null;
  rue?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  date_naissance?: string | null;
  ville_naissance?: string | null;
  pays_naissance?: string | null;
  custom_id?: string | null;
  numero_permis?: string | null;
  prefecture_permis?: string | null;
  date_delivrance_permis?: string | null;
  numero_carte_professionnelle?: string | null;
  prefecture_carte?: string | null;
  date_expiration_carte?: string | null;
  formation?: string | null;
  source?: string | null;
  commentaires?: string | null;
}

interface ContactProfilTabProps {
  contact: Contact;
  contactId: string;
}

export function ContactProfilTab({ contact, contactId }: ContactProfilTabProps) {
  const [activeTab, setActiveTab] = useState("infos");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="infos" className="text-xs px-2">
          <User className="h-3.5 w-3.5 mr-1.5" />
          <span>Informations</span>
        </TabsTrigger>
        <TabsTrigger value="partners" className="text-xs px-2">
          <Building2 className="h-3.5 w-3.5 mr-1.5" />
          <span>Partenaires</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="infos">
        <ContactInfoTab contact={contact} />
      </TabsContent>

      <TabsContent value="partners">
        <ContactPartnersTab contactId={contactId} />
      </TabsContent>
    </Tabs>
  );
}
