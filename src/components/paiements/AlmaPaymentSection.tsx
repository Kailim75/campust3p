import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, ExternalLink, Mail, Check, AlertCircle } from "lucide-react";
import { useAlmaEligibility, useAlmaCreatePayment } from "@/hooks/useAlma";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AlmaPaymentSectionProps {
  factureId: string;
  montantRestant: number;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone?: string;
  numeroFacture: string;
}

export function AlmaPaymentSection({
  factureId,
  montantRestant,
  customerFirstName,
  customerLastName,
  customerEmail,
  customerPhone,
  numeroFacture,
}: AlmaPaymentSectionProps) {
  const [almaUrl, setAlmaUrl] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);

  const { data: eligibility, isLoading: checkingEligibility } = useAlmaEligibility(
    montantRestant > 0 ? montantRestant : null
  );

  const createPayment = useAlmaCreatePayment();

  const isEligible = eligibility?.some((e) => e.eligible) ?? false;
  const eligiblePlans = eligibility?.filter((e) => e.eligible) ?? [];

  const handleCreateAlmaPayment = async (installments: number) => {
    try {
      const baseUrl = window.location.origin;
      const result = await createPayment.mutateAsync({
        amount: Math.round(montantRestant * 100),
        installments,
        return_url: `${baseUrl}/?alma_success=true&facture=${factureId}`,
        cancel_url: `${baseUrl}/?alma_cancel=true&facture=${factureId}`,
        customer: {
          first_name: customerFirstName,
          last_name: customerLastName,
          email: customerEmail,
          phone: customerPhone,
        },
        custom_data: {
          facture_id: factureId,
          numero_facture: numeroFacture,
        },
      });

      setAlmaUrl(result.url);
      toast.success(`Lien de paiement Alma ${installments}x créé`);
    } catch (error: any) {
      console.error("Alma create payment error:", error);
      toast.error(error.message || "Erreur lors de la création du paiement Alma");
    }
  };

  const handleSendAlmaLink = async () => {
    if (!almaUrl || !customerEmail) return;
    setIsSendingLink(true);
    try {
      const { error } = await supabase.functions.invoke("send-automated-emails", {
        body: {
          type: "document_envoi",
          to: customerEmail,
          recipientName: `${customerFirstName} ${customerLastName}`,
          subject: `Paiement en plusieurs fois - Facture ${numeroFacture}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">💳 Paiement en plusieurs fois</h2>
              <p>Bonjour ${customerFirstName},</p>
              <p>Vous pouvez régler votre facture <strong>${numeroFacture}</strong> en plusieurs fois via Alma.</p>
              <p><strong>Montant :</strong> ${montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${almaUrl}" style="background-color: #FA5022; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Payer en plusieurs fois
                </a>
              </div>
              <p style="color: #666; font-size: 13px;">Ce lien est sécurisé et vous redirigera vers la plateforme Alma pour finaliser votre paiement.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #888; font-size: 12px;">
                Ecole T3P Montrouge - Centre de formation Taxi, VTC et VMDTR<br>
                📧 montrouge@ecolet3p.fr
              </p>
            </div>
          `,
        },
      });

      if (error) throw error;
      toast.success(`Lien de paiement envoyé à ${customerEmail}`);
    } catch (err: any) {
      console.error("Erreur envoi lien Alma:", err);
      toast.error(err.message || "Erreur lors de l'envoi du lien");
    } finally {
      setIsSendingLink(false);
    }
  };

  if (montantRestant <= 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-[#FA5022]" />
        <h4 className="font-semibold text-sm">Paiement Alma</h4>
        {checkingEligibility && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {!checkingEligibility && isEligible && (
          <Badge className="bg-[#FA5022]/10 text-[#FA5022] text-[10px]">
            <Check className="h-3 w-3 mr-0.5" /> Éligible
          </Badge>
        )}
        {!checkingEligibility && eligibility && !isEligible && (
          <Badge variant="secondary" className="text-[10px]">
            <AlertCircle className="h-3 w-3 mr-0.5" /> Non éligible
          </Badge>
        )}
      </div>

      {isEligible && !almaUrl && (
        <div className="flex gap-2">
          {eligiblePlans.map((plan) => (
            <Button
              key={plan.installments_count}
              variant="outline"
              size="sm"
              className="flex-1 border-[#FA5022]/30 hover:bg-[#FA5022]/5 hover:border-[#FA5022]"
              onClick={() => handleCreateAlmaPayment(plan.installments_count)}
              disabled={createPayment.isPending}
            >
              {createPayment.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CreditCard className="h-3 w-3 mr-1 text-[#FA5022]" />
              )}
              Payer en {plan.installments_count}x
            </Button>
          ))}
        </div>
      )}

      {almaUrl && (
        <div className="space-y-2 p-3 rounded-lg bg-[#FA5022]/5 border border-[#FA5022]/20">
          <p className="text-xs text-muted-foreground">Lien de paiement généré :</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(almaUrl, "_blank")}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ouvrir
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                navigator.clipboard.writeText(almaUrl);
                toast.success("Lien copié");
              }}
            >
              Copier
            </Button>
            {customerEmail && (
              <Button
                size="sm"
                className="flex-1 bg-[#FA5022] hover:bg-[#FA5022]/90"
                onClick={handleSendAlmaLink}
                disabled={isSendingLink}
              >
                {isSendingLink ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Mail className="h-3 w-3 mr-1" />
                )}
                Envoyer
              </Button>
            )}
          </div>
        </div>
      )}

      {eligiblePlans.length > 0 && !almaUrl && (
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          {eligiblePlans.map((plan) => (
            <p key={plan.installments_count}>
              {plan.installments_count}x : {plan.payment_plan?.length || plan.installments_count} échéances de{" "}
              {plan.payment_plan?.[0]
                ? (plan.payment_plan[0].total_amount / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })
                : (montantRestant / plan.installments_count).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
              €
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
