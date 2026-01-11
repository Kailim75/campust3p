import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Users, MoreHorizontal, Eye, Edit, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Session {
  id: string;
  formation: string;
  type: "Taxi" | "VTC" | "VMDTR" | "Continue" | "Mobilité";
  dateDebut: string;
  dateFin: string;
  inscrits: number;
  places: number;
  status: "en_cours" | "a_venir" | "complet" | "termine";
  formateur: string;
}

const sessions: Session[] = [
  { id: "1", formation: "Formation Initiale Taxi", type: "Taxi", dateDebut: "15/01/2026", dateFin: "12/02/2026", inscrits: 8, places: 10, status: "a_venir", formateur: "M. Dubois" },
  { id: "2", formation: "Formation VTC", type: "VTC", dateDebut: "20/01/2026", dateFin: "17/02/2026", inscrits: 10, places: 10, status: "complet", formateur: "M. Laurent" },
  { id: "3", formation: "Formation Continue Taxi", type: "Continue", dateDebut: "05/02/2026", dateFin: "07/02/2026", inscrits: 6, places: 12, status: "a_venir", formateur: "Mme Moreau" },
  { id: "4", formation: "Formation Mobilité", type: "Mobilité", dateDebut: "10/02/2026", dateFin: "12/02/2026", inscrits: 4, places: 8, status: "a_venir", formateur: "M. Dubois" },
  { id: "5", formation: "Formation VMDTR", type: "VMDTR", dateDebut: "01/01/2026", dateFin: "10/01/2026", inscrits: 12, places: 12, status: "en_cours", formateur: "M. Martin" },
  { id: "6", formation: "Formation Initiale VTC", type: "VTC", dateDebut: "01/12/2025", dateFin: "15/12/2025", inscrits: 9, places: 10, status: "termine", formateur: "M. Laurent" },
];

const typeColors = {
  Taxi: "bg-primary/10 text-primary border-primary/20",
  VTC: "bg-success/10 text-success border-success/20",
  VMDTR: "bg-info/10 text-info border-info/20",
  Continue: "bg-warning/10 text-warning border-warning/20",
  Mobilité: "bg-accent/10 text-accent-foreground border-accent/20",
};

const statusConfig = {
  en_cours: { label: "En cours", class: "bg-success text-success-foreground" },
  a_venir: { label: "À venir", class: "bg-info text-info-foreground" },
  complet: { label: "Complet", class: "bg-warning text-warning-foreground" },
  termine: { label: "Terminé", class: "bg-muted text-muted-foreground" },
};

export function SessionsPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Sessions de formation" 
        subtitle="Planifiez et suivez vos sessions"
        addLabel="Nouvelle session"
        onAddClick={() => console.log("Add session")}
      />

      <main className="p-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Sessions actives</p>
            <p className="text-2xl font-display font-bold text-foreground">5</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Places disponibles</p>
            <p className="text-2xl font-display font-bold text-foreground">18</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Taux de remplissage</p>
            <p className="text-2xl font-display font-bold text-success">78%</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Ce mois</p>
            <p className="text-2xl font-display font-bold text-foreground">3</p>
          </div>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Formation</TableHead>
                <TableHead className="font-semibold">Dates</TableHead>
                <TableHead className="font-semibold">Formateur</TableHead>
                <TableHead className="font-semibold">Inscriptions</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const fillRate = (session.inscrits / session.places) * 100;
                
                return (
                  <TableRow key={session.id} className="table-row-hover">
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {session.formation}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", typeColors[session.type])}
                        >
                          {session.type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{session.dateDebut} → {session.dateFin}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {session.formateur}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {session.inscrits}/{session.places}
                          </span>
                        </div>
                        <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              fillRate >= 100 ? "bg-warning" : fillRate >= 70 ? "bg-success" : "bg-primary"
                            )}
                            style={{ width: `${Math.min(fillRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", statusConfig[session.status].class)}>
                        {statusConfig[session.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Voir détails
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Inscrire stagiaire
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
