import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// L'assistant (et ses dépendances) n'est chargé qu'à l'ouverture du dialogue :
// le bouton flottant est monté sur toutes les pages (audit 13/08, perf P2).
const AIAssistant = lazy(() => import('./AIAssistant').then((m) => ({ default: m.AIAssistant })));

export function AIAssistantFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-105 transition-transform"
        size="icon"
        aria-label="Ouvrir l'assistant IA"
      >
        <Bot className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl h-[80vh] max-h-[700px] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Assistant IA</DialogTitle>
          </DialogHeader>
          {open && (
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Chargement de l'assistant" />
                </div>
              }
            >
              <AIAssistant />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
