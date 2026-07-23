import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onContact: () => void;
}

/**
 * Grille validée par le directeur le 23/07/2026 : par centre (pas par
 * utilisateur), annuel = 2 mois offerts, mise en route 490 €, offre
 * fondateur −40 % à vie + mise en route offerte pour les 5 premiers centres.
 */
const plans = [
  {
    name: "Starter",
    target: "1 centre · jusqu'à 3 utilisateurs",
    mensuel: 149,
    annuel: 124,
    features: [
      "Cockpit décisionnel",
      "Gestion prospects & apprenants",
      "Sessions & inscriptions",
      "Documents & checklist CMA / Carte Pro",
      "Factures & paiements",
      "Support email",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    target: "1 centre · équipe illimitée",
    mensuel: 299,
    annuel: 249,
    features: [
      "Tout Starter +",
      "Multi-staff & rôles (admin / staff / formateur)",
      "Suivi du parcours d'examen (rappels auto)",
      "Signature électronique & relances",
      "Conformité Qualiopi avancée & pack audit",
      "Support prioritaire",
    ],
    highlight: true,
  },
  {
    name: "Multi-centre",
    target: "Réseaux & franchises · vision consolidée",
    mensuel: null,
    annuel: null,
    features: [
      "Tout Pro +",
      "Centres isolés (RLS multi-tenant)",
      "Branding par centre",
      "Dashboard consolidé dirigeant",
      "Onboarding dédié",
      "Interlocuteur unique",
    ],
    highlight: false,
  },
];

export function PresentationPricing({ onContact }: Props) {
  const [annuel, setAnnuel] = useState(true);

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-[hsl(210,40%,98%)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(222,47%,11%)] mb-3">
            Tarifs adaptés à votre taille
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Par centre, pas par utilisateur. Sans frais cachés — l'outil se paie
            en une demi-journée d'administratif économisée par mois.
          </p>
        </div>

        {/* Offre fondateur */}
        <div className="max-w-2xl mx-auto mb-8 rounded-xl border border-[hsl(26,83%,52%,0.35)] bg-[hsl(26,83%,52%,0.07)] px-4 py-3 flex items-start sm:items-center gap-3">
          <Sparkles className="w-5 h-5 text-[hsl(26,83%,52%)] shrink-0" />
          <p className="text-sm text-gray-800">
            <span className="font-semibold">Offre fondateur — 5 premiers centres :</span>{" "}
            −40 % à vie (Starter <span className="font-semibold">74 €</span>, Pro{" "}
            <span className="font-semibold">149 €</span>/mois HT) et mise en route offerte.
          </p>
        </div>

        {/* Bascule mensuel / annuel */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <button
            onClick={() => setAnnuel(false)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              !annuel ? "bg-[hsl(222,47%,11%)] text-white" : "text-gray-500 hover:text-gray-800"
            )}
          >
            Mensuel
          </button>
          <button
            onClick={() => setAnnuel(true)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              annuel ? "bg-[hsl(222,47%,11%)] text-white" : "text-gray-500 hover:text-gray-800"
            )}
          >
            Annuel
            <span className={cn(
              "text-[11px] px-1.5 py-0.5 rounded-full font-semibold",
              annuel ? "bg-[hsl(173,58%,39%)] text-white" : "bg-[hsl(173,58%,39%,0.12)] text-[hsl(173,58%,39%)]"
            )}>
              2 mois offerts
            </span>
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 flex flex-col ${
                plan.highlight
                  ? "bg-white border-[hsl(173,58%,39%)] shadow-lg ring-1 ring-[hsl(173,58%,39%,0.2)] relative"
                  : "bg-white border-gray-200"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[hsl(173,58%,39%)] text-white text-xs font-semibold">
                  Recommandé
                </div>
              )}
              <h3 className="font-bold text-lg text-[hsl(222,47%,11%)]">{plan.name}</h3>
              <p className="text-xs text-gray-500 mt-1 mb-4">{plan.target}</p>
              <div className="mb-1">
                {plan.mensuel != null ? (
                  <>
                    <span className="text-3xl font-extrabold text-[hsl(222,47%,11%)]">
                      {annuel ? plan.annuel : plan.mensuel} €
                    </span>
                    <span className="text-sm text-gray-500"> HT/mois</span>
                  </>
                ) : (
                  <span className="text-3xl font-extrabold text-[hsl(222,47%,11%)]">Sur devis</span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mb-5 min-h-[28px]">
                {plan.mensuel != null
                  ? annuel
                    ? `Facturation annuelle · sans engagement en mensuel à ${plan.mensuel} €`
                    : `Sans engagement · ${plan.annuel} € en annuel (2 mois offerts)`
                  : "À partir de 199 €/centre/mois en annuel"}
              </p>
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-[hsl(173,58%,39%)] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={onContact}
                className={
                  plan.highlight
                    ? "bg-[hsl(173,58%,39%)] hover:bg-[hsl(173,62%,32%)] text-white w-full"
                    : "bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,44%,16%)] text-white w-full"
                }
              >
                {plan.mensuel != null ? "Démarrer" : "Demander un devis"}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          Mise en route : 490 € (import de vos données, paramétrage, 2 h de formation) —
          offerte aux 5 premiers centres. Prix HT.
        </p>
      </div>
    </section>
  );
}
