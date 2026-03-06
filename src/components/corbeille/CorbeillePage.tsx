import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useTrashItems, trashTableLabels, trashTableFilterOptions, type TrashItem } from "@/hooks/useTrash";
import { useRestoreRecord, type SoftDeleteTable } from "@/hooks/useSoftDelete";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Search, RotateCcw, Trash2, Loader2, Inbox, Calendar, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const tableBadgeColors: Record<string, string> = {
  sessions: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  contacts: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  prospects: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  factures: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  devis: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  contact_documents: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  paiements: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  session_inscriptions: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  catalogue_formations: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  email_templates: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

export function CorbeillePage() {
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<TrashItem | null>(null);

  const { data: items = [], isLoading } = useTrashItems(
    tableFilter === "all" ? null : tableFilter,
    debouncedSearch
  );
  const restore = useRestoreRecord();

  // Debounce search
  const handleSearch = (value: string) => {
    setSearch(value);
    const timer = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timer);
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    await restore.mutateAsync({
      table: restoreTarget.table_name as SoftDeleteTable,
      id: restoreTarget.item_id,
    });
    setRestoreTarget(null);
  };

  return (
    <div className="min-h-screen">
      <Header title="Corbeille" subtitle="Éléments supprimés — restaurez ou consultez les données envoyées à la corbeille" />

      <main className="p-6 space-y-6 animate-fade-in">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans la corbeille..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {trashTableFilterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Trash2 className="h-4 w-4" />
          <span>
            {items.length} élément{items.length !== 1 ? "s" : ""} dans la corbeille
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="card-elevated p-12 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Corbeille vide</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Aucun élément supprimé pour le moment.
              </p>
            </div>
          </div>
        ) : (
          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Nom / Libellé</TableHead>
                  <TableHead>Supprimé</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Liés</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={`${item.table_name}-${item.item_id}`}>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${tableBadgeColors[item.table_name] || ""}`}
                      >
                        {trashTableLabels[item.table_name] || item.table_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {item.item_label}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(item.deleted_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">
                          {item.deleted_by_email || "Système"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                      {item.delete_reason || "—"}
                    </TableCell>
                    <TableCell>
                      {item.related_count > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{item.related_count}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary/80"
                        onClick={() => setRestoreTarget(item)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restaurer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Restore confirmation dialog */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Restaurer cet élément ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {restoreTarget && (
                <>
                  <span className="font-medium text-foreground">
                    « {restoreTarget.item_label} »
                  </span>{" "}
                  sera restauré et réapparaîtra dans les listes normales.
                  {restoreTarget.related_count > 0 && (
                    <span className="block mt-2 text-sm">
                      {restoreTarget.related_count} élément(s) lié(s) seront également restaurés.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restore.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restore.isPending}
            >
              {restore.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Restaurer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
