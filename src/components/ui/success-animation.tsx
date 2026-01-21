import { cn } from "@/lib/utils";
import { CheckCircle2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SuccessAnimationProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
}

export function SuccessAnimation({ show, message = "Succès !", onComplete }: SuccessAnimationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={() => {
            if (onComplete) {
              setTimeout(onComplete, 1500);
            }
          }}
          className="fixed inset-0 flex items-center justify-center z-50 bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              transition: { 
                type: "spring",
                stiffness: 300,
                damping: 20
              }
            }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Animated circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ 
                scale: 1,
                transition: { delay: 0.1, type: "spring", stiffness: 200 }
              }}
              className="relative"
            >
              {/* Sparkles around */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.2, 0.5],
                  rotate: [0, 180, 360],
                }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute -inset-4"
              >
                <Sparkles className="absolute top-0 left-0 h-4 w-4 text-warning" />
                <Sparkles className="absolute top-0 right-0 h-3 w-3 text-success" />
                <Sparkles className="absolute bottom-0 left-2 h-3 w-3 text-primary" />
                <Sparkles className="absolute bottom-0 right-0 h-4 w-4 text-info" />
              </motion.div>
              
              {/* Main checkmark */}
              <div className="p-6 rounded-full bg-success/20">
                <motion.div
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <CheckCircle2 className="h-16 w-16 text-success" />
                </motion.div>
              </div>
            </motion.div>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl font-display font-semibold text-foreground"
            >
              {message}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for easy usage
import { useState, useCallback } from "react";

export function useSuccessAnimation() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("Succès !");

  const trigger = useCallback((msg?: string) => {
    if (msg) setMessage(msg);
    setShow(true);
    setTimeout(() => setShow(false), 2000);
  }, []);

  return { show, message, trigger, setShow };
}
