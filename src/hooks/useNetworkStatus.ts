import { useState, useEffect, useCallback } from "react";

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number;
  rtt?: number;
}

interface NetworkInformation {
  effectiveType: "slow-2g" | "2g" | "3g" | "4g";
  downlink: number;
  rtt: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    wasOffline: false,
  });

  const updateNetworkInfo = useCallback(() => {
    const connection = (navigator as any).connection as NetworkInformation | undefined;
    
    setStatus((prev) => ({
      ...prev,
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    }));
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: true,
      }));
      updateNetworkInfo();
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
        wasOffline: true,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for connection changes (if supported)
    const connection = (navigator as any).connection as NetworkInformation | undefined;
    if (connection) {
      connection.addEventListener("change", updateNetworkInfo);
    }

    // Initial update
    updateNetworkInfo();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", updateNetworkInfo);
      }
    };
  }, [updateNetworkInfo]);

  return status;
}

// Hook to queue actions when offline
interface QueuedAction {
  id: string;
  action: () => Promise<void>;
  description: string;
  timestamp: number;
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const { isOnline } = useNetworkStatus();

  const addToQueue = useCallback((action: () => Promise<void>, description: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setQueue((prev) => [...prev, { id, action, description, timestamp: Date.now() }]);
    return id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Process queue when back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      const processQueue = async () => {
        for (const item of queue) {
          try {
            await item.action();
            removeFromQueue(item.id);
          } catch (error) {
            console.error(`Failed to process queued action: ${item.description}`, error);
          }
        }
      };

      processQueue();
    }
  }, [isOnline, queue, removeFromQueue]);

  return {
    queue,
    addToQueue,
    removeFromQueue,
    queueLength: queue.length,
  };
}
