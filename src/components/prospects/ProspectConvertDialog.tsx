import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCheck, GraduationCap, Loader2 } from "lucide-react";
import { useSessions } from "@/hooks/useSessions";
import { type Prospect } from "@/hooks/useProspects";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const VALID_FORMATIONS = [
  "ACC VTC",
  "ACC VTC 75",
  "Formation continue Taxi",
  "Formation continue VTC",
  "Mobilité Taxi",
  "TAXI",
  "VMDTR",
  "VTC",
];

const VALID_STATUTS = [
  "En attente de validation",
  "En attente de documents",
  "En attente de paiement",
  "Validé",
];

const formSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  telephone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  formation: z.string().optional(),
  statut: z.string(),
  source: z.string().optional(),
  enrollInSession: z.boolean(),
  sessionId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProspectConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect | null;
}

export function ProspectConvertDialog({
  open,
  onOpenChange,
  prospect,
}: ProspectConvertDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: sessions = [] } = useSessions();

  // Filter sessions that match the prospect's desired formation
  const availableSessions = sessions.filter((s) => {
    const isUpcoming = new Date(s.date_debut) >= new Date();
    const matchesFormation = !prospect?.formation_souhaitee || 
      s.formation_type === prospect.formation_souhaitee;
    return isUpcoming && s.statut === "a_venir" && matchesFormation;
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      telephone: "",
      email: "",
      formation: "",
      statut: "En attente de validation",
      source: "",
      enrollInSession: false,
      sessionId: "",
    },
  });

  useEffect(() => {
    if (prospect) {
      const isValidFormation = prospect.formation_souhaitee && 
        VALID_FORMATIONS.includes(prospect.formation_souhaitee);

      form.reset({
        nom: prospect.nom,
        prenom: prospect.prenom,
        telephone: prospect.telephone || "",
        email: prospect.email || "",
        formation: isValidFormation ? prospect.formation_souhaitee || "" : "",
        statut: "En attente de validation",
        source: prospect.source || "Prospect converti",
        enrollInSession: false,
        sessionId: "",
      });
    }
  }, [prospect, form]);

  const onSubmit = async (values: FormValues) => {
    if (!prospect) return;

    setIsSubmitting(true);
    try {
      // Build contact data
      const contactData: Record<string, unknown> = {
        nom: values.nom,
        prenom: values.prenom,
        telephone: values.telephone || null,
        email: values.email || null,
        statut: values.statut,
        source: values.source || null,
      };

      if (values.formation && VALID_FORMATIONS.includes(values.formation)) {
        contactData.formation = values.formation;
      }

      // Create contact
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .insert([contactData] as any)
        .select()
        .single();

      if (contactError) throw contactError;

      // Enroll in session if requested
      if (values.enrollInSession && values.sessionId && contact) {
        const { error: inscriptionError } = await supabase
          .from("session_inscriptions")
          .insert({
            session_id: values.sessionId,
            contact_id: contact.id,
            statut: "inscrit",
          });

        if (inscriptionError) {
          console.error("Error enrolling in session:", inscriptionError);
        }
      }

      // Update prospect status
      const { error: prospectError } = await supabase
        .from("prospects")
        .update({
          statut: "converti",
          converted_contact_id: contact.id,
        })
        .eq("id", prospect.id);

      if (prospectError) throw prospectError;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      toast.success("Prospect converti en contact !", {
        description: values.enrollInSession && values.sessionId 
          ? "Le contact a été inscrit à la session sélectionnée."
          : undefined,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error converting prospect:", error);
      toast.error("Erreur lors de la conversion");
    } finally {
      setIsSubmitting(false);
    }
  };

  const enrollInSession = form.watch("enrollInSession");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Convertir en contact
          </DialogTitle>
          <DialogDescription>
            Vérifiez les informations avant de créer le contact.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="prenom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="formation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VALID_FORMATIONS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
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
                name="statut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut initial</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VALID_STATUTS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Session enrollment option */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <FormField
                control={form.control}
                name="enrollInSession"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Inscrire directement à une session
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {enrollInSession && (
                <FormField
                  control={form.control}
                  name="sessionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir une session" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSessions.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              Aucune session disponible
                            </div>
                          ) : (
                            availableSessions.map((session) => (
                              <SelectItem key={session.id} value={session.id}>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {session.formation_type}
                                  </Badge>
                                  <span>{session.nom}</span>
                                  <span className="text-muted-foreground text-xs">
                                    ({format(new Date(session.date_debut), "dd/MM/yyyy", { locale: fr })})
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conversion...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Convertir
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
