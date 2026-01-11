import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  FileCheck, 
  FileWarning, 
  FileX, 
  Download,
  Upload,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Document {
  id: string;
  stagiaire: string;
  type: string;
  status: "valide" | "expire" | "manquant" | "a_verifier";
  dateExpiration?: string;
  dateUpload?: string;
}

const documents: Document[] = [
  { id: "1", stagiaire: "Jean Dupont", type: "Pièce d'identité", status: "valide", dateExpiration: "15/03/2030", dateUpload: "10/01/2026" },
  { id: "2", stagiaire: "Jean Dupont", type: "Permis de conduire", status: "expire", dateExpiration: "05/01/2026", dateUpload: "01/01/2025" },
  { id: "3", stagiaire: "Marie Martin", type: "Casier judiciaire", status: "a_verifier", dateUpload: "08/01/2026" },
  { id: "4", stagiaire: "Marie Martin", type: "Certificat médical", status: "manquant" },
  { id: "5", stagiaire: "Pierre Bernard", type: "Pièce d'identité", status: "valide", dateExpiration: "20/05/2028", dateUpload: "05/01/2026" },
  { id: "6", stagiaire: "Pierre Bernard", type: "Attestation de formation", status: "valide", dateUpload: "10/01/2026" },
  { id: "7", stagiaire: "Sophie Petit", type: "Permis de conduire", status: "valide", dateExpiration: "12/08/2035", dateUpload: "03/01/2026" },
  { id: "8", stagiaire: "Sophie Petit", type: "Casier judiciaire", status: "manquant" },
];

const statusConfig = {
  valide: { 
    label: "Valide", 
    class: "bg-success/10 text-success border-success/20",
    icon: FileCheck
  },
  expire: { 
    label: "Expiré", 
    class: "bg-destructive/10 text-destructive border-destructive/20",
    icon: FileX
  },
  manquant: { 
    label: "Manquant", 
    class: "bg-warning/10 text-warning border-warning/20",
    icon: FileWarning
  },
  a_verifier: { 
    label: "À vérifier", 
    class: "bg-info/10 text-info border-info/20",
    icon: FileWarning
  },
};

export function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.stagiaire.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: documents.length,
    valides: documents.filter((d) => d.status === "valide").length,
    expires: documents.filter((d) => d.status === "expire").length,
    manquants: documents.filter((d) => d.status === "manquant").length,
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Suivi des documents" 
        subtitle="Gérez les documents administratifs"
      />

      <main className="p-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Total documents</p>
            <p className="text-2xl font-display font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Valides</p>
            <p className="text-2xl font-display font-bold text-success">{stats.valides}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Expirés</p>
            <p className="text-2xl font-display font-bold text-destructive">{stats.expires}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Manquants</p>
            <p className="text-2xl font-display font-bold text-warning">{stats.manquants}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par stagiaire ou type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 input-focus"
            />
          </div>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Stagiaire</TableHead>
                <TableHead className="font-semibold">Type de document</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Date d'expiration</TableHead>
                <TableHead className="font-semibold">Téléchargé le</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => {
                const StatusIcon = statusConfig[doc.status].icon;
                
                return (
                  <TableRow key={doc.id} className="table-row-hover">
                    <TableCell className="font-medium text-foreground">
                      {doc.stagiaire}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.type}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5",
                          statusConfig[doc.status].class
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig[doc.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.dateExpiration || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.dateUpload || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.status !== "manquant" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
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
