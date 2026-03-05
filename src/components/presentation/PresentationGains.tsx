import { Clock, TrendingDown, UserCheck, ShieldCheck } from "lucide-react";

const gains = [
  {
    icon: Clock,
    value: "10h+",
    label: "de temps admin économisé par semaine",
    detail: "Relances, documents, factures : tout est automatisé ou assisté.",
  },
  {
    icon: TrendingDown,
    value: "−40%",
    label: "d'impayés",
    detail: "Suivi des échéances, alertes retard, relances depuis le cockpit.",
  },
  {
    icon: UserCheck,
    value: "−60%",
    label: "de no-show & abandon",
    detail: "Notifications SMS/email, suivi personnalisé, pipeline visible.",
  },
  {
    icon: ShieldCheck,
    value: "100%",
    label: "conformité Qualiopi tracée",
    detail: "Score de conformité par session, pack audit, traçabilité complète.",
  },
];

export function PresentationGains() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(222,47%,11%)] mb-3">
            Ce que vous gagnez concrètement
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Des résultats mesurables dès les premières semaines d'utilisation.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {gains.map((g) => (
            <div key={g.label} className="text-center p-6 rounded-xl bg-[hsl(210,40%,98%)] border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-[hsl(173,58%,39%,0.1)] flex items-center justify-center mx-auto mb-4">
                <g.icon className="w-6 h-6 text-[hsl(173,58%,39%)]" />
              </div>
              <div className="text-3xl font-extrabold text-[hsl(222,47%,11%)] mb-1">{g.value}</div>
              <div className="text-sm font-medium text-gray-900 mb-2">{g.label}</div>
              <p className="text-xs text-gray-500">{g.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
