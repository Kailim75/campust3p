import { AnimatePresence, motion } from "framer-motion";
import { useShortcutSequence } from "@/hooks/useShortcutSequence";
import { Kbd } from "@/components/ui/kbd";

/**
 * Discrete indicator (bottom-right) shown when a key-sequence prefix is active.
 * Example: after pressing "G", shows "G… en attente" until next key or timeout.
 */
export function ShortcutSequenceIndicator() {
  const prefix = useShortcutSequence((s) => s.prefix);

  return (
    <AnimatePresence>
      {prefix && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.12 }}
          className="fixed bottom-6 right-6 z-50 pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground text-background shadow-lg text-xs">
            <Kbd className="bg-background/20 text-background border-background/30">
              {prefix.toUpperCase()}
            </Kbd>
            <span className="opacity-80">en attente…</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
