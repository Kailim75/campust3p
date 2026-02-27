import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WorkflowAction } from '@/hooks/useWorkflows';

interface AIWorkflowResult {
  nom: string;
  description: string;
  trigger_type: string;
  actions: WorkflowAction[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (result: AIWorkflowResult) => void;
}

const SUGGESTIONS = [
  "Envoyer un email de bienvenue quand un nouveau contact s'inscrit, puis ajouter une note dans l'historique",
  "Relancer automatiquement les factures impayées après 7 jours avec un email professionnel",
  "Envoyer un rappel la veille d'une session avec les documents à apporter",
  "Confirmer un paiement par email et notifier l'équipe administrative",
  "Envoyer une enquête de satisfaction après la fin d'une session de formation",
  "Alerter l'équipe quand un document administratif expire et créer une tâche de suivi",
];

export function WorkflowAIDialog({ open, onOpenChange, onResult }: Props) {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Décrivez le workflow que vous souhaitez créer');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-workflow-ai', {
        body: {
          mode: 'suggest_workflow',
          context: { description: description.trim() }
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const result = data.result as AIWorkflowResult;
      if (result?.nom && result?.trigger_type && result?.actions?.length) {
        onResult(result);
        onOpenChange(false);
        setDescription('');
        toast.success('Workflow généré par l\'IA — vérifiez et ajustez avant de sauvegarder');
      } else {
        throw new Error('Résultat incomplet');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Créer un workflow avec l'IA
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Décrivez en langage naturel ce que vous souhaitez automatiser. L'IA concevra le workflow complet.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs font-medium">Décrivez votre automatisation</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Quand un nouveau contact s'inscrit, envoyer un email de bienvenue personnalisé et notifier l'équipe..."
              rows={4}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">💡 Suggestions</Label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="text-[11px] text-left px-2.5 py-1.5 rounded-md border bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  onClick={() => setDescription(s)}
                >
                  {s.length > 60 ? s.slice(0, 60) + '...' : s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !description.trim()}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {isGenerating ? 'Génération en cours...' : 'Générer le workflow'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
