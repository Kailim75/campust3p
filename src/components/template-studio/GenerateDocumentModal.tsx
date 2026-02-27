// ═══════════════════════════════════════════════════════════════
// Generate Document Modal — Pick entity, render template, create instance
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Download, Eye, Search, User, Calendar, CreditCard, Building, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { renderTemplate } from "./TemplatePreview";
import DOMPurify from "dompurify";
import type { StudioTemplate } from "@/hooks/useTemplateStudio";

const ENTITY_TYPES = [
  { value: "apprenant", label: "Apprenant", icon: User },
  { value: "session", label: "Session", icon: Calendar },
  { value: "paiement", label: "Paiement / Facture", icon: CreditCard },
  { value: "devis", label: "Devis", icon: FileText },
  { value: "centre", label: "Centre", icon: Building },
] as const;

type EntityType = typeof ENTITY_TYPES[number]["value"];

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: StudioTemplate;
  inline?: boolean;
}

export default function GenerateDocumentModal({ open, onOpenChange, template, inline }: Props) {
  const [entityType, setEntityType] = useState<EntityType>("apprenant");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [editableHtml, setEditableHtml] = useState<string>("");
  const [isEditing, setIsEditing] = useState(true);
  const [generatedInstanceId, setGeneratedInstanceId] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSearch("");
      setResults([]);
      setSelectedEntity(null);
      setGeneratedHtml(null);
      setEditableHtml("");
      setIsEditing(true);
      setGeneratedInstanceId(null);
    }
  }, [open]);

  // Search entities
  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        if (entityType === "apprenant") {
          const { data } = await supabase
            .from("contacts")
            .select("id, nom, prenom, email")
            .or(`nom.ilike.%${search}%,prenom.ilike.%${search}%,email.ilike.%${search}%`)
            .limit(10);
          setResults((data || []).map((c) => ({
            id: c.id,
            label: `${c.prenom || ""} ${c.nom || ""}`.trim(),
            sublabel: c.email || undefined,
          })));
        } else if (entityType === "session") {
          const { data } = await supabase
            .from("sessions")
            .select("id, nom, formation_type, date_debut")
            .or(`nom.ilike.%${search}%,formation_type.ilike.%${search}%`)
            .limit(10);
          setResults((data || []).map((s) => ({
            id: s.id,
            label: s.nom || "Session",
            sublabel: `${s.formation_type || ""} — ${s.date_debut ? new Date(s.date_debut).toLocaleDateString("fr-FR") : ""}`,
          })));
        } else if (entityType === "paiement") {
          const { data } = await supabase
            .from("factures")
            .select("id, numero_facture, montant_total, statut, contacts(nom, prenom)")
            .or(`numero_facture.ilike.%${search}%`)
            .limit(10);
          setResults((data || []).map((f: any) => ({
            id: f.id,
            label: f.numero_facture,
            sublabel: f.contacts ? `${f.contacts.prenom} ${f.contacts.nom} — ${f.montant_total}€` : `${f.montant_total}€`,
          })));
        } else if (entityType === "devis") {
          const { data } = await supabase
            .from("devis")
            .select("id, numero_devis, montant_total, statut, contact:contacts(nom, prenom)")
            .or(`numero_devis.ilike.%${search}%`)
            .limit(10);
          setResults((data || []).map((d: any) => ({
            id: d.id,
            label: d.numero_devis,
            sublabel: d.contact ? `${d.contact.prenom} ${d.contact.nom} — ${d.montant_total}€` : `${d.montant_total}€`,
          })));
        } else if (entityType === "centre") {
          const { data } = await supabase
            .from("centre_formation")
            .select("id, nom_commercial, siret")
            .or(`nom_commercial.ilike.%${search}%,siret.ilike.%${search}%`)
            .limit(10);
          setResults((data || []).map((c) => ({
            id: c.id,
            label: c.nom_commercial,
            sublabel: c.siret,
          })));
        }
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, entityType]);

  // Build data map from entity
  async function buildDataMap(type: EntityType, id: string): Promise<Record<string, string>> {
    const map: Record<string, string> = { date_jour: new Date().toLocaleDateString("fr-FR") };

    if (type === "apprenant") {
      const { data } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();
      if (data) {
        map.nom = data.nom || "";
        map.prenom = data.prenom || "";
        map.email = data.email || "";
        map.telephone = data.telephone || "";
        map.civilite = data.civilite || "";
        map.date_naissance = data.date_naissance ? new Date(data.date_naissance).toLocaleDateString("fr-FR") : "";
        map.adresse = [data.rue, data.code_postal, data.ville].filter(Boolean).join(", ");
      }
    } else if (type === "session") {
      const { data } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
      if (data) {
        map.session_nom = data.nom || "";
        map.session_date_debut = data.date_debut ? new Date(data.date_debut).toLocaleDateString("fr-FR") : "";
        map.session_date_fin = data.date_fin ? new Date(data.date_fin).toLocaleDateString("fr-FR") : "";
        map.duree_heures = String(data.duree_heures || "");
        map.horaires = (data as any).horaires || "";
      }
    } else if (type === "paiement") {
      const { data } = await supabase.from("factures").select("*, contacts(nom, prenom, email)").eq("id", id).maybeSingle();
      if (data) {
        map.numero_facture = data.numero_facture || "";
        map.montant_total = String(data.montant_total || "");
        map.prix_total = String(data.montant_total || "");
        if (data.contacts) {
          map.nom = (data.contacts as any).nom || "";
          map.prenom = (data.contacts as any).prenom || "";
          map.email = (data.contacts as any).email || "";
        }
      }
    } else if (type === "devis") {
      const { data } = await supabase
        .from("devis")
        .select("*, contact:contacts(nom, prenom, email, telephone, rue, code_postal, ville, civilite), session_inscription:session_inscriptions(session:sessions(nom, date_debut, date_fin, duree_heures, formation_type, horaires, lieu))")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        map.numero_devis = data.numero_devis || "";
        map.montant_total = Number(data.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
        map.prix_total = map.montant_total;
        map.type_financement = data.type_financement || "";
        map.date_emission = data.date_emission ? new Date(data.date_emission).toLocaleDateString("fr-FR") : "";
        map.date_validite = data.date_validite ? new Date(data.date_validite).toLocaleDateString("fr-FR") : "";
        map.statut_devis = data.statut || "";
        map.commentaires = data.commentaires || "";
        const contact = (data as any).contact;
        if (contact) {
          map.nom = contact.nom || "";
          map.prenom = contact.prenom || "";
          map.email = contact.email || "";
          map.telephone = contact.telephone || "";
          map.civilite = contact.civilite || "";
          map.adresse = [contact.rue, contact.code_postal, contact.ville].filter(Boolean).join(", ");
        }
        // Session data via inscription
        const session = (data as any).session_inscription?.session;
        if (session) {
          map.session_nom = session.nom || "";
          map.intitule_formation = session.nom || session.formation_type || "";
          map.formation_type = session.formation_type || "";
          map.session_date_debut = session.date_debut ? new Date(session.date_debut).toLocaleDateString("fr-FR") : "";
          map.session_date_fin = session.date_fin ? new Date(session.date_fin).toLocaleDateString("fr-FR") : "";
          map.duree_heures = String(session.duree_heures || "");
          map.horaires = session.horaires || "";
          map.lieu = session.lieu || "";
        }
        // Fetch devis lines
        const { data: lignes } = await supabase
          .from("devis_lignes")
          .select("*")
          .eq("devis_id", id)
          .order("ordre", { ascending: true });
        if (lignes && lignes.length > 0) {
          const fmt = (n: number) => Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
          const totalHt = lignes.reduce((sum, l: any) => sum + Number(l.montant_ht || l.quantite * l.prix_unitaire_ht * (1 - (l.remise_percent || 0) / 100)), 0);
          const rows = lignes.map((l: any) => {
            const lineHt = Number(l.montant_ht || l.quantite * l.prix_unitaire_ht * (1 - (l.remise_percent || 0) / 100));
            return `<tr><td style="border:1px solid #ddd;padding:8px">${l.description}</td><td style="border:1px solid #ddd;padding:8px;text-align:center">${l.quantite}</td><td style="border:1px solid #ddd;padding:8px;text-align:right">${fmt(l.prix_unitaire_ht)}</td><td style="border:1px solid #ddd;padding:8px;text-align:center">${l.remise_percent || 0}%</td><td style="border:1px solid #ddd;padding:8px;text-align:right">${fmt(lineHt)}</td></tr>`;
          }).join("");
          map.lignes_devis = `<table style="width:100%;border-collapse:collapse;margin:10px 0"><thead><tr><th style="border:1px solid #333;padding:8px;background:#1e3a5f;color:#fff;text-align:left">Désignation</th><th style="border:1px solid #333;padding:8px;background:#1e3a5f;color:#fff;text-align:center">Qté</th><th style="border:1px solid #333;padding:8px;background:#1e3a5f;color:#fff;text-align:right">P.U. HT</th><th style="border:1px solid #333;padding:8px;background:#1e3a5f;color:#fff;text-align:center">Remise</th><th style="border:1px solid #333;padding:8px;background:#1e3a5f;color:#fff;text-align:right">Montant HT</th></tr></thead><tbody>${rows}</tbody><tfoot><tr style="background:#f5f5f5;font-weight:bold"><td colspan="4" style="border:1px solid #ddd;padding:8px;text-align:right">Total HT</td><td style="border:1px solid #ddd;padding:8px;text-align:right">${fmt(totalHt)}</td></tr></tfoot></table>`;
          map.total_ht = fmt(totalHt);
        }
      }
    }

    // Always fetch centre info — all fields
    const { data: centre } = await supabase.from("centre_formation").select("*").limit(1).maybeSingle();
    if (centre) {
      map.centre_nom = centre.nom_commercial || centre.nom_legal || "";
      map.centre_nom_legal = centre.nom_legal || "";
      map.centre_nom_commercial = centre.nom_commercial || "";
      map.centre_siret = centre.siret || "";
      map.centre_nda = centre.nda || "";
      map.centre_adresse = centre.adresse_complete || "";
      map.centre_email = centre.email || "";
      map.centre_telephone = centre.telephone || "";
      map.centre_forme_juridique = centre.forme_juridique || "";
      map.centre_iban = centre.iban || "";
      map.centre_bic = centre.bic || "";
      map.centre_region = centre.region_declaration || "";
      map.responsable_nom = centre.responsable_legal_nom || "";
      map.responsable_fonction = centre.responsable_legal_fonction || "";
      map.centre_qualiopi_numero = centre.qualiopi_numero || "";
      map.centre_qualiopi_date = centre.qualiopi_date_obtention || "";
      map.centre_agrement = centre.agrement_prefecture || "";
      map.centre_agrement_date = centre.agrement_prefecture_date || "";
      map.centre_code_rncp = centre.code_rncp || "";
      map.centre_code_rs = centre.code_rs || "";
      map.lieu = centre.adresse_complete?.split(",").pop()?.trim() || "";

      // Parse agrements_autres for taxi/vtc/vmdtr numbers
      if (centre.agrements_autres && Array.isArray(centre.agrements_autres)) {
        const agrements = centre.agrements_autres as Array<{ nom?: string; numero?: string; date_obtention?: string; date_expiration?: string }>;
        for (const ag of agrements) {
          const nom = (ag.nom || "").toLowerCase();
          if (nom.includes("vtc") || nom.includes("taxi")) {
            map.agrement_taxi_vtc = ag.numero || "";
            map.agrement_taxi_vtc_date = ag.date_obtention ? new Date(ag.date_obtention).toLocaleDateString("fr-FR") : "";
            map.agrement_taxi_vtc_expiration = ag.date_expiration ? new Date(ag.date_expiration).toLocaleDateString("fr-FR") : "";
            map.agrement_taxi_vtc_nom = ag.nom || "";
          }
          if (nom.includes("vmdtr")) {
            map.agrement_vmdtr = ag.numero || "";
            map.agrement_vmdtr_date = ag.date_obtention ? new Date(ag.date_obtention).toLocaleDateString("fr-FR") : "";
            map.agrement_vmdtr_expiration = ag.date_expiration ? new Date(ag.date_expiration).toLocaleDateString("fr-FR") : "";
            map.agrement_vmdtr_nom = ag.nom || "";
          }
        }
      }
    }

    return map;
  }

  const handleGenerate = async () => {
    if (!selectedEntity) return;
    setGenerating(true);
    try {
      const dataMap = await buildDataMap(entityType, selectedEntity.id);
      const html = renderTemplate(template.template_body, dataMap);
      const sanitized = DOMPurify.sanitize(html, { ADD_ATTR: ["style"], ADD_TAGS: ["mark"] });
      setGeneratedHtml(sanitized);
      setEditableHtml(sanitized);
      setIsEditing(true);

      // Create document_instances record
      const { data: { user } } = await supabase.auth.getUser();
      const { data: instance, error } = await (supabase as any)
        .from("document_instances")
        .insert({
          template_id: template.id,
          entity_type: entityType,
          entity_id: selectedEntity.id,
          centre_id: template.centre_id,
          status: "generated",
          metadata: { generated_by: user?.id, generated_at: new Date().toISOString(), entity_label: selectedEntity.label },
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      setGeneratedInstanceId(instance?.id || null);

      // Also save to contact_documents if we have a contact
      let contactId: string | null = null;
      if (entityType === "apprenant") {
        contactId = selectedEntity.id;
      } else if (entityType === "devis") {
        const { data: devisData } = await supabase.from("devis").select("contact_id").eq("id", selectedEntity.id).maybeSingle();
        contactId = devisData?.contact_id || null;
      } else if (entityType === "paiement") {
        const { data: factureData } = await supabase.from("factures").select("contact_id").eq("id", selectedEntity.id).maybeSingle();
        contactId = factureData?.contact_id || null;
      }

      if (contactId) {
        await supabase.from("contact_documents").insert({
          contact_id: contactId,
          type_document: template.type || "autre",
          nom: `${template.name} — ${selectedEntity.label}`,
          file_path: `generated/${instance?.id || "doc"}_${Date.now()}`,
          commentaires: `Généré via Template Studio le ${new Date().toLocaleDateString("fr-FR")}`,
        });
      }

      toast.success("Document généré et enregistré");
    } catch (e: any) {
      console.error("Generation error:", e);
      toast.error("Erreur lors de la génération : " + (e.message || "erreur inconnue"));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadHtml = () => {
    if (!editableHtml) return;
    const finalHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${template.name}</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;}</style></head><body>${editableHtml}</body></html>`;
    const blob = new Blob([finalHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, "-")}-${selectedEntity?.label || "doc"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const content = (
    <>
      <div className={inline ? "mb-4" : ""}>
        <div className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5 text-primary" />
          Générer un document
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Template : <strong>{template.name}</strong> — Sélectionnez l'entité pour remplir les variables.
        </p>
      </div>

        {!generatedHtml ? (
          <div className="space-y-4 py-2">
            {/* Entity type */}
            <div>
              <Label>Type d'entité</Label>
              <Select value={entityType} onValueChange={(v) => { setEntityType(v as EntityType); setSelectedEntity(null); setSearch(""); setResults([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <Label>Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tapez au moins 2 caractères..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Results */}
            {searching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Recherche...
              </div>
            )}

            {results.length > 0 && (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1">
                  {results.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedEntity(r)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectedEntity?.id === r.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">{r.label}</p>
                      {r.sublabel && <p className="text-xs text-muted-foreground">{r.sublabel}</p>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectedEntity && (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="text-xs text-muted-foreground">Sélectionné :</p>
                <p className="text-sm font-medium text-foreground">{selectedEntity.label}</p>
                {selectedEntity.sublabel && <p className="text-xs text-muted-foreground">{selectedEntity.sublabel}</p>}
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!selectedEntity || generating}
              className="w-full gap-2"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Générer le document
            </Button>
          </div>
        ) : (
          <div className="space-y-3 py-2 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs text-green-600 border-green-500/30 bg-green-500/10">
                ✓ Document généré
              </Badge>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadHtml} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Télécharger
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setGeneratedHtml(null); setEditableHtml(""); setSelectedEntity(null); setSearch(""); }}
                  className="gap-1.5"
                >
                  Générer un autre
                </Button>
              </div>
            </div>

            <Tabs defaultValue="editor" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="editor" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Éditeur
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Aperçu
                </TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-[350px] border rounded-lg">
                  <div
                    className="p-4 min-h-[300px] bg-background text-foreground text-sm font-mono outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: editableHtml }}
                    onBlur={(e) => setEditableHtml(e.currentTarget.innerHTML)}
                  />
                </ScrollArea>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Modifiez directement le contenu ci-dessus, puis passez à l'onglet Aperçu pour vérifier.
                </p>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-[350px] border rounded-lg">
                  <div
                    className="p-6 bg-white dark:bg-card prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editableHtml, { ADD_ATTR: ["style"], ADD_TAGS: ["mark"] }) }}
                  />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
    </>
  );

  if (inline) {
    return <Card className="p-6">{content}</Card>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        {content}
      </DialogContent>
    </Dialog>
  );
}
