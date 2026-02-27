import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { useNavigation } from "@/contexts/NavigationContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GenerateDocumentModal from "@/components/template-studio/GenerateDocumentModal";
import type { StudioTemplate } from "@/hooks/useTemplateStudio";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  FileCheck, 
  FileWarning, 
  FileX, 
  Download,
  Upload,
  Eye,
  FileText,
  FileSignature,
  Send,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Copy,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  useSignatureRequests,
  useSendSignatureRequest,
  useDeleteSignatureRequest,
  SignatureRequest,
} from "@/hooks/useSignatures";
import { useSendSignatureEmail } from "@/hooks/useSendSignatureEmail";
import { SignatureFormDialog } from "@/components/signatures/SignatureFormDialog";
import { SignatureSigningDialog } from "@/components/signatures/SignatureSigningDialog";
import { SendDocumentsFromSignatureDialog } from "@/components/documents/SendDocumentsFromSignatureDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Document status config
const documentStatusConfig = {
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

// Signature status config
const signatureStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  en_attente: { label: "En attente", color: "bg-muted text-muted-foreground", icon: Clock },
  envoye: { label: "Envoyé", color: "bg-info/10 text-info", icon: Mail },
  signe: { label: "Signé", color: "bg-success/10 text-success", icon: CheckCircle },
  refuse: { label: "Refusé", color: "bg-destructive/10 text-destructive", icon: XCircle },
  expire: { label: "Expiré", color: "bg-warning/10 text-warning", icon: AlertTriangle },
};

// Mock document data (replace with real hook when available)
interface Document {
  id: string;
  stagiaire: string;
  type: string;
  status: "valide" | "expire" | "manquant" | "a_verifier";
  dateExpiration?: string;
  dateUpload?: string;
}

const mockDocuments: Document[] = [
  { id: "1", stagiaire: "Jean Dupont", type: "Pièce d'identité", status: "valide", dateExpiration: "15/03/2030", dateUpload: "10/01/2026" },
  { id: "2", stagiaire: "Jean Dupont", type: "Permis de conduire", status: "expire", dateExpiration: "05/01/2026", dateUpload: "01/01/2025" },
  { id: "3", stagiaire: "Marie Martin", type: "Casier judiciaire", status: "a_verifier", dateUpload: "08/01/2026" },
  { id: "4", stagiaire: "Marie Martin", type: "Certificat médical", status: "manquant" },
  { id: "5", stagiaire: "Pierre Bernard", type: "Pièce d'identité", status: "valide", dateExpiration: "20/05/2028", dateUpload: "05/01/2026" },
];

type ViewMode = "documents" | "signatures" | "generated";

function usePublishedTemplates() {
  return useQuery({
    queryKey: ["published-templates-for-docs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("template_studio_templates")
        .select("*")
        .eq("status", "published")
        .eq("is_active", true)
        .order("type");
      if (error) throw error;
      return (data || []) as StudioTemplate[];
    },
  });
}

export function DocumentsUnifiedPage() {
  const [activeView, setActiveView] = useState<ViewMode>("documents");
  const [searchQuery, setSearchQuery] = useState("");

  // Document instances from Template Studio
  const { data: generatedDocs = [], isLoading: loadingGenerated } = useQuery({
    queryKey: ["document-instances"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("document_instances")
        .select("*, template_studio_templates(name, type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Signatures hooks
  const { data: signatures = [], isLoading: loadingSignatures } = useSignatureRequests();
  const sendRequest = useSendSignatureRequest();
  const deleteRequest = useDeleteSignatureRequest();
  const sendEmail = useSendSignatureEmail();
  
  // Signature dialog states
  const [showSignatureForm, setShowSignatureForm] = useState(false);
  const [signingRequest, setSigningRequest] = useState<SignatureRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [signatureStatusFilter, setSignatureStatusFilter] = useState<string>("all");
  const [sendDocsContact, setSendDocsContact] = useState<{ id: string; nom: string; prenom: string } | null>(null);

  // Template Studio generation
  const { data: publishedTemplates = [] } = usePublishedTemplates();
  const [generateTemplate, setGenerateTemplate] = useState<StudioTemplate | null>(null);

  // Document filtering
  const filteredDocuments = mockDocuments.filter(
    (doc) =>
      doc.stagiaire.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Signature filtering
  const filteredSignatures = signatureStatusFilter === "all"
    ? signatures
    : signatures.filter((s) => s.statut === signatureStatusFilter);

  // Stats
  const documentStats = {
    total: mockDocuments.length,
    valides: mockDocuments.filter((d) => d.status === "valide").length,
    expires: mockDocuments.filter((d) => d.status === "expire").length,
    manquants: mockDocuments.filter((d) => d.status === "manquant").length,
  };

  const signatureStats = {
    total: signatures.length,
    enAttente: signatures.filter((s) => s.statut === "en_attente").length,
    envoyes: signatures.filter((s) => s.statut === "envoye").length,
    signes: signatures.filter((s) => s.statut === "signe").length,
  };

  const handleSendSignature = async (id: string) => {
    // Vérifier que le contact a un email avant d'envoyer
    const sig = signatures.find((s) => s.id === id);
    const contact = sig?.contact as any;
    if (!contact?.email) {
      toast.error("Ce contact n'a pas d'adresse email. Veuillez d'abord renseigner son email.");
      return;
    }
    try {
      await sendEmail.mutateAsync({ signatureRequestId: id, type: "signature_request" });
      toast.success("Demande de signature envoyée");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    }
  };

  const copySigningLink = (token: string) => {
    const url = `${window.location.origin}/signature/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Lien copié dans le presse-papiers");
  };

  const handleAddNew = () => {
    if (activeView === "signatures") {
      setShowSignatureForm(true);
    }
  };

  const { setActiveTab } = useNavigation();
  
  // Update breadcrumb when tab changes
  useEffect(() => {
    setActiveTab(activeView);
  }, [activeView, setActiveTab]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Documents & Signatures" 
        subtitle={`${documentStats.total} documents • ${signatureStats.total} signatures`}
        addLabel={activeView === "signatures" ? "Nouvelle signature" : undefined}
        onAddClick={activeView === "signatures" ? handleAddNew : undefined}
      />

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewMode)} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <TabsList>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
              {documentStats.manquants > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {documentStats.manquants}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="signatures" className="gap-2">
              <FileSignature className="h-4 w-4" />
              Signatures
              {signatureStats.enAttente > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {signatureStats.enAttente}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="generated" className="gap-2">
              <Stamp className="h-4 w-4" />
              Générés
              {generatedDocs.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {generatedDocs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{documentStats.total}</p>
            </Card>
            <Card className="p-4 border-success/20">
              <p className="text-sm text-muted-foreground">Valides</p>
              <p className="text-2xl font-bold text-success">{documentStats.valides}</p>
            </Card>
            <Card className="p-4 border-destructive/20">
              <p className="text-sm text-muted-foreground">Expirés</p>
              <p className="text-2xl font-bold text-destructive">{documentStats.expires}</p>
            </Card>
            <Card className="p-4 border-warning/20">
              <p className="text-sm text-muted-foreground">Manquants</p>
              <p className="text-2xl font-bold text-warning">{documentStats.manquants}</p>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par stagiaire ou type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stagiaire</TableHead>
                  <TableHead>Type de document</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date d'expiration</TableHead>
                  <TableHead>Téléchargé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const StatusIcon = documentStatusConfig[doc.status].icon;
                  
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.stagiaire}</TableCell>
                      <TableCell>{doc.type}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("gap-1.5", documentStatusConfig[doc.status].class)}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {documentStatusConfig[doc.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>{doc.dateExpiration || "—"}</TableCell>
                      <TableCell>{doc.dateUpload || "—"}</TableCell>
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
          </Card>
        </TabsContent>

        {/* Signatures Tab */}
        <TabsContent value="signatures" className="mt-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{signatureStats.total}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold">{signatureStats.enAttente}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Envoyées</p>
              <p className="text-2xl font-bold text-info">{signatureStats.envoyes}</p>
            </Card>
            <Card className="p-4 border-success/20">
              <p className="text-sm text-muted-foreground">Signées</p>
              <p className="text-2xl font-bold text-success">{signatureStats.signes}</p>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex gap-4">
            <Select value={signatureStatusFilter} onValueChange={setSignatureStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="envoye">Envoyé</SelectItem>
                <SelectItem value="signe">Signé</SelectItem>
                <SelectItem value="refuse">Refusé</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowSignatureForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle demande
            </Button>
          </div>

          {/* Signatures Table */}
          {loadingSignatures ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredSignatures.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Aucune demande de signature
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Expire le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredSignatures.map((sig) => {
                    const statusConf = signatureStatusConfig[sig.statut] || signatureStatusConfig.en_attente;
                    const StatusIcon = statusConf.icon;
                    const contact = sig.contact;
                    const isExpired = sig.date_expiration && isPast(parseISO(sig.date_expiration));

                    return (
                      <TableRow key={sig.id}>
                        <TableCell className="font-medium">{sig.type_document}</TableCell>
                        <TableCell>
                          {contact ? `${contact.prenom} ${contact.nom}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1.5", statusConf.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {isExpired && sig.statut !== "signe" ? "Expiré" : statusConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(sig.created_at), "dd/MM/yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {sig.date_expiration 
                            ? format(parseISO(sig.date_expiration), "dd/MM/yyyy", { locale: fr })
                            : "—"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {sig.statut === "en_attente" && (
                                <DropdownMenuItem onClick={() => handleSendSignature(sig.id)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Envoyer
                                </DropdownMenuItem>
                              )}
                              {sig.statut === "signe" && sig.signature_data && (
                                <DropdownMenuItem onClick={() => setSigningRequest(sig)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir signature
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setSendDocsContact(
                                contact ? { id: contact.id, nom: contact.nom, prenom: contact.prenom } : null
                              )}>
                                <FileText className="h-4 w-4 mr-2" />
                                Envoyer documents
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Generated Documents Tab */}
        <TabsContent value="generated" className="mt-4 space-y-4">
          {/* Generate from Template Studio */}
          {publishedTemplates.length > 0 && (
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Générer un document</p>
                  <p className="text-xs text-muted-foreground">Choisissez un template publié pour créer un document</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {publishedTemplates.map((t) => (
                    <Button
                      key={t.id}
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setGenerateTemplate(t)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {t.name}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {loadingGenerated ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : generatedDocs.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Stamp className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun document généré</p>
              <p className="text-sm mt-1">Utilisez les boutons ci-dessus ou le Template Studio pour générer des documents</p>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Type d'entité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedDocs.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        {doc.template_studio_templates?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {doc.entity_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.status === "generated" ? "default" : "secondary"}>
                          {doc.status === "generated" ? "Généré" : doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(doc.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.metadata?.entity_label || doc.entity_id?.substring(0, 8)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Signature Dialogs */}
      <SignatureFormDialog
        open={showSignatureForm}
        onOpenChange={setShowSignatureForm}
      />

      {signingRequest && (
        <SignatureSigningDialog
          open={!!signingRequest}
          onOpenChange={() => setSigningRequest(null)}
          signatureRequest={signingRequest}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette demande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteRequest.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Documents from Signature Dialog */}
      {sendDocsContact && (
        <SendDocumentsFromSignatureDialog
          open={!!sendDocsContact}
          onOpenChange={(val) => { if (!val) setSendDocsContact(null); }}
          contactId={sendDocsContact.id}
          contactNom={sendDocsContact.nom}
          contactPrenom={sendDocsContact.prenom}
        />
      )}

      {/* Generate Document from Template Studio */}
      {generateTemplate && (
        <GenerateDocumentModal
          open={!!generateTemplate}
          onOpenChange={(val) => { if (!val) setGenerateTemplate(null); }}
          template={generateTemplate}
        />
      )}
    </div>
  );
}
