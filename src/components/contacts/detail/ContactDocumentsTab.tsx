import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
import { FolderOpen, File, Download, Trash2, Plus, AlertCircle, CalendarClock, ShieldAlert } from "lucide-react";
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

  const expiredCount = documents.filter((doc) => doc.date_expiration && new Date(doc.date_expiration) < new Date()).length;
  const expiringSoonCount = documents.filter((doc) => {
    if (!doc.date_expiration) return false;
    const expirationDate = new Date(doc.date_expiration);
    const today = new Date();
    return expirationDate >= today && differenceInDays(expirationDate, today) <= 60;
  }).length;
  const typedDocumentsCount = documents.filter((doc) => doc.type_document && doc.type_document !== "autre").length;

  return (
    <div className="space-y-3">
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <p className="font-medium">Dossier documentaire</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Vérifie rapidement les pièces présentes, les renouvellements à surveiller et les manques éventuels.
              </p>
            </div>
            <Button size="sm" onClick={onUpload}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Documents</p>
              <p className="mt-1 text-lg font-semibold">{documents.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Typés</p>
              <p className="mt-1 text-lg font-semibold">{typedDocumentsCount}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">À surveiller</p>
              <p className="mt-1 text-lg font-semibold">{expiringSoonCount}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Expirés</p>
              <p className="mt-1 text-lg font-semibold">{expiredCount}</p>
            </div>
          </div>

          {(expiredCount > 0 || expiringSoonCount > 0) && (
            <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <ShieldAlert className="h-4 w-4 text-warning" />
                Vigilance documentaire
              </div>
              <p className="mt-1 text-muted-foreground">
                {expiredCount > 0
                  ? `${expiredCount} document(s) expiré(s) et ${expiringSoonCount} à renouveler prochainement.`
                  : `${expiringSoonCount} document(s) arrivent à échéance dans les 60 prochains jours.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Aucun document</p>
            <p className="text-xs mt-1">Ajoute CNI, permis, attestations et pièces réglementaires pour commencer le dossier.</p>
          </CardContent>
        </Card>
      ) : (
        documents.map((doc) => {
          const typeLabel = documentTypes.find((t) => t.value === doc.type_document)?.label || doc.type_document;
          const isExpiringSoon = doc.date_expiration && differenceInDays(new Date(doc.date_expiration), new Date()) <= 60;
          const isExpired = doc.date_expiration && new Date(doc.date_expiration) < new Date();

          return (
            <div key={doc.id} className="p-3 border rounded-lg space-y-2 bg-card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <File className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{doc.nom}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{typeLabel}</p>
                      {doc.file_size && (
                        <span className="text-xs text-muted-foreground">
                          {(doc.file_size / 1024).toFixed(1)} Ko
                        </span>
                      )}
                    </div>
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
                  {isExpired ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : (
                    <CalendarClock className="h-3 w-3" />
                  )}
                  <span>
                    {isExpired ? "Expiré le " : "Expire le "}
                    {format(new Date(doc.date_expiration), "dd/MM/yyyy", { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
