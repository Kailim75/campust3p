import { Camera, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentScanner } from "./DocumentScanner";
import { useDocumentScanner } from "@/hooks/useDocumentScanner";
import { cn } from "@/lib/utils";

interface ScanDocumentButtonProps {
  onScan: (file: File) => void;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
  showIcon?: boolean;
}

export function ScanDocumentButton({
  onScan,
  variant = "outline",
  size = "default",
  className,
  label = "Scanner",
  showIcon = true,
}: ScanDocumentButtonProps) {
  const { isOpen, openScanner, setIsOpen, handleCapture } = useDocumentScanner({
    onScanComplete: onScan,
  });

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={openScanner}
        className={cn("gap-2", className)}
      >
        {showIcon && <Scan className="h-4 w-4" />}
        {label}
      </Button>

      <DocumentScanner
        open={isOpen}
        onOpenChange={setIsOpen}
        onCapture={handleCapture}
      />
    </>
  );
}
