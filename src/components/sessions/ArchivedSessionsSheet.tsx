import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Eye, ArchiveRestore, Calendar, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useArchivedSessions, useUnarchiveSession, type ArchivedSession } from "@/hooks/useSessionArchive";
import { SessionDetailSheet } from "./SessionDetailSheet";

interface ArchivedSessionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArchivedSessionsSheet({ open, onOpenChange }: ArchivedSessionsSheetProps) {
  const { data: archivedSessions, isLoading } = useArchivedSessions();
  const unarchiveSession = useUnarchiveSession();
  
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Extract unique years and types
  const { years, types } = useMemo(() => {
    if (!archivedSessions) return { years: [], types: [] };
    
    const yearsSet = new Set<string>();
    const typesSet = new Set<string>();
    
    archivedSessions.forEach((session) => {
      if (session.date_debut) {
        yearsSet.add(new Date(session.date_debut).getFullYear().toString());
      }
      if (session.formation_type) {
        typesSet.add(session.formation_type);
      }
    });
    
    return {
      years: Array.from(yearsSet).sort((a, b) => Number(b) - Number(a)),
      types: Array.from(typesSet).sort(),
    };
  }, [archivedSessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (!archivedSessions) return [];
    
    return archivedSessions.filter((session) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          session.nom.toLowerCase().includes(searchLower) ||
          session.formation_type.toLowerCase().includes(searchLower) ||
          session.numero_session?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Year filter
      if (yearFilter !== "all") {
        const sessionYear = new Date(session.date_debut).getFullYear().toString();
        if (sessionYear !== yearFilter) return false;
      }
      
      // Type filter
      if (typeFilter !== "all" && session.formation_type !== typeFilter) {
        return false;
      }
      
      return true;
    });
  }, [archivedSessions, search, yearFilter, typeFilter]);

  const handleViewDetail = (session: ArchivedSession) => {
    setDetailSessionId(session.id);
    setDetailOpen(true);
  };

  const handleUnarchive = async (sessionId: string) => {
    await unarchiveSession.mutateAsync(sessionId);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sessions archivées
            </SheetTitle>
            <SheetDescription>
              Consultez les sessions de formation terminées et archivées. Ces sessions sont en lecture seule.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, type ou numéro..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les années</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type de formation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{filteredSessions.length} session{filteredSessions.length > 1 ? 's' : ''} archivée{filteredSessions.length > 1 ? 's' : ''}</span>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucune session archivée</p>
                {search && <p className="text-sm mt-1">Essayez de modifier vos critères de recherche</p>}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Archivée le</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{session.nom}</p>
                            {session.numero_session && (
                              <p className="text-xs text-muted-foreground">{session.numero_session}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {session.formation_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(parseISO(session.date_debut), "dd/MM/yyyy", { locale: fr })}
                            {" - "}
                            {format(parseISO(session.date_fin), "dd/MM/yyyy", { locale: fr })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {session.archived_at && (
                            <span className="text-sm text-muted-foreground">
                              {format(parseISO(session.archived_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(session)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir les détails
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUnarchive(session.id)}>
                                <ArchiveRestore className="h-4 w-4 mr-2" />
                                Désarchiver
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Session Detail Sheet (read-only mode for archived) */}
      <SessionDetailSheet
        sessionId={detailSessionId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => {}} // No edit for archived sessions
      />
    </>
  );
}
