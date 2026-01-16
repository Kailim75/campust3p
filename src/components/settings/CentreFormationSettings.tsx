import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCentreFormation, CentreFormationInput } from '@/hooks/useCentreFormation';
import { Loader2, Building2, Upload, X, Image } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCachet, setUploadingCachet] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const cachetInputRef = useRef<HTMLInputElement>(null);

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

  const uploadFile = async (file: File, type: 'logo' | 'cachet'): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}-${Date.now()}.${fileExt}`;
    const filePath = `${type}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('centre-formation-assets')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error(`Erreur lors de l'upload : ${uploadError.message}`);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('centre-formation-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    setUploadingLogo(true);
    const url = await uploadFile(file, 'logo');
    if (url) {
      form.setValue('logo_url', url);
      toast.success('Logo uploadé avec succès');
    }
    setUploadingLogo(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleCachetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    setUploadingCachet(true);
    const url = await uploadFile(file, 'cachet');
    if (url) {
      form.setValue('signature_cachet_url', url);
      toast.success('Cachet uploadé avec succès');
    }
    setUploadingCachet(false);
    if (cachetInputRef.current) cachetInputRef.current.value = '';
  };

  const removeImage = (field: 'logo_url' | 'signature_cachet_url') => {
    form.setValue(field, '');
  };

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Upload */}
                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo du centre</FormLabel>
                      <div className="space-y-3">
                        {field.value ? (
                          <div className="relative inline-block">
                            <img 
                              src={field.value} 
                              alt="Logo" 
                              className="h-24 w-auto object-contain border rounded-lg p-2 bg-background"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={() => removeImage('logo_url')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-24 w-full border-2 border-dashed rounded-lg bg-muted/50">
                            <Image className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingLogo}
                          onClick={() => logoInputRef.current?.click()}
                          className="w-full"
                        >
                          {uploadingLogo ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {field.value ? 'Changer le logo' : 'Uploader un logo'}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cachet Upload */}
                <FormField
                  control={form.control}
                  name="signature_cachet_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cachet / Signature</FormLabel>
                      <div className="space-y-3">
                        {field.value ? (
                          <div className="relative inline-block">
                            <img 
                              src={field.value} 
                              alt="Cachet" 
                              className="h-24 w-auto object-contain border rounded-lg p-2 bg-background"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={() => removeImage('signature_cachet_url')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-24 w-full border-2 border-dashed rounded-lg bg-muted/50">
                            <Image className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <input
                          ref={cachetInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCachetUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingCachet}
                          onClick={() => cachetInputRef.current?.click()}
                          className="w-full"
                        >
                          {uploadingCachet ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {field.value ? 'Changer le cachet' : 'Uploader un cachet'}
                        </Button>
                      </div>
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
