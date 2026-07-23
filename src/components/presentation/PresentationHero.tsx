import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import {
  Play, ArrowRight, ShieldCheck, Building2, FileCheck, BarChart3,
  CreditCard, Users, CheckCircle2, GraduationCap, TrendingUp,
} from "lucide-react";
import { AnimatedValue, FloatingBlob, staggerContainer, staggerItem } from "./presentation-motion";

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

const chartBars = [38, 55, 42, 70, 58, 82, 66, 95];

/** Mockup stylisé du cockpit — pur HTML/CSS animé, aucun asset. */
function MockupCockpit({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative mx-auto max-w-xl" style={{ perspective: 1200 }}>
      <motion.div
        className="relative rounded-2xl border border-white/10 bg-[hsl(222,44%,14%)]/90 backdrop-blur shadow-[0_24px_80px_-20px_rgba(45,212,191,0.35)] p-5"
        style={{ rotateX: 6, rotateY: -6 }}
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Barre de fenêtre */}
        <div className="flex items-center gap-1.5 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-[11px] text-white/40 font-medium">t3pcampus.net — Cockpit</span>
        </div>

        {/* KPIs animés */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "CA sécurisé", value: "92300€", color: "text-teal-300" },
            { label: "Sessions", value: "56", color: "text-white" },
            { label: "Recouvrement", value: "79%", color: "text-emerald-300" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl bg-white/[0.06] border border-white/[0.08] p-3">
              <p className="text-[10px] text-white/50 mb-1">{kpi.label}</p>
              <p className={`text-lg font-bold tabular-nums ${kpi.color}`}>
                <AnimatedValue value={kpi.value} />
              </p>
            </div>
          ))}
        </div>

        {/* Graphique en barres animé */}
        <div className="rounded-xl bg-white/[0.06] border border-white/[0.08] p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-white/50">Encaissements — 8 dernières semaines</p>
            <TrendingUp className="w-3.5 h-3.5 text-teal-300" />
          </div>
          <div className="flex items-end gap-2 h-20">
            {chartBars.map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-teal-500/60 to-teal-300"
                style={{ height: `${h}%`, transformOrigin: "bottom" }}
                initial={reduce ? undefined : { scaleY: 0 }}
                animate={reduce ? undefined : { scaleY: 1 }}
                transition={{ delay: 1 + i * 0.09, duration: 0.5, ease: "easeOut" }}
              />
            ))}
          </div>
        </div>

        {/* Ligne d'action */}
        <div className="flex items-center justify-between rounded-xl bg-white/[0.06] border border-white/[0.08] p-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />
            <span className="text-[11px] text-white/70">Session VTC — 9 inscrits, dossiers complets</span>
          </div>
          <span className="text-[10px] font-medium text-emerald-300">Qualiopi ✓</span>
        </div>
      </motion.div>

      {/* Cartes satellites flottantes */}
      <motion.div
        className="absolute -left-6 sm:-left-14 top-10 rounded-xl bg-white shadow-xl px-3.5 py-2.5 flex items-center gap-2"
        initial={reduce ? undefined : { opacity: 0, x: -20 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0, y: [0, -8, 0] }}
        transition={reduce ? undefined : { opacity: { delay: 1.4 }, x: { delay: 1.4 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.8 } }}
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-medium text-gray-800">Facture émise en 1 clic</span>
      </motion.div>
      <motion.div
        className="absolute -right-4 sm:-right-12 bottom-8 rounded-xl bg-white shadow-xl px-3.5 py-2.5 flex items-center gap-2"
        initial={reduce ? undefined : { opacity: 0, x: 20 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0, y: [0, 8, 0] }}
        transition={reduce ? undefined : { opacity: { delay: 1.7 }, x: { delay: 1.7 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 } }}
      >
        <GraduationCap className="w-4 h-4 text-teal-500" />
        <span className="text-xs font-medium text-gray-800">Rappel examen J+21 envoyé</span>
      </motion.div>
    </div>
  );
}

export function PresentationHero({ onDemo, onContact }: Props) {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[hsl(222,47%,9%)]">
      {/* Aurora de fond */}
      <FloatingBlob
        className="absolute -top-32 left-1/4 w-[560px] h-[560px] rounded-full bg-teal-500/20 blur-3xl"
        duration={13}
      />
      <FloatingBlob
        className="absolute top-40 -right-40 w-[480px] h-[480px] rounded-full bg-[hsl(26,83%,52%)]/10 blur-3xl"
        duration={10}
        delay={1.5}
      />
      <FloatingBlob
        className="absolute -bottom-40 -left-32 w-[420px] h-[420px] rounded-full bg-indigo-500/10 blur-3xl"
        duration={12}
        delay={0.8}
      />
      {/* Grille subtile */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <motion.div
        className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28"
        variants={reduce ? undefined : staggerContainer}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "visible"}
      >
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Colonne texte */}
          <div className="text-center lg:text-left">
            <motion.div
              variants={reduce ? undefined : staggerItem}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-400/10 border border-teal-400/20 text-teal-300 text-sm font-medium mb-6"
            >
              <ShieldCheck className="w-4 h-4" />
              Conçu pour les centres de formation Transport
            </motion.div>

            <motion.h1
              variants={reduce ? undefined : staggerItem}
              className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-white leading-[1.1] mb-5"
            >
              Le logiciel qui sécurise vos sessions et{" "}
              <motion.span
                className="bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent"
                style={{ backgroundSize: "200% 100%" }}
                animate={reduce ? undefined : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              >
                automatise votre administratif
              </motion.span>
            </motion.h1>

            <motion.p
              variants={reduce ? undefined : staggerItem}
              className="text-lg text-white/60 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              Conformité Qualiopi & DREETS, relances automatiques, suivi financier,
              dossiers CMA & Carte Pro — tout est centralisé dans un cockpit actionnable.
            </motion.p>

            <motion.div
              variants={reduce ? undefined : staggerItem}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
            >
              <Button
                onClick={onDemo}
                size="lg"
                className="bg-teal-400 hover:bg-teal-300 text-[hsl(222,47%,9%)] font-semibold gap-2 h-12 px-6 text-base shadow-[0_8px_30px_-8px_rgba(45,212,191,0.6)] transition-transform hover:scale-[1.04]"
              >
                <Play className="w-4 h-4" />
                Voir la démo (3 min)
              </Button>
              <Button
                onClick={onContact}
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white gap-2 h-12 px-6 text-base transition-transform hover:scale-[1.04]"
              >
                Demander une démo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>

          {/* Colonne mockup */}
          <motion.div variants={reduce ? undefined : staggerItem}>
            <MockupCockpit reduce={!!reduce} />
          </motion.div>
        </div>

        {/* Bandeau de confiance */}
        <motion.div
          variants={reduce ? undefined : staggerItem}
          className="mt-16 max-w-4xl mx-auto border border-white/10 rounded-xl bg-white/[0.04] backdrop-blur p-4 sm:p-5"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {trustItems.map((item, i) => (
              <motion.div
                key={item.label}
                className="flex flex-col items-center gap-1.5 text-center"
                initial={reduce ? undefined : { opacity: 0, y: 12 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + i * 0.08, duration: 0.4 }}
              >
                <item.icon className="w-5 h-5 text-teal-300" />
                <span className="text-xs font-medium text-white/60">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
