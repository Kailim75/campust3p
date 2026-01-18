import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  History, 
  Plus, 
  Trash2, 
  Phone, 
  Mail, 
  FileText, 
  MessageSquare, 
  MessageCircle, 
  Users,
  Clock,
  Bell,
  BellOff,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type HistoriqueType = "appel" | "email" | "note" | "sms" | "whatsapp" | "reunion";

interface HistoriqueItem {
  id: string;
  titre: string;
  contenu?: string | null;
  type: HistoriqueType;
  date_echange: string;
  duree_minutes?: number | null;
  contact_id: string;
  alerte_active?: boolean | null;
  date_rappel?: string | null;
  rappel_description?: string | null;
}

interface ContactHistoriqueTabProps {
  historique: HistoriqueItem[];
  isLoading: boolean;
  contactCreatedAt: string;
  contactUpdatedAt: string;
  onAdd: () => void;
  onDelete: (params: { id: string; contactId: string }) => void;
  onUpdateAlert: (params: {
    id: string;
    contactId: string;
    alerte_active: boolean;
    date_rappel: string | null;
    rappel_description: string | null;
  }) => void;
}

const historiqueTypeConfig: Record<HistoriqueType, { label: string; icon: React.ElementType; class: string }> = {
  appel: { label: "Appel", icon: Phone, class: "bg-success/10 text-success" },
  email: { label: "Email", icon: Mail, class: "bg-info/10 text-info" },
  note: { label: "Note", icon: FileText, class: "bg-muted text-muted-foreground" },
  sms: { label: "SMS", icon: MessageSquare, class: "bg-primary/10 text-primary" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, class: "bg-success/10 text-success" },
  reunion: { label: "Réunion", icon: Users, class: "bg-warning/10 text-warning" },
};

export function ContactHistoriqueTab({
  historique,
  isLoading,
  contactCreatedAt,
  contactUpdatedAt,
  onAdd,
  onDelete,
  onUpdateAlert,
}: ContactHistoriqueTabProps) {
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
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {historique.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun échange enregistré</p>
          <p className="text-xs mt-1">Ajoutez des appels, emails, notes...</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-3 pr-3">
            {historique.map((item) => {
              const config = historiqueTypeConfig[item.type];
              const Icon = config.icon;
              
              return (
                <div key={item.id} className="p-3 border rounded-lg space-y-2 group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <div className={cn("p-1.5 rounded-md", config.class)}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.titre}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{config.label}</span>
                          {item.duree_minutes && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.duree_minutes} min
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.date_echange), { addSuffix: true, locale: fr })}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cet échange ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete({ id: item.id, contactId: item.contact_id })}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {item.contenu && (
                    <p className="text-sm text-muted-foreground pl-8">{item.contenu}</p>
                  )}
                  
                  {/* Alerte/Rappel Section */}
                  {item.alerte_active && item.date_rappel && (
                    <div className={cn(
                      "flex items-center gap-2 text-xs p-2 rounded-md ml-8",
                      new Date(item.date_rappel) < new Date() 
                        ? "bg-destructive/10 text-destructive" 
                        : "bg-warning/10 text-warning"
                    )}>
                      <Bell className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        Rappel : {format(new Date(item.date_rappel), "dd MMM yyyy à HH:mm", { locale: fr })}
                      </span>
                      {item.rappel_description && (
                        <>
                          <span>•</span>
                          <span>{item.rappel_description}</span>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 ml-auto"
                        onClick={() => onUpdateAlert({
                          id: item.id,
                          contactId: item.contact_id,
                          alerte_active: false,
                          date_rappel: null,
                          rappel_description: null,
                        })}
                      >
                        <BellOff className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground pl-8">
                    {format(new Date(item.date_echange), "dd MMM yyyy à HH:mm", { locale: fr })}
                  </p>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* System dates */}
      <div className="pt-4 border-t space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">Informations système</p>
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full bg-success" />
          <span className="text-muted-foreground">Créé le</span>
          <span className="font-medium">
            {format(new Date(contactCreatedAt), "dd MMMM yyyy à HH:mm", { locale: fr })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full bg-info" />
          <span className="text-muted-foreground">Modifié le</span>
          <span className="font-medium">
            {format(new Date(contactUpdatedAt), "dd MMMM yyyy à HH:mm", { locale: fr })}
          </span>
        </div>
      </div>
    </div>
  );
}