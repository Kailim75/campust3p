import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, XCircle, Clock, Eye, MousePointerClick,
  Mail, FileText, Search, RefreshCw, AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type SourceKind = "email" | "document";
type UnifiedRow = {
  id: string;
  source: SourceKind;
  created_at: string;
  recipient: string;
  recipient_name?: string | null;
  subject?: string | null;
  type: string;
  status: string;
  error?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  contact_id?: string | null;
  session_id?: string | null;
};

const PERIODS = [
  { value: "1", label: "24 h" },
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "90", label: "90 jours" },
];

function statusMeta(s: string) {
  const v = (s || "").toLowerCase();
  if (["sent", "envoyé", "envoye", "delivered", "ouvert", "clique", "cliqué"].includes(v))
    return { label: "Envoyé", class: "bg-success/10 text-success border-success/20", icon: CheckCircle2 };
  if (["failed", "echec", "échec", "error", "erreur"].includes(v))
    return { label: "Échec", class: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle };
  if (["pending", "en_attente", "queued"].includes(v))
    return { label: "En attente", class: "bg-warning/10 text-warning border-warning/20", icon: Clock };
  return { label: s || "—", class: "bg-muted text-muted-foreground border-muted-foreground/20", icon: AlertCircle };
}

export function EnvoisMonitoringPanel() {
  const [period, setPeriod] = useState("7");
  const [sourceFilter, setSourceFilter] = useState<"all" | SourceKind>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const sinceISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(period, 10));
    return d.toISOString();
  }, [period]);

  const { data: emailLogs = [], isLoading: l1, refetch: r1 } = useQuery({
    queryKey: ["monitoring-emails", sinceISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("id, type, recipient_email, recipient_name, subject, status, error_message, contact_id, session_id, created_at")
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: docEnvois = [], isLoading: l2, refetch: r2 } = useQuery({
    queryKey: ["monitoring-documents", sinceISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_envois")
        .select("id, document_type, document_name, statut, envoi_type, contact_id, session_id, created_at, sent_at, opened_at, clicked_at, contact:contacts(nom, prenom, email)")
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const rows: UnifiedRow[] = useMemo(() => {
    const a: UnifiedRow[] = emailLogs.map((e: any) => ({
      id: `e_${e.id}`,
      source: "email",
      created_at: e.created_at,
      recipient: e.recipient_email,
      recipient_name: e.recipient_name,
      subject: e.subject,
      type: e.type || "—",
      status: e.status || "—",
      error: e.error_message,
      contact_id: e.contact_id,
      session_id: e.session_id,
    }));
    const b: UnifiedRow[] = docEnvois.map((d: any) => ({
      id: `d_${d.id}`,
      source: "document",
      created_at: d.created_at,
      recipient: d.contact?.email || "—",
      recipient_name: d.contact ? `${d.contact.prenom || ""} ${d.contact.nom || ""}`.trim() : null,
      subject: d.document_name,
      type: d.document_type || "—",
      status: d.statut || "—",
      opened_at: d.opened_at,
      clicked_at: d.clicked_at,
      contact_id: d.contact_id,
      session_id: d.session_id,
    }));
    return [...a, ...b].sort((x, y) => +new Date(y.created_at) - +new Date(x.created_at));
  }, [emailLogs, docEnvois]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (statusFilter !== "all" && statusMeta(r.status).label.toLowerCase() !== statusFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.recipient} ${r.recipient_name || ""} ${r.subject || ""} ${r.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, sourceFilter, statusFilter, typeFilter, search]);

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.type))).sort(), [rows]);

  const stats = useMemo(() => {
    const total = filtered.length;
    let sent = 0, failed = 0, pending = 0, opened = 0;
    for (const r of filtered) {
      const m = statusMeta(r.status).label;
      if (m === "Envoyé") sent++;
      else if (m === "Échec") failed++;
      else if (m === "En attente") pending++;
      if (r.opened_at) opened++;
    }
    return { total, sent, failed, pending, opened };
  }, [filtered]);

  const isLoading = l1 || l2;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Total" value={stats.total} icon={Mail} />
        <KpiCard label="Envoyés" value={stats.sent} icon={CheckCircle2} variant="success" />
        <KpiCard label="Échecs" value={stats.failed} icon={XCircle} variant="destructive" />
        <KpiCard label="En attente" value={stats.pending} icon={Clock} variant="warning" />
        <KpiCard label="Ouverts" value={stats.opened} icon={Eye} variant="info" />
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={(v: any) => setSourceFilter(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous canaux</SelectItem>
                <SelectItem value="email">Emails auto</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="envoyé">Envoyé</SelectItem>
                <SelectItem value="échec">Échec</SelectItem>
                <SelectItem value="en attente">En attente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Destinataire, sujet…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button variant="outline" size="sm" onClick={() => { r1(); r2(); }}>
              <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Historique des envois ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Aucun envoi sur cette période.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Quand</TableHead>
                    <TableHead className="w-24">Canal</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>Sujet / Document</TableHead>
                    <TableHead className="w-28">Statut</TableHead>
                    <TableHead className="w-20 text-center">Suivi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 200).map((r) => {
                    const meta = statusMeta(r.status);
                    const Icon = meta.icon;
                    return (
                      <TableRow key={r.id} className={cn(meta.label === "Échec" && "bg-destructive/5")}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {r.source === "email" ? <Mail className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                            {r.source === "email" ? "Email" : "Doc"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.type}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{r.recipient_name || "—"}</div>
                          <div className="text-muted-foreground truncate max-w-[200px]">{r.recipient}</div>
                        </TableCell>
                        <TableCell className="text-xs max-w-[300px] truncate" title={r.subject || ""}>
                          {r.subject || "—"}
                          {r.error && (
                            <div className="text-destructive text-[11px] mt-0.5 truncate">⚠ {r.error}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs gap-1", meta.class)}>
                            <Icon className="h-3 w-3" /> {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            {r.opened_at && <Eye className="h-3.5 w-3.5 text-info" aria-label="Ouvert" />}
                            {r.clicked_at && <MousePointerClick className="h-3.5 w-3.5 text-primary" aria-label="Cliqué" />}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filtered.length > 200 && (
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  Affichage limité aux 200 envois les plus récents. Affinez les filtres pour voir plus.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, variant = "default",
}: {
  label: string; value: number; icon: any;
  variant?: "default" | "success" | "destructive" | "warning" | "info";
}) {
  const variantClass = {
    default: "text-foreground",
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-warning",
    info: "text-info",
  }[variant];
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={cn("text-2xl font-bold", variantClass)}>{value}</div>
          </div>
          <Icon className={cn("h-5 w-5", variantClass)} />
        </div>
      </CardContent>
    </Card>
  );
}
