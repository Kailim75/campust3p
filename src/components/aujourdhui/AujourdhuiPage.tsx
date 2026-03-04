import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { ProspectDetailSheet } from "@/components/prospects/ProspectDetailSheet";
import { ProspectSendEmailDialog } from "@/components/prospects/ProspectSendEmailDialog";
import {
  FileCheck, AlertTriangle, Phone, Mail, Calendar, Clock,
  UserCheck, CreditCard, FolderOpen, ChevronRight, CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/phone-utils";
import { format, isPast, isToday, differenceInDays, parseISO, startOfDay, endOfDay, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { Prospect } from "@/hooks/useProspects";

// ─── CMA required docs ───
const CMA_REQUIRED_DOCS = ["cni", "photo", "attestation_domicile", "permis_b"];

function useAujourdhuiData() {
  return useQuery({
    queryKey: ["aujourdhui-inbox"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const in14Days = addDays(new Date(), 14).toISOString().split("T")[0];

      const [
        contactsRes, docsRes, facturesRes, paiementsRes,
        prospectsRes, sessionsRes, inscriptionsRes, rappelsRes
      ] = await Promise.all([
        supabase.from("contacts").select("id, nom, prenom, formation, statut, email, telephone, updated_at").eq("archived", false),
        supabase.from("contact_documents").select("contact_id, type_document"),
        supabase.from("factures").select("id, contact_id, montant_total, statut, date_echeance"),
        supabase.from("paiements").select("facture_id, montant"),
        supabase.from("prospects").select("*").eq("is_active", true).not("statut", "in", '("converti","perdu")'),
        supabase.from("sessions").select("id, nom, date_debut, date_fin, statut").eq("archived", false).lte("date_debut", in14Days).gte("date_fin", todayStr),
        supabase.from("session_inscriptions").select("contact_id, session_id"),
        supabase.from("contact_historique").select("contact_id, date_rappel, alerte_active, rappel_description").eq("alerte_active", true).not("date_rappel", "is", null),
      ]);

      const contacts = contactsRes.data || [];
      const docs = docsRes.data || [];
      const factures = facturesRes.data || [];
      const paiements = paiementsRes.data || [];
      const prospects = (prospectsRes.data || []) as Prospect[];
      const sessions = sessionsRes.data || [];
      const inscriptions = inscriptionsRes.data || [];
      const rappels = rappelsRes.data || [];

      // Build docs map per contact
      const docsMap = new Map<string, Set<string>>();
      docs.forEach((d: any) => {
        if (!docsMap.has(d.contact_id)) docsMap.set(d.contact_id, new Set());
        docsMap.get(d.contact_id)!.add(d.type_document);
      });

      // Build paiements map per facture
      const paiementsMap = new Map<string, number>();
      paiements.forEach((p: any) => {
        paiementsMap.set(p.facture_id, (paiementsMap.get(p.facture_id) || 0) + Number(p.montant || 0));
      });

      // Build inscriptions set
      const inscribedContactIds = new Set(inscriptions.map((i: any) => i.contact_id));

      // ─── Bloc A: CMA à traiter ───
      const cmaItems = contacts
        .filter(c => c.statut !== "Abandonné" && c.statut !== "En attente de validation")
        .map(c => {
          const contactDocs = docsMap.get(c.id) || new Set();
          const missingDocs = CMA_REQUIRED_DOCS.filter(d => !contactDocs.has(d));
          return { ...c, missingDocs, docCount: contactDocs.size };
        })
        .filter(c => c.missingDocs.length > 0)
        .sort((a, b) => b.missingDocs.length - a.missingDocs.length)
        .slice(0, 10);

      // ─── Bloc B: RDV du jour (prospects with date_prochaine_relance = today) ───
      const rdvToday = prospects
        .filter(p => p.date_prochaine_relance && isToday(parseISO(p.date_prochaine_relance)))
        .slice(0, 10);

      // ─── Bloc C: Relances à faire ───
      const relances = prospects
        .filter(p => {
          if (p.statut === "relance") return true;
          if (p.date_prochaine_relance && isPast(parseISO(p.date_prochaine_relance)) && !isToday(parseISO(p.date_prochaine_relance))) return true;
          return false;
        })
        .sort((a, b) => {
          const da = a.date_prochaine_relance ? new Date(a.date_prochaine_relance).getTime() : Infinity;
          const db = b.date_prochaine_relance ? new Date(b.date_prochaine_relance).getTime() : Infinity;
          return da - db;
        })
        .slice(0, 10);

      // ─── Bloc D: Apprenants critiques ───
      const critiques = contacts
        .filter(c => c.statut !== "Abandonné" && c.statut !== "En attente de validation")
        .map(c => {
          const contactDocs = docsMap.get(c.id) || new Set();
          const missingCMA = CMA_REQUIRED_DOCS.filter(d => !contactDocs.has(d));
          
          // Check unpaid factures
          const contactFactures = factures.filter((f: any) => f.contact_id === c.id);
          const hasUnpaid = contactFactures.some((f: any) => {
            if (f.statut === "payee") return false;
            const paid = paiementsMap.get(f.id) || 0;
            return paid < Number(f.montant_total || 0);
          });

          const hasLatePayment = contactFactures.some((f: any) => 
            f.statut === "emise" && f.date_echeance && f.date_echeance < todayStr
          );

          // Session < 14 days + dossier incomplet
          const isInscribed = inscribedContactIds.has(c.id);
          const sessionSoon = isInscribed; // simplified: if inscribed in upcoming sessions

          const reasons: string[] = [];
          if (missingCMA.length > 0) reasons.push("Docs CMA manquants");
          if (hasLatePayment) reasons.push("Paiement en retard");
          if (sessionSoon && missingCMA.length > 0) reasons.push("Session proche + dossier incomplet");

          return { ...c, reasons, missingCMA, hasLatePayment, hasUnpaid };
        })
        .filter(c => c.reasons.length > 0)
        .sort((a, b) => b.reasons.length - a.reasons.length)
        .slice(0, 10);

      return {
        cmaItems,
        rdvToday,
        relances,
        critiques,
        totalActions: cmaItems.length + rdvToday.length + relances.length + critiques.length,
      };
    },
    staleTime: 30_000,
  });
}

const DOC_LABELS: Record<string, string> = {
  cni: "Pièce d'identité",
  photo: "Photo d'identité",
  attestation_domicile: "Justificatif domicile",
  permis_b: "Permis",
};

interface AujourdhuiPageProps {
  onNavigate?: (section: string) => void;
}

export function AujourdhuiPage({ onNavigate }: AujourdhuiPageProps) {
  const { data, isLoading } = useAujourdhuiData();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactDetailOpen, setContactDetailOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [prospectDetailOpen, setProspectDetailOpen] = useState(false);

  const openContact = (id: string) => {
    setSelectedContactId(id);
    setContactDetailOpen(true);
  };

  const openProspect = (p: Prospect) => {
    setSelectedProspect(p);
    setProspectDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="Aujourd'hui" subtitle="Votre inbox d'actions du jour" />
        <div className="px-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const { cmaItems = [], rdvToday = [], relances = [], critiques = [] } = data || {};

  return (
    <div className="space-y-6">
      <Header title="Aujourd'hui" subtitle={`${data?.totalActions || 0} actions à traiter`} />

      <div className="px-8 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ─── BLOC A: CMA à traiter ─── */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileCheck className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">CMA à traiter</h3>
                <p className="text-[11px] text-muted-foreground">{cmaItems.length} dossier{cmaItems.length > 1 ? "s" : ""} incomplet{cmaItems.length > 1 ? "s" : ""}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary">{cmaItems.length}</Badge>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {cmaItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success/50" />
                Tous les dossiers CMA sont complets
              </div>
            ) : cmaItems.map((item) => (
              <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <button onClick={() => openContact(item.id)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    {item.prenom} {item.nom}
                    <ExternalLink className="h-3 w-3 opacity-40" />
                  </button>
                  {item.formation && <Badge variant="outline" className="text-[10px]">{item.formation}</Badge>}
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.missingDocs.map(d => (
                    <Badge key={d} variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                      ✗ {DOC_LABELS[d] || d}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {item.email && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => window.open(`mailto:${item.email}?subject=Documents CMA manquants&body=Bonjour ${item.prenom},%0A%0AIl manque les documents suivants pour compléter votre dossier CMA :%0A${item.missingDocs.map(d => `- ${DOC_LABELS[d] || d}`).join('%0A')}%0A%0AMerci de nous les transmettre rapidement.%0A%0ACordialement,%0AT3P Campus`)}>
                      <Mail className="h-3 w-3 mr-1" /> Relance docs
                    </Button>
                  )}
                  {item.telephone && (
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-success" onClick={() => openWhatsApp(item.telephone)}>
                      <SiWhatsapp className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ─── BLOC B: RDV du jour ─── */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-warning" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">RDV du jour</h3>
                <p className="text-[11px] text-muted-foreground">{rdvToday.length} rendez-vous prévus</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-warning/10 text-warning">{rdvToday.length}</Badge>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {rdvToday.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Aucun RDV prévu aujourd'hui
              </div>
            ) : rdvToday.map((p) => (
              <div key={p.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <button onClick={() => openProspect(p)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    {p.prenom} {p.nom}
                    <ExternalLink className="h-3 w-3 opacity-40" />
                  </button>
                  <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning">Aujourd'hui</Badge>
                </div>
                {p.formation_souhaitee && (
                  <p className="text-xs text-muted-foreground mb-2">{p.formation_souhaitee}</p>
                )}
                <div className="flex gap-1.5">
                  {p.email && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => window.open(`mailto:${p.email}?subject=Confirmation de votre rendez-vous&body=Bonjour ${p.prenom},%0A%0ANous confirmons votre rendez-vous prévu aujourd'hui.%0A%0AÀ très bientôt !%0AT3P Campus`)}>
                      <Mail className="h-3 w-3 mr-1" /> Confirmer RDV
                    </Button>
                  )}
                  {p.telephone && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px]" asChild>
                        <a href={`tel:${p.telephone}`}><Phone className="h-3 w-3 mr-1" /> Appeler</a>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] text-success" onClick={() => openWhatsApp(p.telephone)}>
                        <SiWhatsapp className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ─── BLOC C: Relances à faire ─── */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Relances à faire</h3>
                <p className="text-[11px] text-muted-foreground">{relances.length} prospect{relances.length > 1 ? "s" : ""} en attente</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-accent/10 text-accent">{relances.length}</Badge>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {relances.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success/50" />
                Toutes les relances sont à jour
              </div>
            ) : relances.map((p) => (
              <div key={p.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <button onClick={() => openProspect(p)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    {p.prenom} {p.nom}
                    <ExternalLink className="h-3 w-3 opacity-40" />
                  </button>
                  {p.date_prochaine_relance && (
                    <Badge variant="outline" className={cn(
                      "text-[10px]",
                      isPast(parseISO(p.date_prochaine_relance)) ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                    )}>
                      {isPast(parseISO(p.date_prochaine_relance))
                        ? `${Math.abs(differenceInDays(parseISO(p.date_prochaine_relance), new Date()))}j retard`
                        : format(parseISO(p.date_prochaine_relance), "dd/MM", { locale: fr })
                      }
                    </Badge>
                  )}
                </div>
                {p.formation_souhaitee && (
                  <p className="text-xs text-muted-foreground mb-2">{p.formation_souhaitee}</p>
                )}
                <div className="flex gap-1.5">
                  {p.email && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => window.open(`mailto:${p.email}?subject=Votre projet de formation ${p.formation_souhaitee || ''}&body=Bonjour ${p.prenom},%0A%0ANous revenons vers vous concernant votre projet de formation.%0A%0AN'hésitez pas à nous contacter pour en discuter.%0A%0ACordialement,%0AT3P Campus`)}>
                      <Mail className="h-3 w-3 mr-1" /> Relancer
                    </Button>
                  )}
                  {p.telephone && (
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-success" onClick={() => openWhatsApp(p.telephone)}>
                      <SiWhatsapp className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ─── BLOC D: Apprenants critiques ─── */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Apprenants critiques</h3>
                <p className="text-[11px] text-muted-foreground">{critiques.length} action{critiques.length > 1 ? "s" : ""} requise{critiques.length > 1 ? "s" : ""}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">{critiques.length}</Badge>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {critiques.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success/50" />
                Aucun apprenant en situation critique
              </div>
            ) : critiques.map((item) => (
              <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <button onClick={() => openContact(item.id)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    {item.prenom} {item.nom}
                    <ExternalLink className="h-3 w-3 opacity-40" />
                  </button>
                  {item.formation && <Badge variant="outline" className="text-[10px]">{item.formation}</Badge>}
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.reasons.map((r, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                      {r}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {item.missingCMA.length > 0 && item.email && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => window.open(`mailto:${item.email}?subject=Documents manquants — Urgent&body=Bonjour ${item.prenom},%0A%0AIl manque les documents suivants pour votre dossier :%0A${item.missingCMA.map(d => `- ${DOC_LABELS[d] || d}`).join('%0A')}%0A%0AMerci de les transmettre en urgence.%0A%0ACordialement,%0AT3P Campus`)}>
                      <FolderOpen className="h-3 w-3 mr-1" /> Demander docs
                    </Button>
                  )}
                  {item.hasLatePayment && item.email && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/20" onClick={() => window.open(`mailto:${item.email}?subject=Rappel de paiement&body=Bonjour ${item.prenom},%0A%0ANous vous rappelons qu'un paiement est en attente pour votre formation.%0A%0AMerci de régulariser votre situation.%0A%0ACordialement,%0AT3P Campus`)}>
                      <CreditCard className="h-3 w-3 mr-1" /> Relance paiement
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Detail sheets */}
      <ApprenantDetailSheet contactId={selectedContactId} open={contactDetailOpen} onOpenChange={setContactDetailOpen} />
      <ProspectDetailSheet prospect={selectedProspect} open={prospectDetailOpen} onOpenChange={setProspectDetailOpen} />
    </div>
  );
}
