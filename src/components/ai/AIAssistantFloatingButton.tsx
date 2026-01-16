import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AIAssistant } from './AIAssistant';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

export function AIAssistantFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-105 transition-transform"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl h-[80vh] max-h-[700px] p-0 flex flex-col overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Assistant IA</DialogTitle>
          </VisuallyHidden>
          <AIAssistant />
        </DialogContent>
      </Dialog>
    </>
  );
}
