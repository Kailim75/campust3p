import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { CalendarClock, Users, BookOpen } from "lucide-react";
import { PlanningTab } from "./PlanningTab";
import { ElevesTab } from "./ElevesTab";
import { RessourcesTab } from "./RessourcesTab";
import { useNoShowDetection } from "@/hooks/useNoShowDetection";

export function PlanningConduitePage() {
  useNoShowDetection();
  const [activeTab, setActiveTab] = useState("planning");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Planning Conduite"
        subtitle="Réservations, suivi pédagogique et ressources pour les élèves"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="planning" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="eleves" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Mes Élèves
          </TabsTrigger>
          <TabsTrigger value="ressources" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Ressources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planning">
          <PlanningTab />
        </TabsContent>

        <TabsContent value="eleves">
          <ElevesTab />
        </TabsContent>

        <TabsContent value="ressources">
          <RessourcesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
