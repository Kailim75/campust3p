import { useState, useCallback } from "react";
import { toast } from "sonner";

interface UseScannerOptions {
  onScanComplete?: (file: File) => void;
  maxSizeMB?: number;
}

export function useDocumentScanner(options: UseScannerOptions = {}) {
  const { onScanComplete, maxSizeMB = 10 } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  // Check if camera is supported
  const checkSupport = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setIsSupported(false);
      return false;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some((device) => device.kind === "videoinput");
      setIsSupported(hasCamera);
      return hasCamera;
    } catch {
      setIsSupported(false);
      return false;
    }
  }, []);

  const openScanner = useCallback(async () => {
    const supported = await checkSupport();
    
    if (!supported) {
      toast.error("Scanner non disponible", {
        description: "Votre appareil ne dispose pas de caméra ou l'accès n'est pas autorisé",
      });
      return;
    }

    setIsOpen(true);
  }, [checkSupport]);

  const closeScanner = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleCapture = useCallback((file: File) => {
    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      toast.error(`Fichier trop volumineux (max ${maxSizeMB}MB)`);
      return;
    }

    onScanComplete?.(file);
  }, [maxSizeMB, onScanComplete]);

  return {
    isOpen,
    isSupported,
    openScanner,
    closeScanner,
    handleCapture,
    setIsOpen,
  };
}
