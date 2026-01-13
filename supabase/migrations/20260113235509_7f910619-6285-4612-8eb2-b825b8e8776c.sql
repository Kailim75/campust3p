-- Table des modèles d'emails
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL,
  sujet text NOT NULL,
  contenu text NOT NULL,
  categorie text NOT NULL DEFAULT 'autre',
  variables text[] DEFAULT '{}',
  actif boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow read access to email_templates" ON public.email_templates
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to email_templates" ON public.email_templates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to email_templates" ON public.email_templates
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to email_templates" ON public.email_templates
  FOR DELETE USING (true);

-- Trigger pour updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer des modèles par défaut adaptés T3P
INSERT INTO public.email_templates (nom, sujet, contenu, categorie, variables) VALUES
(
  'Confirmation inscription',
  'Confirmation de votre inscription - Formation {{formation_type}}',
  'Bonjour {{civilite}} {{nom}},

Nous avons le plaisir de vous confirmer votre inscription à la formation {{formation_type}}.

📅 Date de début : {{date_debut}}
📅 Date de fin : {{date_fin}}
📍 Lieu : {{lieu}}
👨‍🏫 Formateur : {{formateur}}

Merci de vous présenter 15 minutes avant le début de la formation muni des documents suivants :
- Pièce d''identité en cours de validité
- Permis de conduire
- Photo d''identité (si non fournie)

Pour toute question, n''hésitez pas à nous contacter.

Cordialement,
L''équipe de formation',
  'inscription',
  ARRAY['civilite', 'nom', 'prenom', 'formation_type', 'date_debut', 'date_fin', 'lieu', 'formateur']
),
(
  'Convocation formation',
  'Convocation - Formation {{formation_type}} du {{date_debut}}',
  'Bonjour {{civilite}} {{nom}},

Nous vous rappelons que votre formation {{formation_type}} débute le {{date_debut}}.

📅 Dates : du {{date_debut}} au {{date_fin}}
⏰ Horaires : 9h00 - 17h00
📍 Adresse : {{lieu}}

Documents obligatoires à apporter :
✅ Pièce d''identité originale
✅ Permis de conduire original
✅ Attestation d''assurance (si véhicule personnel)

En cas d''empêchement, merci de nous prévenir au plus vite.

À très bientôt,
L''équipe de formation',
  'convocation',
  ARRAY['civilite', 'nom', 'prenom', 'formation_type', 'date_debut', 'date_fin', 'lieu']
),
(
  'Rappel paiement',
  'Rappel - Facture {{numero_facture}} en attente',
  'Bonjour {{civilite}} {{nom}},

Sauf erreur de notre part, nous n''avons pas encore reçu le règlement de la facture n°{{numero_facture}} d''un montant de {{montant}}€.

Date d''échéance : {{date_echeance}}
Montant restant dû : {{montant_restant}}€

Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.

Si vous avez déjà effectué ce paiement, veuillez ne pas tenir compte de ce message.

Cordialement,
L''équipe de formation',
  'paiement',
  ARRAY['civilite', 'nom', 'numero_facture', 'montant', 'date_echeance', 'montant_restant']
),
(
  'Attestation réussite examen',
  'Félicitations - Réussite à l''examen {{formation_type}}',
  'Bonjour {{civilite}} {{nom}},

Nous avons le plaisir de vous annoncer votre RÉUSSITE à l''examen {{formation_type}} ! 🎉

Votre attestation de réussite vous sera envoyée dans les prochains jours.

Prochaines étapes pour obtenir votre carte professionnelle :
1. Récupérer votre attestation de réussite
2. Constituer votre dossier de demande de carte
3. Déposer votre dossier en préfecture

N''hésitez pas à nous contacter si vous avez besoin d''accompagnement dans vos démarches.

Encore bravo et bonne continuation !

L''équipe de formation',
  'examen',
  ARRAY['civilite', 'nom', 'prenom', 'formation_type']
),
(
  'Renouvellement carte pro',
  'Rappel - Votre carte professionnelle expire bientôt',
  'Bonjour {{civilite}} {{nom}},

Nous vous informons que votre carte professionnelle {{type_carte}} arrive à expiration le {{date_expiration}}.

Pour continuer à exercer votre activité, vous devez effectuer une formation continue avant cette date.

Nos prochaines sessions de formation continue {{type_formation}} :
- Consultez notre planning sur notre site

Nous vous conseillons de vous inscrire rapidement car les places sont limitées.

N''hésitez pas à nous contacter pour plus d''informations.

Cordialement,
L''équipe de formation',
  'renouvellement',
  ARRAY['civilite', 'nom', 'type_carte', 'date_expiration', 'type_formation']
),
(
  'Bienvenue prospect',
  'Bienvenue - Votre projet de formation {{formation_type}}',
  'Bonjour {{civilite}} {{nom}},

Merci de l''intérêt que vous portez à nos formations !

Vous avez manifesté votre intérêt pour la formation {{formation_type}}. Voici quelques informations pratiques :

📚 Formation {{formation_type}}
⏱️ Durée : selon le type de formation
💶 Plusieurs modes de financement disponibles (CPF, OPCO, personnel)

Pour finaliser votre inscription ou obtenir plus d''informations, n''hésitez pas à nous contacter :
📞 Par téléphone
📧 Par email

Nous restons à votre disposition.

Cordialement,
L''équipe de formation',
  'prospection',
  ARRAY['civilite', 'nom', 'prenom', 'formation_type']
),
(
  'Documents manquants',
  'Documents manquants pour votre dossier',
  'Bonjour {{civilite}} {{nom}},

Nous avons bien reçu votre dossier d''inscription. Cependant, pour le finaliser, nous avons besoin des documents suivants :

{{liste_documents}}

Merci de nous les transmettre dans les meilleurs délais afin de valider définitivement votre inscription.

Vous pouvez nous les envoyer par email ou les apporter directement à notre centre.

Cordialement,
L''équipe de formation',
  'administratif',
  ARRAY['civilite', 'nom', 'liste_documents']
),
(
  'Annulation session',
  'Information importante - Modification de votre session de formation',
  'Bonjour {{civilite}} {{nom}},

Nous sommes au regret de vous informer que la session de formation {{formation_type}} initialement prévue du {{date_debut}} au {{date_fin}} a dû être modifiée.

Nouvelle date proposée : {{nouvelle_date}}

Si cette nouvelle date ne vous convient pas, merci de nous contacter pour trouver une solution alternative.

Nous vous prions de nous excuser pour ce désagrément.

Cordialement,
L''équipe de formation',
  'modification',
  ARRAY['civilite', 'nom', 'formation_type', 'date_debut', 'date_fin', 'nouvelle_date']
);