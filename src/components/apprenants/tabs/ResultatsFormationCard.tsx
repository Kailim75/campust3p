import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResultatsFormationCardProps {
  contactId: string;
  contactPrenom?: string;
  contactEmail?: string;
}

type ResultatStatus = "admis" | "ajourne" | "en_attente" | null;

const STATUS_CONFIG = {
  admis: { icon: CheckCircle2, label: "Réussi", className: "bg-success/15 text-success border-success/30" },
  ajourne: { icon: XCircle, label: "Échoué", className: "bg-destructive/15 text-destructive border-destructive/30" },
  en_attente: { icon: Clock, label: "En attente", className: "bg-muted text-muted-foreground border-muted" },
};

export function ResultatsFormationCard({ contactId, contactPrenom, contactEmail }: ResultatsFormationCardProps) {
  const [sendingTheorie, setSendingTheorie] = useState(false);
  const [sendingPratique, setSendingPratique] = useState(false);

  // Théorie: from examens_t3p
  const { data: theorieExams } = useQuery({
    queryKey: ["apprenant-theorie-result", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examens_t3p")
        .select("resultat, date_examen")
        .eq("contact_id", contactId)
        .order("date_examen", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data || [];
    },
  });

  // Pratique: from examens_pratique
  const { data: pratiqueExams } = useQuery({
    queryKey: ["apprenant-pratique-result", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examens_pratique")
        .select("resultat, date_examen")
        .eq("contact_id", contactId)
        .order("date_examen", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data || [];
    },
  });

  const theorieStatus: ResultatStatus = (theorieExams?.[0]?.resultat as ResultatStatus) || null;
  const pratiqueStatus: ResultatStatus = (pratiqueExams?.[0]?.resultat as ResultatStatus) || null;

  const getConfig = (status: ResultatStatus) => {
    if (!status || !STATUS_CONFIG[status]) return STATUS_CONFIG.en_attente;
    return STATUS_CONFIG[status];
  };

  const sendResultEmail = async (type: "theorie" | "pratique", isSuccess: boolean) => {
    if (!contactEmail) {
      toast.error("Pas d'email pour cet apprenant");
      return;
    }

    const setter = type === "theorie" ? setSendingTheorie : setSendingPratique;
    setter(true);

    try {
      const label = type === "theorie" ? "théorique" : "pratique";
      const subject = isSuccess
        ? `🎉 Félicitations ${contactPrenom || ""} – Examen ${label} validé !`
        : `💪 Courage ${contactPrenom || ""} – On continue ensemble !`;

      const body = isSuccess
        ? `<p>Bonjour ${contactPrenom || ""},</p>
           <p>Nous avons le plaisir de vous informer que vous avez <strong>réussi</strong> votre examen ${label} ! 🎉</p>
           <p>Félicitations pour ce bel accomplissement. ${type === "theorie" ? "La prochaine étape est la formation pratique." : "Vous êtes maintenant diplômé(e) !"}</p>
           <p>Cordialement,<br/>L'équipe École T3P</p>`
        : `<p>Bonjour ${contactPrenom || ""},</p>
           <p>Nous comprenons que le résultat de votre examen ${label} n'est pas celui espéré.</p>
           <p>Ne vous découragez pas ! Notre équipe est là pour vous accompagner et vous préparer au mieux pour la prochaine session. 💪</p>
           <p>N'hésitez pas à nous contacter pour planifier des sessions de révision.</p>
           <p>Cordialement,<br/>L'équipe École T3P</p>`;

      const { error } = await supabase.functions.invoke("send-automated-emails", {
        body: {
          type: "custom",
          recipients: [{ email: contactEmail, name: contactPrenom || "" }],
          subject,
          htmlContent: body,
        },
      });

      if (error) throw error;
      toast.success(`Email ${isSuccess ? "de félicitations" : "d'encouragement"} envoyé !`);
    } catch {
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setter(false);
    }
  };

  const theorieConfig = getConfig(theorieStatus);
  const pratiqueConfig = getConfig(pratiqueStatus);
  const TheorieIcon = theorieConfig.icon;
  const PratiqueIcon = pratiqueConfig.icon;

  const canSendTheorie = theorieStatus === "admis" || theorieStatus === "ajourne";
  const canSendPratique = pratiqueStatus === "admis" || pratiqueStatus === "ajourne";

  return (
    <Card className="p-3 mb-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Théorie */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <TheorieIcon className={cn("h-4 w-4 shrink-0", theorieStatus === "admis" ? "text-success" : theorieStatus === "ajourne" ? "text-destructive" : "text-muted-foreground")} />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Théorie</p>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", theorieConfig.className)}>
                {theorieConfig.label}
              </Badge>
            </div>
          </div>
          {canSendTheorie && contactEmail && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 shrink-0"
              disabled={sendingTheorie}
              onClick={() => sendResultEmail("theorie", theorieStatus === "admis")}
              title={theorieStatus === "admis" ? "Envoyer félicitations" : "Envoyer encouragements"}
            >
              <Send className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Pratique */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <PratiqueIcon className={cn("h-4 w-4 shrink-0", pratiqueStatus === "admis" ? "text-success" : pratiqueStatus === "ajourne" ? "text-destructive" : "text-muted-foreground")} />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Pratique</p>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", pratiqueConfig.className)}>
                {pratiqueConfig.label}
              </Badge>
            </div>
          </div>
          {canSendPratique && contactEmail && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 shrink-0"
              disabled={sendingPratique}
              onClick={() => sendResultEmail("pratique", pratiqueStatus === "admis")}
              title={pratiqueStatus === "admis" ? "Envoyer félicitations" : "Envoyer encouragements"}
            >
              <Send className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
