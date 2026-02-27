import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CalendarDays } from "lucide-react";
import { TresorerieDashboard } from "./TresorerieDashboard";
import { ImportBancaireTab } from "./ImportBancaireTab";
import { RapprochementTab } from "./RapprochementTab";
import { PrevisionsTab } from "./PrevisionsTab";

export function TresoreriePage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary">
          <Wallet className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Trésorerie</h1>
          <p className="text-sm text-muted-foreground">
            Suivi bancaire, rapprochement et prévisions de trésorerie
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
          <TabsTrigger value="import">Import relevés</TabsTrigger>
          <TabsTrigger value="rapprochement">Rapprochement</TabsTrigger>
          <TabsTrigger value="previsions">Prévisions</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <TresorerieDashboard />
        </TabsContent>

        <TabsContent value="import">
          <ImportBancaireTab />
        </TabsContent>

        <TabsContent value="rapprochement">
          <RapprochementTab />
        </TabsContent>

        <TabsContent value="previsions">
          <PrevisionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
