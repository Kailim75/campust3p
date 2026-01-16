import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCentreFormation, CentreFormationInput } from '@/hooks/useCentreFormation';
import { Loader2, Building2 } from 'lucide-react';
import { useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  nom_legal: z.string().min(1, 'Requis'),
  nom_commercial: z.string().min(1, 'Requis'),
  forme_juridique: z.string().min(1, 'Requis'),
  adresse_complete: z.string().min(1, 'Requis'),
  telephone: z.string().min(10, 'Minimum 10 caractères'),
  email: z.string().email('Email invalide'),
  siret: z.string().length(14, 'Le SIRET doit contenir 14 chiffres'),
  nda: z.string().min(1, 'Requis'),
  region_declaration: z.string().min(1, 'Requis'),
  responsable_legal_nom: z.string().min(1, 'Requis'),
  responsable_legal_fonction: z.string().min(1, 'Requis'),
  logo_url: z.string().nullable().optional(),
  signature_cachet_url: z.string().nullable().optional(),
  iban: z.string().min(14, 'Format IBAN invalide'),
  bic: z.string().min(8, 'Minimum 8 caractères'),
});

type FormValues = z.infer<typeof formSchema>;

export function CentreFormationSettings() {
  const { centreFormation, isLoading, save, isSaving } = useCentreFormation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom_legal: '',
      nom_commercial: '',
      forme_juridique: '',
      adresse_complete: '',
      telephone: '',
      email: '',
      siret: '',
      nda: '',
      region_declaration: '',
      responsable_legal_nom: '',
      responsable_legal_fonction: '',
      logo_url: '',
      signature_cachet_url: '',
      iban: '',
      bic: '',
    },
  });

  // Reset form when data loads
  useEffect(() => {
    if (centreFormation) {
      form.reset({
        nom_legal: centreFormation.nom_legal || '',
        nom_commercial: centreFormation.nom_commercial || '',
        forme_juridique: centreFormation.forme_juridique || '',
        adresse_complete: centreFormation.adresse_complete || '',
        telephone: centreFormation.telephone || '',
        email: centreFormation.email || '',
        siret: centreFormation.siret || '',
        nda: centreFormation.nda || '',
        region_declaration: centreFormation.region_declaration || '',
        responsable_legal_nom: centreFormation.responsable_legal_nom || '',
        responsable_legal_fonction: centreFormation.responsable_legal_fonction || '',
        logo_url: centreFormation.logo_url || '',
        signature_cachet_url: centreFormation.signature_cachet_url || '',
        iban: centreFormation.iban || '',
        bic: centreFormation.bic || '',
      });
    }
  }, [centreFormation, form]);

  function onSubmit(values: FormValues) {
    save({
      nom_legal: values.nom_legal,
      nom_commercial: values.nom_commercial,
      forme_juridique: values.forme_juridique,
      adresse_complete: values.adresse_complete,
      telephone: values.telephone,
      email: values.email,
      siret: values.siret,
      nda: values.nda,
      region_declaration: values.region_declaration,
      responsable_legal_nom: values.responsable_legal_nom,
      responsable_legal_fonction: values.responsable_legal_fonction,
      logo_url: values.logo_url || null,
      signature_cachet_url: values.signature_cachet_url || null,
      iban: values.iban,
      bic: values.bic,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Configuration du Centre de Formation
        </CardTitle>
        <CardDescription>
          Ces informations seront automatiquement injectées dans tous les documents générés (conventions, factures, attestations...)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Identification légale */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Identification légale
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nom_legal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom légal *</FormLabel>
                      <FormControl>
                        <Input placeholder="SARL Mon Centre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="nom_commercial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom commercial *</FormLabel>
                      <FormControl>
                        <Input placeholder="Mon Centre Formation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="forme_juridique"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forme juridique *</FormLabel>
                      <FormControl>
                        <Input placeholder="SARL, SAS, EURL..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="siret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SIRET *</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678901234" maxLength={14} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° de déclaration d'activité (NDA) *</FormLabel>
                      <FormControl>
                        <Input placeholder="11755030075" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region_declaration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Région de déclaration *</FormLabel>
                      <FormControl>
                        <Input placeholder="Île-de-France" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Coordonnées */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Coordonnées
              </h3>
              <FormField
                control={form.control}
                name="adresse_complete"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse complète *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="123 rue Example&#10;75001 Paris" 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone *</FormLabel>
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
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@moncentre.fr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Responsable légal */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Responsable légal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="responsable_legal_nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du responsable légal *</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responsable_legal_fonction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fonction du responsable légal *</FormLabel>
                      <FormControl>
                        <Input placeholder="Gérant, Directeur..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Informations bancaires */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Informations bancaires
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN *</FormLabel>
                      <FormControl>
                        <Input placeholder="FR76 1234 5678 9012 3456 7890 123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BIC *</FormLabel>
                      <FormControl>
                        <Input placeholder="BNPAFRPP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Visuels (optionnels) */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Visuels (optionnel)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL du logo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/logo.png" 
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="signature_cachet_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL du cachet/signature</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/cachet.png" 
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit" disabled={isSaving} className="w-full md:w-auto">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer la configuration
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
