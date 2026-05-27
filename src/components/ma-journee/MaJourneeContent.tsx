import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCentreContext } from "@/contexts/CentreContext";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Bell,
  Mail,
  FileWarning,
  ChevronRight,
  ArrowLeft,
  Sun,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function MaJourneeContent() {
  const { centreId } = useCentreContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const tomorrowStr = new Date(today.getTime() + 24 * 3600 * 1000)
    .toISOString()
    .split("T")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["ma-journee", centreId, user?.id, todayStr],
    enabled: !!centreId && !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const [sessionsRes, rappelsRes, threadsRes, docsRes] = await Promise.all([
        supabase
          .from("sessions")
          .select("id, nom, date_debut, date_fin, lieu, formation_type")
          .eq("centre_id", centreId!)
          .eq("archived", false)
          .gte("date_debut", todayStr)
          .lt("date_debut", tomorrowStr)
          .order("date_debut", { ascending: true }),
        supabase
          .from("contact_historique")
          .select("id, contact_id, contenu, date_rappel")
          .eq("alerte_active", true)
          .not("date_rappel", "is", null)
          .lte("date_rappel", todayStr)
          .order("date_rappel", { ascending: true })
          .limit(20),
        supabase
          .from("crm_email_threads")
          .select("id, subject, last_message_at, status")
          .eq("centre_id", centreId!)
          .eq("status", "nouveau")
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(10),
        supabase
          .from("contacts")
          .select("id, prenom, nom, statut_cma")
          .eq("centre_id", centreId!)
          .eq("archived", false)
          .is("deleted_at", null)
          .in("statut_cma", ["docs_manquants", "rejete"])
          .limit(10),
      ]);

      return {
        sessions: sessionsRes.data ?? [],
        rappels: rappelsRes.data ?? [],
        threads: threadsRes.data ?? [],
        docs: docsRes.data ?? [],
      };
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate("/aujourdhui")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-500" />
              <h1 className="text-base font-semibold">Ma journée</h1>
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {format(today, "EEEE d MMMM yyyy", { locale: fr })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <SectionCard
              icon={Calendar}
              tone="blue"
              title="Sessions du jour"
              count={data?.sessions.length ?? 0}
              emptyText="Aucune session aujourd'hui"
              onClickAll={() => navigate("/sessions")}
            >
              {data?.sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/sessions?id=${s.id}`)}
                  className="w-full text-left p-2.5 rounded-md hover:bg-muted/50 transition-colors flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.nom}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {format(new Date(s.date_debut), "HH:mm")} · {s.lieu ?? "—"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </SectionCard>

            <SectionCard
              icon={Bell}
              tone="amber"
              title="Rappels à traiter"
              count={data?.rappels.length ?? 0}
              emptyText="Aucun rappel en attente"
              onClickAll={() => navigate("/aujourdhui")}
            >
              {data?.rappels.slice(0, 5).map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/contacts/${r.contact_id}`)}
                  className="w-full text-left p-2.5 rounded-md hover:bg-muted/50 transition-colors flex items-start gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">{r.contenu || "Rappel sans titre"}</p>
                    {r.date_rappel && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(r.date_rappel), "d MMM", { locale: fr })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </button>
              ))}
            </SectionCard>

            <SectionCard
              icon={Mail}
              tone="indigo"
              title="Emails non traités"
              count={data?.threads.length ?? 0}
              emptyText="Inbox à jour"
              onClickAll={() => navigate("/inbox")}
            >
              {data?.threads.slice(0, 5).map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/inbox?thread=${t.id}`)}
                  className="w-full text-left p-2.5 rounded-md hover:bg-muted/50 transition-colors flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.subject || "(sans objet)"}</p>
                    {t.last_message_at && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.last_message_at), "d MMM HH:mm", { locale: fr })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </SectionCard>

            <SectionCard
              icon={FileWarning}
              tone="red"
              title="Dossiers CMA à compléter"
              count={data?.docs.length ?? 0}
              emptyText="Aucun dossier en attente"
              onClickAll={() => navigate("/contacts")}
            >
              {data?.docs.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/contacts/${c.id}`)}
                  className="w-full text-left p-2.5 rounded-md hover:bg-muted/50 transition-colors flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.prenom} {c.nom}
                    </p>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 mt-0.5">
                      {c.statut_cma}
                    </Badge>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}

const TONES = {
  blue: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-600 dark:text-indigo-400", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
  red: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-600 dark:text-red-400", badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
} as const;

function SectionCard({
  icon: Icon,
  tone,
  title,
  count,
  emptyText,
  onClickAll,
  children,
}: {
  icon: typeof Calendar;
  tone: keyof typeof TONES;
  title: string;
  count: number;
  emptyText: string;
  onClickAll: () => void;
  children: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onClickAll}
        className="w-full px-4 py-3 flex items-center gap-3 border-b hover:bg-muted/30 transition-colors"
      >
        <div className={`h-9 w-9 rounded-lg ${t.bg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${t.text}`} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold">{title}</p>
        </div>
        <Badge className={`${t.badge} border-0`}>{count}</Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="p-2 space-y-1">
        {count === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
