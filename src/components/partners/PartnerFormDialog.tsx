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
import { useCreatePartner, useUpdatePartner, type Partner, type PartnerCategory } from "@/hooks/usePartners";

const partnerSchema = z.object({
  company_name: z.string().min(1, "Le nom de la société est requis"),
  category: z.enum(["assurance", "comptable", "medecin", "banque", "vehicule", "autre"]),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
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

export function PartnerFormDialog({ open, onOpenChange, partner }: PartnerFormDialogProps) {
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
  const isEditing = !!partner;

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      company_name: "",
      category: "autre",
      contact_name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (partner) {
      form.reset({
        company_name: partner.company_name,
        category: partner.category,
        contact_name: partner.contact_name || "",
        phone: partner.phone || "",
        email: partner.email || "",
        address: partner.address || "",
        notes: partner.notes || "",
      });
    } else {
      form.reset({
        company_name: "",
        category: "autre",
        contact_name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
      });
    }
  }, [partner, form]);

  const onSubmit = async (values: PartnerFormValues) => {
    try {
      if (isEditing && partner) {
        await updatePartner.mutateAsync({
          id: partner.id,
          updates: {
            company_name: values.company_name,
            category: values.category,
            email: values.email || null,
            contact_name: values.contact_name || null,
            phone: values.phone || null,
            address: values.address || null,
            notes: values.notes || null,
          },
        });
      } else {
        await createPartner.mutateAsync({
          company_name: values.company_name,
          category: values.category,
          email: values.email || null,
          contact_name: values.contact_name || null,
          phone: values.phone || null,
          address: values.address || null,
          notes: values.notes || null,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving partner:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le partenaire" : "Nouveau partenaire"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie *</FormLabel>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informations complémentaires..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
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
