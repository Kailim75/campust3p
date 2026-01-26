import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Phone, Mail, MessageSquare, Calendar, FileText, RefreshCw, Plus, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  useProspectHistorique, 
  useCreateProspectHistorique, 
  useDeleteProspectHistorique,
  type ProspectHistoriqueType 
} from "@/hooks/useProspectHistorique";

const TYPE_CONFIG: Record<ProspectHistoriqueType, { label: string; icon: React.ReactNode; color: string }> = {
  appel: { label: "Appel", icon: <Phone className="h-3 w-3" />, color: "bg-blue-100 text-blue-800" },
  email: { label: "Email", icon: <Mail className="h-3 w-3" />, color: "bg-green-100 text-green-800" },
  sms: { label: "SMS", icon: <MessageSquare className="h-3 w-3" />, color: "bg-purple-100 text-purple-800" },
  rdv: { label: "RDV", icon: <Calendar className="h-3 w-3" />, color: "bg-orange-100 text-orange-800" },
  note: { label: "Note", icon: <FileText className="h-3 w-3" />, color: "bg-gray-100 text-gray-800" },
  relance: { label: "Relance", icon: <RefreshCw className="h-3 w-3" />, color: "bg-yellow-100 text-yellow-800" },
};

const formSchema = z.object({
  type: z.enum(["appel", "email", "sms", "rdv", "note", "relance"]),
  titre: z.string().min(1, "Le titre est requis"),
  contenu: z.string().optional(),
  duree_minutes: z.number().optional(),
  resultat: z.string().optional(),
  date_rappel: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProspectHistoriqueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string;
  prospectName: string;
}

export function ProspectHistoriqueDialog({
  open,
  onOpenChange,
  prospectId,
  prospectName,
}: ProspectHistoriqueDialogProps) {
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: historique = [], isLoading } = useProspectHistorique(prospectId);
  const createHistorique = useCreateProspectHistorique();
  const deleteHistorique = useDeleteProspectHistorique();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "appel",
      titre: "",
      contenu: "",
      duree_minutes: undefined,
      resultat: "",
      date_rappel: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    await createHistorique.mutateAsync({
      prospect_id: prospectId,
      type: values.type,
      titre: values.titre,
      contenu: values.contenu || null,
      duree_minutes: values.duree_minutes || null,
      resultat: values.resultat || null,
      date_rappel: values.date_rappel || null,
    });
    form.reset();
    setShowForm(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteHistorique.mutate({ id: deleteId, prospectId });
      setDeleteId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Historique - {prospectName}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {!showForm ? (
              <Button onClick={() => setShowForm(true)} className="mb-4">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un échange
              </Button>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 mb-4 p-3 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(TYPE_CONFIG).map(([value, { label, icon }]) => (
                                <SelectItem key={value} value={value}>
                                  <span className="flex items-center gap-2">
                                    {icon}
                                    {label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="duree_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Durée (min)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="5"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="titre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titre *</FormLabel>
                        <FormControl>
                          <Input placeholder="Appel de qualification..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contenu"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Détails</FormLabel>
                        <FormControl>
                          <Textarea rows={2} placeholder="Notes sur l'échange..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="resultat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Résultat</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="positif">Positif</SelectItem>
                              <SelectItem value="neutre">Neutre</SelectItem>
                              <SelectItem value="negatif">Négatif</SelectItem>
                              <SelectItem value="sans_reponse">Sans réponse</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date_rappel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prochain rappel</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" size="sm" disabled={createHistorique.isPending}>
                      {createHistorique.isPending ? "..." : "Ajouter"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : historique.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun échange enregistré</p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {historique.map((entry) => {
                    const config = TYPE_CONFIG[entry.type];
                    return (
                      <div key={entry.id} className="p-3 border rounded-lg hover:bg-muted/30 group">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={config.color}>
                              {config.icon}
                              <span className="ml-1">{config.label}</span>
                            </Badge>
                            {entry.duree_minutes && (
                              <span className="text-xs text-muted-foreground">
                                {entry.duree_minutes} min
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => setDeleteId(entry.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                        <p className="font-medium text-sm mt-1">{entry.titre}</p>
                        {entry.contenu && (
                          <p className="text-sm text-muted-foreground mt-1">{entry.contenu}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>
                            {format(new Date(entry.date_echange), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </span>
                          {entry.resultat && (
                            <Badge variant="outline" className="text-xs">
                              {entry.resultat}
                            </Badge>
                          )}
                          {entry.date_rappel && (
                            <span className="text-orange-600">
                              Rappel: {format(new Date(entry.date_rappel), "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet échange ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
