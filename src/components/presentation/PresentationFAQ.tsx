import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    q: "Est-ce adapté aux centres Taxi, VTC et VMDTR ?",
    a: "Oui. T3P Campus gère nativement les parcours initiaux (CMA) et continus (Carte Pro) avec des checklists et documents adaptés à chaque filière.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Absolument. Chaque centre a ses données isolées via RLS (Row Level Security). Les accès sont contrôlés par rôle (admin, staff, formateur), et toutes les actions sont tracées dans un journal d'audit.",
  },
  {
    q: "Combien de temps pour être opérationnel ?",
    a: "En général 1 à 2 semaines. L'onboarding inclut l'import de vos données existantes, la configuration du centre et la formation de votre équipe.",
  },
  {
    q: "Est-ce compatible avec Qualiopi ?",
    a: "T3P Campus intègre un module de conformité Qualiopi avec score dynamique, pack audit exportable et traçabilité complète des actions pédagogiques.",
  },
  {
    q: "Puis-je gérer plusieurs centres ?",
    a: "Oui, avec l'offre Multi-centre. Chaque centre a son espace isolé et le dirigeant bénéficie d'un dashboard consolidé.",
  },
  {
    q: "Y a-t-il un engagement minimum ?",
    a: "Non, pas d'engagement. Vous pouvez résilier à tout moment. Nous proposons aussi un tarif annuel avantageux.",
  },
];

export function PresentationFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(222,47%,11%)] mb-3">
            Questions fréquentes
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <Collapsible
              key={i}
              open={openIndex === i}
              onOpenChange={(open) => setOpenIndex(open ? i : null)}
            >
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4 rounded-lg bg-[hsl(210,40%,98%)] hover:bg-gray-100 transition-colors text-left">
                <span className="font-medium text-sm text-[hsl(222,47%,11%)]">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 pt-2">
                <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </section>
  );
}
