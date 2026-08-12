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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreatePaiement, ModePaiement } from "@/hooks/usePaiements";
import { commissionAlma, libelleTaux } from "@/lib/alma-commission";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const formSchema = z.object({
  montant: z.coerce.number().min(0.01, "Le montant doit être supérieur à 0"),
  date_paiement: z.string().min(1, "La date est requise"),
  mode_paiement: z.enum(["cb", "virement", "cheque", "especes", "cpf", "alma"]),
  // Nombre d'échéances Alma : détermine la commission (voir alma-commission.ts).
  alma_nb_fois: z.enum(["1", "2", "3", "4"]).optional(),
  reference: z.string().optional(),
  commentaires: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PaiementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factureId: string;
  montantRestant: number;
}

const modeOptions: { value: ModePaiement; label: string }[] = [
  { value: "cb", label: "Carte bancaire" },
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
  { value: "especes", label: "Espèces" },
  { value: "cpf", label: "CPF" },
  { value: "alma", label: "Alma (3x/4x)" },
];

export function PaiementFormDialog({
  open,
  onOpenChange,
  factureId,
  montantRestant,
}: PaiementFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createPaiement = useCreatePaiement();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      montant: montantRestant,
      date_paiement: format(new Date(), "yyyy-MM-dd"),
      mode_paiement: "cb",
      alma_nb_fois: "3",
      reference: "",
      commentaires: "",
    },
  });

  const modeChoisi = form.watch("mode_paiement");
  const nbFoisChoisi = form.watch("alma_nb_fois");
  const montantSaisi = Number(form.watch("montant")) || 0;
  const coutAlma =
    modeChoisi === "alma" && nbFoisChoisi
      ? commissionAlma(montantSaisi, Number(nbFoisChoisi))
      : null;

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Le nombre de fois Alma est tracé dans le commentaire, au même
      // format « Nx » que le webhook : c'est là que le calcul de
      // commission (alma-commission.ts) va le relire. Sans lui, le
      // paiement serait estimé au taux 4x.
      const commentaires =
        values.mode_paiement === "alma" && values.alma_nb_fois
          ? [`Alma ${values.alma_nb_fois}x (saisie manuelle)`, values.commentaires?.trim()]
              .filter(Boolean)
              .join(" — ")
          : values.commentaires || null;

      await createPaiement.mutateAsync({
        facture_id: factureId,
        montant: values.montant,
        date_paiement: values.date_paiement,
        mode_paiement: values.mode_paiement,
        reference: values.reference || null,
        commentaires,
      });
      toast.success("Paiement enregistré");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error creating paiement:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
        </DialogHeader>

        <div className="p-3 bg-muted rounded-lg mb-4">
          <p className="text-sm text-muted-foreground">Montant restant dû</p>
          <p className="text-xl font-bold text-foreground">
            {montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="montant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant (€) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_paiement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mode_paiement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {modeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {modeChoisi === "alma" && (
              <FormField
                control={form.control}
                name="alma_nb_fois"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de fois (Alma) *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["1", "2", "3", "4"].map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}x — commission {libelleTaux(Number(n))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {coutAlma && (
                      <p className="text-[11px] text-muted-foreground">
                        Commission Alma :{" "}
                        <span className="font-medium text-foreground">
                          {coutAlma.commission.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                        </span>{" "}
                        → net perçu {coutAlma.net.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Référence</FormLabel>
                  <FormControl>
                    <Input placeholder="N° chèque, ref virement..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commentaires"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commentaires</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
