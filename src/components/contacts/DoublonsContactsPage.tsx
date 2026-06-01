import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ExternalLink, Loader2, ShieldCheck, Users } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Contact = Tables<"contacts">;

interface DuplicateGroup {
  email: string;
  total: number;
  active: number;
  archived: number;
  deleted: number;
  contacts: Contact[];
}

type FilterMode = "all" | "with_active" | "with_multiple_active" | "archived_only";

function normalizeEmail(e: string | null): string | null {
  if (!e) return null;
  const s = e.trim().toLowerCase();
  return s || null;
}

function statusOf(c: Contact): "active" | "archived" | "deleted" {
  if (c.deleted_at) return "deleted";
  if ((c as any).archived) return "archived";
  return "active";
}

function statusBadge(c: Contact) {
  const s = statusOf(c);
  if (s === "active") return <Badge variant="default">Actif</Badge>;
  if (s === "archived") return <Badge variant="secondary">Archivé</Badge>;
  return <Badge variant="outline">Supprimé</Badge>;
}

export function DoublonsContactsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ["contacts", "all-for-duplicates"],
    queryFn: async () => {
      // 1000 rows max par défaut — suffisant pour le périmètre actuel (~654 contacts).
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  const groups = useMemo<DuplicateGroup[]>(() => {
    if (!contacts) return [];
    const byEmail = new Map<string, Contact[]>();
    for (const c of contacts) {
      const e = normalizeEmail(c.email);
      if (!e) continue;
      const arr = byEmail.get(e) ?? [];
      arr.push(c);
      byEmail.set(e, arr);
    }
    const out: DuplicateGroup[] = [];
    for (const [email, list] of byEmail.entries()) {
      if (list.length < 2) continue;
      const active = list.filter((c) => statusOf(c) === "active").length;
      const archived = list.filter((c) => statusOf(c) === "archived").length;
      const deleted = list.filter((c) => statusOf(c) === "deleted").length;
      out.push({ email, total: list.length, active, archived, deleted, contacts: list });
    }
    out.sort((a, b) => b.active - a.active || b.total - a.total);
    return out;
  }, [contacts]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (s && !g.email.includes(s) && !g.contacts.some((c) => `${c.prenom ?? ""} ${c.nom ?? ""}`.toLowerCase().includes(s))) {
        return false;
      }
      switch (filter) {
        case "with_active":
          return g.active >= 1;
        case "with_multiple_active":
          return g.active >= 2;
        case "archived_only":
          return g.active === 0 && (g.archived > 0 || g.deleted > 0);
        default:
          return true;
      }
    });
  }, [groups, search, filter]);

  const stats = useMemo(() => {
    const totalGroups = groups.length;
    const totalFiches = groups.reduce((s, g) => s + g.total, 0);
    const groupsWithActive = groups.filter((g) => g.active >= 1).length;
    const groupsWithMultipleActive = groups.filter((g) => g.active >= 2).length;
    const archivedOnly = groups.filter((g) => g.active === 0).length;
    return { totalGroups, totalFiches, groupsWithActive, groupsWithMultipleActive, archivedOnly };
  }, [groups]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center gap-2 pt-6 text-destructive">
            <AlertCircle className="h-4 w-4" />
            Erreur de chargement : {(error as Error).message}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Doublons de contacts
        </h1>
        <p className="text-sm text-muted-foreground">
          Vue historique des doublons d'email (tous statuts confondus). Lecture seule —
          aucune fusion automatique. La protection anti-doublons actifs est appliquée
          en base par un index unique partiel et un trigger.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Groupes" value={stats.totalGroups} />
        <StatCard label="Fiches concernées" value={stats.totalFiches} />
        <StatCard label="Avec ≥1 actif" value={stats.groupsWithActive} />
        <StatCard label="≥2 actifs (à risque)" value={stats.groupsWithMultipleActive} tone={stats.groupsWithMultipleActive > 0 ? "danger" : "muted"} />
        <StatCard label="Archivés / supprimés" value={stats.archivedOnly} />
      </div>

      {/* Banner de protection */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-3 pt-6">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div className="text-sm">
            <p className="font-medium">Protection active</p>
            <p className="text-muted-foreground">
              Toute création ou réactivation provoquant un email actif en doublon dans le même centre est bloquée
              en base de données. Les tentatives bloquées sont journalisées (table d'audit).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Rechercher email, nom, prénom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
          <SelectTrigger className="sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les groupes</SelectItem>
            <SelectItem value="with_active">Avec au moins 1 actif</SelectItem>
            <SelectItem value="with_multiple_active">≥ 2 fiches actives (à risque)</SelectItem>
            <SelectItem value="archived_only">Archivés / supprimés uniquement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              Aucun groupe ne correspond aux filtres.
            </CardContent>
          </Card>
        ) : (
          filtered.map((g) => <DuplicateGroupCard key={g.email} group={g} />)
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "muted" | "danger" }) {
  const cls =
    tone === "danger"
      ? "text-destructive"
      : tone === "muted"
      ? "text-muted-foreground"
      : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-semibold ${cls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function DuplicateGroupCard({ group }: { group: DuplicateGroup }) {
  // Master = première fiche active, sinon la plus récente
  const sorted = [...group.contacts].sort((a, b) => {
    const sa = statusOf(a), sb = statusOf(b);
    if (sa === "active" && sb !== "active") return -1;
    if (sb === "active" && sa !== "active") return 1;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
  const master = sorted[0];

  const openContact = (id: string) => {
    window.dispatchEvent(new CustomEvent("navigate-to-contact", { detail: { contactId: id } }));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-mono">{group.email}</CardTitle>
          <div className="flex gap-2 text-xs">
            <Badge variant="outline">{group.total} fiches</Badge>
            {group.active > 0 && <Badge variant="default">{group.active} actifs</Badge>}
            {group.archived > 0 && <Badge variant="secondary">{group.archived} archivés</Badge>}
            {group.deleted > 0 && <Badge variant="outline">{group.deleted} supprimés</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sorted.map((c) => {
            const isMaster = c.id === master.id;
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-3 rounded-md border p-2 ${
                  isMaster ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {statusBadge(c)}
                  {isMaster && <Badge variant="default" className="text-xs">Master</Badge>}
                  <span className="truncate font-medium">
                    {c.prenom} {c.nom}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {c.telephone ?? "—"}
                  </span>
                  <span className="hidden md:inline text-xs text-muted-foreground">
                    {c.statut ?? "—"}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => openContact(c.id)}
                  className="gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ouvrir
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Aucune action de fusion ici — décision humaine requise. Pour les groupes
          {" "}<strong>≥ 2 actifs</strong>, vérifier manuellement avant toute action.
        </p>
      </CardContent>
    </Card>
  );
}
