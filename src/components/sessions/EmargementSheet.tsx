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

interface EmargementSheetProps {
  session: {
    id: string;
    nom: string;
    date_debut: string;
    date_fin: string;
    lieu?: string;
    formation_type?: string;
    formateur_id?: string | null;
  };
}

export function EmargementSheet({ session }: EmargementSheetProps) {
  const { data: emargements, isLoading, refetch } = useEmargements(session.id);
  const generateEmargements = useGenerateEmargements();
  const signEmargement = useSignEmargement();
  const togglePresence = useTogglePresence();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [signatureDialog, setSignatureDialog] = useState<{
    open: boolean;
    emargementId: string;
    contactName: string;
  } | null>(null);

  // Get unique dates from session range
  const sessionDates = eachDayOfInterval({
    start: new Date(session.date_debut),
    end: new Date(session.date_fin),
  }).filter((date) => !isWeekend(date));

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
      // Fetch formateur name if needed
      let formateurNom: string | undefined;
      if (session.formateur_id) {
        const { data: formateur } = await supabase
          .from("formateurs")
          .select("nom, prenom")
          .eq("id", session.formateur_id)
          .single();
        if (formateur) formateurNom = `${formateur.prenom} ${formateur.nom}`;
      }

      // Fetch centre info
      let centreNom: string | undefined;
      let centreNda: string | undefined;
      const { data: centre } = await supabase
        .from("centre_formation")
        .select("nom_commercial, nda")
        .limit(1)
        .single();
      if (centre) {
        centreNom = centre.nom_commercial;
        centreNda = centre.nda;
      }

      const blob = generateEmargementDocx(emargements, {
        nom: session.nom,
        date_debut: session.date_debut,
        date_fin: session.date_fin,
        lieu: session.lieu,
        formation_type: session.formation_type,
        formateur_nom: formateurNom,
        centre_nom: centreNom,
        centre_nda: centreNda,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Emargement_${session.nom.replace(/\s+/g, "_")}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Feuille d'émargement téléchargée");
    } catch (error) {
      console.error("Erreur téléchargement:", error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setIsDownloading(false);
    }
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
          {totalEmargements > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadDocx}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Télécharger DOCX
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          {totalEmargements === 0 && (
            <Button onClick={handleGenerate} disabled={generateEmargements.isPending}>
              {generateEmargements.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Générer la feuille
                </>
              )}
            </Button>
          )}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stagiaire</TableHead>
                  <TableHead className="text-center">Matin (9h-12h30)</TableHead>
                  <TableHead className="text-center">Après-midi (14h-17h30)</TableHead>
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

                  return (
                    <TableRow key={contact?.id}>
                      <TableCell className="font-medium">
                        {contact?.prenom} {contact?.nom}
                      </TableCell>
                      <TableCell className="text-center">
                        {morningEmarg && (
                          <EmargementCell
                            emargement={morningEmarg}
                            onSign={() =>
                              setSignatureDialog({
                                open: true,
                                emargementId: morningEmarg.id,
                                contactName: `${contact?.prenom} ${contact?.nom}`,
                              })
                            }
                            onToggle={(present) =>
                              handleTogglePresence(morningEmarg.id, present)
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {afternoonEmarg && (
                          <EmargementCell
                            emargement={afternoonEmarg}
                            onSign={() =>
                              setSignatureDialog({
                                open: true,
                                emargementId: afternoonEmarg.id,
                                contactName: `${contact?.prenom} ${contact?.nom}`,
                              })
                            }
                            onToggle={(present) =>
                              handleTogglePresence(afternoonEmarg.id, present)
                            }
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
