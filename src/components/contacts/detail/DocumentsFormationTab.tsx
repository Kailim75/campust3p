import { useState, useMemo } from "react";
import { 
  FileText, 
  Award, 
  FileSignature, 
  ScrollText, 
  Folder,
  FolderOpen,
  Plus,
  Search,
  Grid3X3,
  List,
  Download,
  Trash2,
  Edit,
  Eye,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useContactDocuments, downloadDocument, ContactDocument } from "@/hooks/useContactDocuments";
import { usePedagogicalDocuments, useDownloadPedagogicalDocument, useDeletePedagogicalDocument, DOCUMENT_TYPE_LABELS } from "@/hooks/usePedagogicalDocuments";
import { useContactCertificates } from "@/hooks/useAttestationCertificates";
import { DocumentUploadDialog } from "../DocumentUploadDialog";
import { AttestationEditorDialog } from "./AttestationEditorDialog";
import { AttestationGeneratorDialog } from "./AttestationGeneratorDialog";
import { DocumentVersionHistoryDialog } from "./DocumentVersionHistoryDialog";

// Document categories configuration
const DOCUMENT_CATEGORIES = [
  { 
    id: "attestations", 
    label: "Attestations de formation", 
    icon: Award,
    types: ["attestation", "attestation_formation"],
    color: "text-amber-600"
  },
  { 
    id: "contrats", 
    label: "Contrats de formation", 
    icon: FileSignature,
    types: ["contrat", "contrat_formation"],
    color: "text-blue-600"
  },
  { 
    id: "conventions", 
    label: "Conventions de stage", 
    icon: ScrollText,
    types: ["convention", "convention_stage"],
    color: "text-purple-600"
  },
  { 
    id: "reglement", 
    label: "Règlement intérieur signé", 
    icon: FileText,
    types: ["reglement_interieur", "reglement"],
    color: "text-green-600"
  },
  { 
    id: "administratif", 
    label: "Documents administratifs", 
    icon: Folder,
    types: ["cni", "permis", "casier", "certificat_medical", "inscription", "entree_sortie", "test_positionnement"],
    color: "text-slate-600"
  },
  { 
    id: "autres", 
    label: "Autres documents", 
    icon: FolderOpen,
    types: ["autre"],
    color: "text-gray-600"
  },
];

interface DocumentsFormationTabProps {
  contactId: string;
  contact?: {
    nom: string;
    prenom: string;
    formation?: string | null;
  };
}

export function DocumentsFormationTab({ contactId, contact }: DocumentsFormationTabProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["attestations", "administratif"]);
  
  // Dialogs state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editorDialogOpen, setEditorDialogOpen] = useState(false);
  const [generatorDialogOpen, setGeneratorDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  
  // Data hooks
  const { data: contactDocuments = [], isLoading: docsLoading } = useContactDocuments(contactId);
  const { data: pedagogicalDocuments = [], isLoading: pedaLoading } = usePedagogicalDocuments(contactId);
  const { data: certificates = [], isLoading: certsLoading } = useContactCertificates(contactId);
  const downloadPedaDoc = useDownloadPedagogicalDocument();
  const deletePedaDoc = useDeletePedagogicalDocument();
  
  const isLoading = docsLoading || pedaLoading || certsLoading;
  
  // Combine all documents into unified structure
  const allDocuments = useMemo(() => {
    const docs: Array<{
      id: string;
      nom: string;
      type: string;
      category: string;
      filePath?: string;
      fileSize?: number | null;
      dateCreation: string;
      dateExpiration?: string | null;
      status: "signed" | "pending" | "expired" | "valid";
      source: "contact" | "pedagogical" | "certificate";
      originalData: any;
    }> = [];
    
    // Contact documents
    contactDocuments.forEach(doc => {
      const category = DOCUMENT_CATEGORIES.find(c => c.types.includes(doc.type_document))?.id || "autres";
      const isExpired = doc.date_expiration && new Date(doc.date_expiration) < new Date();
      
      docs.push({
        id: doc.id,
        nom: doc.nom,
        type: doc.type_document,
        category,
        filePath: doc.file_path,
        fileSize: doc.file_size,
        dateCreation: doc.created_at,
        dateExpiration: doc.date_expiration,
        status: isExpired ? "expired" : "valid",
        source: "contact",
        originalData: doc,
      });
    });
    
    // Pedagogical documents
    pedagogicalDocuments.forEach(doc => {
      const category = DOCUMENT_CATEGORIES.find(c => c.types.includes(doc.document_type))?.id || "administratif";
      
      docs.push({
        id: doc.id,
        nom: doc.file_name,
        type: doc.document_type,
        category,
        filePath: doc.file_path,
        dateCreation: doc.created_at,
        status: doc.status === "actif" ? "valid" : "pending",
        source: "pedagogical",
        originalData: doc,
      });
    });
    
    // Certificates as attestation documents
    certificates.forEach(cert => {
      docs.push({
        id: cert.id,
        nom: `Attestation ${cert.numero_certificat}`,
        type: "attestation_formation",
        category: "attestations",
        dateCreation: cert.date_emission,
        status: cert.status === "generated" ? "valid" : cert.status === "revoked" ? "expired" : "pending",
        source: "certificate",
        originalData: cert,
      });
    });
    
    return docs;
  }, [contactDocuments, pedagogicalDocuments, certificates]);
  
  // Filter documents
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter(doc => {
      // Search filter
      if (searchQuery && !doc.nom.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (categoryFilter !== "all" && doc.category !== categoryFilter) {
        return false;
      }
      
      // Date filter
      if (dateFilter !== "all") {
        const docDate = new Date(doc.dateCreation);
        const now = new Date();
        
        if (dateFilter === "week" && differenceInDays(now, docDate) > 7) return false;
        if (dateFilter === "month" && differenceInDays(now, docDate) > 30) return false;
        if (dateFilter === "year" && differenceInDays(now, docDate) > 365) return false;
      }
      
      return true;
    });
  }, [allDocuments, searchQuery, categoryFilter, dateFilter]);
  
  // Group by category
  const documentsByCategory = useMemo(() => {
    const grouped: Record<string, typeof filteredDocuments> = {};
    
    DOCUMENT_CATEGORIES.forEach(cat => {
      grouped[cat.id] = filteredDocuments.filter(d => d.category === cat.id);
    });
    
    return grouped;
  }, [filteredDocuments]);
  
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };
  
  const handleDownload = async (doc: typeof allDocuments[0]) => {
    if (doc.source === "contact" && doc.filePath) {
      await downloadDocument(doc.filePath, doc.nom);
    } else if (doc.source === "pedagogical" && doc.filePath) {
      await downloadPedaDoc.mutateAsync({ filePath: doc.filePath, fileName: doc.nom });
    } else if (doc.source === "certificate" && doc.originalData.document_url) {
      window.open(doc.originalData.document_url, "_blank");
    }
  };
  
  const handleEdit = (doc: typeof allDocuments[0]) => {
    if (doc.source === "certificate") {
      setSelectedDocument(doc.originalData);
      setEditorDialogOpen(true);
    }
  };
  
  const handleViewHistory = (doc: typeof allDocuments[0]) => {
    setSelectedDocument(doc);
    setHistoryDialogOpen(true);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "signed":
        return <Badge variant="default" className="text-[11px] font-semibold px-2.5 py-0.5"><CheckCircle className="h-3 w-3 mr-1" />Signé</Badge>;
      case "pending":
        return <Badge variant="secondary" className="text-[11px] font-semibold px-2.5 py-0.5 bg-warning/10 text-warning border border-warning/20"><Clock className="h-3 w-3 mr-1" />Attendu</Badge>;
      case "expired":
        return <Badge variant="destructive" className="text-[11px] font-semibold px-2.5 py-0.5"><AlertCircle className="h-3 w-3 mr-1" />Expiré</Badge>;
      case "valid":
        return <Badge variant="outline" className="text-[11px] font-semibold px-2.5 py-0.5 bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Reçu</Badge>;
      default:
        return null;
    }
  };
  
  const getDocumentIcon = (categoryId: string) => {
    const category = DOCUMENT_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return FileText;
    return category.icon;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {DOCUMENT_CATEGORIES.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes dates</SelectItem>
              <SelectItem value="week">7 derniers jours</SelectItem>
              <SelectItem value="month">30 derniers jours</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-10 w-10 rounded-r-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-10 w-10 rounded-l-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un document
        </Button>
        <Button variant="outline" onClick={() => setGeneratorDialogOpen(true)}>
          <Award className="h-4 w-4 mr-2" />
          Générer une attestation
        </Button>
      </div>
      
      {/* Documents count */}
      <div className="text-sm text-muted-foreground">
        {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} 
        {searchQuery && ` trouvé${filteredDocuments.length !== 1 ? 's' : ''}`}
      </div>
      
      {/* Documents by category */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Aucun document</p>
          <p className="text-sm mt-1">
            {searchQuery 
              ? "Aucun document ne correspond à votre recherche" 
              : "Ajoutez des documents ou générez une attestation"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {DOCUMENT_CATEGORIES.map(category => {
            const docs = documentsByCategory[category.id] || [];
            if (docs.length === 0 && categoryFilter !== "all") return null;
            
            const Icon = category.icon;
            const isExpanded = expandedCategories.includes(category.id);
            
            return (
              <Collapsible
                key={category.id}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between p-3 h-auto",
                      docs.length === 0 && "opacity-50"
                    )}
                    disabled={docs.length === 0}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-5 w-5", category.color)} />
                      <span className="font-medium">{category.label}</span>
                      <Badge variant="secondary" className="ml-2">
                        {docs.length}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className={cn(
                    "mt-2 pl-4",
                    viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"
                  )}>
                    {docs.map(doc => (
                      <DocumentCard
                        key={doc.id}
                        document={doc}
                        viewMode={viewMode}
                        categoryColor={category.color}
                        onDownload={() => handleDownload(doc)}
                        onEdit={() => handleEdit(doc)}
                        onViewHistory={() => handleViewHistory(doc)}
                        getStatusBadge={getStatusBadge}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
      
      {/* Dialogs */}
      <DocumentUploadDialog
        contactId={contactId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
      
      <AttestationGeneratorDialog
        contactId={contactId}
        contact={contact}
        open={generatorDialogOpen}
        onOpenChange={setGeneratorDialogOpen}
      />
      
      {selectedDocument && (
        <>
          <AttestationEditorDialog
            certificate={selectedDocument}
            open={editorDialogOpen}
            onOpenChange={setEditorDialogOpen}
          />
          
          <DocumentVersionHistoryDialog
            document={selectedDocument}
            open={historyDialogOpen}
            onOpenChange={setHistoryDialogOpen}
          />
        </>
      )}
    </div>
  );
}

// Document card component
interface DocumentCardProps {
  document: {
    id: string;
    nom: string;
    type: string;
    category: string;
    filePath?: string;
    fileSize?: number | null;
    dateCreation: string;
    dateExpiration?: string | null;
    status: string;
    source: string;
    originalData: any;
  };
  viewMode: "grid" | "list";
  categoryColor: string;
  onDownload: () => void;
  onEdit: () => void;
  onViewHistory: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

function DocumentCard({ 
  document, 
  viewMode, 
  categoryColor, 
  onDownload, 
  onEdit, 
  onViewHistory,
  getStatusBadge 
}: DocumentCardProps) {
  const isAttestation = document.source === "certificate";
  const isExpired = document.status === "expired";
  
  if (viewMode === "grid") {
    return (
      <Card className={cn("transition-colors hover:bg-muted/50", isExpired && "opacity-75")}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <FileText className={cn("h-8 w-8 shrink-0", categoryColor)} />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{document.nom}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(document.dateCreation), "dd/MM/yyyy", { locale: fr })}
                </p>
                {document.fileSize && (
                  <p className="text-xs text-muted-foreground">
                    {(document.fileSize / 1024).toFixed(1)} Ko
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end shrink-0">
              {getStatusBadge(document.status)}
              <DocumentActions
                isAttestation={isAttestation}
                onDownload={onDownload}
                onEdit={onEdit}
                onViewHistory={onViewHistory}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-2xl border border-border bg-card transition-all duration-150 group",
      "hover:border-border-strong",
      isExpired && "opacity-75"
    )} style={{ boxShadow: 'var(--shadow-xs)' }}
       onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
       onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-xs)'}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className={cn("p-2 rounded-xl bg-muted/50", categoryColor)}>
          <FileText className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate tracking-tight">{document.nom}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{format(new Date(document.dateCreation), "dd/MM/yyyy", { locale: fr })}</span>
            {document.fileSize && (
              <>
                <span className="text-border-strong">•</span>
                <span>{(document.fileSize / 1024).toFixed(1)} Ko</span>
              </>
            )}
            {document.dateExpiration && (
              <>
                <span className="text-border-strong">•</span>
                <span className={isExpired ? "text-destructive font-medium" : ""}>
                  Expire le {format(new Date(document.dateExpiration), "dd/MM/yyyy", { locale: fr })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2.5 shrink-0">
        {getStatusBadge(document.status)}
        <DocumentActions
          isAttestation={isAttestation}
          onDownload={onDownload}
          onEdit={onEdit}
          onViewHistory={onViewHistory}
        />
      </div>
    </div>
  );
}

// Actions dropdown
function DocumentActions({ 
  isAttestation, 
  onDownload, 
  onEdit, 
  onViewHistory 
}: { 
  isAttestation: boolean;
  onDownload: () => void;
  onEdit: () => void;
  onViewHistory: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Télécharger
        </DropdownMenuItem>
        
        {isAttestation && (
          <>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Éditer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onViewHistory}>
              <History className="h-4 w-4 mr-2" />
              Historique
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onDownload}>
          <Send className="h-4 w-4 mr-2" />
          Envoyer par email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
