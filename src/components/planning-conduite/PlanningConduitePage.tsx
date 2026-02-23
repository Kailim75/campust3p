import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { CalendarClock, Users, BookOpen } from "lucide-react";

export function PlanningConduitePage() {
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
            Ressources Pédagogiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planning">
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">Planning des créneaux</p>
            <p className="text-sm">Contenu à venir</p>
          </div>
        </TabsContent>

        <TabsContent value="eleves">
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">Suivi des élèves</p>
            <p className="text-sm">Contenu à venir</p>
          </div>
        </TabsContent>

        <TabsContent value="ressources">
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">Ressources pédagogiques</p>
            <p className="text-sm">Contenu à venir</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
