import { useState, useRef, useCallback } from "react";
import { Camera, X, Check, RotateCcw, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocumentScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
  title?: string;
}

export function DocumentScanner({
  open,
  onOpenChange,
  onCapture,
  title = "Scanner un document",
}: DocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setStream(mediaStream);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Impossible d'accéder à la caméra", {
        description: "Vérifiez les permissions de votre navigateur",
      });
    } finally {
      setIsLoading(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, [stopCamera]);

  // Start camera when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
    }
    onOpenChange(isOpen);
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply document enhancement filter
    applyDocumentFilter(context, canvas.width, canvas.height);

    // Get image data URL
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageDataUrl);
  }, []);

  const applyDocumentFilter = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Increase contrast and brightness for document readability
    const contrast = 1.3;
    const brightness = 10;

    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast and brightness
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness));
    }

    context.putImageData(imageData, 0, 0);
  };

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
  }, []);

  const confirmCapture = useCallback(async () => {
    if (!capturedImage || !canvasRef.current) return;

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Create file from blob
      const fileName = `scan_${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
      const file = new File([blob], fileName, { type: "image/jpeg" });

      onCapture(file);
      handleOpenChange(false);
      toast.success("Document scanné avec succès");
    } catch (error) {
      console.error("Error creating file:", error);
      toast.error("Erreur lors de la création du fichier");
    }
  }, [capturedImage, onCapture]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[3/4] bg-black">
          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} className="hidden" />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {!capturedImage ? (
            <>
              {/* Live camera preview */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Scanning overlay guide */}
              <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-lg pointer-events-none">
                <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
              </div>

              {/* Camera controls */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-white/20 backdrop-blur hover:bg-white/30"
                  onClick={switchCamera}
                >
                  <RotateCcw className="h-5 w-5 text-white" />
                </Button>

                <Button
                  size="icon"
                  className="h-16 w-16 rounded-full bg-white hover:bg-white/90"
                  onClick={capturePhoto}
                  disabled={!stream}
                >
                  <Camera className="h-8 w-8 text-black" />
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-white/20 backdrop-blur hover:bg-white/30"
                  onClick={() => handleOpenChange(false)}
                >
                  <X className="h-5 w-5 text-white" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Captured image preview */}
              <img
                src={capturedImage}
                alt="Captured document"
                className="w-full h-full object-cover"
              />

              {/* Confirmation controls */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-14 w-14 rounded-full bg-white/20 backdrop-blur hover:bg-white/30"
                  onClick={retakePhoto}
                >
                  <RotateCcw className="h-6 w-6 text-white" />
                </Button>

                <Button
                  size="icon"
                  className="h-16 w-16 rounded-full bg-success hover:bg-success/90"
                  onClick={confirmCapture}
                >
                  <Check className="h-8 w-8 text-white" />
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="p-4 text-center text-sm text-muted-foreground">
          Placez le document dans le cadre et prenez une photo
        </div>
      </DialogContent>
    </Dialog>
  );
}
