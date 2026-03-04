import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  Mail,
  MessageCircle,
  Edit,
  Trash2,
  UserCheck,
  Calendar,
  Clock,
  AlertCircle,
  Building,
  GraduationCap,
  Send,
  Plus,
  FileText,
  RefreshCw,
  MessageSquare,
  Bell,
  BellOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
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
import { useSheetSize } from "@/hooks/useSheetSize";
import { SheetSizeSelector } from "@/components/ui/sheet-size-selector";
import { openWhatsApp } from "@/lib/phone-utils";
import { useDeleteProspect, useUpdateProspect, type Prospect, type ProspectStatus } from "@/hooks/useProspects";
import { useProspectHistorique, type ProspectHistoriqueType } from "@/hooks/useProspectHistorique";
import { ProspectHistoriqueDialog } from "./ProspectHistoriqueDialog";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { ProspectFormDialog } from "./ProspectFormDialog";
import { ProspectRappelDialog } from "./ProspectRappelDialog";
import { SmartConversionDialog } from "@/components/workflow/SmartConversionDialog";

const STATUS_LABELS: Record<ProspectStatus, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  relance: "À relancer",
  converti: "Converti",
  perdu: "Perdu",
};

const STATUS_COLORS: Record<ProspectStatus, string> = {
  nouveau: "bg-blue-100 text-blue-800 border-blue-200",
  contacte: "bg-yellow-100 text-yellow-800 border-yellow-200",
  relance: "bg-orange-100 text-orange-800 border-orange-200",
  converti: "bg-green-100 text-green-800 border-green-200",
  perdu: "bg-gray-100 text-gray-800 border-gray-200",
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  basse: { label: "Basse", color: "bg-gray-100 text-gray-600" },
  normale: { label: "Normale", color: "bg-blue-100 text-blue-600" },
  haute: { label: "Haute", color: "bg-orange-100 text-orange-600" },
  urgente: { label: "Urgente", color: "bg-red-100 text-red-600" },
};

const TYPE_CONFIG: Record<ProspectHistoriqueType, { label: string; icon: React.ReactNode; color: string }> = {
  appel: { label: "Appel", icon: <Phone className="h-3 w-3" />, color: "bg-blue-100 text-blue-800" },
  email: { label: "Email", icon: <Mail className="h-3 w-3" />, color: "bg-green-100 text-green-800" },
  sms: { label: "SMS", icon: <MessageSquare className="h-3 w-3" />, color: "bg-purple-100 text-purple-800" },
  rdv: { label: "RDV", icon: <Calendar className="h-3 w-3" />, color: "bg-orange-100 text-orange-800" },
  note: { label: "Note", icon: <FileText className="h-3 w-3" />, color: "bg-gray-100 text-gray-800" },
  relance: { label: "Relance", icon: <RefreshCw className="h-3 w-3" />, color: "bg-yellow-100 text-yellow-800" },
};

interface ProspectDetailSheetProps {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProspectDetailSheet({ prospect, open, onOpenChange }: ProspectDetailSheetProps) {
  const { size, setSize, sizeClass } = useSheetSize("prospect");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historiqueDialogOpen, setHistoriqueDialogOpen] = useState(false);
  const { composerProps, openComposer } = useEmailComposer();
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rappelDialogOpen, setRappelDialogOpen] = useState(false);

  const deleteProspect = useDeleteProspect();
  const updateProspect = useUpdateProspect();
  const { data: historique = [], isLoading: historiqueLoading } = useProspectHistorique(prospect?.id || null);

  const handleClearRappel = async () => {
    if (!prospect) return;
    try {
      await updateProspect.mutateAsync({
        id: prospect.id,
        updates: { date_prochaine_relance: null },
      });
      toast.success("Rappel supprimé");
    } catch {
      toast.error("Erreur lors de la suppression du rappel");
    }
  };

  const handleDelete = async () => {
    if (!prospect) return;
    try {
      await deleteProspect.mutateAsync(prospect.id);
      toast.success("Prospect archivé");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
    setDeleteDialogOpen(false);
  };

  if (!prospect) return null;

  const initials = `${prospect.prenom?.[0] ?? ""}${prospect.nom?.[0] ?? ""}`.toUpperCase();
  const priorityConfig = PRIORITY_CONFIG[prospect.priorite || "normale"];

  // Check if follow-up date is today or past
  const followUpDate = prospect.date_prochaine_relance ? new Date(prospect.date_prochaine_relance) : null;
  const isFollowUpToday = followUpDate && isToday(followUpDate);
  const isFollowUpPast = followUpDate && isPast(followUpDate) && !isToday(followUpDate);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className={cn(sizeClass, "overflow-y-auto p-0")}>
          <div className="p-6">
            <SheetHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-xl">
                      {prospect.prenom} {prospect.nom}
                    </SheetTitle>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={STATUS_COLORS[prospect.statut]}>
                        {STATUS_LABELS[prospect.statut]}
                      </Badge>
                      {priorityConfig && (
                        <Badge variant="outline" className={priorityConfig.color}>
                          {priorityConfig.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <SheetSizeSelector size={size} onSizeChange={setSize} />
              </div>
            </SheetHeader>

            {/* Follow-up alert */}
            {followUpDate && (isFollowUpToday || isFollowUpPast) && (
              <div className={cn(
                "p-3 rounded-lg mb-4 flex items-center gap-2",
                isFollowUpPast ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
              )}>
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {isFollowUpPast 
                    ? `Relance en retard (${format(followUpDate, "dd/MM/yyyy")})`
                    : "Relance prévue aujourd'hui"
                  }
                </span>
              </div>
            )}

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              {prospect.telephone && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:${prospect.telephone}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Appeler
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openWhatsApp(prospect.telephone)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                </>
              )}
              {prospect.email && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => openComposer({
                    recipients: [{ id: prospect.id, email: prospect.email!, prenom: prospect.prenom, nom: prospect.nom }],
                    defaultSubject: `Votre projet de formation ${prospect.formation_souhaitee || ""}`.trim(),
                    defaultBody: `Bonjour ${prospect.prenom},\n\n\n\nCordialement,\nT3P Campus`,
                  })}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer un email
                </Button>
              )}
              {prospect.statut !== "converti" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConvertDialogOpen(true)}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Convertir
                </Button>
              )}
            </div>

            {/* Info cards */}
            <div className="space-y-4">
              {/* Contact info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {prospect.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${prospect.email}`} className="text-primary hover:underline">
                        {prospect.email}
                      </a>
                    </div>
                  )}
                  {prospect.telephone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${prospect.telephone}`} className="text-primary hover:underline">
                        {prospect.telephone}
                      </a>
                    </div>
                  )}
                  {prospect.formation_souhaitee && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span>{prospect.formation_souhaitee}</span>
                    </div>
                  )}
                  {prospect.source && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>Source: {prospect.source}</span>
                    </div>
                  )}
                  {prospect.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground">{prospect.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rappel Card */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Rappel
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRappelDialogOpen(true)}
                    >
                      {followUpDate ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4 mr-1" />}
                      {followUpDate ? "" : "Ajouter"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {followUpDate ? (
                    <div className={cn(
                      "p-3 rounded-lg flex items-center justify-between",
                      isFollowUpPast 
                        ? "bg-destructive/10 text-destructive" 
                        : isFollowUpToday 
                          ? "bg-warning/10 text-warning"
                          : "bg-muted"
                    )}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <div>
                          <p className="font-medium text-sm">
                            {format(followUpDate, "EEEE dd MMMM yyyy", { locale: fr })}
                          </p>
                          <p className="text-xs opacity-80">
                            {isFollowUpPast 
                              ? `En retard de ${formatDistanceToNow(followUpDate, { locale: fr })}`
                              : isFollowUpToday
                                ? "Aujourd'hui"
                                : `Dans ${formatDistanceToNow(followUpDate, { locale: fr })}`
                            }
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleClearRappel}
                        title="Supprimer le rappel"
                      >
                        <BellOff className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucun rappel programmé</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setRappelDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Programmer un rappel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Historique */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Historique des échanges</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHistoriqueDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {historiqueLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : historique.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucun échange enregistré</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setHistoriqueDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter le premier échange
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-64">
                      <div className="space-y-2 pr-2">
                        {historique.slice(0, 5).map((entry) => {
                          const config = TYPE_CONFIG[entry.type];
                          return (
                            <div key={entry.id} className="p-2 border rounded-lg text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={cn("text-xs", config.color)}>
                                  {config.icon}
                                  <span className="ml-1">{config.label}</span>
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(entry.date_echange), {
                                    addSuffix: true,
                                    locale: fr,
                                  })}
                                </span>
                              </div>
                              <p className="font-medium">{entry.titre}</p>
                              {entry.contenu && (
                                <p className="text-muted-foreground text-xs line-clamp-2">
                                  {entry.contenu}
                                </p>
                              )}
                            </div>
                          );
                        })}
                        {historique.length > 5 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setHistoriqueDialogOpen(true)}
                          >
                            Voir tout ({historique.length})
                          </Button>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Metadata */}
              <div className="text-xs text-muted-foreground space-y-1 pt-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Créé {formatDistanceToNow(new Date(prospect.created_at), { addSuffix: true, locale: fr })}
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex gap-2 pt-4 mt-4 border-t">
              <Button className="flex-1" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <ProspectHistoriqueDialog
        open={historiqueDialogOpen}
        onOpenChange={setHistoriqueDialogOpen}
        prospectId={prospect.id}
        prospectName={`${prospect.prenom} ${prospect.nom}`}
      />

      <EmailComposerModal {...composerProps} />

      <SmartConversionDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        prospect={prospect}
        onReturnDashboard={() => onOpenChange(false)}
      />

      <ProspectFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        prospect={prospect}
      />

      <ProspectRappelDialog
        open={rappelDialogOpen}
        onOpenChange={setRappelDialogOpen}
        prospect={prospect}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le prospect "{prospect.prenom} {prospect.nom}" sera archivé et n'apparaîtra plus dans la liste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
