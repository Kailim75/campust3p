import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, Calendar, MapPin, Clock, CheckCircle, Car, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface TokenInfo {
  apprenant_id: string;
  apprenant_prenom: string;
  apprenant_nom: string;
  apprenant_formation: string | null;
  token_actif: boolean;
  token_expire: boolean;
}

interface CreneauDisponible {
  id: string;
  type_seance: string;
  date_creneau: string;
  heure_debut: string;
  heure_fin: string;
  lieu_depart: string | null;
  capacite_max: number;
}

interface Reservation {
  id: string;
  creneau_id: string;
  statut: string;
  created_at: string;
  creneau?: CreneauDisponible;
}

interface Ressource {
  id: string;
  titre: string;
  categorie: string;
  contenu: string;
}

const TYPE_LABELS: Record<string, string> = {
  conduite_preventive: "Conduite préventive",
  conduite_ville: "Conduite en ville",
};

const TYPE_ICONS: Record<string, string> = {
  conduite_preventive: "🚗",
  conduite_ville: "🏙️",
};

const CATEGORIE_LABELS: Record<string, { emoji: string; label: string }> = {
  regles_centre: { emoji: "📋", label: "Règles du centre" },
  regles_formateur: { emoji: "🤝", label: "Règles vis-à-vis du formateur" },
  deroulement_examen: { emoji: "🏁", label: "Déroulement de l'examen" },
  adresses_secteur: { emoji: "📍", label: "Adresses et secteur" },
  checklist_jour_j: { emoji: "✅", label: "Checklist jour J" },
  conseils_conduite: { emoji: "💡", label: "Conseils de conduite" },
};

const NIVEAU_BADGES: Record<string, { label: string; className: string }> = {
  debutant: { label: "Débutant", className: "bg-destructive/15 text-destructive border-destructive/30" },
  intermediaire: { label: "Intermédiaire", className: "bg-warning/15 text-warning border-warning/30" },
  avance: { label: "Avancé", className: "bg-info/15 text-info border-info/30" },
  pret_examen: { label: "Prêt pour l'examen ✅", className: "bg-success/15 text-success border-success/30" },
};

export default function ReserverConduite() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [invalid, setInvalid] = useState(false);

  const [creneaux, setCreneaux] = useState<CreneauDisponible[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [progression, setProgression] = useState<any>(null);
  const [ressources, setRessources] = useState<Ressource[]>([]);

  const [confirmCreneau, setConfirmCreneau] = useState<CreneauDisponible | null>(null);
  const [reserving, setReserving] = useState(false);
  const [success, setSuccess] = useState<CreneauDisponible | null>(null);

  const [cancelResa, setCancelResa] = useState<Reservation | null>(null);
  const [cancelMotif, setCancelMotif] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase.rpc("validate_reservation_token", { p_token: token! });
      if (error || !data?.length) { setInvalid(true); setLoading(false); return; }
      
      const info = data[0] as unknown as TokenInfo;
      if (!info.token_actif || info.token_expire) { setInvalid(true); setLoading(false); return; }
      
      setTokenInfo(info);
      await supabase.rpc("use_reservation_token", { p_token: token! });
      await loadData(info.apprenant_id);
    } catch {
      setInvalid(true);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (apprenantId: string) => {
    const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

    const [creneauxRes, resasRes, progRes, ressRes] = await Promise.all([
      supabase
        .from("creneaux_conduite")
        .select("id, type_seance, date_creneau, heure_debut, heure_fin, lieu_depart, capacite_max")
        .eq("visible_eleve", true)
        .eq("statut", "disponible")
        .neq("type_seance", "accompagnement_examen")
        .gte("date_creneau", tomorrow)
        .order("date_creneau")
        .order("heure_debut"),
      supabase
        .from("reservations_conduite")
        .select("id, creneau_id, statut, created_at")
        .eq("apprenant_id", apprenantId)
        .eq("statut", "confirmee" as any),
      supabase
        .from("progression_conduite")
        .select("*")
        .eq("apprenant_id", apprenantId)
        .maybeSingle(),
      supabase
        .from("ressources_conduite")
        .select("id, titre, categorie, contenu")
        .eq("visible_eleve", true)
        .order("ordre_affichage"),
    ]);

    setCreneaux((creneauxRes.data || []) as CreneauDisponible[]);
    
    // Load creneau details for reservations
    const resas = (resasRes.data || []) as Reservation[];
    if (resas.length > 0) {
      const creneauIds = resas.map(r => r.creneau_id);
      const { data: creneauxDetail } = await supabase
        .from("creneaux_conduite")
        .select("id, type_seance, date_creneau, heure_debut, heure_fin, lieu_depart, capacite_max")
        .in("id", creneauIds);
      
      resas.forEach(r => {
        r.creneau = (creneauxDetail || []).find((c: any) => c.id === r.creneau_id) as CreneauDisponible | undefined;
      });
    }
    setReservations(resas);
    setProgression(progRes.data);
    setRessources((ressRes.data || []) as Ressource[]);
  };

  const handleReserver = async () => {
    if (!confirmCreneau || !token) return;
    setReserving(true);
    try {
      const { data } = await supabase.rpc("reserver_creneau_public", {
        p_token: token,
        p_creneau_id: confirmCreneau.id,
      });
      const result = data as unknown as { success: boolean; error?: string };
      if (result?.success) {
        setSuccess(confirmCreneau);
        setConfirmCreneau(null);
        if (tokenInfo) await loadData(tokenInfo.apprenant_id);
      } else {
        toast.error(result?.error || "Erreur lors de la réservation");
      }
    } catch {
      toast.error("Erreur lors de la réservation");
    } finally {
      setReserving(false);
    }
  };

  const handleAnnuler = async () => {
    if (!cancelResa || !token) return;
    setCancelling(true);
    try {
      const { data } = await supabase.rpc("annuler_reservation_public", {
        p_token: token,
        p_reservation_id: cancelResa.id,
        p_motif: cancelMotif || null,
      });
      const result = data as unknown as { success: boolean; error?: string };
      if (result?.success) {
        toast.success("Réservation annulée");
        setCancelResa(null);
        setCancelMotif("");
        if (tokenInfo) await loadData(tokenInfo.apprenant_id);
      } else {
        toast.error(result?.error || "Erreur");
      }
    } catch {
      toast.error("Erreur lors de l'annulation");
    } finally {
      setCancelling(false);
    }
  };

  const generateICS = (c: CreneauDisponible) => {
    const startDate = `${c.date_creneau.replace(/-/g, "")}T${c.heure_debut.replace(/:/g, "").slice(0, 6)}00`;
    const endDate = `${c.date_creneau.replace(/-/g, "")}T${c.heure_fin.replace(/:/g, "").slice(0, 6)}00`;
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${startDate}\nDTEND:${endDate}\nSUMMARY:Séance de conduite - ${TYPE_LABELS[c.type_seance] || c.type_seance}\nLOCATION:${c.lieu_depart || ""}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seance-conduite.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group creneaux by date
  const groupedCreneaux = creneaux.reduce((acc, c) => {
    const key = c.date_creneau;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, CreneauDisponible[]>);

  // Group ressources by category
  const groupedRessources = ressources.reduce((acc, r) => {
    if (!acc[r.categorie]) acc[r.categorie] = [];
    acc[r.categorie].push(r);
    return acc;
  }, {} as Record<string, Ressource[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-lg px-4">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive/60" />
            <h1 className="text-xl font-bold text-foreground">Lien invalide</h1>
            <p className="text-muted-foreground">
              Ce lien de réservation n'est plus valide.
              Contactez l'école pour obtenir un nouveau lien.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 mx-auto text-success" />
            <h1 className="text-xl font-bold text-foreground">Séance réservée !</h1>
            <div className="bg-muted rounded-lg p-4 text-left space-y-2 text-sm">
              <p><strong>Date :</strong> {format(parseISO(success.date_creneau), "EEEE d MMMM yyyy", { locale: fr })}</p>
              <p><strong>Horaire :</strong> {success.heure_debut?.slice(0, 5)} → {success.heure_fin?.slice(0, 5)}</p>
              {success.lieu_depart && <p><strong>Départ :</strong> {success.lieu_depart}</p>}
            </div>
            <p className="text-sm text-muted-foreground">Pensez à être là 5 min avant.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => generateICS(success)}>
                <Calendar className="h-4 w-4 mr-1" /> Ajouter au calendrier
              </Button>
              <Button size="sm" onClick={() => setSuccess(null)}>
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Car className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">T3P Campus</h1>
              <p className="text-sm opacity-90">Bonjour {tokenInfo?.apprenant_prenom} 👋</p>
            </div>
          </div>
          <p className="mt-2 text-sm opacity-80">Réservez votre prochaine séance de conduite</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Section 1: Progression */}
        {progression && (
          <Card>
            <CardContent className="pt-5 space-y-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                📊 Ma progression
              </h2>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Conduite en ville</span>
                    <span>{Number(progression.heures_ville_realisees || 0).toFixed(1)}h</span>
                  </div>
                  <Progress value={Math.min((Number(progression.heures_ville_realisees || 0) / 10) * 100, 100)} className="h-2 [&>div]:bg-accent" />
                </div>
                <div>
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Conduite préventive</span>
                    <span>{Number(progression.heures_preventive_realisees || 0).toFixed(1)}h</span>
                  </div>
                  <Progress value={Math.min((Number(progression.heures_preventive_realisees || 0) / 10) * 100, 100)} className="h-2 [&>div]:bg-primary" />
                </div>
              </div>
              {progression.niveau_actuel && (
                <Badge variant="outline" className={NIVEAU_BADGES[progression.niveau_actuel]?.className || ""}>
                  {NIVEAU_BADGES[progression.niveau_actuel]?.label || progression.niveau_actuel}
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 2: Créneaux disponibles */}
        <div>
          <h2 className="font-semibold text-foreground mb-3 text-lg">🗓️ Créneaux disponibles</h2>
          {Object.keys(groupedCreneaux).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">Aucun créneau disponible pour le moment.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Votre formateur ajoutera prochainement de nouveaux créneaux.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedCreneaux).map(([dateStr, slots]) => (
                <div key={dateStr}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                    {format(parseISO(dateStr), "EEEE d MMMM yyyy", { locale: fr })}
                  </h3>
                  <div className="space-y-2">
                    {slots.map((c) => {
                      const durationMin = (() => {
                        const [sh, sm] = c.heure_debut.split(":").map(Number);
                        const [eh, em] = c.heure_fin.split(":").map(Number);
                        return (eh * 60 + em) - (sh * 60 + sm);
                      })();
                      const durationLabel = durationMin >= 60 ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? (durationMin % 60).toString().padStart(2, "0") : ""}` : `${durationMin}min`;

                      return (
                        <Card key={c.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="py-4 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span>{TYPE_ICONS[c.type_seance] || "🚗"}</span>
                                  <span className="font-medium text-foreground">{TYPE_LABELS[c.type_seance] || c.type_seance}</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" />
                                  {c.heure_debut?.slice(0, 5)} → {c.heure_fin?.slice(0, 5)} ({durationLabel})
                                </div>
                                {c.lieu_depart && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {c.lieu_depart}
                                  </div>
                                )}
                              </div>
                              <Button size="sm" onClick={() => setConfirmCreneau(c)}>
                                Réserver →
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Mes réservations */}
        {reservations.length > 0 && (
          <div>
            <h2 className="font-semibold text-foreground mb-3 text-lg">📅 Mes réservations à venir</h2>
            <div className="space-y-2">
              {reservations.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="space-y-0.5 text-sm">
                      {r.creneau ? (
                        <>
                          <p className="font-medium">
                            {format(parseISO(r.creneau.date_creneau), "EEEE d MMMM", { locale: fr })}
                          </p>
                          <p className="text-muted-foreground">
                            {r.creneau.heure_debut?.slice(0, 5)} → {r.creneau.heure_fin?.slice(0, 5)} • {TYPE_LABELS[r.creneau.type_seance] || r.creneau.type_seance}
                          </p>
                          {r.creneau.lieu_depart && (
                            <p className="text-muted-foreground text-xs">{r.creneau.lieu_depart}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">Séance confirmée</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setCancelResa(r)}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Annuler
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Ressources */}
        {ressources.length > 0 && (
          <div>
            <h2 className="font-semibold text-foreground mb-3 text-lg">📖 Ressources</h2>
            <Accordion type="multiple" className="space-y-1">
              {Object.entries(groupedRessources).map(([cat, items]) => {
                const config = CATEGORIE_LABELS[cat];
                return (
                  <AccordionItem key={cat} value={cat} className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 text-sm">
                      <span>{config?.emoji || "📄"} {config?.label || cat}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {items.map((r) => (
                        <div key={r.id} className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                          {r.contenu}
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}
      </div>

      {/* Confirm reservation modal */}
      <Dialog open={!!confirmCreneau} onOpenChange={(v) => !v && setConfirmCreneau(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer cette séance ?</DialogTitle>
          </DialogHeader>
          {confirmCreneau && (
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <p><strong>{TYPE_LABELS[confirmCreneau.type_seance]}</strong></p>
              <p>{format(parseISO(confirmCreneau.date_creneau), "EEEE d MMMM yyyy", { locale: fr })}</p>
              <p>{confirmCreneau.heure_debut?.slice(0, 5)} → {confirmCreneau.heure_fin?.slice(0, 5)}</p>
              {confirmCreneau.lieu_depart && <p>📍 {confirmCreneau.lieu_depart}</p>}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmCreneau(null)}>Annuler</Button>
            <Button onClick={handleReserver} disabled={reserving}>
              {reserving ? "Réservation..." : "✅ Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel reservation modal */}
      <Dialog open={!!cancelResa} onOpenChange={(v) => !v && setCancelResa(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Annuler cette réservation ?</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Motif d'annulation (optionnel)"
            value={cancelMotif}
            onChange={(e) => setCancelMotif(e.target.value)}
            rows={2}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCancelResa(null); setCancelMotif(""); }}>Non</Button>
            <Button variant="destructive" onClick={handleAnnuler} disabled={cancelling}>
              {cancelling ? "Annulation..." : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
