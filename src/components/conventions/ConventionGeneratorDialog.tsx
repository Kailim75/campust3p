// ============================================================
// COMPOSANT DE GÉNÉRATION DE CONVENTIONS T3P
// Formulaire + Prévisualisation + Téléchargement ZIP
// ============================================================

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarIcon,
  Download,
  FileText,
  FileArchive,
  Eye,
  Loader2,
  User,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Beneficiaire,
  type Formation,
  type TypeFormation,
  type Modalite,
  type Civilite,
  getProgramme,
  getPrerequis,
  getObjectifs,
  getTarif,
  getHoraires,
} from "@/constants/formations";
import {
  generateConventionPDF,
  generateReglementInterieurPDF,
  generateCGVPDF,
  generateConventionZIP,
  downloadPDF,
  downloadBlob,
} from "@/lib/convention-pdf-generator";

interface ConventionGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optionnel : pré-remplir avec un contact existant
  initialBeneficiaire?: Partial<Beneficiaire>;
}

export function ConventionGeneratorDialog({
  open,
  onOpenChange,
  initialBeneficiaire,
}: ConventionGeneratorDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("beneficiaire");

  // État du bénéficiaire
  const [beneficiaire, setBeneficiaire] = useState<Beneficiaire>({
    civilite: initialBeneficiaire?.civilite || "M.",
    nom: initialBeneficiaire?.nom || "",
    prenom: initialBeneficiaire?.prenom || "",
    dateNaissance: initialBeneficiaire?.dateNaissance || new Date(1990, 0, 1),
    adresse: initialBeneficiaire?.adresse || "",
    codePostal: initialBeneficiaire?.codePostal || "",
    ville: initialBeneficiaire?.ville || "",
    telephone: initialBeneficiaire?.telephone || "",
    email: initialBeneficiaire?.email || "",
    situationHandicap: initialBeneficiaire?.situationHandicap || false,
  });

  // État de la formation
  const [typeFormation, setTypeFormation] = useState<TypeFormation>("VTC");
  const [modalite, setModalite] = useState<Modalite>("journée");
  const [dateDebut, setDateDebut] = useState<Date>(new Date());
  const [dateFin, setDateFin] = useState<Date>(new Date());

  // Calculer automatiquement la date de fin (5 jours après)
  const updateDateFin = (debut: Date) => {
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 4); // 5 jours de formation
    setDateFin(fin);
  };

  // Construire l'objet Formation
  const buildFormation = (): Formation => {
    const horaires = getHoraires(modalite);
    const duree = typeFormation === "RECUPERATION_POINTS" ? 14 : 35;

    return {
      type: typeFormation,
      intitule: getFormationIntitule(typeFormation),
      modalite,
      dateDebut,
      dateFin,
      dureeHeures: duree,
      horaires: horaires || { matin: "9h00 - 12h30", apresMidi: "13h30 - 17h00" },
      tarifHT: getTarif(typeFormation, modalite),
      prerequisReglementaires: getPrerequis(typeFormation),
      objectifsPedagogiques: getObjectifs(typeFormation),
      programme: getProgramme(typeFormation),
    };
  };

  const getFormationIntitule = (type: TypeFormation): string => {
    const intitules: Record<TypeFormation, string> = {
      VTC: "Conducteur de Voiture de Transport avec Chauffeur",
      TAXI: "Conducteur de Taxi",
      VMDTR: "Conducteur de Véhicule Motorisé à Deux ou Trois Roues",
      RECUPERATION_POINTS: "Stage de Récupération de Points",
    };
    return intitules[type];
  };

  // Validation du formulaire
  const isFormValid = (): boolean => {
    return (
      beneficiaire.nom.trim() !== "" &&
      beneficiaire.prenom.trim() !== "" &&
      beneficiaire.adresse.trim() !== "" &&
      beneficiaire.codePostal.trim() !== "" &&
      beneficiaire.ville.trim() !== "" &&
      beneficiaire.telephone.trim() !== "" &&
      beneficiaire.email.trim() !== ""
    );
  };

  // Télécharger la convention seule
  const handleDownloadConvention = () => {
    if (!isFormValid()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsGenerating(true);
    try {
      const formation = buildFormation();
      const pdf = generateConventionPDF(formation, beneficiaire);
      const filename = `Convention_${beneficiaire.nom}_${beneficiaire.prenom}.pdf`;
      downloadPDF(pdf, filename);
      toast.success("Convention téléchargée");
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      toast.error("Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  };

  // Télécharger le règlement intérieur seul
  const handleDownloadReglement = () => {
    setIsGenerating(true);
    try {
      const pdf = generateReglementInterieurPDF();
      downloadPDF(pdf, "Reglement_Interieur_T3P_CAMPUS.pdf");
      toast.success("Règlement intérieur téléchargé");
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      toast.error("Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  };

  // Télécharger les CGV seules
  const handleDownloadCGV = () => {
    setIsGenerating(true);
    try {
      const pdf = generateCGVPDF();
      downloadPDF(pdf, "CGV_T3P_CAMPUS.pdf");
      toast.success("CGV téléchargées");
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      toast.error("Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  };

  // Télécharger le ZIP complet
  const handleDownloadZIP = async () => {
    if (!isFormValid()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsGenerating(true);
    try {
      const formation = buildFormation();
      const zipBlob = await generateConventionZIP(formation, beneficiaire);
      const filename = `Documents_Convention_${beneficiaire.nom}_${beneficiaire.prenom}.zip`;
      downloadBlob(zipBlob, filename);
      toast.success("Archive ZIP téléchargée (3 documents)");
    } catch (error) {
      console.error("Erreur génération ZIP:", error);
      toast.error("Erreur lors de la génération du ZIP");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Générateur de Convention de Formation
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations pour générer les documents contractuels conformes DREETS et Qualiopi.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="beneficiaire" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Bénéficiaire
            </TabsTrigger>
            <TabsTrigger value="formation" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Formation
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileArchive className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] pr-4">
            {/* Onglet Bénéficiaire */}
            <TabsContent value="beneficiaire" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Civilité */}
                <div className="space-y-2">
                  <Label>Civilité *</Label>
                  <Select
                    value={beneficiaire.civilite}
                    onValueChange={(value: Civilite) =>
                      setBeneficiaire({ ...beneficiaire, civilite: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M.">M.</SelectItem>
                      <SelectItem value="Mme">Mme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Nom */}
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input
                    value={beneficiaire.nom}
                    onChange={(e) =>
                      setBeneficiaire({ ...beneficiaire, nom: e.target.value })
                    }
                    placeholder="DUPONT"
                  />
                </div>

                {/* Prénom */}
                <div className="space-y-2">
                  <Label>Prénom *</Label>
                  <Input
                    value={beneficiaire.prenom}
                    onChange={(e) =>
                      setBeneficiaire({ ...beneficiaire, prenom: e.target.value })
                    }
                    placeholder="Jean"
                  />
                </div>

                {/* Date de naissance */}
                <div className="space-y-2">
                  <Label>Date de naissance *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !beneficiaire.dateNaissance && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {beneficiaire.dateNaissance
                          ? format(beneficiaire.dateNaissance, "dd MMMM yyyy", { locale: fr })
                          : "Sélectionner une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={beneficiaire.dateNaissance}
                        onSelect={(date) =>
                          date && setBeneficiaire({ ...beneficiaire, dateNaissance: date })
                        }
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={1940}
                        toYear={2006}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Adresse */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Adresse *</Label>
                  <Input
                    value={beneficiaire.adresse}
                    onChange={(e) =>
                      setBeneficiaire({ ...beneficiaire, adresse: e.target.value })
                    }
                    placeholder="123 rue de la Formation"
                  />
                </div>

                {/* Code Postal */}
                <div className="space-y-2">
                  <Label>Code postal *</Label>
                  <Input
                    value={beneficiaire.codePostal}
                    onChange={(e) =>
                      setBeneficiaire({ ...beneficiaire, codePostal: e.target.value })
                    }
                    placeholder="75001"
                  />
                </div>

                {/* Ville */}
                <div className="space-y-2">
                  <Label>Ville *</Label>
                  <Input
                    value={beneficiaire.ville}
                    onChange={(e) =>
                      setBeneficiaire({ ...beneficiaire, ville: e.target.value })
                    }
                    placeholder="Paris"
                  />
                </div>

                {/* Téléphone */}
                <div className="space-y-2">
                  <Label>Téléphone *</Label>
                  <Input
                    value={beneficiaire.telephone}
                    onChange={(e) =>
                      setBeneficiaire({ ...beneficiaire, telephone: e.target.value })
                    }
                    placeholder="06 12 34 56 78"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={beneficiaire.email}
                    onChange={(e) =>
                      setBeneficiaire({ ...beneficiaire, email: e.target.value })
                    }
                    placeholder="jean.dupont@email.com"
                  />
                </div>

                {/* Situation handicap */}
                <div className="flex items-center space-x-2 md:col-span-2">
                  <Checkbox
                    id="handicap"
                    checked={beneficiaire.situationHandicap}
                    onCheckedChange={(checked) =>
                      setBeneficiaire({ ...beneficiaire, situationHandicap: !!checked })
                    }
                  />
                  <Label htmlFor="handicap" className="text-sm">
                    Situation de handicap (adaptation possible)
                  </Label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setActiveTab("formation")}>
                  Suivant : Formation
                </Button>
              </div>
            </TabsContent>

            {/* Onglet Formation */}
            <TabsContent value="formation" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type de formation */}
                <div className="space-y-2">
                  <Label>Type de formation *</Label>
                  <Select
                    value={typeFormation}
                    onValueChange={(value: TypeFormation) => setTypeFormation(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VTC">VTC - Voiture de Transport avec Chauffeur</SelectItem>
                      <SelectItem value="TAXI">TAXI - Conducteur de Taxi</SelectItem>
                      <SelectItem value="VMDTR">VMDTR - Véhicule à 2/3 roues</SelectItem>
                      <SelectItem value="RECUPERATION_POINTS">Récupération de points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Modalité */}
                <div className="space-y-2">
                  <Label>Modalité *</Label>
                  <Select
                    value={modalite}
                    onValueChange={(value: Modalite) => setModalite(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="journée">Journée (9h-17h)</SelectItem>
                      <SelectItem value="soirée">Soirée (18h-22h)</SelectItem>
                      <SelectItem value="weekend">Weekend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date de début */}
                <div className="space-y-2">
                  <Label>Date de début *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateDebut && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateDebut
                          ? format(dateDebut, "dd MMMM yyyy", { locale: fr })
                          : "Sélectionner une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateDebut}
                        onSelect={(date) => {
                          if (date) {
                            setDateDebut(date);
                            updateDateFin(date);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date de fin */}
                <div className="space-y-2">
                  <Label>Date de fin *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateFin && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFin
                          ? format(dateFin, "dd MMMM yyyy", { locale: fr })
                          : "Sélectionner une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateFin}
                        onSelect={(date) => date && setDateFin(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Récapitulatif */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Récapitulatif de la formation
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="secondary">{typeFormation}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Durée:</span>
                    <span>{typeFormation === "RECUPERATION_POINTS" ? "14" : "35"} heures</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tarif HT:</span>
                    <span>{getTarif(typeFormation, modalite)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tarif TTC:</span>
                    <span className="font-medium">{(getTarif(typeFormation, modalite) * 1.2).toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveTab("beneficiaire")}>
                  Retour
                </Button>
                <Button onClick={() => setActiveTab("documents")}>
                  Suivant : Documents
                </Button>
              </div>
            </TabsContent>

            {/* Onglet Documents */}
            <TabsContent value="documents" className="space-y-4 mt-4">
              <div className="bg-muted/30 rounded-lg p-4 border">
                <h4 className="font-medium mb-3">Documents à générer</h4>
                <div className="space-y-3">
                  {/* Convention */}
                  <div className="flex items-center justify-between p-3 bg-background rounded border">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Convention de Formation</p>
                        <p className="text-xs text-muted-foreground">
                          18 articles conformes DREETS/Qualiopi
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadConvention}
                      disabled={isGenerating || !isFormValid()}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>

                  {/* Règlement intérieur */}
                  <div className="flex items-center justify-between p-3 bg-background rounded border">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="font-medium">Règlement Intérieur</p>
                        <p className="text-xs text-muted-foreground">
                          9 articles (Annexe 2)
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadReglement}
                      disabled={isGenerating}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>

                  {/* CGV */}
                  <div className="flex items-center justify-between p-3 bg-background rounded border">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Conditions Générales de Vente</p>
                        <p className="text-xs text-muted-foreground">
                          16 articles (Annexe 3)
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadCGV}
                      disabled={isGenerating}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bouton ZIP principal */}
              <div className="bg-primary/5 rounded-lg p-6 border border-primary/20 text-center">
                <FileArchive className="h-12 w-12 mx-auto text-primary mb-3" />
                <h4 className="font-medium mb-2">Télécharger l'archive complète</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Un fichier ZIP contenant les 3 documents PDF conformes
                </p>
                <Button
                  size="lg"
                  onClick={handleDownloadZIP}
                  disabled={isGenerating || !isFormValid()}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Télécharger le ZIP (3 PDFs)
                    </>
                  )}
                </Button>
              </div>

              <div className="flex justify-start pt-4">
                <Button variant="outline" onClick={() => setActiveTab("formation")}>
                  Retour
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
