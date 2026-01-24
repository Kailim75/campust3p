import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  FileText,
  Users,
  BarChart3,
  CalendarIcon,
  Download,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBimProjets, BimProjet } from "@/hooks/useBimProjets";
import { useBimScenes } from "@/hooks/useBimScenes";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import {
  generateAttestationBimPDF,
  generateFeuillePresenceBimPDF,
  generateBilanCompetencesBimPDF,
  BimProgressionData,
  BimEvaluationData,
  BimInteractionData,
} from "@/lib/bim-qualiopi-pdf-generator";
import { cn } from "@/lib/utils";

interface BimQualiopiProofsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DocumentType = "attestation" | "presence" | "bilan";

const PERIOD_OPTIONS = [
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "month", label: "Ce mois" },
  { value: "custom", label: "Personnalisé" },
];

export function BimQualiopiProofsDialog({
  open,
  onOpenChange,
}: BimQualiopiProofsDialogProps) {
  const { data: projets, isLoading: projetsLoading } = useBimProjets();
  const { data: allScenes = [] } = useBimScenes();
  const { centreFormation: centre } = useCentreFormation();

  const [selectedTab, setSelectedTab] = useState<DocumentType>("bilan");
  const [selectedProjetId, setSelectedProjetId] = useState<string>("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [periodOption, setPeriodOption] = useState("30");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch contacts with progressions for selected project
  const [contacts, setContacts] = useState<
    Array<{ id: string; nom: string; prenom: string; formation: string }>
  >([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const selectedProjet = projets?.find((p) => p.id === selectedProjetId);
  const projectScenes = allScenes.filter((s) => s.projet_id === selectedProjetId);

  // Load contacts when project changes
  const loadContacts = async (projetId: string) => {
    setContactsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bim_progressions")
        .select("contact_id, contacts(id, nom, prenom, formation)")
        .eq("projet_id", projetId);

      if (error) throw error;

      const uniqueContacts = new Map();
      data?.forEach((row) => {
        const contact = row.contacts as { id: string; nom: string; prenom: string; formation: string } | null;
        if (contact && !uniqueContacts.has(contact.id)) {
          uniqueContacts.set(contact.id, contact);
        }
      });

      setContacts(Array.from(uniqueContacts.values()));
    } catch (error) {
      console.error("Error loading contacts:", error);
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  const handleProjetChange = (projetId: string) => {
    setSelectedProjetId(projetId);
    setSelectedContactId("");
    if (projetId) {
      loadContacts(projetId);
    } else {
      setContacts([]);
    }
  };

  const handlePeriodChange = (value: string) => {
    setPeriodOption(value);
    const now = new Date();

    if (value === "7") {
      setDateRange({ from: subDays(now, 7), to: now });
    } else if (value === "30") {
      setDateRange({ from: subDays(now, 30), to: now });
    } else if (value === "month") {
      setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    }
  };

  const fetchProgressionData = async (
    projetId: string,
    contactId?: string
  ): Promise<BimProgressionData[]> => {
    let query = supabase
      .from("bim_progressions")
      .select("*, contacts(id, nom, prenom, email, formation)")
      .eq("projet_id", projetId);

    if (contactId) {
      query = query.eq("contact_id", contactId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row) => ({
      ...row,
      contact: row.contacts as BimProgressionData["contact"],
    }));
  };

  const fetchEvaluationData = async (
    projetId: string,
    contactId?: string
  ): Promise<BimEvaluationData[]> => {
    let query = supabase
      .from("bim_evaluations")
      .select("*, contacts(nom, prenom), bim_scenes(titre)")
      .eq("projet_id", projetId);

    if (contactId) {
      query = query.eq("contact_id", contactId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row) => ({
      ...row,
      contact: row.contacts as BimEvaluationData["contact"],
      scene: row.bim_scenes as BimEvaluationData["scene"],
    }));
  };

  const fetchInteractionData = async (
    projetId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<BimInteractionData[]> => {
    const { data, error } = await supabase
      .from("bim_interactions")
      .select("*, contacts(nom, prenom), bim_scenes(titre)")
      .eq("projet_id", projetId)
      .gte("started_at", dateFrom.toISOString())
      .lte("started_at", dateTo.toISOString())
      .order("started_at", { ascending: true });

    if (error) throw error;

    return (data || []).map((row) => ({
      ...row,
      contact: row.contacts as BimInteractionData["contact"],
      scene: row.bim_scenes as BimInteractionData["scene"],
    }));
  };

  const handleGenerate = async () => {
    if (!selectedProjet) {
      toast.error("Veuillez sélectionner un projet");
      return;
    }

    setIsGenerating(true);

    try {
      const centreData = centre
        ? {
            nom: centre.nom_commercial || centre.nom_legal || undefined,
            numero_declaration: centre.nda || undefined,
            numero_qualiopi: centre.qualiopi_numero || undefined,
            adresse: centre.adresse_complete || undefined,
          }
        : undefined;

      if (selectedTab === "attestation") {
        if (!selectedContactId) {
          toast.error("Veuillez sélectionner un apprenant");
          return;
        }

        const progressions = await fetchProgressionData(
          selectedProjetId,
          selectedContactId
        );
        const evaluations = await fetchEvaluationData(
          selectedProjetId,
          selectedContactId
        );

        if (progressions.length === 0) {
          toast.error("Aucune progression trouvée pour cet apprenant");
          return;
        }

        // Générer ou récupérer le numéro de certificat unique via RPC
        let numeroCertificat: string | undefined;
        try {
          const { data: certData, error: certError } = await supabase.rpc(
            "create_attestation_certificate",
            {
              p_contact_id: selectedContactId,
              p_session_id: null,
              p_type_attestation: "competences",
              p_metadata: {
                source: "bim",
                projet_id: selectedProjetId,
                projet_code: selectedProjet.code,
                projet_titre: selectedProjet.titre,
              },
            }
          );

          if (certError) {
            console.error("Erreur génération certificat:", certError);
            toast.warning("Attestation générée sans numéro de certificat unique");
          } else if (certData && certData.length > 0) {
            numeroCertificat = certData[0].numero_certificat;
          }
        } catch (certErr) {
          console.error("Erreur certificat:", certErr);
        }

        generateAttestationBimPDF({
          projet: selectedProjet,
          progression: progressions[0],
          evaluations,
          centre: centreData,
          numeroCertificat,
        });

        toast.success(
          numeroCertificat
            ? `Attestation générée - N° ${numeroCertificat}`
            : "Attestation générée avec succès"
        );
      } else if (selectedTab === "presence") {
        const interactions = await fetchInteractionData(
          selectedProjetId,
          dateRange.from,
          dateRange.to
        );

        if (interactions.length === 0) {
          toast.error("Aucune interaction trouvée pour cette période");
          return;
        }

        generateFeuillePresenceBimPDF({
          projet: selectedProjet,
          scenes: projectScenes,
          interactions,
          dateDebut: dateRange.from,
          dateFin: dateRange.to,
          centre: centreData,
        });

        toast.success("Feuille de présence générée avec succès");
      } else if (selectedTab === "bilan") {
        const progressions = await fetchProgressionData(selectedProjetId);
        const evaluations = await fetchEvaluationData(selectedProjetId);

        if (progressions.length === 0) {
          toast.error("Aucune progression trouvée pour ce projet");
          return;
        }

        generateBilanCompetencesBimPDF({
          projet: selectedProjet,
          scenes: projectScenes,
          progressions,
          evaluations,
          centre: centreData,
        });

        toast.success("Bilan de compétences généré avec succès");
      }
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("Erreur lors de la génération du document");
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = () => {
    if (!selectedProjetId) return false;
    if (selectedTab === "attestation" && !selectedContactId) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Preuves Qualiopi BIM
          </DialogTitle>
          <DialogDescription>
            Générez les documents de traçabilité pour vos audits Qualiopi
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as DocumentType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bilan" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Bilan</span>
            </TabsTrigger>
            <TabsTrigger value="presence" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Présence</span>
            </TabsTrigger>
            <TabsTrigger value="attestation" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Attestation</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            {/* Project selector (common) */}
            <div className="space-y-2">
              <Label>Projet BIM</Label>
              {projetsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedProjetId} onValueChange={handleProjetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projets?.map((projet) => (
                      <SelectItem key={projet.id} value={projet.id}>
                        <div className="flex items-center gap-2">
                          <span>{projet.titre}</span>
                          <Badge variant="outline" className="text-xs">
                            {projet.code}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Tab-specific content */}
            <TabsContent value="bilan" className="mt-0 space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="font-medium mb-2">Bilan de compétences</h4>
                <p className="text-sm text-muted-foreground">
                  Synthèse complète du projet : taux de réussite, scores moyens,
                  répartition par statut et détail par apprenant.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">Critère 2 Qualiopi</Badge>
                  <Badge variant="secondary">Critère 6 Qualiopi</Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="presence" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Période</Label>
                <div className="flex gap-2">
                  <Select value={periodOption} onValueChange={handlePeriodChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {periodOption === "custom" && (
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-[130px]">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(dateRange.from, "dd/MM/yyyy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dateRange.from}
                            onSelect={(date) =>
                              date && setDateRange((prev) => ({ ...prev, from: date }))
                            }
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-[130px]">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(dateRange.to, "dd/MM/yyyy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dateRange.to}
                            onSelect={(date) =>
                              date && setDateRange((prev) => ({ ...prev, to: date }))
                            }
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="font-medium mb-2">Feuille de présence</h4>
                <p className="text-sm text-muted-foreground">
                  Journal détaillé des sessions BIM : apprenants, dates, scènes
                  consultées, durées et signatures.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">Critère 7 Qualiopi</Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attestation" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Apprenant</Label>
                {contactsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedContactId}
                    onValueChange={setSelectedContactId}
                    disabled={!selectedProjetId || contacts.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          contacts.length === 0
                            ? "Aucun apprenant avec progression"
                            : "Sélectionner un apprenant"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          <div className="flex items-center gap-2">
                            <span>
                              {contact.prenom} {contact.nom}
                            </span>
                            {contact.formation && (
                              <Badge variant="outline" className="text-xs">
                                {contact.formation.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="font-medium mb-2">Attestation de compétences</h4>
                <p className="text-sm text-muted-foreground">
                  Certificat individuel attestant la validation des compétences
                  BIM par l'apprenant, avec détail des scores et compétences.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">Critère 6 Qualiopi</Badge>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={handleGenerate} disabled={!canGenerate() || isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Générer PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
