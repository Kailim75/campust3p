import { useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCreatePartner, useUpdatePartner, type Partner, type PartnerCategory, type PartnerStatus, type PartnerType, type PartnerRemunerationMode } from "@/hooks/usePartners";
import { useCentreContext } from "@/contexts/CentreContext";

const partnerSchema = z.object({
  company_name: z.string().min(1, "Le nom de la société est requis"),
  category: z.enum(["assurance", "comptable", "medecin", "banque", "vehicule", "autre"]),
  type_partenaire: z.enum(["apporteur_affaires", "auto_ecole", "entreprise", "organisme_formation", "prescripteur", "autre"]),
  statut_partenaire: z.enum(["actif", "inactif", "suspendu"]),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  address: z.string().optional(),
  zone_geographique: z.string().optional(),
  notes: z.string().optional(),
  mode_remuneration: z.enum(["commission", "forfait", "aucun"]),
  taux_commission: z.number().min(0).max(100).optional(),
  montant_forfait: z.number().min(0).optional(),
  date_debut_contrat: z.date().optional().nullable(),
  date_fin_contrat: z.date().optional().nullable(),
});

type PartnerFormValues = z.infer<typeof partnerSchema>;

interface PartnerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner | null;
}

const CATEGORY_OPTIONS: { value: PartnerCategory; label: string }[] = [
  { value: "assurance", label: "Assurance" },
  { value: "comptable", label: "Comptable" },
  { value: "medecin", label: "Médecin" },
  { value: "banque", label: "Banque" },
  { value: "vehicule", label: "Véhicule" },
  { value: "autre", label: "Autre" },
];

const TYPE_OPTIONS: { value: PartnerType; label: string }[] = [
  { value: "apporteur_affaires", label: "Apporteur d'affaires" },
  { value: "auto_ecole", label: "Auto-école" },
  { value: "entreprise", label: "Entreprise" },
  { value: "organisme_formation", label: "Organisme de formation" },
  { value: "prescripteur", label: "Prescripteur" },
  { value: "autre", label: "Autre" },
];

const STATUS_OPTIONS: { value: PartnerStatus; label: string }[] = [
  { value: "actif", label: "Actif" },
  { value: "inactif", label: "Inactif" },
  { value: "suspendu", label: "Suspendu" },
];

const REMUNERATION_OPTIONS: { value: PartnerRemunerationMode; label: string }[] = [
  { value: "commission", label: "Commission (%)" },
  { value: "forfait", label: "Forfait par apprenant" },
  { value: "aucun", label: "Aucune rémunération" },
];

export function PartnerFormDialog({ open, onOpenChange, partner }: PartnerFormDialogProps) {
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
  const { currentCentre } = useCentreContext();
  const isEditing = !!partner;

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      company_name: "",
      category: "autre",
      type_partenaire: "autre",
      statut_partenaire: "actif",
      contact_name: "",
      phone: "",
      email: "",
      address: "",
      zone_geographique: "",
      notes: "",
      mode_remuneration: "aucun",
      taux_commission: 0,
      montant_forfait: 0,
      date_debut_contrat: null,
      date_fin_contrat: null,
    },
  });

  const modeRemuneration = form.watch("mode_remuneration");

  useEffect(() => {
    if (partner) {
      form.reset({
        company_name: partner.company_name,
        category: partner.category,
        type_partenaire: partner.type_partenaire || "autre",
        statut_partenaire: partner.statut_partenaire || "actif",
        contact_name: partner.contact_name || "",
        phone: partner.phone || "",
        email: partner.email || "",
        address: partner.address || "",
        zone_geographique: partner.zone_geographique || "",
        notes: partner.notes || "",
        mode_remuneration: partner.mode_remuneration || "aucun",
        taux_commission: partner.taux_commission || 0,
        montant_forfait: partner.montant_forfait || 0,
        date_debut_contrat: partner.date_debut_contrat ? new Date(partner.date_debut_contrat) : null,
        date_fin_contrat: partner.date_fin_contrat ? new Date(partner.date_fin_contrat) : null,
      });
    } else {
      form.reset({
        company_name: "",
        category: "autre",
        type_partenaire: "autre",
        statut_partenaire: "actif",
        contact_name: "",
        phone: "",
        email: "",
        address: "",
        zone_geographique: "",
        notes: "",
        mode_remuneration: "aucun",
        taux_commission: 0,
        montant_forfait: 0,
        date_debut_contrat: null,
        date_fin_contrat: null,
      });
    }
  }, [partner, form]);

  const onSubmit = async (values: PartnerFormValues) => {
    try {
      const partnerData = {
        company_name: values.company_name,
        category: values.category,
        type_partenaire: values.type_partenaire,
        statut_partenaire: values.statut_partenaire,
        contact_name: values.contact_name || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        zone_geographique: values.zone_geographique || null,
        notes: values.notes || null,
        mode_remuneration: values.mode_remuneration,
        taux_commission: values.taux_commission || 0,
        montant_forfait: values.montant_forfait || 0,
        date_debut_contrat: values.date_debut_contrat?.toISOString().split('T')[0] || null,
        date_fin_contrat: values.date_fin_contrat?.toISOString().split('T')[0] || null,
      };

      if (isEditing && partner) {
        await updatePartner.mutateAsync({
          id: partner.id,
          updates: partnerData,
        });
      } else {
        await createPartner.mutateAsync({
          ...partnerData,
          centre_id: currentCentre?.id || null,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving partner:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le partenaire" : "Nouveau partenaire"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="contrat">Contrat</TabsTrigger>
                <TabsTrigger value="remuneration">Rémunération</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la société *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: AXA Assurances" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type_partenaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de partenaire *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
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
                    name="statut_partenaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statut *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie (ancienne)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Jean Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="01 23 45 67 89" {...field} />
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
                          <Input type="email" placeholder="contact@exemple.fr" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input placeholder="123 rue de Paris, 75001 Paris" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zone_geographique"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zone géographique</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Île-de-France, Paris" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="contrat" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date_debut_contrat"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date début contrat</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy", { locale: fr })
                                ) : (
                                  <span>Sélectionner</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              locale={fr}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date_fin_contrat"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date fin contrat</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy", { locale: fr })
                                ) : (
                                  <span>Sélectionner</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              locale={fr}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes / Conditions particulières</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Informations complémentaires, conditions du contrat..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="remuneration" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="mode_remuneration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mode de rémunération</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REMUNERATION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {modeRemuneration === "commission" && (
                  <FormField
                    control={form.control}
                    name="taux_commission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taux de commission (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            placeholder="Ex: 10"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {modeRemuneration === "forfait" && (
                  <FormField
                    control={form.control}
                    name="montant_forfait"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant forfaitaire par apprenant (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={10}
                            placeholder="Ex: 100"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {modeRemuneration === "aucun" && (
                  <p className="text-sm text-muted-foreground">
                    Ce partenaire n'a pas de rémunération configurée.
                  </p>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createPartner.isPending || updatePartner.isPending}
              >
                {createPartner.isPending || updatePartner.isPending
                  ? "Enregistrement..."
                  : isEditing
                  ? "Modifier"
                  : "Créer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
