import { motion } from "framer-motion";

/**
 * Branded loading screen for the CRM — replaces generic spinners.
 * Shows the T3P logo with a pulse animation.
 */
export function BrandedLoader({ message = "Chargement..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Animated logo */}
        <motion.div
          animate={{ 
            boxShadow: [
              "0 0 0 0 hsl(199 55% 26% / 0.2)",
              "0 0 0 12px hsl(199 55% 26% / 0)",
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          className="flex items-center justify-center bg-primary rounded-2xl"
          style={{ width: 56, height: 56 }}
        >
          <span className="text-primary-foreground font-bold text-lg tracking-tight">T3</span>
        </motion.div>

        {/* Brand name */}
        <div className="text-center">
          <p className="text-foreground font-display font-bold text-base tracking-tight">T3P Campus</p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-sm mt-1"
          >
            {message}
          </motion.p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary/40"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Inline skeleton loader for content areas — branded with warm tones.
 */
export function BrandedSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="shimmer rounded-lg"
          style={{ 
            height: 14,
            width: `${85 - i * 15}%`,
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}
