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
import { Euro, FileText, MoreHorizontal, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Paiement {
  id: string;
  stagiaire: string;
  formation: string;
  montantTotal: number;
  montantPaye: number;
  financement: "personnel" | "entreprise" | "cpf" | "opco";
  status: "paye" | "partiel" | "impaye";
  dateEcheance: string;
}

const paiements: Paiement[] = [
  { id: "1", stagiaire: "Jean Dupont", formation: "Formation Taxi", montantTotal: 1800, montantPaye: 1800, financement: "personnel", status: "paye", dateEcheance: "—" },
  { id: "2", stagiaire: "Marie Martin", formation: "Formation VTC", montantTotal: 1800, montantPaye: 900, financement: "personnel", status: "partiel", dateEcheance: "20/01/2026" },
  { id: "3", stagiaire: "Pierre Bernard", formation: "Formation Continue", montantTotal: 350, montantPaye: 0, financement: "entreprise", status: "impaye", dateEcheance: "15/01/2026" },
  { id: "4", stagiaire: "Sophie Petit", formation: "Formation VMDTR", montantTotal: 350, montantPaye: 350, financement: "cpf", status: "paye", dateEcheance: "—" },
  { id: "5", stagiaire: "Lucas Robert", formation: "Formation Mobilité", montantTotal: 200, montantPaye: 100, financement: "personnel", status: "partiel", dateEcheance: "25/01/2026" },
  { id: "6", stagiaire: "Emma Moreau", formation: "Formation Taxi", montantTotal: 1800, montantPaye: 0, financement: "opco", status: "impaye", dateEcheance: "30/01/2026" },
];

const financementLabels = {
  personnel: { label: "Personnel", class: "bg-muted text-muted-foreground" },
  entreprise: { label: "Entreprise", class: "bg-info/10 text-info" },
  cpf: { label: "CPF", class: "bg-success/10 text-success" },
  opco: { label: "OPCO", class: "bg-primary/10 text-primary" },
};

const statusConfig = {
  paye: { label: "Payé", class: "bg-success text-success-foreground" },
  partiel: { label: "Partiel", class: "bg-warning text-warning-foreground" },
  impaye: { label: "Impayé", class: "bg-destructive text-destructive-foreground" },
};

export function PaiementsPage() {
  const stats = {
    total: paiements.reduce((acc, p) => acc + p.montantTotal, 0),
    paye: paiements.reduce((acc, p) => acc + p.montantPaye, 0),
    impaye: paiements.reduce((acc, p) => acc + (p.montantTotal - p.montantPaye), 0),
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Paiements & Facturation" 
        subtitle="Suivez les règlements et facturations"
        addLabel="Nouvelle facture"
        onAddClick={() => console.log("Add invoice")}
      />

      <main className="p-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Euro className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total facturé</p>
                <p className="text-2xl font-display font-bold text-foreground">{stats.total.toLocaleString()}€</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-success/10">
                <Euro className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Encaissé</p>
                <p className="text-2xl font-display font-bold text-success">{stats.paye.toLocaleString()}€</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-destructive/10">
                <Euro className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-display font-bold text-destructive">{stats.impaye.toLocaleString()}€</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Stagiaire</TableHead>
                <TableHead className="font-semibold">Formation</TableHead>
                <TableHead className="font-semibold">Financement</TableHead>
                <TableHead className="font-semibold">Montant</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Échéance</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements.map((paiement) => {
                const paidPercentage = (paiement.montantPaye / paiement.montantTotal) * 100;
                
                return (
                  <TableRow key={paiement.id} className="table-row-hover">
                    <TableCell className="font-medium text-foreground">
                      {paiement.stagiaire}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {paiement.formation}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", financementLabels[paiement.financement].class)}
                      >
                        {financementLabels[paiement.financement].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {paiement.montantPaye.toLocaleString()}€ / {paiement.montantTotal.toLocaleString()}€
                        </p>
                        <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              paidPercentage >= 100 ? "bg-success" : paidPercentage > 0 ? "bg-warning" : "bg-destructive"
                            )}
                            style={{ width: `${paidPercentage}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", statusConfig[paiement.status].class)}>
                        {statusConfig[paiement.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {paiement.dateEcheance}
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
                            <FileText className="h-4 w-4 mr-2" />
                            Voir facture
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Send className="h-4 w-4 mr-2" />
                            Envoyer relance
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Euro className="h-4 w-4 mr-2" />
                            Enregistrer paiement
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
