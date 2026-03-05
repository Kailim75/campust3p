import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface Props {
  onContact: () => void;
}

const plans = [
  {
    name: "Starter",
    target: "1 centre · jusqu'à 3 utilisateurs",
    price: "Sur devis",
    features: [
      "Cockpit décisionnel",
      "Gestion prospects & apprenants",
      "Sessions & inscriptions",
      "Documents & checklist",
      "Factures & paiements",
      "Support email",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    target: "1 centre · staff illimité",
    price: "Sur devis",
    features: [
      "Tout Starter +",
      "Multi-staff & rôles (admin / staff / formateur)",
      "Espace formateur dédié",
      "Conformité Qualiopi avancée",
      "Pack audit & clôture session",
      "Support prioritaire",
    ],
    highlight: true,
  },
  {
    name: "Multi-centre",
    target: "Plusieurs centres · vision consolidée",
    price: "Sur devis",
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
  return (
    <section id="pricing" className="py-16 sm:py-24 bg-[hsl(210,40%,98%)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(222,47%,11%)] mb-3">
            Tarifs adaptés à votre taille
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Pas de frais cachés. Un abonnement mensuel ou annuel, ajustable à vos besoins.
          </p>
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
              <div className="text-2xl font-extrabold text-[hsl(222,47%,11%)] mb-5">{plan.price}</div>
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
                Demander un devis
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
