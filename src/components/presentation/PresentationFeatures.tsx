import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  GitBranch,
  CreditCard,
  Building2,
  GraduationCap,
} from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Cockpit décisionnel",
    desc: "KPIs cliquables, actions du jour, alertes risque et sessions — tout en un écran.",
  },
  {
    icon: Users,
    title: "Prospects → Apprenants",
    desc: "Pipeline de conversion propre : relances, devis, inscription en session en quelques clics.",
  },
  {
    icon: CalendarCheck,
    title: "Gestion de sessions",
    desc: "Inscrits, score de santé, conformité Qualiopi, convocations et émargements intégrés.",
  },
  {
    icon: FileText,
    title: "Documents intelligents",
    desc: "Checklist par profil, génération automatique (convocations, attestations, chevalets), stockage sécurisé.",
  },
  {
    icon: GitBranch,
    title: "Initial vs Continue",
    desc: "Distinction automatique CMA / Carte Pro selon le parcours. Onglets, compteurs et dossiers adaptés.",
  },
  {
    icon: CreditCard,
    title: "Finances & paiements",
    desc: "Devis, factures, paiements, retards, trésorerie prévisionnelle — sans saisie double.",
  },
  {
    icon: Building2,
    title: "Multi-centre & multi-tenant",
    desc: "Chaque centre a ses données isolées, son branding, ses utilisateurs. Vision consolidée pour le dirigeant.",
  },
  {
    icon: GraduationCap,
    title: "Espace formateur & apprenant",
    desc: "Le formateur consulte ses sessions et documents. L'apprenant accède à son portail personnalisé.",
  },
];

export function PresentationFeatures() {
  return (
    <section id="features" className="py-16 sm:py-24 bg-[hsl(210,40%,98%)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(222,47%,11%)] mb-3">
            Fonctionnalités clés
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Tout ce dont un centre de formation Transport a besoin, dans un seul outil.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow group"
            >
              <div className="w-10 h-10 rounded-lg bg-[hsl(222,47%,11%,0.05)] group-hover:bg-[hsl(173,58%,39%,0.1)] flex items-center justify-center mb-3 transition-colors">
                <f.icon className="w-5 h-5 text-[hsl(222,47%,11%)] group-hover:text-[hsl(173,58%,39%)] transition-colors" />
              </div>
              <h3 className="font-semibold text-sm text-[hsl(222,47%,11%)] mb-1.5">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
