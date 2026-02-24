import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, RefreshCw, Loader2, Sparkles, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const ANALYSIS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-analysis`;

export function CRMAnalysisTab() {
  const [analysis, setAnalysis] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const runAnalysis = useCallback(async () => {
    if (isLoading) {
      abortRef.current?.abort();
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setAnalysis("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(ANALYSIS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ analysisType: "full" }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erreur inconnue" }));
        if (resp.status === 429) {
          toast({ title: "Limite atteinte", description: "Réessayez dans quelques instants.", variant: "destructive" });
        } else if (resp.status === 402) {
          toast({ title: "Crédits insuffisants", description: "Rechargez vos crédits IA.", variant: "destructive" });
        } else {
          toast({ title: "Erreur", description: err.error || "Erreur lors de l'analyse", variant: "destructive" });
        }
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAnalysis(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Flush remaining
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAnalysis(fullText);
            }
          } catch {}
        }
      }

      setLastAnalysis(new Date());
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("Analysis error:", e);
        toast({ title: "Erreur", description: "Impossible de lancer l'analyse", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, toast]);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-display">Agent IA — Analyse CRM</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Détection d'anomalies, relances et recommandations en temps réel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastAnalysis && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Dernière: {lastAnalysis.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </Badge>
              )}
              <Button onClick={runAnalysis} size="sm" className="gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Arrêter
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Lancer l'analyse
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Analysis Result */}
      {analysis ? (
        <Card>
          <CardContent className="pt-6">
            <ScrollArea className="max-h-[600px]">
              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-h2:text-base prose-h3:text-sm prose-p:text-sm prose-li:text-sm">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : !isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldAlert className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-display font-semibold text-foreground mb-2">
              Aucune analyse en cours
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Lancez l'agent IA pour scanner vos données CRM et détecter automatiquement
              les anomalies, retards de paiement, relances oubliées et opportunités.
            </p>
            <Button onClick={runAnalysis} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Analyser maintenant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Analyse en cours de vos données CRM...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
