// ═══════════════════════════════════════════════════════════════
// SuiviTab — Communications, Notes & Rappels (unified)
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, StickyNote, Bell, Plus, Send, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SuiviTabProps {
  contactId: string;
  contactPrenom: string;
  contactNom: string;
  contactEmail: string | null;
  contactFormation: string | null;
}

export function SuiviTab({ contactId, contactPrenom, contactNom }: SuiviTabProps) {
  const [subTab, setSubTab] = useState("communications");

  return (
    <div className="space-y-3">
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
  const [newType, setNewType] = useState("note");
  const [rdvDate, setRdvDate] = useState("");
  const [rdvHeure, setRdvHeure] = useState("09:00");
  const queryClient = useQueryClient();

  const { data: historique = [], isLoading } = useQuery({
    queryKey: ["contact-historique", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_historique")
        .select("*")
        .eq("contact_id", contactId)
        .order("date_echange", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim()) return;
      const insertData: Record<string, unknown> = {
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
      toast.success(newType === "rdv" ? "RDV programmé" : "Échange ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const typeLabels: Record<string, string> = {
    appel: "Appel", email: "Email", sms: "SMS", rdv: "RDV", note: "Note", whatsapp: "WhatsApp", reunion: "Réunion",
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={newType === "rdv" ? "Objet du rendez-vous..." : "Ajouter un échange..."}
              className="text-sm min-h-[60px]"
            />
          </div>
          {newType === "rdv" && (
            <div className="flex gap-2 items-center">
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
        <p className="text-xs text-muted-foreground text-center py-4">Aucun échange enregistré</p>
      ) : (
        <div className="space-y-2">
          {historique.map((h) => (
            <Card key={h.id} className={`border-l-2 ${h.type === "rdv" ? "border-l-primary" : "border-l-primary/30"}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant={h.type === "rdv" ? "default" : "outline"} className="text-[10px]">{typeLabels[h.type] || h.type}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(h.date_echange), "dd MMM yyyy HH:mm", { locale: fr })}
                  </span>
                </div>
                <p className="text-xs font-medium">{h.titre}</p>
                {h.contenu && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{h.contenu}</p>}
                {h.date_rappel && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-primary">
                    <Clock className="h-3 w-3" />
                    RDV le {format(new Date(h.date_rappel), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
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
        .select("*")
        .eq("contact_id", contactId)
        .eq("type", "note_interne")
        .order("date_echange", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!newNote.trim()) return;
      const { error } = await supabase.from("contact_historique").insert({
        contact_id: contactId,
        titre: "Note interne",
        contenu: newNote.trim(),
        type: "note_interne",
        date_echange: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["contact-notes", contactId] });
      toast.success("Note ajoutée");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 space-y-2">
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
        <p className="text-xs text-muted-foreground text-center py-4">Aucune note interne</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Card key={n.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <StickyNote className="h-3 w-3 text-muted-foreground" />
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
        .select("*")
        .eq("contact_id", contactId)
        .not("date_rappel", "is", null)
        .order("date_rappel", { ascending: true })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });

  const addRappel = useMutation({
    mutationFn: async () => {
      if (!newRappel.trim() || !dateRappel) return;
      const { error } = await supabase.from("contact_historique").insert({
        contact_id: contactId,
        titre: "Rappel",
        rappel_description: newRappel.trim(),
        type: "rappel",
        date_echange: new Date().toISOString(),
        date_rappel: dateRappel,
        alerte_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewRappel("");
      setDateRappel("");
      queryClient.invalidateQueries({ queryKey: ["contact-rappels", contactId] });
      toast.success("Rappel ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
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
      toast.success("Rappel marqué comme traité");
    },
  });

  const now = new Date();

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 space-y-2">
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
        <p className="text-xs text-muted-foreground text-center py-4">Aucun rappel programmé</p>
      ) : (
        <div className="space-y-2">
          {rappels.map((r) => {
            const isOverdue = r.date_rappel && new Date(r.date_rappel) < now && r.alerte_active;
            return (
              <Card key={r.id} className={isOverdue ? "border-destructive/50" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className={`h-3 w-3 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`} />
                      <span className={`text-xs font-medium ${isOverdue ? "text-destructive" : ""}`}>
                        {r.date_rappel && format(new Date(r.date_rappel), "dd MMM yyyy", { locale: fr })}
                      </span>
                      {!r.alerte_active && <Badge variant="secondary" className="text-[10px]">Traité</Badge>}
                      {isOverdue && <Badge variant="destructive" className="text-[10px]">En retard</Badge>}
                    </div>
                    {r.alerte_active && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => markDone.mutate(r.id)}>
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
