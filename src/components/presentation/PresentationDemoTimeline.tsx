import { UserPlus, ArrowRightLeft, FolderCheck, LayoutDashboard } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "Étape 1",
    title: "Créer un prospect & planifier une relance",
    desc: "Ajoutez un contact en quelques secondes, planifiez un rappel. Le cockpit vous alerte automatiquement.",
  },
  {
    icon: ArrowRightLeft,
    step: "Étape 2",
    title: "Convertir en apprenant & inscrire en session",
    desc: "Un clic pour changer le statut, générer le devis et inscrire dans la bonne session.",
  },
  {
    icon: FolderCheck,
    step: "Étape 3",
    title: "Suivre le dossier & les paiements",
    desc: "Checklist CMA ou Carte Pro selon le track. Factures, paiements et alertes retard centralisés.",
  },
  {
    icon: LayoutDashboard,
    step: "Étape 4",
    title: "Piloter depuis le cockpit",
    desc: "Le dashboard affiche les actions du jour : relances, dossiers incomplets, sessions à risque.",
  },
];

export function PresentationDemoTimeline() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(222,47%,11%)] mb-3">
            Parcours démo en 3 minutes
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Découvrez le flux complet — du premier contact au pilotage quotidien.
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200 hidden sm:block" />

          <div className="space-y-8">
            {steps.map((s, i) => (
              <div key={s.step} className="relative flex gap-5">
                {/* Dot */}
                <div className="relative z-10 w-12 h-12 rounded-full bg-[hsl(222,47%,11%)] flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div className="pt-1">
                  <span className="text-xs font-semibold text-[hsl(173,58%,39%)] uppercase tracking-wide">
                    {s.step}
                  </span>
                  <h3 className="font-semibold text-[hsl(222,47%,11%)] mt-0.5 mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-gray-400 italic">
            Vidéo walkthrough bientôt disponible — en attendant, demandez une démo personnalisée.
          </p>
        </div>
      </div>
    </section>
  );
}
