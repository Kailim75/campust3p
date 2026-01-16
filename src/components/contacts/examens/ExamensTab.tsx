import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Car } from "lucide-react";
import { ExamensT3PSection } from "./ExamensT3PSection";
import { ExamensPratiqueSection } from "./ExamensPratiqueSection";

interface ExamensTabProps {
  contactId: string;
  formationType?: string;
}

export function ExamensTab({ contactId, formationType }: ExamensTabProps) {
  const [activeTab, setActiveTab] = useState("t3p");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="t3p" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Examen T3P
          </TabsTrigger>
          <TabsTrigger value="pratique" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Examen Pratique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="t3p" className="mt-4">
          <ExamensT3PSection contactId={contactId} formationType={formationType} />
        </TabsContent>

        <TabsContent value="pratique" className="mt-4">
          <ExamensPratiqueSection contactId={contactId} formationType={formationType} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
