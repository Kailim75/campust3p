import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  FileText,
  Download,
  Trash2,
  Upload,
  BookOpen,
  FileCheck,
  ClipboardList,
  Award,
  File,
  IdCard,
} from "lucide-react";
import {
  usePedagogicalDocuments,
  useUploadPedagogicalDocument,
  useDeletePedagogicalDocument,
  useDownloadPedagogicalDocument,
  DOCUMENT_TYPE_LABELS,
  type PedagogicalDocumentType,
} from "@/hooks/usePedagogicalDocuments";
import { useGenerateChevalet } from "@/hooks/useChevalets";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DOCUMENT_TYPE_ICONS: Record<PedagogicalDocumentType, React.ReactNode> = {
  inscription: <ClipboardList className="h-4 w-4" />,
  entree_sortie: <FileCheck className="h-4 w-4" />,
  test_positionnement: <BookOpen className="h-4 w-4" />,
  attestation: <Award className="h-4 w-4" />,
  autre: <File className="h-4 w-4" />,
};

interface ContactPedagogyTabProps {
  contactId: string;
  contactPrenom: string;
  contactFormation: string;
}

export function ContactPedagogyTab({ contactId, contactPrenom, contactFormation }: ContactPedagogyTabProps) {
  const { data: documents = [], isLoading } = usePedagogicalDocuments(contactId);
  const uploadDocument = useUploadPedagogicalDocument();
  const deleteDocument = useDeletePedagogicalDocument();
  const downloadDocument = useDownloadPedagogicalDocument();
  const generateChevalet = useGenerateChevalet();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<PedagogicalDocumentType>("inscription");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{ id: string; filePath: string; name: string } | null>(null);

  // Separate active and archived documents
  const activeDocuments = documents.filter((d) => d.status === "actif");
  const archivedDocuments = documents.filter((d) => d.status === "archive");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    await uploadDocument.mutateAsync({
      contactId,
      documentType: selectedType,
      file: selectedFile,
      notes: notes || undefined,
    });

    setUploadDialogOpen(false);
    setSelectedFile(null);
    setNotes("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownload = (filePath: string, fileName: string) => {
    downloadDocument.mutate({ filePath, fileName });
  };

  const handleDelete = (id: string, filePath: string, name: string) => {
    setDocToDelete({ id, filePath, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (docToDelete) {
      deleteDocument.mutate({
        id: docToDelete.id,
        contactId,
        filePath: docToDelete.filePath,
      });
    }
    setDeleteDialogOpen(false);
    setDocToDelete(null);
  };

  const handleGenerateChevalet = () => {
    generateChevalet.mutate({
      contactId,
      prenom: contactPrenom,
      formationType: contactFormation || "VTC",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Ajouter un document
        </Button>
        <Button size="sm" variant="outline" onClick={handleGenerateChevalet} disabled={generateChevalet.isPending}>
          <IdCard className="h-4 w-4 mr-2" />
          {generateChevalet.isPending ? "Génération..." : "Générer chevalet"}
        </Button>
      </div>

      {/* Active Documents */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Documents actifs</h3>
        {activeDocuments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun document pédagogique"
            description="Ajoutez des documents pédagogiques (fiche d'inscription, test de positionnement, etc.)"
            action={
              <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeDocuments.map((doc) => (
              <Card key={doc.id} className="relative group">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {DOCUMENT_TYPE_ICONS[doc.document_type]}
                      <CardTitle className="text-base">{DOCUMENT_TYPE_LABELS[doc.document_type]}</CardTitle>
                    </div>
                    <Badge variant="outline">v{doc.version}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="text-muted-foreground truncate">{doc.file_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(doc.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                  </div>
                  {doc.notes && (
                    <div className="text-xs text-muted-foreground border-t pt-2 mt-2">{doc.notes}</div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(doc.file_path, doc.file_name)}
                      disabled={downloadDocument.isPending}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Télécharger
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(doc.id, doc.file_path, doc.file_name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Archived Documents */}
      {archivedDocuments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">Documents archivés</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {archivedDocuments.map((doc) => (
              <Card key={doc.id} className="opacity-60">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {DOCUMENT_TYPE_ICONS[doc.document_type]}
                      <CardTitle className="text-base">{DOCUMENT_TYPE_LABELS[doc.document_type]}</CardTitle>
                    </div>
                    <Badge variant="secondary">v{doc.version} - archivé</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="text-muted-foreground truncate">{doc.file_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(doc.created_at), "dd MMM yyyy", { locale: fr })}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(doc.file_path, doc.file_name)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Télécharger
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un document pédagogique</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as PedagogicalDocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fichier</Label>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {selectedFile && (
                <div className="text-sm text-muted-foreground">
                  Fichier sélectionné: {selectedFile.name}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                placeholder="Notes sur ce document..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadDocument.isPending}
              >
                {uploadDocument.isPending ? "Upload..." : "Ajouter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le document "{docToDelete?.name}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
