import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, StickyNote, Bell, Plus, Send, Clock, CheckCircle2, CalendarClock, Mail, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface SuiviTabProps {
  contactId: string;
  contactPrenom: string;
  contactNom: string;
  contactEmail: string | null;
  contactFormation: string | null;
}

type HistoriqueRow = Pick<
  Tables<"contact_historique">,
  "id" | "titre" | "contenu" | "type" | "date_echange" | "date_rappel" | "alerte_active" | "rappel_description"
>;
type HistoriqueInsert = TablesInsert<"contact_historique">;
type HistoriqueType = "appel" | "email" | "sms" | "rdv" | "note" | "whatsapp" | "reunion" | "note_interne" | "rappel";

const COMMUNICATION_TYPES: HistoriqueType[] = ["appel", "email", "sms", "rdv", "note", "whatsapp", "reunion"];

const typeLabels: Record<HistoriqueType, string> = {
  appel: "Appel",
  email: "Email",
  sms: "SMS",
  rdv: "RDV",
  note: "Note",
  whatsapp: "WhatsApp",
  reunion: "Réunion",
  note_interne: "Note interne",
  rappel: "Rappel",
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

function formatRelativeFollowUp(date: string | null): string {
  if (!date) return "Aucun";

  const parsedDate = parseISO(date);

  if (isToday(parsedDate)) {
    return `Aujourd'hui à ${format(parsedDate, "HH:mm", { locale: fr })}`;
  }

  if (isTomorrow(parsedDate)) {
    return `Demain à ${format(parsedDate, "HH:mm", { locale: fr })}`;
  }

  return format(parsedDate, "dd MMM yyyy 'à' HH:mm", { locale: fr });
}

export function SuiviTab({ contactId, contactPrenom, contactNom, contactEmail, contactFormation }: SuiviTabProps) {
  const [subTab, setSubTab] = useState("communications");
  const now = new Date();

  const { data: suiviSummary = [] } = useQuery({
    queryKey: ["contact-suivi-summary", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_historique")
        .select("id, type, date_echange, date_rappel, alerte_active")
        .eq("contact_id", contactId)
        .order("date_echange", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as Pick<HistoriqueRow, "id" | "type" | "date_echange" | "date_rappel" | "alerte_active">[];
    },
    enabled: Boolean(contactId),
  });

  const summary = useMemo(() => {
    const communications = suiviSummary.filter((entry) => COMMUNICATION_TYPES.includes(entry.type as HistoriqueType));
    const notes = suiviSummary.filter((entry) => entry.type === "note_interne");
    const reminders = suiviSummary.filter((entry) => entry.date_rappel);
    const activeReminders = reminders.filter((entry) => entry.alerte_active);
    const overdueReminders = activeReminders.filter((entry) => entry.date_rappel && isPast(parseISO(entry.date_rappel)));
    const upcomingMeetings = communications.filter(
      (entry) => entry.type === "rdv" && entry.date_rappel && !isPast(parseISO(entry.date_rappel)),
    );

    return {
      communicationsCount: communications.length,
      notesCount: notes.length,
      activeRemindersCount: activeReminders.length,
      overdueRemindersCount: overdueReminders.length,
      upcomingMeetingsCount: upcomingMeetings.length,
      lastExchangeDate: communications[0]?.date_echange || null,
      nextReminderDate: activeReminders
        .map((entry) => entry.date_rappel)
        .filter((date): date is string => Boolean(date))
        .sort()[0] ?? null,
    };
  }, [suiviSummary]);

  return (
    <div className="space-y-4">
      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold">Pilotage du suivi</p>
                <p className="text-xs text-muted-foreground">
                  Toute la relation apprenant au même endroit : échanges, notes internes et rappels à traiter.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {contactFormation && (
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    <GraduationCap className="h-3 w-3" />
                    {contactFormation}
                  </Badge>
                )}
                {contactEmail ? (
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    <Mail className="h-3 w-3" />
                    {contactEmail}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[11px]">
                    Email non renseigné
                  </Badge>
                )}
                {summary.overdueRemindersCount > 0 && (
                  <Badge variant="destructive" className="text-[11px]">
                    {summary.overdueRemindersCount} rappel{summary.overdueRemindersCount > 1 ? "s" : ""} en retard
                  </Badge>
                )}
              </div>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2 text-xs">
              <p className="font-medium">Dernière activité</p>
              <p className="text-muted-foreground">
                {summary.lastExchangeDate
                  ? format(parseISO(summary.lastExchangeDate), "dd MMM yyyy 'à' HH:mm", { locale: fr })
                  : "Aucun échange enregistré"}
              </p>
              <p className="mt-1 text-muted-foreground">
                Prochain rappel : {formatRelativeFollowUp(summary.nextReminderDate)}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Échanges</p>
                <p className="mt-1 text-lg font-semibold">{summary.communicationsCount}</p>
                <p className="text-xs text-muted-foreground">
                  dont {summary.upcomingMeetingsCount} RDV à venir
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes internes</p>
                <p className="mt-1 text-lg font-semibold">{summary.notesCount}</p>
                <p className="text-xs text-muted-foreground">Mémoire opérationnelle du dossier</p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rappels actifs</p>
                <p className="mt-1 text-lg font-semibold">{summary.activeRemindersCount}</p>
                <p className="text-xs text-muted-foreground">
                  {summary.nextReminderDate ? `Prochain : ${formatRelativeFollowUp(summary.nextReminderDate)}` : "Aucun rappel en attente"}
                </p>
              </CardContent>
            </Card>
            <Card className={summary.overdueRemindersCount > 0 ? "border-destructive/40 bg-destructive/5" : "border-border/70"}>
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Urgence</p>
                <p className="mt-1 text-lg font-semibold">{summary.overdueRemindersCount}</p>
                <p className="text-xs text-muted-foreground">
                  rappel{summary.overdueRemindersCount > 1 ? "s" : ""} à reprendre aujourd&apos;hui
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-8 bg-muted/50 p-0.5 gap-0.5">
          <TabsTrigger value="communications" className="text-xs px-3 py-1 gap-1 data-[state=active]:bg-background">
            <MessageCircle className="h-3 w-3" />
            Échanges
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs px-3 py-1 gap-1 data-[state=active]:bg-background">
            <StickyNote className="h-3 w-3" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="rappels" className="text-xs px-3 py-1 gap-1 data-[state=active]:bg-background">
            <Bell className="h-3 w-3" />
            Rappels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="communications" className="mt-2">
          <CommunicationsSection contactId={contactId} contactPrenom={contactPrenom} contactNom={contactNom} />
        </TabsContent>
        <TabsContent value="notes" className="mt-2">
          <NotesSection contactId={contactId} />
        </TabsContent>
        <TabsContent value="rappels" className="mt-2">
          <RappelsSection contactId={contactId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Communications (historique d'échanges) ──

function CommunicationsSection({ contactId, contactPrenom, contactNom }: { contactId: string; contactPrenom: string; contactNom: string }) {
  const [newMessage, setNewMessage] = useState("");
  const [newType, setNewType] = useState<HistoriqueType>("note");
  const [rdvDate, setRdvDate] = useState("");
  const [rdvHeure, setRdvHeure] = useState("09:00");
  const queryClient = useQueryClient();

  const { data: historique = [], isLoading } = useQuery({
    queryKey: ["contact-historique", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_historique")
        .select("id, titre, contenu, type, date_echange, date_rappel, alerte_active, rappel_description")
        .eq("contact_id", contactId)
        .order("date_echange", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as HistoriqueRow[];
    },
    enabled: !!contactId,
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim()) {
        throw new Error("Merci de saisir un échange avant de l'ajouter.");
      }

      const insertData: HistoriqueInsert = {
        contact_id: contactId,
        titre: newType === "rdv" ? `RDV — ${newMessage.trim()}` : `Échange avec ${contactPrenom} ${contactNom}`,
        contenu: newMessage.trim(),
        type: newType,
        date_echange: new Date().toISOString(),
      };
      if (newType === "rdv" && rdvDate) {
        insertData.date_rappel = `${rdvDate}T${rdvHeure}:00`;
        insertData.alerte_active = true;
        insertData.rappel_description = newMessage.trim();
      }
      const { error } = await supabase.from("contact_historique").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      setRdvDate("");
      setRdvHeure("09:00");
      queryClient.invalidateQueries({ queryKey: ["contact-historique", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contact-rappels", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contact-suivi-summary", contactId] });
      toast.success(newType === "rdv" ? "RDV programmé" : "Échange ajouté");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Erreur lors de l'ajout de l'échange.")),
  });
  const nextMeeting = historique.find((entry) => entry.type === "rdv" && entry.date_rappel && !isPast(parseISO(entry.date_rappel)));

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium">Journal des échanges</p>
              <p className="text-xs text-muted-foreground">
                Appels, emails, WhatsApp et rendez-vous liés au dossier.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {historique.length} échange{historique.length > 1 ? "s" : ""} enregistré{historique.length > 1 ? "s" : ""}
              {nextMeeting?.date_rappel ? ` · Prochain RDV ${formatRelativeFollowUp(nextMeeting.date_rappel)}` : ""}
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as HistoriqueType)}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              {COMMUNICATION_TYPES.map((type) => (
                <option key={type} value={type}>{typeLabels[type]}</option>
              ))}
            </select>
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={newType === "rdv" ? "Objet du rendez-vous..." : "Ajouter un échange utile pour l'équipe..."}
              className="text-sm min-h-[60px]"
            />
          </div>
          {newType === "rdv" && (
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                type="date"
                value={rdvDate}
                onChange={(e) => setRdvDate(e.target.value)}
                className="text-xs w-40"
                placeholder="Date du RDV"
              />
              <Input
                type="time"
                value={rdvHeure}
                onChange={(e) => setRdvHeure(e.target.value)}
                className="text-xs w-28"
              />
              <p className="text-xs text-muted-foreground">
                Le RDV sera aussi visible dans les rappels actifs.
              </p>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => addEntry.mutate()}
              disabled={!newMessage.trim() || (newType === "rdv" && !rdvDate) || addEntry.isPending}
            >
              <Send className="h-3 w-3 mr-1" />
              {newType === "rdv" ? "Programmer" : "Ajouter"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Chargement…</p>
      ) : historique.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Aucun échange enregistré</p>
              <p className="text-xs text-muted-foreground">
                Commence par noter le dernier appel, email ou rendez-vous utile pour l&apos;équipe.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {historique.map((h) => (
            <Card key={h.id} className={`border-l-2 ${h.type === "rdv" ? "border-l-primary" : "border-l-primary/30"}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant={h.type === "rdv" ? "default" : "outline"} className="text-[10px]">{typeLabels[h.type as HistoriqueType] || h.type}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(h.date_echange), "dd MMM yyyy HH:mm", { locale: fr })}
                  </span>
                </div>
                <p className="text-xs font-medium">{h.titre}</p>
                {h.contenu && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{h.contenu}</p>}
                {h.date_rappel && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-primary">
                      <Clock className="h-3 w-3" />
                      RDV le {formatRelativeFollowUp(h.date_rappel)}
                    </div>
                    {h.alerte_active ? (
                      <Badge variant="outline" className="text-[10px]">Rappel actif</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Traité</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notes internes ──

function NotesSection({ contactId }: { contactId: string }) {
  const [newNote, setNewNote] = useState("");
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["contact-notes", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_historique")
        .select("id, titre, contenu, type, date_echange, date_rappel, alerte_active, rappel_description")
        .eq("contact_id", contactId)
        .eq("type", "note_interne")
        .order("date_echange", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as HistoriqueRow[];
    },
    enabled: !!contactId,
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!newNote.trim()) {
        throw new Error("Merci de saisir une note avant de l'enregistrer.");
      }

      const insertData: HistoriqueInsert = {
        contact_id: contactId,
        titre: "Note interne",
        contenu: newNote.trim(),
        type: "note_interne",
        date_echange: new Date().toISOString(),
      };

      const { error } = await supabase.from("contact_historique").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["contact-notes", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contact-suivi-summary", contactId] });
      toast.success("Note ajoutée");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Erreur lors de l'ajout de la note.")),
  });

  const latestNoteDate = notes[0]?.date_echange
    ? format(parseISO(notes[0].date_echange), "dd MMM yyyy 'à' HH:mm", { locale: fr })
    : null;

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium">Notes internes</p>
              <p className="text-xs text-muted-foreground">
                Réserve cet espace aux informations utiles à l&apos;équipe, non visibles par l&apos;apprenant.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {notes.length} note{notes.length > 1 ? "s" : ""}
              {latestNoteDate ? ` · Dernière le ${latestNoteDate}` : ""}
            </div>
          </div>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Ajouter une note interne..."
            className="text-sm min-h-[60px]"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={() => addNote.mutate()} disabled={!newNote.trim() || addNote.isPending}>
              <Plus className="h-3 w-3 mr-1" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Chargement…</p>
      ) : notes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
            <StickyNote className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Aucune note interne</p>
              <p className="text-xs text-muted-foreground">
                Utilise cet espace pour garder les consignes, blocages ou décisions utiles au suivi.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Card key={n.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <StickyNote className="h-3 w-3" />
                    <span className="text-[10px] uppercase tracking-wide">Interne</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(n.date_echange), "dd MMM yyyy HH:mm", { locale: fr })}
                  </span>
                </div>
                <p className="text-xs whitespace-pre-wrap">{n.contenu}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rappels ──

function RappelsSection({ contactId }: { contactId: string }) {
  const [newRappel, setNewRappel] = useState("");
  const [dateRappel, setDateRappel] = useState("");
  const queryClient = useQueryClient();

  const { data: rappels = [], isLoading } = useQuery({
    queryKey: ["contact-rappels", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_historique")
        .select("id, titre, contenu, type, date_echange, date_rappel, alerte_active, rappel_description")
        .eq("contact_id", contactId)
        .not("date_rappel", "is", null)
        .order("date_rappel", { ascending: true })
        .limit(30);
      if (error) throw error;
      return (data || []) as HistoriqueRow[];
    },
    enabled: !!contactId,
  });

  const addRappel = useMutation({
    mutationFn: async () => {
      if (!newRappel.trim() || !dateRappel) {
        throw new Error("Choisis une date et décris le rappel avant de l'ajouter.");
      }

      const insertData: HistoriqueInsert = {
        contact_id: contactId,
        titre: "Rappel",
        rappel_description: newRappel.trim(),
        type: "rappel",
        date_echange: new Date().toISOString(),
        date_rappel: dateRappel,
        alerte_active: true,
      };

      const { error } = await supabase.from("contact_historique").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewRappel("");
      setDateRappel("");
      queryClient.invalidateQueries({ queryKey: ["contact-rappels", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contact-suivi-summary", contactId] });
      toast.success("Rappel ajouté");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Erreur lors de l'ajout du rappel.")),
  });

  const markDone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_historique")
        .update({ alerte_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-rappels", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contact-suivi-summary", contactId] });
      toast.success("Rappel marqué comme traité");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Erreur lors de la mise à jour du rappel.")),
  });

  const now = new Date();
  const activeRappels = rappels.filter((rappel) => rappel.alerte_active);
  const overdueRappels = activeRappels.filter((rappel) => rappel.date_rappel && new Date(rappel.date_rappel) < now);
  const completedRappels = rappels.filter((rappel) => !rappel.alerte_active);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium">Rappels et prochaines actions</p>
              <p className="text-xs text-muted-foreground">
                Programme ici les relances à faire et coche-les quand l&apos;action est traitée.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {activeRappels.length} actif{activeRappels.length > 1 ? "s" : ""} · {overdueRappels.length} en retard
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Actifs</p>
                <p className="mt-1 text-lg font-semibold">{activeRappels.length}</p>
              </CardContent>
            </Card>
            <Card className={overdueRappels.length > 0 ? "border-destructive/40 bg-destructive/5" : "border-border/70"}>
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">En retard</p>
                <p className="mt-1 text-lg font-semibold">{overdueRappels.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Traités</p>
                <p className="mt-1 text-lg font-semibold">{completedRappels.length}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Input
              type="date"
              value={dateRappel}
              onChange={(e) => setDateRappel(e.target.value)}
              className="text-xs w-40"
            />
            <Textarea
              value={newRappel}
              onChange={(e) => setNewRappel(e.target.value)}
              placeholder="Description du rappel..."
              className="text-sm min-h-[40px]"
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => addRappel.mutate()} disabled={!newRappel.trim() || !dateRappel || addRappel.isPending}>
              <Bell className="h-3 w-3 mr-1" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Chargement…</p>
      ) : rappels.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Aucun rappel programmé</p>
              <p className="text-xs text-muted-foreground">
                Programme ici les prochaines relances importantes pour ne rien laisser retomber.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rappels.map((r) => {
            const isOverdue = r.date_rappel && new Date(r.date_rappel) < now && r.alerte_active;
            return (
              <Card key={r.id} className={isOverdue ? "border-destructive/50" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className={`h-3 w-3 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`} />
                      <span className={`text-xs font-medium ${isOverdue ? "text-destructive" : ""}`}>
                        {r.date_rappel && format(new Date(r.date_rappel), "dd MMM yyyy", { locale: fr })}
                      </span>
                      {!r.alerte_active && <Badge variant="secondary" className="text-[10px]">Traité</Badge>}
                      {isOverdue && <Badge variant="destructive" className="text-[10px]">En retard</Badge>}
                    </div>
                    {r.alerte_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => markDone.mutate(r.id)}
                        disabled={markDone.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Traiter
                      </Button>
                    )}
                  </div>
                  {r.rappel_description && <p className="text-xs text-muted-foreground mt-1">{r.rappel_description}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
