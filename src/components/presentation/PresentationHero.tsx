import { Button } from "@/components/ui/button";
import { Play, ArrowRight, ShieldCheck, Building2, FileCheck, BarChart3, CreditCard, Users } from "lucide-react";

interface Props {
  onDemo: () => void;
  onContact: () => void;
}

const trustItems = [
  { icon: Building2, label: "Multi-centre" },
  { icon: ShieldCheck, label: "Données isolées (RLS)" },
  { icon: FileCheck, label: "Suivi dossiers" },
  { icon: CreditCard, label: "Finances & paiements" },
  { icon: BarChart3, label: "Cockpit décisionnel" },
  { icon: Users, label: "Espace formateur" },
];

export function PresentationHero({ onDemo, onContact }: Props) {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210,40%,98%)] via-white to-[hsl(173,58%,39%,0.05)]" />
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(173,58%,39%,0.1)] text-[hsl(173,58%,39%)] text-sm font-medium mb-6">
            <ShieldCheck className="w-4 h-4" />
            Conçu pour les centres de formation Transport
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[hsl(222,47%,11%)] leading-[1.15] mb-5">
            Le logiciel qui sécurise vos sessions et{" "}
            <span className="text-[hsl(173,58%,39%)]">automatise votre administratif</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Conformité Qualiopi & DREETS, relances automatiques, suivi financier, 
            dossiers CMA & Carte Pro — tout est centralisé dans un cockpit actionnable.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Button
              onClick={onDemo}
              size="lg"
              className="bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,44%,16%)] text-white gap-2 h-12 px-6 text-base"
            >
              <Play className="w-4 h-4" />
              Voir la démo (3 min)
            </Button>
            <Button
              onClick={onContact}
              size="lg"
              variant="outline"
              className="border-[hsl(173,58%,39%)] text-[hsl(173,58%,39%)] hover:bg-[hsl(173,58%,39%,0.05)] gap-2 h-12 px-6 text-base"
            >
              Demander une démo
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Trust band */}
        <div className="max-w-4xl mx-auto border rounded-xl bg-white/80 backdrop-blur p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {trustItems.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1.5 text-center">
                <item.icon className="w-5 h-5 text-[hsl(173,58%,39%)]" />
                <span className="text-xs font-medium text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
