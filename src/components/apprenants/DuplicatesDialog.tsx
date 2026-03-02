import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DuplicateGroup {
  key: string;
  contacts: {
    id: string;
    nom: string;
    prenom: string;
    email: string | null;
    telephone: string | null;
    date_naissance: string | null;
    created_at: string;
    formation: string | null;
    statut: string | null;
  }[];
}

function useDuplicateContacts(enabled: boolean) {
  return useQuery({
    queryKey: ["contacts_duplicates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, nom, prenom, email, telephone, date_naissance, created_at, formation, statut")
        .eq("archived", false)
        .order("nom")
        .order("prenom");

      if (error) throw error;

      // Group by normalized nom+prenom
      const groups: Record<string, DuplicateGroup["contacts"]> = {};

      for (const c of data || []) {
        const key = `${c.nom.trim().toUpperCase()}|${c.prenom.trim().toUpperCase()}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
      }

      // Also group by email (non-null)
      const emailGroups: Record<string, DuplicateGroup["contacts"]> = {};
      for (const c of data || []) {
        if (!c.email) continue;
        const key = c.email.trim().toLowerCase();
        if (!emailGroups[key]) emailGroups[key] = [];
        emailGroups[key].push(c);
      }

      // Merge: keep groups with 2+ contacts
      const result: DuplicateGroup[] = [];
      const seenIds = new Set<string>();

      for (const [key, contacts] of Object.entries(groups)) {
        if (contacts.length < 2) continue;
        const groupKey = `name:${key}`;
        if (!seenIds.has(groupKey)) {
          seenIds.add(groupKey);
          result.push({ key: groupKey, contacts });
        }
      }

      for (const [key, contacts] of Object.entries(emailGroups)) {
        if (contacts.length < 2) continue;
        // Check if already covered by name group
        const ids = contacts.map(c => c.id).sort().join(",");
        const alreadyCovered = result.some(g => {
          const gIds = g.contacts.map(c => c.id).sort().join(",");
          return gIds === ids;
        });
        if (!alreadyCovered) {
          result.push({ key: `email:${key}`, contacts });
        }
      }

      return result;
    },
    enabled,
    staleTime: 10_000,
  });
}

export function DuplicatesDialog({ open, onOpenChange }: DuplicatesDialogProps) {
  const { data: groups = [], isLoading } = useDuplicateContacts(open);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("contacts")
        .update({ archived: true })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts_duplicates"] });
      toast.success(`${selectedIds.size} doublon(s) archivé(s)`);
      setSelectedIds(new Set());
    },
    onError: () => {
      toast.error("Erreur lors de l'archivage");
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Archiver ${selectedIds.size} contact(s) sélectionné(s) ? Cette action les retirera de la liste active.`)) return;
    archiveMutation.mutate(Array.from(selectedIds));
  };

  const totalDuplicates = groups.reduce((s, g) => s + g.contacts.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Détection de doublons
          </DialogTitle>
          <DialogDescription>
            {isLoading
              ? "Analyse en cours..."
              : groups.length === 0
                ? "Aucun doublon détecté parmi vos contacts actifs."
                : `${groups.length} groupe(s) de doublons détecté(s) (${totalDuplicates} contacts). Sélectionnez les contacts à archiver.`}
          </DialogDescription>
        </DialogHeader>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
            <Badge variant="destructive" className="text-sm">
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
            </Badge>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1.5" />
              )}
              Archiver la sélection
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Désélectionner
            </Button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <Badge className="bg-success/10 text-success border-success/20 text-sm px-4 py-2">
                ✓ Aucun doublon détecté
              </Badge>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {groups.map((group) => {
                const label = group.key.startsWith("name:")
                  ? group.key.replace("name:", "").replace("|", " ")
                  : `Email: ${group.key.replace("email:", "")}`;

                return (
                  <div key={group.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-medium">
                        {group.contacts.length} contacts
                      </Badge>
                      <span className="text-sm font-medium text-muted-foreground">{label}</span>
                    </div>

                    <div className="rounded-xl border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10" />
                            <TableHead className="text-xs">Contact</TableHead>
                            <TableHead className="text-xs">Email</TableHead>
                            <TableHead className="text-xs">Téléphone</TableHead>
                            <TableHead className="text-xs">Formation</TableHead>
                            <TableHead className="text-xs">Statut</TableHead>
                            <TableHead className="text-xs">Créé le</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.contacts.map((c, idx) => {
                            const initials = `${c.prenom.charAt(0)}${c.nom.charAt(0)}`.toUpperCase();
                            const isOldest = idx === group.contacts.reduce((minIdx, curr, i, arr) =>
                              new Date(curr.created_at) < new Date(arr[minIdx].created_at) ? i : minIdx, 0);
                            return (
                              <TableRow
                                key={c.id}
                                className={cn(
                                  isOldest && "bg-success/5",
                                  selectedIds.has(c.id) && "bg-destructive/5"
                                )}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selectedIds.has(c.id)}
                                    onCheckedChange={() => toggleSelect(c.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7">
                                      <AvatarFallback className="text-[10px] font-semibold bg-primary/8">
                                        {initials}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <span className="text-sm font-medium">
                                        {c.prenom} {c.nom}
                                      </span>
                                      {isOldest && (
                                        <Badge variant="outline" className="ml-2 text-[10px] text-success border-success/30">
                                          Original
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {c.email || "—"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {c.telephone || "—"}
                                </TableCell>
                                <TableCell>
                                  {c.formation ? (
                                    <Badge variant="outline" className="text-xs">{c.formation}</Badge>
                                  ) : "—"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {c.statut || "—"}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {new Date(c.created_at).toLocaleDateString("fr-FR")}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
