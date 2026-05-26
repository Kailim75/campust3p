import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { BookOpen, Keyboard, Sparkles, GitBranch } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Cmd/Ctrl + K", label: "Ouvrir la palette de commandes" },
  { keys: "?", label: "Afficher tous les raccourcis" },
  { keys: "G puis D", label: "Aller au Dashboard" },
  { keys: "G puis A", label: "Aller à Aujourd'hui" },
  { keys: "G puis S", label: "Aller aux Sessions" },
  { keys: "G puis P", label: "Aller aux Prospects" },
  { keys: "G puis F", label: "Aller aux Finances" },
  { keys: "N puis A", label: "Nouvel apprenant" },
  { keys: "N puis P", label: "Nouveau prospect" },
  { keys: "Échap", label: "Fermer un dialogue / une fiche" },
];

const GLOSSARY: { term: string; def: string }[] = [
  {
    term: "Parcours Initial",
    def: "Formation CMA (Carte de Mobilité Apprenants) — exige 5 documents réglementaires obligatoires avant inscription à l'examen.",
  },
  {
    term: "Formation continue",
    def: "Formations à la Carte Pro (renouvellement triennal des chauffeurs Taxi/VTC). Programme et convocation suffisent généralement.",
  },
  {
    term: "Contrat (B2C)",
    def: "Document signé quand l'apprenant paie lui-même sa formation. 18 articles réglementaires, délai de rétractation de 10 jours.",
  },
  {
    term: "Convention (B2B)",
    def: "Document signé quand un tiers paie (employeur, OPCO, France Travail). Pas de délai de rétractation.",
  },
  {
    term: "Bénéficiaire",
    def: "L'apprenant qui suit effectivement la formation.",
  },
  {
    term: "Payeur",
    def: "L'entité (personne physique ou morale) qui règle la facture. Peut être différent du bénéficiaire.",
  },
  {
    term: "Émargement",
    def: "Feuille de présence signée 2 fois par jour (matin / après-midi) + soir (18:00-21:30) si applicable. Obligatoire pour Qualiopi.",
  },
  {
    term: "Audit pack",
    def: "Archive ZIP générée à la clôture d'une session, contenant tous les documents Qualiopi pour audit.",
  },
  {
    term: "Score SAO",
    def: "Score prédictif Sécurité-Activité-Opportunités sur 30 jours, calculé par l'IA Director.",
  },
  {
    term: "Factur-X / PDP",
    def: "Format de facturation électronique obligatoire dès 2026 (réforme française). Le CRM gère la génération et la soumission à la PDP.",
  },
];

const WORKFLOWS: { title: string; steps: string[] }[] = [
  {
    title: "De prospect à facturation",
    steps: [
      "Création du prospect (manuel ou via webhook)",
      "Qualification et relances planifiées (next_action_at)",
      "Conversion en apprenant + choix du parcours",
      "Inscription à une session",
      "Génération automatique des documents (programme, contrat/convention, convocation)",
      "Envoi pour signature électronique",
      "Émission de la facture (paiement ponctuel ou Alma)",
      "Encaissement et rapprochement automatique",
    ],
  },
  {
    title: "Cycle de vie d'une session",
    steps: [
      "Création depuis le catalogue (formation + dates + formateur)",
      "Inscription des apprenants (manuelle ou conversion prospect)",
      "Envoi des convocations J-7",
      "Émargements quotidiens pendant la session",
      "Lancement de l'assistant de clôture en fin de session",
      "Génération des attestations + envoi des enquêtes de satisfaction",
      "Export de l'audit pack Qualiopi",
    ],
  },
  {
    title: "Gestion d'un impayé",
    steps: [
      "Détection automatique J+1 après échéance",
      "Relance email J+7 (template configurable)",
      "Relance J+14 + bascule en priorité Critique dans 'Aujourd'hui'",
      "Relance J+30 + alerte dans IA Director",
      "Décision manuelle : recouvrement, échéancier Alma, ou abandon créance",
    ],
  },
];

export default function AidePage() {
  return (
    <div className="min-h-screen">
      <Header title="Aide & Mémo" subtitle="Raccourcis, glossaire métier et workflows-types" />

      <main className="p-3 sm:p-6 animate-fade-in space-y-6 max-w-5xl">
        {/* Raccourcis clavier */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Keyboard className="h-4 w-4 text-primary" />
              Raccourcis clavier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {SHORTCUTS.map((s) => (
                <div
                  key={s.keys}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
                >
                  <span className="text-sm text-foreground">{s.label}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {s.keys}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Glossaire */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              Glossaire métier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              {GLOSSARY.map((g) => (
                <div key={g.term} className="rounded-md border border-border bg-card p-3">
                  <dt className="text-sm font-semibold text-foreground">{g.term}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{g.def}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Workflows */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-4 w-4 text-primary" />
              Workflows-types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {WORKFLOWS.map((w, i) => (
                <AccordionItem key={w.title} value={`w-${i}`}>
                  <AccordionTrigger className="text-sm">{w.title}</AccordionTrigger>
                  <AccordionContent>
                    <ol className="ml-5 list-decimal space-y-1.5 text-sm text-muted-foreground">
                      {w.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Lien vers ressources externes */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Pour aller plus loin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Cliquez sur le bouton <strong>?</strong> en bas à droite de n'importe quelle page pour ouvrir le centre d'aide contextuel.
            </p>
            <p>
              • Les articles affichés sont automatiquement filtrés selon votre écran courant.
            </p>
            <p>
              • Pour toute question non couverte, contactez le support depuis <strong>Paramètres → Support</strong>.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
