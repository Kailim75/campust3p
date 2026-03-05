import { AlertTriangle, FileX, CreditCard, CalendarX } from "lucide-react";

const problems = [
  {
    icon: AlertTriangle,
    title: "Relances oubliées",
    before: "Prospects perdus dans des fichiers Excel et messages WhatsApp éparpillés.",
    after: "Pipeline clair avec relances automatiques et alertes dans le cockpit quotidien.",
  },
  {
    icon: FileX,
    title: "Documents manquants",
    before: "Dossiers incomplets découverts la veille de l'audit ou à l'examen.",
    after: "Checklist intelligente par track (CMA / Carte Pro) avec alertes en temps réel.",
  },
  {
    icon: CreditCard,
    title: "Impayés & facturation",
    before: "Factures envoyées en retard, paiements non suivis, trésorerie incertaine.",
    after: "Factures générées en 1 clic, suivi des échéances et alertes retard automatiques.",
  },
  {
    icon: CalendarX,
    title: "Sessions à risque",
    before: "Sous-effectif découvert trop tard, formateur non confirmé, salle non réservée.",
    after: "Score de santé par session, alertes risque et actions correctives guidées.",
  },
];

export function PresentationProblems() {
  return (
    <section className="py-16 sm:py-24 bg-[hsl(210,40%,98%)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(222,47%,11%)] mb-3">
            Vous reconnaissez ces problèmes ?
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Chaque centre de formation les vit au quotidien. T3P Campus les résout.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {problems.map((p) => (
            <div
              key={p.title}
              className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <p.icon className="w-5 h-5 text-red-500" />
                </div>
                <div className="space-y-3 flex-1">
                  <h3 className="font-semibold text-[hsl(222,47%,11%)]">{p.title}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-red-400 font-medium shrink-0">Avant</span>
                      <span className="text-gray-500">{p.before}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[hsl(173,58%,39%)] font-medium shrink-0">Après</span>
                      <span className="text-gray-700">{p.after}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
