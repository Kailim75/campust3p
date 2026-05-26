import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  Clock,
  Mail,
  XCircle,
  AlertTriangle,
  Search,
  Send,
  Copy,
  FileSignature,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useSendSignatureEmail } from "@/hooks/useSignatures";

type Row = {
  id: string;
  contact_id: string;
  session_inscription_id: string | null;
  type_document: string;
  titre: string;
  statut: string;
  date_envoi: string | null;
  date_signature: string | null;
  date_expiration: string | null;
  signing_token: string | null;
  signature_url: string | null;
  created_at: string;
  contact: { id: string; nom: string; prenom: string; email: string | null } | null;
  session_inscription: {
    id: string;
    session: { id: string; nom: string; date_debut: string | null; formation_type: string | null } | null;
  } | null;
};

const STATUT_META: Record<string, { label: string; cls: string; icon: any }> = {
  en_attente: { label: "En attente", cls: "bg-muted text-muted-foreground", icon: Clock },
  envoye: { label: "Envoyé", cls: "bg-info/10 text-info", icon: Mail },
  signe: { label: "Signé", cls: "bg-success/10 text-success", icon: CheckCircle },
  refuse: { label: "Refusé", cls: "bg-destructive/10 text-destructive", icon: XCircle },
  expire: { label: "Expiré", cls: "bg-warning/10 text-warning", icon: AlertTriangle },
};

function effectiveStatut(r: Row): string {
  if (r.statut === "envoye" && r.date_expiration && isPast(parseISO(r.date_expiration))) {
    return "expire";
  }
  return r.statut;
}

function StatutBadge({ statut }: { statut: string }) {
  const meta = STATUT_META[statut] || STATUT_META.en_attente;
  const Icon = meta.icon;
  return (
    <Badge className={cn("gap-1", meta.cls)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

export function SignaturesTrackingPanel() {
  const [search, setSearch] = useState("");
  const sendEmail = useSendSignatureEmail();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["signature_requests", "tracking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signature_requests")
        .select(`
          id, contact_id, session_inscription_id, type_document, titre, statut,
          date_envoi, date_signature, date_expiration, signing_token, signature_url, created_at,
          contact:contacts(id, nom, prenom, email),
          session_inscription:session_inscriptions(id, session:sessions(id, nom, date_debut, formation_type))
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as Row[];
    },
  });

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        sessionId: string | null;
        nom: string;
        dateDebut: string | null;
        formationType: string | null;
        rows: Row[];
      }
    >();
    for (const r of rows) {
      const sess = r.session_inscription?.session ?? null;
      const key = sess?.id ?? "__none__";
      if (!map.has(key)) {
        map.set(key, {
          key,
          sessionId: sess?.id ?? null,
          nom: sess?.nom ?? "Hors session",
          dateDebut: sess?.date_debut ?? null,
          formationType: sess?.formation_type ?? null,
          rows: [],
        });
      }
      map.get(key)!.rows.push(r);
    }
    const arr = Array.from(map.values());
    // sort: sessions first by date desc, "hors session" last
    arr.sort((a, b) => {
      if (a.key === "__none__") return 1;
      if (b.key === "__none__") return -1;
      const ad = a.dateDebut ? new Date(a.dateDebut).getTime() : 0;
      const bd = b.dateDebut ? new Date(b.dateDebut).getTime() : 0;
      return bd - ad;
    });
    return arr;
  }, [rows]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        rows: g.rows.filter((r) => {
          const c = r.contact;
          return (
            g.nom.toLowerCase().includes(q) ||
            r.titre.toLowerCase().includes(q) ||
            r.type_document.toLowerCase().includes(q) ||
            `${c?.prenom ?? ""} ${c?.nom ?? ""}`.toLowerCase().includes(q) ||
            (c?.email ?? "").toLowerCase().includes(q)
          );
        }),
      }))
      .filter((g) => g.rows.length > 0);
  }, [groups, search]);

  const globalStats = useMemo(() => {
    const stats = { total: 0, signe: 0, envoye: 0, en_attente: 0, refuse: 0, expire: 0 };
    for (const r of rows) {
      stats.total++;
      const s = effectiveStatut(r) as keyof typeof stats;
      if (s in stats) (stats as any)[s]++;
    }
    return stats;
  }, [rows]);

  const copyLink = (r: Row) => {
    if (!r.signing_token) {
      toast.error("Aucun token actif. Envoyez la demande pour générer un lien.");
      return;
    }
    const link = `${window.location.origin}/signature/${r.id}/${r.signing_token}?token=${r.signing_token}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien copié");
  };

  const resend = async (r: Row) => {
    try {
      await sendEmail.mutateAsync({ signatureRequestId: r.id, type: "signature_request" });
    } catch {
      /* handled in hook */
    }
  };

  return (
    <div className="space-y-4">
      {/* Global summary */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold">{globalStats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Signés</p>
          <p className="text-xl font-bold text-success">{globalStats.signe}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Envoyés</p>
          <p className="text-xl font-bold text-info">{globalStats.envoye}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">En attente</p>
          <p className="text-xl font-bold">{globalStats.en_attente}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Refusés</p>
          <p className="text-xl font-bold text-destructive">{globalStats.refuse}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Expirés</p>
          <p className="text-xl font-bold text-warning">{globalStats.expire}</p>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher session, contact, document..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Groups */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileSignature className="h-10 w-10 mx-auto mb-2 opacity-50" />
          Aucune demande de signature
        </CardContent></Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {filteredGroups.map((g) => {
            const counts = { signe: 0, envoye: 0, en_attente: 0, refuse: 0, expire: 0 };
            for (const r of g.rows) {
              const s = effectiveStatut(r) as keyof typeof counts;
              if (s in counts) counts[s]++;
            }
            const total = g.rows.length;
            const pct = total ? Math.round((counts.signe / total) * 100) : 0;
            const pending = counts.envoye + counts.en_attente;

            return (
              <AccordionItem
                key={g.key}
                value={g.key}
                className="border rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{g.nom}</p>
                        {g.formationType && (
                          <Badge variant="outline" className="text-xs">{g.formationType}</Badge>
                        )}
                        {g.dateDebut && (
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(g.dateDebut), "dd MMM yyyy", { locale: fr })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={pct} className="h-2 w-32" />
                        <span className="text-xs text-muted-foreground">
                          {counts.signe}/{total} signés ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {counts.signe > 0 && <Badge className="bg-success/10 text-success">✓ {counts.signe}</Badge>}
                      {pending > 0 && <Badge className="bg-info/10 text-info">⏳ {pending}</Badge>}
                      {counts.expire > 0 && <Badge className="bg-warning/10 text-warning">⚠ {counts.expire}</Badge>}
                      {counts.refuse > 0 && <Badge className="bg-destructive/10 text-destructive">✕ {counts.refuse}</Badge>}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Envoyé le</TableHead>
                        <TableHead>Signé le</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.rows.map((r) => {
                        const s = effectiveStatut(r);
                        const c = r.contact;
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className="min-w-0">
                                <p className="font-medium">{c?.prenom} {c?.nom}</p>
                                {c?.email && (
                                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{r.titre}</p>
                              <p className="text-xs text-muted-foreground capitalize">{r.type_document}</p>
                            </TableCell>
                            <TableCell><StatutBadge statut={s} /></TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {r.date_envoi ? format(parseISO(r.date_envoi), "dd/MM/yy HH:mm") : "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {r.date_signature ? format(parseISO(r.date_signature), "dd/MM/yy HH:mm") : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {(s === "envoye" || s === "expire" || s === "en_attente") && (
                                  <>
                                    <Button size="sm" variant="ghost" onClick={() => resend(r)} title="Renvoyer">
                                      <Send className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => copyLink(r)} title="Copier le lien">
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {s === "signe" && r.signature_url && (
                                  <Button size="sm" variant="ghost" onClick={() => window.open(r.signature_url!, "_blank")}>
                                    Voir
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
