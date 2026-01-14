import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { FormationCard } from "./FormationCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormationsStats } from "@/hooks/useFormations";
import { GraduationCap } from "lucide-react";

// Configuration des types de formation avec leurs métadonnées
const formationConfig: Record<string, { 
  intitule: string; 
  type: "initiale" | "continue" | "mobilite";
  categorie: "Taxi" | "VTC" | "VMDTR" | "Accompagnement";
  duree: string;
  defaultPrix: number;
  defaultPlaces: number;
}> = {
  "TAXI": { 
    intitule: "Formation Initiale Taxi", 
    type: "initiale", 
    categorie: "Taxi", 
    duree: "250 heures",
    defaultPrix: 1800,
    defaultPlaces: 10
  },
  "VTC": { 
    intitule: "Formation Initiale VTC", 
    type: "initiale", 
    categorie: "VTC", 
    duree: "250 heures",
    defaultPrix: 1800,
    defaultPlaces: 10
  },
  "VMDTR": { 
    intitule: "Formation VMDTR", 
    type: "initiale", 
    categorie: "VMDTR", 
    duree: "14 heures",
    defaultPrix: 350,
    defaultPlaces: 12
  },
  "ACC VTC": { 
    intitule: "Accompagnement VTC", 
    type: "initiale", 
    categorie: "Accompagnement", 
    duree: "Variable",
    defaultPrix: 500,
    defaultPlaces: 5
  },
  "ACC VTC 75": { 
    intitule: "Accompagnement VTC Paris", 
    type: "initiale", 
    categorie: "Accompagnement", 
    duree: "Variable",
    defaultPrix: 600,
    defaultPlaces: 5
  },
  "Formation continue Taxi": { 
    intitule: "Formation Continue Taxi", 
    type: "continue", 
    categorie: "Taxi", 
    duree: "14 heures",
    defaultPrix: 350,
    defaultPlaces: 12
  },
  "Formation continue VTC": { 
    intitule: "Formation Continue VTC", 
    type: "continue", 
    categorie: "VTC", 
    duree: "14 heures",
    defaultPrix: 350,
    defaultPlaces: 12
  },
  "Mobilité Taxi": { 
    intitule: "Formation Mobilité Taxi", 
    type: "mobilite", 
    categorie: "Taxi", 
    duree: "7 heures",
    defaultPrix: 200,
    defaultPlaces: 10
  },
};

export function FormationsPage() {
  const { data: stats = [], isLoading } = useFormationsStats();
  const [activeTab, setActiveTab] = useState("all");

  // Créer les formations à partir de la config + stats
  const formations = Object.entries(formationConfig).map(([key, config]) => {
    const stat = stats.find(s => s.formation_type === key);
    return {
      id: key,
      intitule: config.intitule,
      type: config.type,
      categorie: config.categorie,
      duree: config.duree,
      prix: stat?.avgPrice || config.defaultPrix,
      places: config.defaultPlaces,
      prochaineSessions: stat?.upcomingSessions || 0,
      totalSessions: stat?.sessionsCount || 0,
      totalInscriptions: stat?.totalInscriptions || 0,
    };
  });

  const filterFormations = (categorie?: string) => {
    if (!categorie || categorie === "all") return formations;
    return formations.filter(f => f.categorie === categorie);
  };

  const categories = [
    { value: "all", label: "Toutes" },
    { value: "Taxi", label: "Taxi" },
    { value: "VTC", label: "VTC" },
    { value: "VMDTR", label: "VMDTR" },
    { value: "Accompagnement", label: "Accompagnement" },
  ];

  return (
    <div className="min-h-screen">
      <Header 
        title="Catalogue des formations" 
        subtitle="Gérez votre offre de formation T3P"
      />

      <main className="p-6 animate-fade-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50">
            {categories.map(cat => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label} ({filterFormations(cat.value).length})
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat.value} value={cat.value} className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-64 rounded-xl" />
                  ))}
                </div>
              ) : filterFormations(cat.value).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Aucune formation dans cette catégorie</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filterFormations(cat.value).map((formation) => (
                    <FormationCard key={formation.id} formation={formation} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
