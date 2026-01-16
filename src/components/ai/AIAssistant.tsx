import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Bot, User, Send, Sparkles, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

interface ToolResult {
  tool: string;
  result: {
    success: boolean;
    message?: string;
    [key: string]: any;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolResults?: ToolResult[];
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
  add_contact_historique: 'Ajout historique'
};

export function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Bonjour ! Je suis votre assistant IA et je peux maintenant **exécuter des actions** dans votre CRM.\n\n🎯 **Ce que je peux faire :**\n• Créer et rechercher des contacts\n• Planifier des sessions et inscrire des stagiaires\n• Créer des factures et enregistrer des paiements\n• Envoyer des emails\n• Créer des rappels et notifications\n\nDites-moi ce que vous souhaitez faire !",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { label: '📊 Voir les stats', prompt: 'Montre-moi les statistiques du mois en cours' },
    { label: '➕ Créer un contact', prompt: 'Je veux créer un nouveau contact' },
    { label: '📅 Sessions à venir', prompt: 'Liste les prochaines sessions de formation planifiées' },
    { label: '💳 Factures en attente', prompt: 'Quelles sont les factures en attente de paiement ?' },
    { label: '📧 Envoyer un email', prompt: 'Je veux envoyer un email à un contact' },
  ];

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: messageText,
          action: 'agent',
          userId: user?.id,
          conversationHistory
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        toolResults: data.toolResults
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show toast for executed actions
      if (data.toolResults && data.toolResults.length > 0) {
        const successCount = data.toolResults.filter((r: ToolResult) => r.result.success).length;
        if (successCount > 0) {
          toast.success(`${successCount} action(s) exécutée(s) avec succès`);
        }
      }
    } catch (error: any) {
      console.error('AI Assistant error:', error);
      toast.error(error.message || 'Erreur de communication avec l\'assistant');
      
      const errorMessage: Message = {
        role: 'assistant',
        content: "Désolé, une erreur s'est produite. Veuillez réessayer dans quelques instants.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const renderToolResults = (toolResults: ToolResult[]) => {
    return (
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
            {tr.result.success ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            <span className="font-medium">{TOOL_LABELS[tr.tool] || tr.tool}</span>
            {tr.result.message && (
              <span className="text-muted-foreground">- {tr.result.message}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-full border-0 shadow-none">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Assistant IA Agent
              <Badge variant="secondary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Actions CRM
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Exécute des tâches dans votre CRM
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Quick actions */}
        <div className="p-3 border-b bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">Actions rapides :</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((qa, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => sendMessage(qa.prompt)}
                disabled={isLoading}
              >
                {qa.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div
                  className={`rounded-lg px-4 py-3 max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.toolResults && msg.toolResults.length > 0 && renderToolResults(msg.toolResults)}
                  
                  <span className="text-xs opacity-70 mt-1 block">
                    {msg.timestamp.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-lg px-4 py-3 bg-muted flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Exécution en cours...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ex: Crée un contact Jean Dupont avec l'email jean@example.com"
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
