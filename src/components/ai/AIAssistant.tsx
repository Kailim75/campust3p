import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, Send, Zap, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { AIProgressIndicator, ProgressStep } from './AIProgressIndicator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ToolResult {
  tool: string;
  result: {
    success: boolean;
    message?: string;
    [key: string]: any;
  };
}

interface PendingConfirmation {
  tool: string;
  params: any;
  tool_call_id: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolResults?: ToolResult[];
  pendingConfirmations?: PendingConfirmation[];
}

const TOOL_LABELS: Record<string, string> = {
  create_contact: 'Création contact',
  search_contacts: 'Recherche contacts',
  update_contact: 'Mise à jour contact',
  list_sessions: 'Liste sessions',
  create_session: 'Création session',
  enroll_contact_to_session: 'Inscription session',
  list_factures: 'Liste factures',
  create_facture: 'Création facture',
  register_payment: 'Enregistrement paiement',
  send_email: 'Envoi email',
  create_notification: 'Création notification',
  get_dashboard_stats: 'Statistiques',
  add_contact_historique: 'Ajout historique',
};

const TOOL_DESCRIPTIONS: Record<string, (params: any) => string> = {
  create_facture: (p) => `Créer une facture de ${p.montant_total}€ pour le contact`,
  register_payment: (p) => `Enregistrer un paiement de ${p.montant}€ (${p.mode_paiement})`,
  update_contact: (p) => `Modifier le contact: ${Object.keys(p.updates || {}).join(', ')}`,
  create_session: (p) => `Créer la session "${p.nom}" (${p.formation_type}) du ${p.date_debut} au ${p.date_fin}`,
  enroll_contact_to_session: () => `Inscrire l'apprenant à la session`,
  send_email: (p) => `Envoyer l'email "${p.subject}"`,
};

export function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Bonjour ! Je suis votre assistant IA. Je peux créer des apprenants, planifier des sessions, gérer la facturation et envoyer des emails. Que puis-je faire pour vous ?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [progressStep, setProgressStep] = useState<ProgressStep>('idle');
  const [currentTool, setCurrentTool] = useState<string | undefined>();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    pending: PendingConfirmation[];
    originalMessage: string;
  }>({ open: false, pending: [], originalMessage: '' });
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { label: '📊 Stats', prompt: 'Statistiques du mois' },
    { label: '➕ Apprenant', prompt: 'Créer un apprenant' },
    { label: '📅 Sessions', prompt: 'Prochaines sessions' },
    { label: '💳 Factures', prompt: 'Factures en attente' },
  ];

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (messageText: string, confirmedActions?: string[]) => {
    if (!messageText.trim() || progressStep !== 'idle') return;

    if (!confirmedActions) {
      const userMessage: Message = {
        role: 'user',
        content: messageText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
    }
    
    setInput('');
    setProgressStep('sending');
    setCurrentTool(undefined);

    try {
      // Immediate progression - no artificial delays
      setProgressStep('analyzing');
      
      // Only keep last 4 messages for faster context
      const conversationHistory = messages.slice(-4).map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: messageText,
          action: 'agent',
          userId: user?.id,
          conversationHistory,
          confirmedActions
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue');
      }

      // Show executing step if there are tool results - no delays
      if (data.toolResults && data.toolResults.length > 0) {
        setCurrentTool(data.toolResults[0]?.tool);
      }

      setProgressStep('done');

      if (data.pendingConfirmations && data.pendingConfirmations.length > 0) {
        setConfirmDialog({
          open: true,
          pending: data.pendingConfirmations,
          originalMessage: messageText
        });
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response + "\n\n⚠️ **Actions en attente de confirmation...**",
          timestamp: new Date(),
          toolResults: data.toolResults,
          pendingConfirmations: data.pendingConfirmations
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          toolResults: data.toolResults
        };
        setMessages(prev => [...prev, assistantMessage]);

        if (data.toolResults && data.toolResults.length > 0) {
          const successCount = data.toolResults.filter((r: ToolResult) => r.result.success).length;
          if (successCount > 0) {
            toast.success(`${successCount} action(s) exécutée(s)`);
          }
        }
      }

      // Reset immediately
      setTimeout(() => setProgressStep('idle'), 200);
      
    } catch (error: any) {
      console.error('AI Assistant error:', error);
      toast.error(error.message || 'Erreur de communication');
      
      const errorMessage: Message = {
        role: 'assistant',
        content: "Désolé, une erreur s'est produite. Réessayez.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setProgressStep('idle');
    }
  };

  const handleConfirmActions = async () => {
    const confirmedTools = confirmDialog.pending.map(p => p.tool);
    setConfirmDialog({ open: false, pending: [], originalMessage: '' });
    
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0) {
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.content.includes('Actions en attente de confirmation')) {
          lastMsg.content = lastMsg.content.replace("\n\n⚠️ **Actions en attente de confirmation...**", "\n\n✅ **Exécution en cours...**");
        }
      }
      return newMessages;
    });
    
    await sendMessage(confirmDialog.originalMessage, confirmedTools);
  };

  const handleCancelActions = () => {
    setConfirmDialog({ open: false, pending: [], originalMessage: '' });
    
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0) {
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.content.includes('Actions en attente de confirmation')) {
          lastMsg.content = lastMsg.content.replace("\n\n⚠️ **Actions en attente de confirmation...**", "\n\n❌ **Annulé**");
        }
      }
      return newMessages;
    });
    
    toast.info('Actions annulées');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const renderToolResults = (toolResults: ToolResult[]) => (
    <div className="mt-2 space-y-1">
      {toolResults.map((tr, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
            tr.result.success 
              ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
              : 'bg-red-500/10 text-red-700 dark:text-red-400'
          }`}
        >
          {tr.result.success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          <span className="font-medium">{TOOL_LABELS[tr.tool] || tr.tool}</span>
          {tr.result.message && <span className="text-muted-foreground truncate">- {tr.result.message}</span>}
        </div>
      ))}
    </div>
  );

  const renderPendingConfirmations = (pending: PendingConfirmation[]) => (
    <div className="mt-2 space-y-1">
      {pending.map((p, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-3 w-3" />
          <span className="font-medium">{TOOL_LABELS[p.tool] || p.tool}</span>
          <span className="text-muted-foreground">- En attente</span>
        </div>
      ))}
    </div>
  );

  const isLoading = progressStep !== 'idle';

  return (
    <>
      <Card className="flex flex-col h-full border-0 shadow-none">
        <CardHeader className="pb-2 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                Assistant IA
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                  Rapide
                </Badge>
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Quick actions */}
          <div className="p-2 border-b bg-muted/30">
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map((qa, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => sendMessage(qa.prompt)}
                  disabled={isLoading}
                >
                  {qa.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-3">
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  
                  <div className={`rounded-lg px-3 py-2 max-w-[85%] ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.toolResults && msg.toolResults.length > 0 && renderToolResults(msg.toolResults)}
                    {msg.pendingConfirmations && msg.pendingConfirmations.length > 0 && renderPendingConfirmations(msg.pendingConfirmations)}
                    <span className="text-[10px] opacity-60 mt-1 block">
                      {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {msg.role === 'user' && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <AIProgressIndicator step={progressStep} currentTool={currentTool} />
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ex: Créer un contact Jean Dupont"
                disabled={isLoading}
                className="flex-1 h-9 text-sm"
              />
              <Button type="submit" disabled={isLoading || !input.trim()} size="sm" className="h-9 w-9 p-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && handleCancelActions()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirmation requise
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Actions en attente :</p>
                <div className="space-y-2">
                  {confirmDialog.pending.map((p, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                      <Badge variant="outline" className="shrink-0">{TOOL_LABELS[p.tool] || p.tool}</Badge>
                      <span className="text-sm">{TOOL_DESCRIPTIONS[p.tool]?.(p.params) || JSON.stringify(p.params)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelActions}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmActions}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
