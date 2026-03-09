import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Award } from "lucide-react";
import { FormationTab } from "./FormationTab";
import { ExamensTab } from "./ExamensTab";

interface FormationExamensTabProps {
  contactId: string;
  contactPrenom: string;
  contactEmail?: string;
  contactFormation: string | null;
}

export function FormationExamensTab({ contactId, contactPrenom, contactEmail, contactFormation }: FormationExamensTabProps) {
  const [subTab, setSubTab] = useState("formation");

  return (
    <div className="space-y-3">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-8 bg-muted/50 p-0.5 gap-0.5">
          <TabsTrigger value="formation" className="text-xs px-3 py-1 gap-1 data-[state=active]:bg-background">
            <GraduationCap className="h-3 w-3" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="examens" className="text-xs px-3 py-1 gap-1 data-[state=active]:bg-background">
            <Award className="h-3 w-3" />
            Examens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formation" className="mt-2">
          <FormationTab contactId={contactId} contactPrenom={contactPrenom} contactEmail={contactEmail} />
        </TabsContent>
        <TabsContent value="examens" className="mt-2">
          <ExamensTab contactId={contactId} formation={contactFormation} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
