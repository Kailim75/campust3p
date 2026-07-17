import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Route, Inbox, MailCheck, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  computeParcours,
  SEUILS_PARCOURS,
  type StageKind,
} from "@/lib/parcours-examen";

const KIND_BADGE: Record<StageKind, string> = {
  spine: "bg-info/15 text-info border-info/30",
  waiting: "bg-warning/15 text-warning border-warning/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  done: "bg-success/15 text-success border-success/30",
};

const ATTENTE_LABEL: Record<string, string> = {
  resultat_theorie: "Résultat théorique attendu",
  convocation_cma: "Convocation CMA attendue",
  resultat_pratique: "Résultat pratique attendu",
};

interface ParcoursExamenCardProps {
  contactId: string;
}

/**
 * Étape calculée du parcours d'examen (jamais saisie — dérivée des faits,
 * cf. src/lib/parcours-examen.ts) + gestion de la boîte mail interne Outlook.
 * Affichée en tête de l'onglet Examens, à côté du statut manuel qui reste
 * inchangé.
 */
export function ParcoursExamenCard({ contactId }: ParcoursExamenCardProps) {
  const queryClient = useQueryClient();
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["apprenant-parcours", contactId],
    queryFn: async () => {
      const [contactRes, t3pRes, pratiqueRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("email_interne, email_interne_consulte_le")
          .eq("id", contactId)
          .single(),
        supabase
          .from("examens_t3p")
          .select("type_formation, date_examen, resultat, date_resultat_recu, date_reussite, date_convocation_pratique_recue, numero_convocation")
          .eq("contact_id", contactId)
          .order("date_examen", { ascending: false }),
        supabase
          .from("examens_pratique")
          .select("date_examen, resultat, date_resultat_recu")
          .eq("contact_id", contactId)
          .order("date_examen", { ascending: false })
          .limit(1),
      ]);
      if (contactRes.error) throw contactRes.error;
      // Même classification que le hub : les lignes « pratique » saisies dans
      // examens_t3p sont des épreuves pratiques.
      const rows = t3pRes.data || [];
      const isPratique = (r: { type_formation: string | null }) =>
        String(r.type_formation || "").toLowerCase() === "pratique";
      const theorie = rows.find((r) => !isPratique(r)) || null;
      const pratiqueFromT3p = rows.find(isPratique) || null;
      const pratiqueFromTable = pratiqueRes.data?.[0] || null;
      const pratique =
        pratiqueFromTable && pratiqueFromT3p
          ? (pratiqueFromTable.date_examen || "") >= (pratiqueFromT3p.date_examen || "")
            ? pratiqueFromTable
            : pratiqueFromT3p
          : pratiqueFromTable || pratiqueFromT3p;
      return { contact: contactRes.data, theorie, pratique };
    },
  });

  const saveEmail = useMutation({
    mutationFn: async (email: string | null) => {
      const { error } = await supabase
        .from("contacts")
        .update({ email_interne: email })
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenant-parcours", contactId] });
      queryClient.invalidateQueries({ queryKey: ["aujourdhui-inbox"] });
      toast.success("Boîte mail interne enregistrée");
      setEditingEmail(false);
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const marquerConsultee = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("contacts")
        .update({ email_interne_consulte_le: new Date().toISOString() })
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenant-parcours", contactId] });
      queryClient.invalidateQueries({ queryKey: ["aujourdhui-inbox"] });
      toast.success("Boîte marquée comme consultée");
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  if (isLoading) return <Skeleton className="h-24 rounded-xl" />;
  if (!data) return null;

  const parcours = computeParcours({
    theorie: data.theorie
      ? {
          date_examen: data.theorie.date_examen ?? null,
          resultat: data.theorie.resultat ?? null,
          date_resultat_recu: data.theorie.date_resultat_recu ?? null,
          date_reussite: data.theorie.date_reussite ?? null,
          date_convocation_pratique_recue: data.theorie.date_convocation_pratique_recue ?? null,
          numero_convocation: data.theorie.numero_convocation ?? null,
        }
      : null,
    pratique: data.pratique
      ? {
          date_examen: data.pratique.date_examen ?? null,
          resultat: data.pratique.resultat ?? null,
          date_resultat_recu: data.pratique.date_resultat_recu ?? null,
        }
      : null,
    emailInterne: data.contact.email_interne,
    emailInterneConsulteLe: data.contact.email_interne_consulte_le,
  });

  const attente = parcours.attente;
  const boite = parcours.boiteMail;
  const emailInterne = data.contact.email_interne;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Parcours d'examen</span>
          <Badge variant="outline" className={cn("text-xs", KIND_BADGE[parcours.kind])}>
            {parcours.label}
          </Badge>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Étape calculée automatiquement d'après les examens
        </span>
      </div>

      {attente && (
        <p className={cn(
          "text-xs rounded-md px-3 py-2",
          attente.niveau === "alerte"
            ? "bg-destructive/10 text-destructive"
            : attente.niveau === "rappel"
              ? "bg-warning/10 text-warning"
              : "bg-muted text-muted-foreground",
        )}>
          {ATTENTE_LABEL[attente.type]} depuis{" "}
          <span className="font-semibold">{attente.joursEcoules} jour{attente.joursEcoules > 1 ? "s" : ""}</span>
          {" "}(rappel à {attente.seuilRappel} j, alerte à {attente.seuilAlerte} j)
          {attente.niveau === "alerte" && " — délai dépassé, relancer la CMA"}
        </p>
      )}

      {/* Boîte mail interne (Outlook, hors CRM) */}
      <div className="flex items-center gap-2 flex-wrap">
        <Inbox className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {editingEmail ? (
          <div className="flex items-center gap-1 flex-1 min-w-[240px]">
            <Input
              className="h-7 text-xs"
              type="email"
              placeholder="boite.candidat@outlook.fr"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEmail.mutate(emailValue.trim() || null);
                if (e.key === "Escape") setEditingEmail(false);
              }}
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" disabled={saveEmail.isPending}
              onClick={() => saveEmail.mutate(emailValue.trim() || null)}>
              <Check className="h-3 w-3 text-success" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingEmail(false)}>
              <X className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        ) : emailInterne ? (
          <>
            <span className="text-xs font-mono text-foreground">{emailInterne}</span>
            <Button size="icon" variant="ghost" className="h-5 w-5"
              onClick={() => { setEmailValue(emailInterne); setEditingEmail(true); }}>
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </Button>
            <Badge variant="outline" className={cn(
              "text-[11px]",
              boite?.aConsulter ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground",
            )}>
              {boite?.joursDepuisConsultation == null
                ? "Jamais consultée"
                : `Consultée il y a ${boite.joursDepuisConsultation} j`}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[11px] gap-1 ml-auto"
              disabled={marquerConsultee.isPending}
              onClick={() => marquerConsultee.mutate()}
            >
              <MailCheck className="h-3 w-3" />
              J'ai consulté
            </Button>
          </>
        ) : (
          <>
            <span className="text-xs text-muted-foreground italic">
              Boîte mail interne non renseignée (rappel de consultation tous les {SEUILS_PARCOURS.boiteMail.rappel} j)
            </span>
            <Button size="sm" variant="ghost" className="h-6 text-[11px]"
              onClick={() => { setEmailValue(""); setEditingEmail(true); }}>
              Renseigner
            </Button>
          </>
        )}
      </div>

      {data.theorie?.date_convocation_pratique_recue && (
        <p className="text-[11px] text-muted-foreground">
          Convocation pratique reçue le{" "}
          {format(parseISO(data.theorie.date_convocation_pratique_recue), "dd/MM/yyyy", { locale: fr })}
          {data.theorie.numero_convocation ? ` — n° ${data.theorie.numero_convocation}` : ""}
        </p>
      )}
    </Card>
  );
}
