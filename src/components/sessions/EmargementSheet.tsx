import { useState } from "react";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignatureCanvas } from "@/components/signatures/SignatureCanvas";
import {
  useEmargements,
  useGenerateEmargements,
  useSignEmargement,
  useTogglePresence,
} from "@/hooks/useEmargements";
import {
  ClipboardList,
  Loader2,
  RefreshCw,
  PenTool,
  Check,
  X,
  Calendar,
  Users,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { generateEmargementDocx } from "@/lib/emargement-docx-generator";
import { supabase } from "@/integrations/supabase/client";
import { usePublishedTemplate } from "@/hooks/usePublishedTemplate";
import { renderTemplateHtml, buildDocumentVariables, printHtmlDocument } from "@/lib/template-renderer";

interface EmargementSheetProps {
  session: {
    id: string;
    nom: string;
    date_debut: string;
    date_fin: string;
    lieu?: string;
    formation_type?: string;
    formateur_id?: string | null;
    horaire_type?: string | null;
  };
}

export function EmargementSheet({ session }: EmargementSheetProps) {
  const { data: emargements, isLoading, refetch } = useEmargements(session.id);
  const generateEmargements = useGenerateEmargements();
  const signEmargement = useSignEmargement();
  const togglePresence = useTogglePresence();
  const { data: publishedTemplate } = usePublishedTemplate("emargement");

  // Fetch formateur name
  const [formateurNom, setFormateurNom] = useState<string | null>(null);
  import("@/integrations/supabase/client").then(() => {});
  // Use effect to fetch formateur

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [signatureDialog, setSignatureDialog] = useState<{
    open: boolean;
    emargementId: string;
    contactName: string;
  } | null>(null);

  // Get unique dates from session range
  // Don't filter weekends for FC sessions (often held on Saturdays)
  const isFC = session.formation_type?.toUpperCase().startsWith("FC-");
  const sessionDates = eachDayOfInterval({
    start: new Date(session.date_debut),
    end: new Date(session.date_fin),
  }).filter((date) => isFC || !isWeekend(date));

  // Get unique contacts
  const contacts = emargements
    ? Array.from(
        new Map(
          emargements.map((e) => [e.contact_id, e.contact])
        ).values()
      ).filter(Boolean)
    : [];

  // Get emargements for selected date
  const dateEmargements = selectedDate
    ? emargements?.filter((e) => e.date_emargement === selectedDate)
    : [];

  // Stats
  const totalEmargements = emargements?.length || 0;
  const signedEmargements = emargements?.filter((e) => e.present).length || 0;
  const signatureRate = totalEmargements > 0 
    ? Math.round((signedEmargements / totalEmargements) * 100) 
    : 0;

  const handleGenerate = async () => {
    await generateEmargements.mutateAsync({
      sessionId: session.id,
      dateDebut: session.date_debut,
      dateFin: session.date_fin,
    });
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadDocx = async () => {
    if (!emargements || emargements.length === 0) {
      toast.error("Aucun émargement à exporter");
      return;
    }

    setIsDownloading(true);
    try {
      // If a published template exists, use it
      if (publishedTemplate) {
        await handleDownloadFromTemplate();
        return;
      }

      // Fallback to legacy DOCX generator
      await handleDownloadLegacyDocx();
    } catch (error) {
      console.error("Erreur téléchargement:", error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setIsDownloading(false);
    }
  };

  /** Download using published Template Studio template */
  const handleDownloadFromTemplate = async () => {
    if (!publishedTemplate || !emargements) return;

    // Build variables
    const variables = await buildDocumentVariables({
      sessionId: session.id,
      extra: {
        session_nom: session.nom,
        session_date_debut: session.date_debut ? new Date(session.date_debut).toLocaleDateString("fr-FR") : "",
        session_date_fin: session.date_fin ? new Date(session.date_fin).toLocaleDateString("fr-FR") : "",
        formation_type: session.formation_type || "",
        lieu: session.lieu || "",
      },
    });

    // Build emargement table HTML dynamically
    const uniqueDates = [...new Set(emargements.map((e) => e.date_emargement))].sort();
    const contactsMap = new Map(emargements.map((e) => [e.contact_id, e.contact]));
    const contactsList = Array.from(contactsMap.values()).filter(Boolean);

    let tableHtml = "";
    for (const dateStr of uniqueDates) {
      const dateEmargs = emargements.filter((e) => e.date_emargement === dateStr);
      const dateFormatted = new Date(dateStr).toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });

      tableHtml += `<h3 style="margin-top:20px;page-break-before:auto;">${dateFormatted}</h3>`;
      tableHtml += `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">`;
      tableHtml += `<thead><tr><th style="border:1px solid #333;padding:6px 8px;background:#f5f5f5;text-align:left;">Stagiaire</th>`;
      tableHtml += `<th style="border:1px solid #333;padding:6px 8px;background:#f5f5f5;text-align:center;">Présent</th>`;
      tableHtml += `<th style="border:1px solid #333;padding:6px 8px;background:#f5f5f5;text-align:center;">Signature</th></tr></thead><tbody>`;

      for (const contact of contactsList) {
        if (!contact) continue;
        const emarg = dateEmargs.find((e) => e.contact_id === contact.id);
        const presentStr = emarg?.present ? "✓" : "—";
        const signatureStr = emarg?.signature_url ? "Signé" : "";

        tableHtml += `<tr>`;
        tableHtml += `<td style="border:1px solid #333;padding:6px 8px;">${contact.prenom || ""} ${contact.nom || ""}</td>`;
        tableHtml += `<td style="border:1px solid #333;padding:6px 8px;text-align:center;">${presentStr}</td>`;
        tableHtml += `<td style="border:1px solid #333;padding:6px 8px;text-align:center;min-width:120px;">${signatureStr}</td>`;
        tableHtml += `</tr>`;
      }
      tableHtml += `</tbody></table>`;
    }

    // Add the table as a variable
    variables.emargement_table = tableHtml;
    variables.nb_stagiaires = String(contactsList.length);
    variables.nb_jours = String(uniqueDates.length);

    // Render template
    const html = renderTemplateHtml(publishedTemplate.template_body, variables);
    printHtmlDocument(html, `Emargement_${session.nom}`);
    toast.success("Feuille d'émargement générée depuis le template publié");
  };

  /** Legacy DOCX generator fallback */
  const handleDownloadLegacyDocx = async () => {
    if (!emargements) return;
    let formateurNom: string | undefined;
    if (session.formateur_id) {
      const { data: formateur } = await supabase
        .from("formateurs")
        .select("nom, prenom")
        .eq("id", session.formateur_id)
        .single();
      if (formateur) formateurNom = `${formateur.prenom} ${formateur.nom}`;
    }

    const { data: centre } = await supabase
      .from("centre_formation")
      .select("nom_commercial, nda, siret, adresse_complete, telephone, email")
      .limit(1)
      .single();

    const blob = await generateEmargementDocx(emargements, {
      nom: session.nom,
      date_debut: session.date_debut,
      date_fin: session.date_fin,
      lieu: session.lieu,
      formation_type: session.formation_type,
      formateur_nom: formateurNom,
      centre_nom: centre?.nom_commercial || undefined,
      centre_adresse: centre?.adresse_complete || undefined,
      centre_nda: centre?.nda || undefined,
      centre_siret: centre?.siret || undefined,
      centre_telephone: centre?.telephone || undefined,
      centre_email: centre?.email || undefined,
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Emargement_${session.nom.replace(/\s+/g, "_")}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Feuille d'émargement téléchargée");
  };

  const handleSignature = (signatureData: string) => {
    if (!signatureDialog) return;
    
    signEmargement.mutate({
      emargementId: signatureDialog.emargementId,
      sessionId: session.id,
      signatureData,
    });
    setSignatureDialog(null);
  };

  const handleTogglePresence = (emargementId: string, present: boolean) => {
    togglePresence.mutate({
      emargementId,
      sessionId: session.id,
      present,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{sessionDates.length}</p>
                <p className="text-xs text-muted-foreground">Jours de formation</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-xs text-muted-foreground">Stagiaires</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">{signatureRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {signedEmargements}/{totalEmargements} signés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Select value={selectedDate || ""} onValueChange={setSelectedDate}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Sélectionner une date" />
          </SelectTrigger>
          <SelectContent>
            {sessionDates.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const dateEmargs = emargements?.filter((e) => e.date_emargement === dateStr) || [];
              const signed = dateEmargs.filter((e) => e.present).length;
              
              return (
                <SelectItem key={dateStr} value={dateStr}>
                  <div className="flex items-center justify-between gap-4">
                    <span>{format(date, "EEEE d MMMM", { locale: fr })}</span>
                    <Badge variant={signed === dateEmargs.length && dateEmargs.length > 0 ? "default" : "outline"}>
                      {signed}/{dateEmargs.length}
                    </Badge>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadDocx}
            disabled={isDownloading || totalEmargements === 0}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {publishedTemplate ? "Télécharger (Template)" : "Télécharger DOCX"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={handleGenerate} disabled={generateEmargements.isPending}>
            {generateEmargements.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4 mr-2" />
                {totalEmargements === 0 ? "Générer la feuille" : "Régénérer (sync inscrits)"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Emargement table for selected date */}
      {selectedDate && dateEmargements && dateEmargements.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {format(new Date(selectedDate), "EEEE d MMMM yyyy", { locale: fr })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const isSoir = (session as any).horaire_type === "soir" || dateEmargements.some((e) => e.periode === "soir");
              
              if (isSoir) {
                // Evening session: single column
                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stagiaire</TableHead>
                        <TableHead className="text-center">Soir — Signature</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => {
                        const soirEmarg = dateEmargements.find(
                          (e) => e.contact_id === contact?.id && e.periode === "soir"
                        );
                        return (
                          <TableRow key={contact?.id}>
                            <TableCell className="font-medium">
                              {contact?.prenom} {contact?.nom}
                            </TableCell>
                            <TableCell className="text-center">
                              {soirEmarg && (
                                <EmargementCell
                                  emargement={soirEmarg}
                                  onSign={() =>
                                    setSignatureDialog({
                                      open: true,
                                      emargementId: soirEmarg.id,
                                      contactName: `${contact?.prenom} ${contact?.nom}`,
                                    })
                                  }
                                  onToggle={(present) =>
                                    handleTogglePresence(soirEmarg.id, present)
                                  }
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                );
              }

              // Day session: merged matin/apres-midi
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stagiaire</TableHead>
                      <TableHead className="text-center">Signature</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => {
                      const morningEmarg = dateEmargements.find(
                        (e) => e.contact_id === contact?.id && e.periode === "matin"
                      );
                      const afternoonEmarg = dateEmargements.find(
                        (e) => e.contact_id === contact?.id && e.periode === "apres_midi"
                      );
                      const bestEmarg = (morningEmarg?.signature_url || morningEmarg?.present) ? morningEmarg : afternoonEmarg;

                      return (
                        <TableRow key={contact?.id}>
                          <TableCell className="font-medium">
                            {contact?.prenom} {contact?.nom}
                          </TableCell>
                          <TableCell className="text-center">
                            {bestEmarg && (
                              <EmargementCell
                                emargement={bestEmarg}
                                onSign={() =>
                                  setSignatureDialog({
                                    open: true,
                                    emargementId: bestEmarg.id,
                                    contactName: `${contact?.prenom} ${contact?.nom}`,
                                  })
                                }
                                onToggle={(present) =>
                                  handleTogglePresence(bestEmarg.id, present)
                                }
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              );
            })()}
          </CardContent>
        </Card>
      ) : selectedDate ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun émargement pour cette date. Cliquez sur "Générer la feuille" pour créer les émargements.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Sélectionnez une date pour voir les émargements
          </CardContent>
        </Card>
      )}

      {/* Signature dialog */}
      <Dialog
        open={!!signatureDialog}
        onOpenChange={() => setSignatureDialog(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Signature de {signatureDialog?.contactName}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <SignatureCanvas
              onSignatureChange={(dataUrl) => {
                if (dataUrl && signatureDialog) {
                  handleSignature(dataUrl);
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSignatureDialog(null)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EmargementCellProps {
  emargement: {
    id: string;
    present: boolean;
    signature_url: string | null;
    date_signature: string | null;
  };
  onSign: () => void;
  onToggle: (present: boolean) => void;
}

function EmargementCell({ emargement, onSign, onToggle }: EmargementCellProps) {
  if (emargement.signature_url) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge variant="default" className="bg-success">
          <Check className="h-3 w-3 mr-1" />
          Signé
        </Badge>
        {emargement.date_signature && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(emargement.date_signature), "HH:mm")}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <Checkbox
        checked={emargement.present}
        onCheckedChange={(checked) => onToggle(!!checked)}
      />
      <Button variant="outline" size="sm" onClick={onSign}>
        <PenTool className="h-3 w-3 mr-1" />
        Signer
      </Button>
    </div>
  );
}
