import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { FolderOpen, File, Download, Trash2, Plus, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  nom: string;
  type_document: string;
  file_path: string;
  file_size?: number | null;
  date_expiration?: string | null;
  contact_id: string;
}

interface ContactDocumentsTabProps {
  documents: Document[];
  isLoading: boolean;
  documentTypes: { value: string; label: string }[];
  onUpload: () => void;
  onDownload: (filePath: string, filename: string) => void;
  onDelete: (params: { id: string; filePath: string; contactId: string }) => void;
}

export function ContactDocumentsTab({
  documents,
  isLoading,
  documentTypes,
  onUpload,
  onDownload,
  onDelete,
}: ContactDocumentsTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={onUpload}>
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun document</p>
          <p className="text-xs mt-1">Ajoutez CNI, permis, attestations...</p>
        </div>
      ) : (
        documents.map((doc) => {
          const typeLabel = documentTypes.find((t) => t.value === doc.type_document)?.label || doc.type_document;
          const isExpiringSoon = doc.date_expiration && differenceInDays(new Date(doc.date_expiration), new Date()) <= 60;
          const isExpired = doc.date_expiration && new Date(doc.date_expiration) < new Date();

          return (
            <div key={doc.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <File className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{doc.nom}</p>
                    <p className="text-xs text-muted-foreground">{typeLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onDownload(doc.file_path, doc.nom)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete({
                            id: doc.id,
                            filePath: doc.file_path,
                            contactId: doc.contact_id,
                          })}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {doc.date_expiration && (
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  isExpired ? "text-destructive" : isExpiringSoon ? "text-warning" : "text-muted-foreground"
                )}>
                  {(isExpired || isExpiringSoon) && <AlertCircle className="h-3 w-3" />}
                  <span>
                    {isExpired ? "Expiré le " : "Expire le "}
                    {format(new Date(doc.date_expiration), "dd/MM/yyyy", { locale: fr })}
                  </span>
                </div>
              )}
              {doc.file_size && (
                <p className="text-xs text-muted-foreground">
                  {(doc.file_size / 1024).toFixed(1)} Ko
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}