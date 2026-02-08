import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, AlertCircle, Download } from "lucide-react";

interface PDFViewerProps {
  pdfData: string | Blob | ArrayBuffer | null;
  className?: string;
  onDownload?: () => void;
}

/**
 * Composant de visualisation PDF utilisant un canvas
 * Contourne les restrictions de Chrome sur les blobs dans les iframes
 */
export function PDFViewer({ pdfData, className, onDownload }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  // Load PDF.js dynamically
  const loadPdfJs = useCallback(async () => {
    if ((window as any).pdfjsLib) {
      return (window as any).pdfjsLib;
    }

    // Load PDF.js from CDN
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }, []);

  // Render a specific page
  const renderPage = useCallback(async (pdf: any, pageNumber: number) => {
    if (!canvasRef.current || !containerRef.current) return;

    try {
      const page = await pdf.getPage(pageNumber);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Calculate scale based on container width
      const containerWidth = containerRef.current.clientWidth - 32; // padding
      const viewport = page.getViewport({ scale: 1 });
      const autoScale = containerWidth / viewport.width;
      const finalScale = autoScale * scale;

      const scaledViewport = page.getViewport({ scale: finalScale });

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      await page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
      }).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Erreur lors du rendu de la page');
    }
  }, [scale]);

  // Load PDF when data changes
  useEffect(() => {
    if (!pdfData) {
      setPdfDoc(null);
      setNumPages(0);
      setPageNum(1);
      return;
    }

    let cancelled = false;

    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const pdfjsLib = await loadPdfJs();

        let loadingTask;

        if (typeof pdfData === 'string') {
          if (pdfData.startsWith('blob:')) {
            // Fetch blob URL and convert to ArrayBuffer
            const response = await fetch(pdfData);
            const arrayBuffer = await response.arrayBuffer();
            loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          } else if (pdfData.startsWith('data:')) {
            // Base64 data URL
            const base64 = pdfData.split(',')[1];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            loadingTask = pdfjsLib.getDocument({ data: bytes });
          } else {
            loadingTask = pdfjsLib.getDocument(pdfData);
          }
        } else if (pdfData instanceof Blob) {
          const arrayBuffer = await pdfData.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        } else if (pdfData instanceof ArrayBuffer) {
          loadingTask = pdfjsLib.getDocument({ data: pdfData });
        } else {
          throw new Error('Format PDF non supporté');
        }

        const pdf = await loadingTask.promise;

        if (cancelled) return;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setPageNum(1);
        await renderPage(pdf, 1);
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (!cancelled) {
          setError('Impossible de charger le PDF');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfData, loadPdfJs]);

  // Re-render when page or scale changes
  useEffect(() => {
    if (pdfDoc && pageNum > 0) {
      renderPage(pdfDoc, pageNum);
    }
  }, [pdfDoc, pageNum, scale, renderPage]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc && pageNum > 0) {
        renderPage(pdfDoc, pageNum);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, pageNum, renderPage]);

  const goToPrevPage = () => {
    if (pageNum > 1) {
      setPageNum(pageNum - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNum < numPages) {
      setPageNum(pageNum + 1);
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted/50 ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Chargement du PDF...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted/50 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!pdfData) {
    return (
      <div className={`flex items-center justify-center bg-muted/50 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <span className="text-sm">Aucun document à afficher</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`} ref={containerRef}>
      {/* Toolbar */}
      {numPages > 0 && (
        <div className="flex items-center justify-between p-2 bg-background border-b gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevPage}
              disabled={pageNum <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              {pageNum} / {numPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNum >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2 min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={zoomIn} disabled={scale >= 3}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            {onDownload && (
              <Button variant="ghost" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Canvas container */}
      <div className="flex-1 overflow-auto bg-muted/30 flex justify-center p-4">
        <canvas
          ref={canvasRef}
          className="shadow-lg bg-white"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );
}
