import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ThreadLinkAddProps {
  threadId: string;
  centreId: string;
}

type EntityType = "contact" | "prospect" | "session" | "facture" | "devis" | "document";

const ENTITY_TYPES: { value: EntityType; label: string; hint: string }[] = [
  { value: "contact", label: "Contact / Apprenant", hint: "Nom, prénom ou email" },
  { value: "prospect", label: "Prospect", hint: "Nom, prénom ou email" },
  { value: "session", label: "Session", hint: "Nom de la session" },
  { value: "facture", label: "Facture", hint: "Numéro de facture" },
  { value: "devis", label: "Devis", hint: "Numéro de devis" },
  { value: "document", label: "Document", hint: "Nom du document" },
];

export function ThreadLinkAdd({ threadId, centreId }: ThreadLinkAddProps) {
  const [entityType, setEntityType] = useState<EntityType>("contact");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentType = ENTITY_TYPES.find((t) => t.value === entityType);

  // Search entities based on type
  const { data: results = [], isLoading: searching } = useQuery({
    queryKey: ["crm-link-search", entityType, search, centreId],
    queryFn: async () => {
      if (!search.trim() || search.trim().length < 2) return [];
      const term = `%${search.trim()}%`;

      switch (entityType) {
        case "contact": {
          const { data } = await supabase
            .from("contacts")
            .select("id, nom, prenom, email, statut_apprenant")
            .eq("centre_id", centreId)
            .eq("archived", false)
            .or(`nom.ilike.${term},prenom.ilike.${term},email.ilike.${term}`)
            .limit(10);
          return (data || []).map((c) => ({
            id: c.id,
            label: `${c.prenom} ${c.nom}`,
            sublabel: [c.statut_apprenant !== "actif" ? c.statut_apprenant : null, c.email].filter(Boolean).join(" • "),
          }));
        }
        case "prospect": {
          const { data } = await supabase
            .from("prospects")
            .select("id, nom, prenom, email")
            .eq("centre_id", centreId)
            .or(`nom.ilike.${term},prenom.ilike.${term},email.ilike.${term}`)
            .limit(10);
          return (data || []).map((p) => ({
            id: p.id,
            label: `${p.prenom} ${p.nom}`,
            sublabel: p.email || "",
          }));
        }
        case "session": {
          const { data } = await supabase
            .from("sessions")
            .select("id, nom, formation_type, date_debut")
            .eq("centre_id", centreId)
            .ilike("nom", term)
            .is("deleted_at", null)
            .limit(10);
          return (data || []).map((s) => ({
            id: s.id,
            label: s.nom,
            sublabel: [s.formation_type, s.date_debut].filter(Boolean).join(" • "),
          }));
        }
        case "facture": {
          const { data } = await supabase
            .from("factures")
            .select("id, numero_facture, montant_total, contacts(nom, prenom)")
            .eq("centre_id", centreId)
            .ilike("numero_facture", term)
            .is("deleted_at", null)
            .limit(10);
          return (data || []).map((f: any) => ({
            id: f.id,
            label: f.numero_facture,
            sublabel: f.contacts ? `${f.contacts.prenom} ${f.contacts.nom} • ${f.montant_total}€` : `${f.montant_total}€`,
          }));
        }
        case "devis": {
          const { data } = await supabase
            .from("devis")
            .select("id, numero_devis, montant_total")
            .eq("centre_id", centreId)
            .ilike("numero_devis", term)
            .is("deleted_at", null)
            .limit(10);
          return (data || []).map((d) => ({
            id: d.id,
            label: d.numero_devis,
            sublabel: `${d.montant_total}€`,
          }));
        }
        case "document": {
          const { data } = await supabase
            .from("contact_documents")
            .select("id, nom, type_document, contacts!inner(centre_id)")
            .eq("contacts.centre_id", centreId)
            .ilike("nom", term)
            .is("deleted_at", null)
            .limit(10);
          return (data || []).map((d: any) => ({
            id: d.id,
            label: d.nom,
            sublabel: d.type_document || "",
          }));
        }
        default:
          return [];
      }
    },
    enabled: search.trim().length >= 2,
  });

  const addLink = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      const { error } = await supabase.from("crm_email_links").insert({
        thread_id: threadId,
        centre_id: centreId,
        entity_type: entityType,
        entity_id: selectedId,
        is_primary: false,
        link_source: "manual",
        linked_by: user?.id || null,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Ce lien existe déjà");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-email-links", threadId] });
      setSelectedId(null);
      setSearch("");
      setIsOpen(false);
      toast.success("Entité rattachée");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="text-xs gap-1">
        <Plus className="h-3 w-3" /> Rattacher
      </Button>
    );
  }

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-2 border">
      <div className="flex gap-2">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v as EntityType); setSearch(""); setSelectedId(null); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedId(null); }}
            placeholder={currentType?.hint || "Rechercher…"}
            className="h-8 text-xs pl-7"
          />
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setIsOpen(false); setSearch(""); setSelectedId(null); }}>
          Annuler
        </Button>
      </div>

      {searching && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Recherche…
        </div>
      )}

      {results.length > 0 && (
        <div className="max-h-[150px] overflow-y-auto space-y-1">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors ${
                selectedId === r.id ? "bg-primary/10 border border-primary/30" : ""
              }`}
            >
              <span className="font-medium">{r.label}</span>
              {r.sublabel && <span className="text-muted-foreground ml-2">{r.sublabel}</span>}
            </button>
          ))}
        </div>
      )}

      {search.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="text-xs text-muted-foreground py-1">Aucun résultat</p>
      )}

      {selectedId && (
        <div className="flex justify-end">
          <Button size="sm" className="h-7 text-xs" onClick={() => addLink.mutate()} disabled={addLink.isPending}>
            {addLink.isPending ? "Ajout…" : "Rattacher"}
          </Button>
        </div>
      )}
    </div>
  );
}
