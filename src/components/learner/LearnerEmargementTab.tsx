import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Pen,
  Check,
  Clock,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { format, isToday, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { SignatureCanvas } from "@/components/signatures/SignatureCanvas";
import { messageErreurInvoke } from "@/lib/erreurs";

interface LearnerEmargementTabProps {
  contactId: string;
  token: string;
}

export function LearnerEmargementTab({ contactId, token }: LearnerEmargementTabProps) {
  const queryClient = useQueryClient();
  const [signingEmargement, setSigningEmargement] = useState<any>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Fetch emargements for this contact
  const { data: emargements = [], isLoading } = useQuery({
    queryKey: ["learner-emargements", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emargements")
        .select(`
          *,
          session:sessions(id, nom, formation_type, date_debut, date_fin)
        `)
        .eq("contact_id", contactId)
        .order("date_emargement", { ascending: false })
        .order("periode", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });

  const signMutation = useMutation({
    mutationFn: async ({
      emargementId,
      sessionId,
      signature,
    }: {
      emargementId: string;
      sessionId: string;
      signature: string;
    }) => {
      // Le portail est anonyme (jeton, pas de session Supabase) : le rôle
      // anon n'a aucun droit sur le bucket privé "signatures". L'upload
      // passe donc par une edge function service_role qui revalide le
      // jeton elle-même — voir supabase/functions/portal-upload-signature.
      const base64Data = signature.split(",")[1];
      const { data, error } = await supabase.functions.invoke("portal-upload-signature", {
        body: {
          token,
          emargementId,
          signatureDataBase64: base64Data,
          userAgent: navigator.userAgent,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors de la signature");
      return sessionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learner-emargements", contactId] });
      toast.success("Émargement signé avec succès !");
      setSigningEmargement(null);
      setSignatureData(null);
    },
    onError: async (error) => {
      console.error("Sign error:", error);
      toast.error(await messageErreurInvoke(error, "Erreur lors de la signature"));
    },
  });

  const handleSign = () => {
    if (!signatureData || !signingEmargement) {
      toast.error("Veuillez signer avant de valider");
      return;
    }

    signMutation.mutate({
      emargementId: signingEmargement.id,
      sessionId: signingEmargement.session_id,
      signature: signatureData,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  // Group by date
  const groupedByDate = emargements.reduce((acc: any, em: any) => {
    const date = em.date_emargement;
    if (!acc[date]) acc[date] = [];
    acc[date].push(em);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Filter to show only past/today emargements that can be signed
  const signableDates = sortedDates.filter(date => {
    const d = new Date(date);
    return isToday(d) || isPast(d);
  });

  const pendingCount = emargements.filter(
    (em: any) => !em.signature_data && (isToday(new Date(em.date_emargement)) || isPast(new Date(em.date_emargement)))
  ).length;

  if (emargements.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Aucun émargement"
        description="Vos feuilles de présence apparaîtront ici."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Mes émargements
        </h2>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {pendingCount} à signer
          </Badge>
        )}
      </div>

      {signableDates.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Aucun émargement à signer pour le moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {signableDates.map((date) => {
            const dateEmargements = groupedByDate[date];
            const dateObj = new Date(date);
            const isTodayDate = isToday(dateObj);

            return (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {format(dateObj, "EEEE d MMMM yyyy", { locale: fr })}
                  </span>
                  {isTodayDate && (
                    <Badge variant="secondary" className="ml-2">
                      Aujourd'hui
                    </Badge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {dateEmargements.map((em: any) => {
                    const isSigned = !!em.signature_data;
                    const canSign = !isSigned;

                    return (
                      <Card
                        key={em.id}
                        className={`transition-all ${
                          isSigned
                            ? "border-success/50 bg-success/5"
                            : "border-warning/50 bg-warning/5"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={em.periode === "matin" ? "default" : em.periode === "soir" ? "outline" : "secondary"}>
                                  {em.periode === "matin" ? "Matin" : em.periode === "soir" ? "Soir" : "Après-midi"}
                                </Badge>
                                {isSigned ? (
                                  <Check className="h-4 w-4 text-success" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-warning" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {em.heure_debut} - {em.heure_fin}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {em.session?.nom}
                              </p>
                            </div>

                            {canSign ? (
                              <Button
                                size="sm"
                                onClick={() => setSigningEmargement(em)}
                              >
                                <Pen className="h-4 w-4 mr-1" />
                                Signer
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-success">
                                <Check className="h-3 w-3 mr-1" />
                                Signé
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Signature Dialog */}
      <Dialog open={!!signingEmargement} onOpenChange={() => setSigningEmargement(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Signer l'émargement</DialogTitle>
            <DialogDescription>
              {signingEmargement && (
                <>
                  {format(new Date(signingEmargement.date_emargement), "EEEE d MMMM yyyy", { locale: fr })} -{" "}
                  {signingEmargement.periode === "matin" ? "Matin" : signingEmargement.periode === "soir" ? "Soir" : "Après-midi"}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              En signant, vous confirmez votre présence à cette demi-journée de formation.
            </p>

            <div className="border rounded-lg p-2">
              <SignatureCanvas
                onSignatureChange={setSignatureData}
                width={350}
                height={150}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSigningEmargement(null);
                  setSignatureData(null);
                }}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleSign}
                disabled={!signatureData || signMutation.isPending}
              >
                {signMutation.isPending ? "Signature..." : "Valider ma signature"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
