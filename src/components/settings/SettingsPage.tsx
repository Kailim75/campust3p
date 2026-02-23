import { useState, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Upload, 
  Users, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Info,
  Building2,
  FileText,
  Settings2,
  Bell,
  Webhook,
  CreditCard as CreditCardIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { DocumentTemplatesSection } from "./DocumentTemplatesSection";
import { TemplateFilesSection } from "./TemplateFilesSection";
import { DefaultTemplatesSection } from "./DefaultTemplatesSection";
import { UserManagementSection } from "./UserManagementSection";
import { CentreFormationSettings } from "./CentreFormationSettings";
import { NotificationSettings } from "./NotificationSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

// CSV columns mapping
const CSV_COLUMNS = [
  "civilite",
  "nom",
  "prenom",
  "email",
  "telephone",
  "rue",
  "code_postal",
  "ville",
  "date_naissance",
  "ville_naissance",
  "pays_naissance",
  "numero_permis",
  "prefecture_permis",
  "date_delivrance_permis",
  "numero_carte_professionnelle",
  "prefecture_carte",
  "date_expiration_carte",
  "formation",
  "statut",
  "source",
  "commentaires",
];

const STATUT_VALUES = ["En attente de validation", "Client", "Bravo"];
const FORMATION_VALUES = ["TAXI", "VTC", "VMDTR", "ACC VTC", "ACC VTC 75", "Formation continue Taxi", "Formation continue VTC", "Mobilité Taxi"];
const CIVILITE_VALUES = ["M.", "Mme"];

export function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Export contacts to CSV
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("archived", false)
        .order("nom", { ascending: true });

      if (error) throw error;

      if (!contacts || contacts.length === 0) {
        toast.error("Aucun contact à exporter");
        return;
      }

      // Create CSV content
      const headers = CSV_COLUMNS.join(";");
      const rows = contacts.map((contact) => {
        return CSV_COLUMNS.map((col) => {
          const value = contact[col as keyof typeof contact];
          if (value === null || value === undefined) return "";
          const strValue = String(value);
          if (strValue.includes(";") || strValue.includes('"') || strValue.includes("\n")) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return strValue;
        }).join(";");
      });

      const csvContent = [headers, ...rows].join("\n");
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contacts_t3p_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`${contacts.length} contacts exportés avec succès`);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  // Parse CSV file
  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ";" && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(parseRow);

    return { headers, rows };
  };

  // Validate and prepare import data
  const validateImportData = (headers: string[], rows: string[][]): { valid: any[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: any[] = [];

    const nomIndex = headers.indexOf("nom");
    const prenomIndex = headers.indexOf("prenom");

    if (nomIndex === -1 || prenomIndex === -1) {
      errors.push("Les colonnes 'nom' et 'prenom' sont obligatoires");
      return { valid: [], errors };
    }

    rows.forEach((row, rowIndex) => {
      const lineNum = rowIndex + 2;
      const contact: any = {};
      let rowErrors: string[] = [];

      headers.forEach((header, colIndex) => {
        const value = row[colIndex]?.trim() || "";
        
        if (CSV_COLUMNS.includes(header)) {
          if (header === "nom" && !value) {
            rowErrors.push(`Ligne ${lineNum}: Nom obligatoire`);
          }
          if (header === "prenom" && !value) {
            rowErrors.push(`Ligne ${lineNum}: Prénom obligatoire`);
          }
          if (header === "email" && value && !value.includes("@")) {
            rowErrors.push(`Ligne ${lineNum}: Email invalide`);
          }
          if (header === "statut" && value && !STATUT_VALUES.includes(value)) {
            rowErrors.push(`Ligne ${lineNum}: Statut invalide (${value})`);
          }
          if (header === "formation" && value && !FORMATION_VALUES.includes(value)) {
            rowErrors.push(`Ligne ${lineNum}: Formation invalide (${value})`);
          }
          if (header === "civilite" && value && !CIVILITE_VALUES.includes(value)) {
            rowErrors.push(`Ligne ${lineNum}: Civilité invalide (${value})`);
          }
          
          if (["date_naissance", "date_delivrance_permis", "date_expiration_carte"].includes(header) && value) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(value)) {
              rowErrors.push(`Ligne ${lineNum}: Format de date invalide pour ${header} (attendu: AAAA-MM-JJ)`);
            }
          }

          contact[header] = value || null;
        }
      });

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else if (contact.nom && contact.prenom) {
        valid.push(contact);
      }
    });

    return { valid, errors };
  };

  // Parse XLSX file
  const parseXLSX = (buffer: ArrayBuffer): { headers: string[]; rows: string[][] } => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length === 0) return { headers: [], rows: [] };
    
    const headers = data[0].map((h: any) => String(h || "").trim().toLowerCase());
    const rows = data.slice(1).map((row: any[]) => 
      row.map((cell: any) => {
        if (cell === null || cell === undefined) return "";
        if (typeof cell === "number" && headers[row.indexOf(cell)]?.includes("date")) {
          try {
            const date = XLSX.SSF.parse_date_code(cell);
            if (date) {
              const year = date.y;
              const month = String(date.m).padStart(2, "0");
              const day = String(date.d).padStart(2, "0");
              return `${year}-${month}-${day}`;
            }
          } catch {
            // Not a date
          }
        }
        return String(cell).trim();
      })
    );
    
    return { headers, rows };
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isCSV = file.name.toLowerCase().endsWith(".csv");
    const isXLSX = file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");

    if (!isCSV && !isXLSX) {
      toast.error("Veuillez sélectionner un fichier CSV ou Excel (.xlsx, .xls)");
      return;
    }

    try {
      let headers: string[];
      let rows: string[][];

      if (isCSV) {
        const text = await file.text();
        const parsed = parseCSV(text);
        headers = parsed.headers;
        rows = parsed.rows;
      } else {
        const buffer = await file.arrayBuffer();
        const parsed = parseXLSX(buffer);
        headers = parsed.headers;
        rows = parsed.rows;
      }
      
      if (rows.length === 0) {
        toast.error("Le fichier est vide");
        return;
      }

      const { valid, errors } = validateImportData(headers, rows);
      
      setImportPreview(valid);
      setImportErrors(errors);
      setShowImportDialog(true);
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Erreur lors de la lecture du fichier");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.length === 0) return;

    setIsImporting(true);
    try {
      const batchSize = 50;
      let imported = 0;

      for (let i = 0; i < importPreview.length; i += batchSize) {
        const batch = importPreview.slice(i, i + batchSize);
        const { error } = await supabase.from("contacts").insert(batch);
        
        if (error) throw error;
        imported += batch.length;
      }

      toast.success(`${imported} contacts importés avec succès`);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowImportDialog(false);
      setImportPreview(null);
      setImportErrors([]);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error("Erreur lors de l'import: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const headers = CSV_COLUMNS.join(";");
    const exampleRow = [
      "M.",
      "Dupont",
      "Jean",
      "jean.dupont@email.com",
      "0612345678",
      "123 rue Example",
      "75001",
      "Paris",
      "1990-01-15",
      "Paris",
      "France",
      "123456789",
      "Paris",
      "2015-06-01",
      "CARTE123",
      "Paris",
      "2025-12-31",
      "VTC",
      "En attente de validation",
      "Site web",
      "Commentaire exemple",
    ].join(";");

    const csvContent = [headers, exampleRow].join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele_import_contacts.csv";
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Modèle téléchargé");
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Paramètres" 
        subtitle="Configuration et gestion des données"
      />

      <main className="p-6 animate-fade-in">
        <Tabs defaultValue="centre" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:w-auto lg:inline-flex">
            <TabsTrigger value="centre" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Centre</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Contacts</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="utilisateurs" className="gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Webhook className="h-4 w-4" />
              <span className="hidden sm:inline">Intégrations</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Centre de Formation */}
          <TabsContent value="centre" className="space-y-6">
            <CentreFormationSettings />
          </TabsContent>

          {/* Tab: Contacts Import/Export */}
          <TabsContent value="contacts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestion des contacts
                </CardTitle>
                <CardDescription>
                  Importez ou exportez vos contacts en masse au format CSV ou Excel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Formats supportés</AlertTitle>
                  <AlertDescription>
                    <strong>CSV</strong> : utilise le point-virgule (;) comme séparateur.<br />
                    <strong>Excel</strong> : fichiers .xlsx et .xls.<br />
                    Colonnes obligatoires : <strong>nom</strong> et <strong>prenom</strong>.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Export Card */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <Download className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <h4 className="font-medium">Exporter les contacts</h4>
                        <p className="text-sm text-muted-foreground">
                          Téléchargez tous vos contacts au format CSV
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleExport} 
                      disabled={isExporting}
                      className="w-full"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Export en cours...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Exporter CSV
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Import Card */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Upload className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">Importer des contacts</h4>
                        <p className="text-sm text-muted-foreground">
                          Ajoutez des contacts depuis un fichier CSV ou Excel
                        </p>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Sélectionner CSV ou Excel
                    </Button>
                  </div>
                </div>

                {/* Template download */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Modèle d'import</p>
                      <p className="text-xs text-muted-foreground">
                        Téléchargez un fichier exemple avec les colonnes requises
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                    <Download className="h-4 w-4 mr-1" />
                    Télécharger
                  </Button>
                </div>

                {/* Columns reference */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Colonnes disponibles</h4>
                  <div className="flex flex-wrap gap-1">
                    {CSV_COLUMNS.map((col) => (
                      <Badge key={col} variant="outline" className="text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Documents */}
          <TabsContent value="documents" className="space-y-6">
            <DefaultTemplatesSection />
            <DocumentTemplatesSection />
            <TemplateFilesSection />
          </TabsContent>

          {/* Tab: Utilisateurs */}
          <TabsContent value="utilisateurs" className="space-y-6">
            <UserManagementSection />
          </TabsContent>

          {/* Tab: Intégrations */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Webhook */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Webhook className="h-5 w-5 text-primary" />
                    Webhook entrant
                  </CardTitle>
                  <CardDescription>
                    Connectez ecolet3p.fr pour recevoir les leads automatiquement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-success/10 text-success">Actif</Badge>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">URL du webhook</p>
                    <code className="text-xs break-all">https://api.campust3p.fr/webhook/leads</code>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => {
                    navigator.clipboard.writeText("https://api.campust3p.fr/webhook/leads");
                    toast.success("URL copiée");
                  }}>
                    Copier l'URL
                  </Button>
                </CardContent>
              </Card>

              {/* Alma */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCardIcon className="h-5 w-5 text-accent" />
                    Alma
                  </CardTitle>
                  <CardDescription>
                    Paiement en plusieurs fois pour vos apprenants
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="outline" className="text-muted-foreground">Non configuré</Badge>
                  <Input placeholder="Clé API Alma" className="text-sm" />
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Connecter
                  </Button>
                </CardContent>
              </Card>

              {/* n8n */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-info" />
                    n8n
                  </CardTitle>
                  <CardDescription>
                    Automatisations et workflows avancés
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="outline" className="text-muted-foreground">Non configuré</Badge>
                  <Input placeholder="URL n8n" className="text-sm" />
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Connecter
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aperçu de l'import</DialogTitle>
            <DialogDescription>
              Vérifiez les données avant de confirmer l'import
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-medium">{importPreview?.length || 0} contacts valides</span>
              </div>
              {importErrors.length > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{importErrors.length} erreurs</span>
                </div>
              )}
            </div>

            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreurs détectées</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="h-24 mt-2">
                    <ul className="text-sm space-y-1">
                      {importErrors.slice(0, 10).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                      {importErrors.length > 10 && (
                        <li>... et {importErrors.length - 10} autres erreurs</li>
                      )}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            {importPreview && importPreview.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <ScrollArea className="h-[200px]">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Nom</th>
                        <th className="px-3 py-2 text-left">Prénom</th>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Téléphone</th>
                        <th className="px-3 py-2 text-left">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 20).map((contact, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{contact.nom}</td>
                          <td className="px-3 py-2">{contact.prenom}</td>
                          <td className="px-3 py-2 text-muted-foreground">{contact.email || "-"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{contact.telephone || "-"}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-xs">
                              {contact.statut || "En attente"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importPreview.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      ... et {importPreview.length - 20} autres contacts
                    </p>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmImport} 
              disabled={isImporting || !importPreview || importPreview.length === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Importer {importPreview?.length || 0} contacts
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
