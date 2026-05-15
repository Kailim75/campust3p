import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Result =
  | { kind: "success"; status: "recorded" | "already_recorded"; data: any }
  | { kind: "needs_facture"; data: any }
  | { kind: "error"; message: string; detail?: any };

export function AlmaReconciliationPage() {
  const [paymentId, setPaymentId] = useState("");
  const [factureId, setFactureId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const queryClient = useQueryClient();

  const submit = async (overrideFacture?: string) => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("alma-reconcile", {
        body: {
          payment_id: paymentId.trim(),
          facture_id: (overrideFacture ?? factureId).trim() || undefined,
        },
      });
      if (error) {
        // Edge runtime returns non-2xx as `error`; the body is in error.context if available.
        const ctx: any = (error as any).context;
        let parsed: any = null;
        try {
          parsed = ctx ? await ctx.json() : null;
        } catch {
          /* ignore */
        }
        if (parsed?.payment_summary) {
          setResult({ kind: "needs_facture", data: parsed });
        } else {
          setResult({ kind: "error", message: parsed?.error || error.message, detail: parsed });
        }
        return;
      }
      if (data?.status === "recorded" || data?.status === "already_recorded") {
        setResult({ kind: "success", status: data.status, data });
        toast.success(
          data.status === "recorded"
            ? "Paiement Alma rattaché à la facture"
            : "Paiement déjà enregistré (idempotent)",
        );
        queryClient.invalidateQueries({ queryKey: ["paiements"] });
        queryClient.invalidateQueries({ queryKey: ["factures"] });
        queryClient.invalidateQueries({ queryKey: ["session_financials"] });
      } else {
        setResult({ kind: "error", message: data?.error || "Réponse inattendue", detail: data });
      }
    } catch (e: any) {
      setResult({ kind: "error", message: e?.message ?? "Erreur inconnue" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" />
            Réconciliation paiement Alma
          </CardTitle>
          <CardDescription>
            Collez l'ID du paiement Alma (ou l'URL complète depuis le dashboard Alma) pour
            l'affecter automatiquement à la facture associée. La référence
            <code className="mx-1 px-1 py-0.5 rounded bg-muted">ALMA-&lt;id&gt;</code>
            empêche tout doublon si le webhook se déclenche ensuite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alma-payment-id">ID paiement Alma</Label>
            <Input
              id="alma-payment-id"
              placeholder="payment_xxxxxxxxxxxxxxxxxxx"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Visible dans l'email Alma ("suivez ce lien") ou dans le dashboard Alma.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="facture-id">
              ID facture <span className="text-muted-foreground">(optionnel — utilisé si Alma n'a pas le facture_id en custom_data)</span>
            </Label>
            <Input
              id="facture-id"
              placeholder="UUID de la facture"
              value={factureId}
              onChange={(e) => setFactureId(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <Button
            onClick={() => submit()}
            disabled={loading || !paymentId.trim()}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vérification auprès d'Alma…
              </>
            ) : (
              "Récupérer et affecter"
            )}
          </Button>
        </CardContent>
      </Card>

      {result?.kind === "success" && (
        <Alert className="border-emerald-500/40 bg-emerald-500/5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>
            {result.status === "recorded"
              ? "Paiement enregistré ✅"
              : "Paiement déjà présent (rien à faire)"}
          </AlertTitle>
          <AlertDescription className="space-y-1 mt-2 text-sm">
            <div>
              <strong>Facture :</strong> {result.data.facture?.numero_facture} —{" "}
              {result.data.facture?.contacts?.prenom} {result.data.facture?.contacts?.nom}
            </div>
            <div>
              <strong>Montant :</strong> {Number(result.data.montant).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
            </div>
            <div>
              <strong>Référence :</strong> <code>{result.data.reference}</code>
            </div>
            {result.data.payment_state && (
              <div>
                <strong>État Alma :</strong> {result.data.payment_state} ({result.data.installments_count}x)
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {result?.kind === "needs_facture" && (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Aucune facture liée dans le paiement Alma</AlertTitle>
          <AlertDescription className="space-y-2 mt-2 text-sm">
            <p>
              Le paiement Alma n'a pas de <code>facture_id</code> dans <code>custom_data</code>.
              Renseignez l'ID facture ci-dessus et relancez.
            </p>
            <div className="rounded-md border border-border bg-background p-3 space-y-1 text-xs">
              <div><strong>Client Alma :</strong> {result.data.payment_summary?.customer?.first_name} {result.data.payment_summary?.customer?.last_name} ({result.data.payment_summary?.customer?.email})</div>
              <div><strong>Montant :</strong> {((result.data.payment_summary?.purchase_amount ?? 0) / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</div>
              <div><strong>État :</strong> {result.data.payment_summary?.state} ({result.data.payment_summary?.installments_count}x)</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {result?.kind === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription className="space-y-1 mt-2 text-sm">
            <div>{result.message}</div>
            {result.detail?.alma_status && (
              <div className="text-xs opacity-80">Alma HTTP {result.detail.alma_status}</div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
