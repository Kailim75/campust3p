import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Mail, FileText, Eye, Sparkles, ArrowRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useEmailTemplates, replaceTemplateVariables } from "@/hooks/useEmailTemplates";
import { useCreateProspectHistorique } from "@/hooks/useProspectHistorique";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  templateId: z.string().optional(),
  sujet: z.string().min(1, "Le sujet est requis").max(200, "Max 200 caractères"),
  contenu: z.string().min(1, "Le contenu est requis").max(5000, "Max 5000 caractères"),
});

type FormValues = z.infer<typeof formSchema>;

interface ProspectSendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: {
    id: string;
    prenom: string;
    nom: string;
    email: string | null;
    formation_souhaitee?: string | null;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  prospect: "Prospects",
  inscription: "Inscription",
  information: "Information",
  relance: "Relance",
  confirmation: "Confirmation",
  autre: "Autre",
};

export function ProspectSendEmailDialog({
  open,
  onOpenChange,
  prospect,
}: ProspectSendEmailDialogProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { data: templates = [], isLoading: templatesLoading } = useEmailTemplates();
  const createHistorique = useCreateProspectHistorique();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateId: "",
      sujet: "",
      contenu: "",
    },
  });

  const watchedContent = form.watch("contenu");
  const watchedSubject = form.watch("sujet");
  const hasEmail = Boolean(prospect.email);

  // Get variables for replacement
  const variables = useMemo(
    () => ({
      prenom: prospect.prenom,
      nom: prospect.nom,
      email: prospect.email || "",
      formation: prospect.formation_souhaitee || "",
      date: new Date().toLocaleDateString("fr-FR"),
    }),
    [prospect.email, prospect.formation_souhaitee, prospect.nom, prospect.prenom]
  );

  const groupedTemplates = useMemo(
    () =>
      templates.reduce((acc, template) => {
        const cat = template.categorie || "autre";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(template);
        return acc;
      }, {} as Record<string, typeof templates>),
    [templates]
  );

  const previewContent = useMemo(
    () => replaceTemplateVariables(watchedContent, variables),
    [variables, watchedContent]
  );

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      form.setValue("sujet", replaceTemplateVariables(template.sujet, variables));
      form.setValue("contenu", replaceTemplateVariables(template.contenu, variables));
    }
    form.setValue("templateId", templateId);
  };

  const handleSend = async (values: FormValues) => {
    if (!prospect.email) {
      toast.error("Ce prospect n'a pas d'adresse email");
      return;
    }

    setIsSending(true);
    try {
      // Call the edge function to send the email
      const { error } = await supabase.functions.invoke("send-automated-emails", {
        body: {
          to: prospect.email,
          subject: values.sujet,
          html: values.contenu.replace(/\n/g, "<br>"),
          type: "prospect_email",
        },
      });

      if (error) throw error;

      // Log to prospect history
      await createHistorique.mutateAsync({
        prospect_id: prospect.id,
        type: "email",
        titre: `Email envoyé: ${values.sujet}`,
        contenu: values.contenu.substring(0, 500),
        resultat: "positif",
      });

      toast.success("Email envoyé avec succès", {
        description: `Email envoyé à ${prospect.prenom} ${prospect.nom}`,
      });
      
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending email:", error);
      const message = error instanceof Error ? error.message : "Veuillez réessayer";
      toast.error("Erreur lors de l'envoi", {
        description: message,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envoyer un email à {prospect.prenom} {prospect.nom}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="bg-muted/20">
            <CardContent className="px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Contact</p>
              <p className="text-sm font-semibold">{prospect.prenom} {prospect.nom}</p>
              <p className="text-xs text-muted-foreground">{prospect.email || "Aucun email renseigné"}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/20">
            <CardContent className="px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Formation</p>
              <p className="text-sm font-semibold">{prospect.formation_souhaitee || "Non renseignée"}</p>
              <p className="text-xs text-muted-foreground">Personnalisation disponible via les variables</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/20">
            <CardContent className="px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Modèles</p>
              <p className="text-sm font-semibold">{templates.length}</p>
              <p className="text-xs text-muted-foreground">Bibliothèque email disponible</p>
            </CardContent>
          </Card>
        </div>

        {!hasEmail ? (
          <div className="py-8 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Ce prospect n'a pas d'adresse email configurée.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSend)} className="flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="flex items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  Ce message sera envoyé directement au prospect et enregistré dans son historique CRM.
                </span>
              </div>

              {/* Template selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Utiliser un modèle
                </label>
                {templatesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun modèle disponible. Créez des modèles dans Communications.
                  </p>
                ) : (
                  <Select onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un modèle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            {CATEGORY_LABELS[category] || category}
                          </div>
                          {categoryTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3" />
                                {template.nom}
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {templates.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{Object.keys(groupedTemplates).length} catégorie{Object.keys(groupedTemplates).length > 1 ? "s" : ""}</Badge>
                  <Badge variant="outline">{templates.length} modèle{templates.length > 1 ? "s" : ""}</Badge>
                </div>
              )}

              {/* Email form */}
              <div className="flex-1 overflow-hidden flex flex-col gap-3">
                <FormField
                  control={form.control}
                  name="sujet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sujet *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Objet de votre email..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showPreview ? (
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Aperçu avant envoi</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowPreview(false)}
                      >
                        Modifier
                      </Button>
                    </div>
                    <ScrollArea className="h-64 border rounded-md p-4 bg-muted/30">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 rounded-md border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>Vérifiez l'objet, le nom du prospect et les variables remplacées avant l'envoi.</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">À:</span> {prospect.email}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Objet:</span> {watchedSubject}
                        </div>
                        <hr className="my-3" />
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: previewContent.replace(/\n/g, "<br>") 
                          }}
                        />
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="contenu"
                    render={({ field }) => (
                      <FormItem className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between">
                          <FormLabel>Contenu *</FormLabel>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setShowPreview(true)}
                            disabled={!watchedContent}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Aperçu
                          </Button>
                        </div>
                        <FormControl>
                          <Textarea 
                            className="flex-1 min-h-[200px] resize-none"
                            placeholder="Contenu de votre email..."
                            {...field} 
                          />
                      </FormControl>
                      <FormMessage />
                        <div className="flex items-start gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>
                          Variables disponibles: {"{{prenom}}"}, {"{{nom}}"}, {"{{formation}}"}, {"{{date}}"}
                          </span>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isSending}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? "Envoi..." : "Envoyer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
