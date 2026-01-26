import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Award, Car, BookOpen } from "lucide-react";
import { ContactSessionsTab } from "./ContactSessionsTab";
import { ContactPedagogyTab } from "./ContactPedagogyTab";
import { ExamensTab } from "../examens/ExamensTab";
import { ContactPratiqueTab } from "../pratique/ContactPratiqueTab";

interface Inscription {
  id: string;
  statut: string;
  sessions?: {
    id: string;
    nom: string;
    date_debut: string;
    date_fin: string;
    formation_type: string;
    lieu?: string;
  } | null;
}

interface ContactFormationTabProps {
  contactId: string;
  contactPrenom: string;
  contactFormation: string | null;
  inscriptions: Inscription[];
  inscriptionsLoading: boolean;
}

export function ContactFormationTab({
  contactId,
  contactPrenom,
  contactFormation,
  inscriptions,
  inscriptionsLoading,
}: ContactFormationTabProps) {
  const [activeTab, setActiveTab] = useState("sessions");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-4">
        <TabsTrigger value="sessions" className="text-xs px-2">
          <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
          <span className="hidden sm:inline">Sessions</span>
        </TabsTrigger>
        <TabsTrigger value="examens" className="text-xs px-2">
          <Award className="h-3.5 w-3.5 mr-1.5" />
          <span className="hidden sm:inline">Examens</span>
        </TabsTrigger>
        <TabsTrigger value="pratique" className="text-xs px-2">
          <Car className="h-3.5 w-3.5 mr-1.5" />
          <span className="hidden sm:inline">Pratique</span>
        </TabsTrigger>
        <TabsTrigger value="pedagogie" className="text-xs px-2">
          <BookOpen className="h-3.5 w-3.5 mr-1.5" />
          <span className="hidden sm:inline">E-Learning</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="sessions">
        <ContactSessionsTab 
          inscriptions={inscriptions} 
          isLoading={inscriptionsLoading} 
        />
      </TabsContent>

      <TabsContent value="examens">
        <ExamensTab 
          contactId={contactId} 
          formationType={contactFormation || undefined} 
        />
      </TabsContent>

      <TabsContent value="pratique">
        <ContactPratiqueTab contactId={contactId} />
      </TabsContent>

      <TabsContent value="pedagogie">
        <ContactPedagogyTab
          contactId={contactId}
          contactPrenom={contactPrenom}
          contactFormation={contactFormation || "VTC"}
        />
      </TabsContent>
    </Tabs>
  );
}
