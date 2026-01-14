-- Create document templates table for customizable contracts, certificates, etc.
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  type_document TEXT NOT NULL DEFAULT 'convention',
  categorie TEXT NOT NULL DEFAULT 'formation',
  contenu TEXT NOT NULL,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  actif BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies - accessible to all authenticated users
CREATE POLICY "Users can view document templates"
  ON public.document_templates
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create document templates"
  ON public.document_templates
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update document templates"
  ON public.document_templates
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete document templates"
  ON public.document_templates
  FOR DELETE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.document_templates (nom, type_document, categorie, contenu, variables, description) VALUES
(
  'Convention de formation',
  'convention',
  'formation',
  'CONVENTION DE FORMATION PROFESSIONNELLE

Entre les soussignés :

L''organisme de formation : [NOM DE VOTRE ORGANISME]
Numéro de déclaration d''activité : [NUMÉRO]
Adresse : [ADRESSE]

Et

Le stagiaire :
{{civilite}} {{prenom}} {{nom}}
Né(e) le {{date_naissance}} à {{ville_naissance}} ({{pays_naissance}})
Demeurant : {{rue}}, {{code_postal}} {{ville}}
Email : {{email}}
Téléphone : {{telephone}}

Article 1 - Objet de la convention
La présente convention a pour objet la réalisation de la formation : {{formation}}

Article 2 - Durée et dates
La formation se déroule du {{session_date_debut}} au {{session_date_fin}}.
Durée totale : {{session_duree}} heures.
Lieu : {{session_lieu}}

Article 3 - Effectif
Cette formation est prévue pour un groupe de {{session_places}} stagiaires maximum.

Article 4 - Prix et modalités de paiement
Le coût total de la formation s''élève à {{session_prix}} € TTC.

Article 5 - Dispositions générales
En cas d''absence ou de retard, le stagiaire doit prévenir l''organisme de formation.
Une attestation de fin de formation sera délivrée au stagiaire à l''issue de la formation.

Fait à _____________, le ______________

Signature du stagiaire                    Signature de l''organisme
(précédée de la mention                   
"Lu et approuvé")


_______________________                   _______________________',
  ARRAY['civilite', 'prenom', 'nom', 'date_naissance', 'ville_naissance', 'pays_naissance', 'rue', 'code_postal', 'ville', 'email', 'telephone', 'formation', 'session_date_debut', 'session_date_fin', 'session_duree', 'session_lieu', 'session_places', 'session_prix'],
  'Convention de formation standard pour les formations professionnelles'
),
(
  'Attestation de formation',
  'attestation',
  'formation',
  'ATTESTATION DE FORMATION

Je soussigné(e), [NOM DU RESPONSABLE], responsable de l''organisme de formation [NOM DE L''ORGANISME], certifie que :

{{civilite}} {{prenom}} {{nom}}
Né(e) le {{date_naissance}} à {{ville_naissance}}
Demeurant : {{rue}}, {{code_postal}} {{ville}}

A suivi avec succès la formation :
{{formation}}

Formation dispensée du {{session_date_debut}} au {{session_date_fin}}
Durée : {{session_duree}} heures
Lieu : {{session_lieu}}
Formateur : {{session_formateur}}

Cette attestation est délivrée pour servir et valoir ce que de droit.

Fait à _____________, le ______________

Cachet et signature


_______________________',
  ARRAY['civilite', 'prenom', 'nom', 'date_naissance', 'ville_naissance', 'rue', 'code_postal', 'ville', 'formation', 'session_date_debut', 'session_date_fin', 'session_duree', 'session_lieu', 'session_formateur'],
  'Attestation de fin de formation'
),
(
  'Contrat de formation',
  'contrat',
  'formation',
  'CONTRAT DE FORMATION PROFESSIONNELLE
(Article L6353-3 du Code du travail)

Entre :
L''organisme de formation : [NOM DE VOTRE ORGANISME]
Adresse : [ADRESSE]
Représenté par : [NOM DU REPRÉSENTANT]

Ci-après dénommé "l''organisme de formation"

Et :
{{civilite}} {{prenom}} {{nom}}
Adresse : {{rue}}, {{code_postal}} {{ville}}
Email : {{email}}
Téléphone : {{telephone}}

Ci-après dénommé "le stagiaire"

Il est convenu ce qui suit :

ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat a pour objet de définir les conditions dans lesquelles l''organisme de formation s''engage à dispenser au stagiaire la formation suivante :

Intitulé : {{formation}}
Type : Formation initiale / continue

ARTICLE 2 - NATURE ET CARACTÉRISTIQUES DE LA FORMATION
- Durée : {{session_duree}} heures
- Dates : du {{session_date_debut}} au {{session_date_fin}}
- Lieu : {{session_lieu}}
- Horaires : 9h00 - 12h30 / 13h30 - 17h00

ARTICLE 3 - PRIX DE LA FORMATION
Le prix de la formation est fixé à {{session_prix}} € TTC.

ARTICLE 4 - MODALITÉS DE PAIEMENT
Le règlement s''effectue selon les modalités suivantes :
- Acompte à l''inscription : 30%
- Solde avant le début de la formation : 70%

ARTICLE 5 - DÉLAI DE RÉTRACTATION
Le stagiaire dispose d''un délai de 14 jours à compter de la signature du présent contrat pour exercer son droit de rétractation.

Fait en deux exemplaires, à _____________, le ______________

Le stagiaire                              L''organisme de formation
(mention "Lu et approuvé")


_______________________                   _______________________',
  ARRAY['civilite', 'prenom', 'nom', 'rue', 'code_postal', 'ville', 'email', 'telephone', 'formation', 'session_duree', 'session_date_debut', 'session_date_fin', 'session_lieu', 'session_prix'],
  'Contrat de formation professionnelle conforme au Code du travail'
),
(
  'Règlement intérieur',
  'reglement',
  'administratif',
  'RÈGLEMENT INTÉRIEUR
DE L''ORGANISME DE FORMATION

Le présent règlement est établi conformément aux dispositions des articles L.6352-3 et L.6352-4 et R.6352-1 à R.6352-15 du Code du travail.

PRÉAMBULE
Le présent règlement s''applique à tous les stagiaires et ce, pour la durée de la formation suivie.

SECTION 1 - RÈGLES GÉNÉRALES

Article 1 - Assiduité
Les stagiaires doivent se conformer aux horaires fixés et communiqués au préalable.
Toute absence doit être justifiée.

Article 2 - Comportement
Les stagiaires sont tenus d''avoir un comportement respectueux envers l''ensemble des personnes présentes dans l''établissement.

SECTION 2 - HYGIÈNE ET SÉCURITÉ

Article 3 - Consignes de sécurité
Les consignes de sécurité et d''incendie doivent être respectées.
Il est interdit de fumer dans les locaux.

SECTION 3 - SANCTIONS

Article 4 - Sanctions disciplinaires
Tout manquement du stagiaire à l''une des prescriptions du présent règlement pourra faire l''objet d''une sanction.

Fait à _____________, le ______________',
  ARRAY[]::TEXT[],
  'Règlement intérieur obligatoire de l''organisme de formation'
),
(
  'Convocation à la formation',
  'convocation',
  'communication',
  '{{civilite}} {{prenom}} {{nom}}
{{rue}}
{{code_postal}} {{ville}}

Objet : Convocation à la formation {{formation}}

{{civilite}} {{nom}},

Nous avons le plaisir de vous confirmer votre inscription à la formation mentionnée ci-dessus.

INFORMATIONS PRATIQUES :

Formation : {{formation}}
Dates : du {{session_date_debut}} au {{session_date_fin}}
Horaires : 9h00 - 12h30 / 13h30 - 17h00
Lieu : {{session_lieu}}
Formateur : {{session_formateur}}

DOCUMENTS À APPORTER :
- Pièce d''identité en cours de validité
- Permis de conduire (si applicable)
- De quoi prendre des notes

Nous vous remercions de bien vouloir nous confirmer votre présence par retour de mail.

Dans l''attente de vous accueillir, nous vous prions d''agréer, {{civilite}} {{nom}}, l''expression de nos salutations distinguées.

L''équipe de formation',
  ARRAY['civilite', 'prenom', 'nom', 'rue', 'code_postal', 'ville', 'formation', 'session_date_debut', 'session_date_fin', 'session_lieu', 'session_formateur'],
  'Modèle de convocation envoyée aux stagiaires avant la formation'
);