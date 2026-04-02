import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus, Search, Users, Phone, Mail, MoreHorizontal, Pencil, Trash2,
  UserCheck, TrendingUp, Clock, XCircle, CheckCircle, LayoutList, Kanban,
  BarChart3, GitBranch, X, Eye, MessageCircle, CalendarClock,
  CheckSquare, AlertTriangle,
} from "lucide-react";
import { useProspects, useDeleteProspect, useProspectsStats, type ProspectStatus, type Prospect } from "@/hooks/useProspects";
import { useLogProspectAction, useMarkProspectDone } from "@/hooks/useProspectActions";
import { SmartConversionDialog } from "@/components/workflow/SmartConversionDialog";
import { ProspectFormDialog } from "./ProspectFormDialog";
import { ProspectsDashboard } from "./ProspectsDashboard";
import { PipelinePage } from "@/components/pipeline/PipelinePage";
import { ProspectsAgenda } from "./ProspectsAgenda";
import { useNavigation } from "@/contexts/NavigationContext";
import { ProspectsKanban } from "./ProspectsKanban";
import { ProspectDetailSheet } from "./ProspectDetailSheet";
import { ProspectQuickFilters, type QuickFilter } from "./ProspectQuickFilters";
import { ProspectReplanDialog } from "./ProspectReplanDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow, isAfter, isBefore, startOfDay, endOfDay, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ProspectStatus, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  relance: "À relancer",
  converti: "Converti",
  perdu: "Perdu",
};

const STATUS_COLORS: Record<ProspectStatus, string> = {
  nouveau: "bg-blue-100 text-blue-800",
  contacte: "bg-yellow-100 text-yellow-800",
  relance: "bg-orange-100 text-orange-800",
  converti: "bg-green-100 text-green-800",
  perdu: "bg-gray-100 text-gray-800",
};

const STATUS_ICONS: Record<ProspectStatus, React.ReactNode> = {
  nouveau: <Clock className="h-3 w-3" />,
  contacte: <Phone className="h-3 w-3" />,
  relance: <TrendingUp className="h-3 w-3" />,
  converti: <CheckCircle className="h-3 w-3" />,
  perdu: <XCircle className="h-3 w-3" />,
};

function getLeadAge(createdAt: string): string {
  return formatDistanceToNow(new Date(createdAt), { locale: fr });
}

function getNextActionLabel(prospect: Prospect): React.ReactNode {
  if (!prospect.next_action_at) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const d = new Date(prospect.next_action_at);
  const now = new Date();
  const isOverdue = isBefore(d, now);
  const label = formatDistanceToNow(d, { addSuffix: true, locale: fr });
  const typeIcon = prospect.next_action_type === "whatsapp" ? (
    <MessageCircle className="h-3 w-3" />
  ) : prospect.next_action_type === "email" ? (
    <Mail className="h-3 w-3" />
  ) : (
    <Phone className="h-3 w-3" />
  );

  return (
    <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
      {isOverdue && <AlertTriangle className="h-3 w-3" />}
      {typeIcon}
      {label}
    </span>
  );
}

export function ProspectsPage() {
  const { data: prospects = [], isLoading } = useProspects();
  const { data: stats } = useProspectsStats();
  const deleteProspect = useDeleteProspect();
  const logAction = useLogProspectAction();
  const markDone = useMarkProspectDone();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("actifs");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [activeView, setActiveView] = useState<"list" | "kanban" | "dashboard" | "pipeline" | "agenda">("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [viewingProspect, setViewingProspect] = useState<Prospect | null>(null);
  const [replanOpen, setReplanOpen] = useState(false);
  const [replanProspect, setReplanProspect] = useState<Prospect | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Support tab navigation from legacy routes or deep links
  const nav = useNavigation();
  useEffect(() => {
    const validTabs = ["list", "kanban", "dashboard", "pipeline", "agenda"];
    if (nav.activeTab && validTabs.includes(nav.activeTab)) {
      setActiveView(nav.activeTab as typeof activeView);
      nav.setActiveTab(undefined);
    }
  }, [nav.activeTab]);

  const handleViewDetail = (prospect: Prospect) => {
    setViewingProspect(prospect);
    setDetailSheetOpen(true);
  };

  // Apply quick filter
  const quickFiltered = useMemo(() => {
    const now = new Date();
    const todayS = startOfDay(now);
    const todayE = endOfDay(now);
    const weekE = endOfDay(addDays(todayS, 6));

    return prospects.filter((p) => {
      if (quickFilter === "overdue") {
        return p.next_action_at && isBefore(new Date(p.next_action_at), now) && p.statut !== "converti" && p.statut !== "perdu";
      }
      if (quickFilter === "today") {
        if (!p.next_action_at) return false;
        const d = new Date(p.next_action_at);
        return d >= todayS && d <= todayE;
      }
      if (quickFilter === "week") {
        if (!p.next_action_at) return false;
        const d = new Date(p.next_action_at);
        return d >= todayS && d <= weekE;
      }
      if (quickFilter === "mine") {
        return currentUserId && p.assigned_to === currentUserId;
      }
      return true;
    });
  }, [prospects, quickFilter, currentUserId]);

  const filteredProspects = useMemo(() => {
    return quickFiltered.filter((prospect) => {
      const matchesSearch =
        prospect.nom.toLowerCase().includes(search.toLowerCase()) ||
        prospect.prenom.toLowerCase().includes(search.toLowerCase()) ||
        prospect.email?.toLowerCase().includes(search.toLowerCase()) ||
        prospect.telephone?.includes(search);
      const matchesStatus = statusFilter === "all" || prospect.statut === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      // Sort by urgency: next_action_at asc (overdue first), nulls last
      const aTime = a.next_action_at ? new Date(a.next_action_at).getTime() : Infinity;
      const bTime = b.next_action_at ? new Date(b.next_action_at).getTime() : Infinity;
      if (aTime !== bTime) return aTime - bTime;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [quickFiltered, search, statusFilter]);

  const handleEdit = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setFormOpen(true);
  };

  const handleDelete = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setDeleteDialogOpen(true);
  };

  const handleConvert = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setConvertDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedProspect) deleteProspect.mutate(selectedProspect.id);
    setDeleteDialogOpen(false);
    setSelectedProspect(null);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingProspect(null);
  };

  const handleQuickAction = (prospect: Prospect, action: "call" | "whatsapp" | "email") => {
    logAction.mutate({ prospectId: prospect.id, actionType: action });
    if (action === "call" && prospect.telephone) {
      window.open(`tel:${prospect.telephone}`, "_blank");
    } else if (action === "whatsapp" && prospect.telephone) {
      const phone = prospect.telephone.replace(/\s+/g, "").replace(/^0/, "33");
      window.open(`https://wa.me/${phone}`, "_blank");
    } else if (action === "email" && prospect.email) {
      window.open(`mailto:${prospect.email}`, "_blank");
    }
  };

  const handleReplan = (prospect: Prospect) => {
    setReplanProspect(prospect);
    setReplanOpen(true);
  };

  const handleMarkDone = (prospect: Prospect) => {
    markDone.mutate(prospect.id);
  };

  // Selection logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredProspects.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    let successCount = 0;
    for (const id of ids) {
      try { await deleteProspect.mutateAsync(id); successCount++; } catch {}
    }
    toast.success(`${successCount} prospect(s) supprimé(s)`);
    setSelectedIds(new Set());
    setBulkDeleteDialogOpen(false);
  };

  const filterCounts = useMemo(() => {
    return {
      overdue: stats?.overdue || 0,
      today: stats?.today || 0,
      week: stats?.week || 0,
    };
  }, [stats]);

  return (
    <div className="space-y-6">
      <Header
        title="Prospects"
        subtitle="Gérez vos prospects et convertissez-les en contacts"
      />

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Liste
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2">
              <Kanban className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="agenda" className="gap-2">
              <Clock className="h-4 w-4" />
              Agenda
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau prospect
          </Button>
        </div>

        <TabsContent value="dashboard" className="mt-6">
          <ProspectsDashboard />
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <ProspectsKanban onViewDetail={handleViewDetail} />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6">
          <PipelinePage embedded />
        </TabsContent>

        <TabsContent value="agenda" className="mt-6">
          <ProspectsAgenda onViewDetail={handleViewDetail} />
        </TabsContent>

        <TabsContent value="list" className="mt-6 space-y-4">
          {/* KPI Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Card className="p-3">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </Card>
              <Card className={cn("p-3", stats.overdue > 0 ? "border-destructive/40 bg-destructive/5" : "")}>
                <div className={cn("text-2xl font-bold", stats.overdue > 0 ? "text-destructive" : "")}>
                  {stats.overdue}
                </div>
                <div className={cn("text-xs flex items-center gap-1", stats.overdue > 0 ? "text-destructive" : "text-muted-foreground")}>
                  <AlertTriangle className="h-3 w-3" /> En retard
                </div>
              </Card>
              <Card className="p-3 border-orange-200 bg-orange-50/50">
                <div className="text-2xl font-bold text-orange-700">{stats.today}</div>
                <div className="text-xs text-orange-600">Aujourd'hui</div>
              </Card>
              <Card className="p-3 border-blue-200 bg-blue-50/50">
                <div className="text-2xl font-bold text-blue-700">{stats.nouveaux}</div>
                <div className="text-xs text-blue-600">Nouveaux</div>
              </Card>
              <Card className="p-3 border-green-200 bg-green-50/50">
                <div className="text-2xl font-bold text-green-700">{stats.converti}</div>
                <div className="text-xs text-green-600">Convertis</div>
              </Card>
              <Card className="p-3">
                <div className="text-2xl font-bold text-muted-foreground">{stats.perdu}</div>
                <div className="text-xs text-muted-foreground">Perdus</div>
              </Card>
            </div>
          )}

          {/* Quick Filters */}
          <ProspectQuickFilters
            activeFilter={quickFilter}
            onFilterChange={setQuickFilter}
            counts={filterCounts}
          />

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un prospect..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : filteredProspects.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun prospect"
              description="Ajoutez des prospects pour suivre vos opportunités commerciales."
              action={
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un prospect
                </Button>
              }
            />
          ) : isMobile ? (
            /* ─── MOBILE CARDS ─── */
            <div className="space-y-3">
              {filteredProspects.map((prospect) => (
                <Card key={prospect.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="font-semibold">{prospect.prenom} {prospect.nom}</div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={STATUS_COLORS[prospect.statut]}>
                          {STATUS_ICONS[prospect.statut]}
                          <span className="ml-1">{STATUS_LABELS[prospect.statut]}</span>
                        </Badge>
                        {prospect.formation_souhaitee && (
                          <Badge variant="outline">{prospect.formation_souhaitee}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {getNextActionLabel(prospect)}
                        <span>• {getLeadAge(prospect.created_at)}</span>
                      </div>
                      {/* Quick actions */}
                      <div className="flex gap-1 pt-1">
                        <TooltipProvider>
                          {prospect.telephone && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleQuickAction(prospect, "call")}>
                                    <Phone className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Appeler</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleQuickAction(prospect, "whatsapp")}>
                                    <MessageCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>WhatsApp</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          {prospect.email && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleQuickAction(prospect, "email")}>
                                  <Mail className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Email</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleReplan(prospect)}>
                                <CalendarClock className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Replanifier</TooltipContent>
                          </Tooltip>
                          {prospect.next_action_at && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMarkDone(prospect)}>
                                  <CheckSquare className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Marquer fait</TooltipContent>
                            </Tooltip>
                          )}
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleViewDetail(prospect)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {prospect.statut !== "converti" && (
                        <Button size="sm" variant="default" onClick={() => handleConvert(prospect)}>
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* ─── DESKTOP TABLE ─── */
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredProspects.length > 0 && selectedIds.size === filteredProspects.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Prochaine action</TableHead>
                    <TableHead>Formation</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Âge du lead</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProspects.map((prospect) => {
                    const isOverdue = prospect.next_action_at && isBefore(new Date(prospect.next_action_at), new Date());
                    return (
                      <TableRow
                        key={prospect.id}
                        className={cn(
                          selectedIds.has(prospect.id) ? "bg-muted/50" : "",
                          isOverdue ? "bg-destructive/[0.03]" : ""
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(prospect.id)}
                            onCheckedChange={(checked) => handleSelectOne(prospect.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <button className="hover:underline text-left" onClick={() => handleViewDetail(prospect)}>
                            {prospect.prenom} {prospect.nom}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[prospect.statut]}>
                            {STATUS_ICONS[prospect.statut]}
                            <span className="ml-1">{STATUS_LABELS[prospect.statut]}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{getNextActionLabel(prospect)}</TableCell>
                        <TableCell>
                          {prospect.formation_souhaitee ? (
                            <Badge variant="outline">{prospect.formation_souhaitee}</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {prospect.telephone ? (
                            <span className="text-sm">{prospect.telephone}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default">{getLeadAge(prospect.created_at)}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Créé le {new Date(prospect.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <TooltipProvider delayDuration={300}>
                              {prospect.telephone && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleQuickAction(prospect, "call")}>
                                        <Phone className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Appeler</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleQuickAction(prospect, "whatsapp")}>
                                        <MessageCircle className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>WhatsApp</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                              {prospect.email && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleQuickAction(prospect, "email")}>
                                      <Mail className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Email</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleReplan(prospect)}>
                                    <CalendarClock className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Replanifier</TooltipContent>
                              </Tooltip>
                              {prospect.next_action_at && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleMarkDone(prospect)}>
                                      <CheckSquare className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Marquer fait</TooltipContent>
                                </Tooltip>
                              )}
                            </TooltipProvider>

                            {prospect.statut !== "converti" && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => handleConvert(prospect)}>
                                <UserCheck className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetail(prospect)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir la fiche
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(prospect)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(prospect)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ProspectFormDialog open={formOpen} onOpenChange={handleFormClose} prospect={editingProspect} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action masquera le prospect "{selectedProspect?.prenom} {selectedProspect?.nom}".
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

      <SmartConversionDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        prospect={selectedProspect}
      />

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selectedIds.size} prospect(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action masquera les prospects sélectionnés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4">
          <span className="text-sm font-medium">{selectedIds.size} sélectionné(s)</span>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
        </div>
      )}

      <ProspectDetailSheet
        prospect={viewingProspect}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />

      <ProspectReplanDialog
        open={replanOpen}
        onOpenChange={setReplanOpen}
        prospectId={replanProspect?.id || null}
        prospectName={replanProspect ? `${replanProspect.prenom} ${replanProspect.nom}` : undefined}
      />
    </div>
  );
}
