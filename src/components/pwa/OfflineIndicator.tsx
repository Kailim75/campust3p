import { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        toast.success("Connexion rétablie", {
          description: "Synchronisation des données en cours...",
          icon: <Wifi className="h-4 w-4" />,
        });
        // Hide reconnected message after 3 seconds
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast.warning("Mode hors-ligne", {
        description: "Certaines fonctionnalités sont limitées.",
        icon: <WifiOff className="h-4 w-4" />,
        duration: 5000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  // Don't show anything if online and never was offline
  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 transition-all duration-300 animate-in slide-in-from-bottom-4",
        showReconnected && "animate-out slide-out-to-bottom-4"
      )}
    >
      <Badge
        variant={isOnline ? "default" : "destructive"}
        className={cn(
          "px-3 py-2 text-sm font-medium shadow-lg flex items-center gap-2",
          isOnline ? "bg-success text-success-foreground" : "bg-destructive"
        )}
      >
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            Reconnecté
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            Hors-ligne
          </>
        )}
      </Badge>
    </div>
  );
}
