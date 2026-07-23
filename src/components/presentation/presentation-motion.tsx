import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion, type Variants } from "framer-motion";

/**
 * Briques d'animation de la page de présentation (22/07/2026, demande du
 * directeur : « page de présentation dynamique »). Tout respecte
 * prefers-reduced-motion et ne joue qu'une fois (viewport once).
 */

const EASE = [0.21, 0.65, 0.36, 1] as const;

export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/** Grille dont les enfants apparaissent en cascade au scroll. */
export function StaggerGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

/**
 * Compteur animé : parse « 10h+ », « −40% », « 100% »… et anime la partie
 * numérique de 0 à sa valeur quand il entre à l'écran.
 */
export function AnimatedValue({ value, className }: { value: string; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  // Parse UNE fois par valeur : un match recréé à chaque rendu dans les deps
  // de l'effet relançait l'animation en boucle (chiffres coincés à ~0).
  const parsed = useMemo(() => {
    const m = value.match(/^([^0-9]*)(\d+)(.*)$/);
    return m ? { prefix: m[1], target: parseInt(m[2], 10), suffix: m[3] } : null;
  }, [value]);
  const target = parsed?.target ?? 0;
  const [display, setDisplay] = useState(reduce ? target : 0);

  useEffect(() => {
    if (!inView || reduce || !parsed) return;
    const controls = animate(0, target, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, target]);

  if (!parsed) return <span className={className}>{value}</span>;
  return (
    <span ref={ref} className={className}>
      {parsed.prefix}
      {display.toLocaleString("fr-FR")}
      {parsed.suffix}
    </span>
  );
}

/** Halo de dégradé flottant pour le fond du héros. */
export function FloatingBlob({
  className,
  duration = 9,
  delay = 0,
}: {
  className?: string;
  duration?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className} aria-hidden />;
  return (
    <motion.div
      aria-hidden
      className={className}
      animate={{ y: [0, -22, 0], scale: [1, 1.08, 1] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
