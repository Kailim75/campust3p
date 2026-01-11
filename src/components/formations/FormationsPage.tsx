import { Header } from "@/components/layout/Header";
import { FormationCard } from "./FormationCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formations = [
  { id: "1", intitule: "Formation Initiale Taxi", type: "initiale" as const, categorie: "Taxi" as const, duree: "250 heures", prix: 1800, places: 10, prochaineSessions: 2 },
  { id: "2", intitule: "Formation Initiale VTC", type: "initiale" as const, categorie: "VTC" as const, duree: "250 heures", prix: 1800, places: 10, prochaineSessions: 3 },
  { id: "3", intitule: "Formation VMDTR", type: "initiale" as const, categorie: "VMDTR" as const, duree: "14 heures", prix: 350, places: 12, prochaineSessions: 1 },
  { id: "4", intitule: "Formation Continue Taxi", type: "continue" as const, categorie: "Taxi" as const, duree: "14 heures", prix: 350, places: 12, prochaineSessions: 4 },
  { id: "5", intitule: "Formation Continue VTC", type: "continue" as const, categorie: "VTC" as const, duree: "14 heures", prix: 350, places: 12, prochaineSessions: 2 },
  { id: "6", intitule: "Formation Mobilité Taxi", type: "mobilite" as const, categorie: "Taxi" as const, duree: "7 heures", prix: 200, places: 10, prochaineSessions: 1 },
];

export function FormationsPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Catalogue des formations" 
        subtitle="Gérez votre offre de formation"
        addLabel="Nouvelle formation"
        onAddClick={() => console.log("Add formation")}
      />

      <main className="p-6 animate-fade-in">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="taxi">Taxi</TabsTrigger>
            <TabsTrigger value="vtc">VTC</TabsTrigger>
            <TabsTrigger value="vmdtr">VMDTR</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {formations.map((formation) => (
                <FormationCard key={formation.id} formation={formation} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="taxi" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {formations
                .filter((f) => f.categorie === "Taxi")
                .map((formation) => (
                  <FormationCard key={formation.id} formation={formation} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="vtc" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {formations
                .filter((f) => f.categorie === "VTC")
                .map((formation) => (
                  <FormationCard key={formation.id} formation={formation} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="vmdtr" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {formations
                .filter((f) => f.categorie === "VMDTR")
                .map((formation) => (
                  <FormationCard key={formation.id} formation={formation} />
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
