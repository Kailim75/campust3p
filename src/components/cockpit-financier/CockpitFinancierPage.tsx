import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Periode = "mois" | "trimestre" | "annee" | "personnalise";

export function CockpitFinancierPage() {
  const [periode, setPeriode] = useState<Periode>("mois");

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary">
            <Landmark className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Cockpit Financier</h1>
            <p className="text-sm text-muted-foreground">Pilotage financier de votre centre de formation</p>
          </div>
        </div>

        {/* Period selector */}
        <Select value={periode} onValueChange={(v) => setPeriode(v as Periode)}>
          <SelectTrigger className="w-[200px]">
            <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mois">Ce mois</SelectItem>
            <SelectItem value="trimestre">Ce trimestre</SelectItem>
            <SelectItem value="annee">Cette année</SelectItem>
            <SelectItem value="personnalise">Personnalisé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="vue-ensemble" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="revenus">Revenus</TabsTrigger>
          <TabsTrigger value="charges">Charges</TabsTrigger>
          <TabsTrigger value="previsionnel">Prévisionnel</TabsTrigger>
        </TabsList>

        <TabsContent value="vue-ensemble">
          <EmptyTabPlaceholder label="Vue d'ensemble" />
        </TabsContent>

        <TabsContent value="revenus">
          <EmptyTabPlaceholder label="Revenus" />
        </TabsContent>

        <TabsContent value="charges">
          <EmptyTabPlaceholder label="Charges" />
        </TabsContent>

        <TabsContent value="previsionnel">
          <EmptyTabPlaceholder label="Prévisionnel" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyTabPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center text-center space-y-4">
      <div className="p-4 rounded-full bg-muted">
        <Landmark className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{label}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Ce module sera bientôt disponible.
        </p>
      </div>
    </div>
  );
}
