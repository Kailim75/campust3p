import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { Play, ArrowRight, ShieldCheck, Building2, FileCheck, BarChart3, CreditCard, Users } from "lucide-react";
import { FloatingBlob, staggerContainer, staggerItem } from "./presentation-motion";

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
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient + halos flottants */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210,40%,98%)] via-white to-[hsl(173,58%,39%,0.05)]" />
      <FloatingBlob
        className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-[hsl(173,58%,39%,0.12)] blur-3xl"
        duration={11}
      />
      <FloatingBlob
        className="absolute top-32 -right-32 w-[380px] h-[380px] rounded-full bg-[hsl(222,47%,11%,0.07)] blur-3xl"
        duration={9}
        delay={1.2}
      />

      <motion.div
        className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24"
        variants={reduce ? undefined : staggerContainer}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "visible"}
      >
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            variants={reduce ? undefined : staggerItem}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(173,58%,39%,0.1)] text-[hsl(173,58%,39%)] text-sm font-medium mb-6"
          >
            <ShieldCheck className="w-4 h-4" />
            Conçu pour les centres de formation Transport
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={reduce ? undefined : staggerItem}
            className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[hsl(222,47%,11%)] leading-[1.15] mb-5"
          >
            Le logiciel qui sécurise vos sessions et{" "}
            <span className="relative text-[hsl(173,58%,39%)]">
              automatise votre administratif
              <motion.span
                aria-hidden
                className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-[hsl(173,58%,39%,0.35)]"
                initial={reduce ? undefined : { scaleX: 0 }}
                animate={reduce ? undefined : { scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.9, ease: "easeOut" }}
              />
            </span>
          </motion.h1>

          <motion.p
            variants={reduce ? undefined : staggerItem}
            className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            Conformité Qualiopi & DREETS, relances automatiques, suivi financier,
            dossiers CMA & Carte Pro — tout est centralisé dans un cockpit actionnable.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={reduce ? undefined : staggerItem}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12"
          >
            <Button
              onClick={onDemo}
              size="lg"
              className="bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,44%,16%)] text-white gap-2 h-12 px-6 text-base transition-transform hover:scale-[1.03]"
            >
              <Play className="w-4 h-4" />
              Voir la démo (3 min)
            </Button>
            <Button
              onClick={onContact}
              size="lg"
              variant="outline"
              className="border-[hsl(173,58%,39%)] text-[hsl(173,58%,39%)] hover:bg-[hsl(173,58%,39%,0.05)] gap-2 h-12 px-6 text-base transition-transform hover:scale-[1.03]"
            >
              Demander une démo
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>

        {/* Trust band */}
        <motion.div
          variants={reduce ? undefined : staggerItem}
          className="max-w-4xl mx-auto border rounded-xl bg-white/80 backdrop-blur p-4 sm:p-6"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {trustItems.map((item, i) => (
              <motion.div
                key={item.label}
                className="flex flex-col items-center gap-1.5 text-center"
                initial={reduce ? undefined : { opacity: 0, y: 12 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: 1 + i * 0.08, duration: 0.4 }}
              >
                <item.icon className="w-5 h-5 text-[hsl(173,58%,39%)]" />
                <span className="text-xs font-medium text-gray-600">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
