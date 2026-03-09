import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, StickyNote, Bell } from "lucide-react";
import { CommunicationsTab } from "./CommunicationsTab";
import { NotesTab } from "./NotesTab";
import { RappelsTab } from "./RappelsTab";

interface SuiviTabProps {
  contactId: string;
  contactPrenom: string;
  contactNom: string;
  contactEmail: string | null;
  contactFormation: string | null;
}

export function SuiviTab({ contactId, contactPrenom, contactNom, contactEmail, contactFormation }: SuiviTabProps) {
  const [subTab, setSubTab] = useState("communications");

  return (
    <div className="space-y-3">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-8 bg-muted/50 p-0.5 gap-0.5">
          <TabsTrigger value="communications" className="text-xs px-3 py-1 gap-1 data-[state=active]:bg-background">
            <MessageCircle className="h-3 w-3" />
            Échanges
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs px-3 py-1 gap-1 data-[state=active]:bg-background">
            <StickyNote className="h-3 w-3" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="rappels" className="text-xs px-3 py-1 gap-1 data-[state=active]:bg-background">
            <Bell className="h-3 w-3" />
            Rappels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="communications" className="mt-2">
          <CommunicationsTab
            contactId={contactId}
            contactPrenom={contactPrenom}
            contactNom={contactNom}
            contactEmail={contactEmail}
            contactFormation={contactFormation}
          />
        </TabsContent>
        <TabsContent value="notes" className="mt-2">
          <NotesTab contactId={contactId} />
        </TabsContent>
        <TabsContent value="rappels" className="mt-2">
          <RappelsTab contactId={contactId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
