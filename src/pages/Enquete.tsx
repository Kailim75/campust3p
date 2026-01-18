import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, CheckCircle, AlertCircle, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TokenData {
  id: string;
  contact_id: string;
  session_id: string | null;
  type: "satisfaction" | "reclamation";
  contact: { id: string; nom: string; prenom: string; email: string } | null;
  session: { id: string; nom: string; formation_type: string } | null;
}

export default function EnquetePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);

  // Satisfaction form state
  const [noteGlobale, setNoteGlobale] = useState(8);
  const [noteFormateur, setNoteFormateur] = useState(8);
  const [noteSupports, setNoteSupports] = useState(8);
  const [noteLocaux, setNoteLocaux] = useState(8);
  const [npsScore, setNpsScore] = useState(8);
  const [objectifsAtteints, setObjectifsAtteints] = useState("oui");
  const [commentaire, setCommentaire] = useState("");

  // Reclamation form state
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState("formation");
  const [priorite, setPriorite] = useState("moyenne");

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setError("Lien invalide");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("enquete_tokens")
        .select(`
          *,
          contact:contacts(id, nom, prenom, email),
          session:sessions(id, nom, formation_type)
        `)
        .eq("token", token)
        .single();

      if (error) throw new Error("Lien invalide ou expiré");

      // Check expiration
      if (new Date(data.expire_at) < new Date()) {
        throw new Error("Ce lien a expiré. Veuillez contacter le centre de formation.");
      }

      // Check if already used
      if (data.used_at) {
        throw new Error("Ce formulaire a déjà été rempli. Merci pour votre participation !");
      }

      setTokenData(data as TokenData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSatisfaction = async () => {
    if (!tokenData) return;
    
    setSubmitting(true);
    try {
      // Insert response
      const { error: insertError } = await supabase
        .from("satisfaction_reponses")
        .insert({
          contact_id: tokenData.contact_id,
          session_id: tokenData.session_id,
          type_questionnaire: "fin_formation",
          note_globale: noteGlobale,
          note_formateur: noteFormateur,
          note_supports: noteSupports,
          note_locaux: noteLocaux,
          nps_score: npsScore,
          objectifs_atteints: objectifsAtteints,
          commentaire: commentaire || null,
        });

      if (insertError) throw insertError;

      // Mark token as used
      await supabase
        .from("enquete_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);

      setSubmitted(true);
      toast.success("Merci pour votre retour !");
    } catch (err: any) {
      toast.error("Erreur lors de l'envoi: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReclamation = async () => {
    if (!tokenData) return;
    
    if (!titre.trim()) {
      toast.error("Veuillez saisir un sujet");
      return;
    }
    if (!description.trim()) {
      toast.error("Veuillez décrire votre réclamation");
      return;
    }

    setSubmitting(true);
    try {
      // Insert reclamation
      const { error: insertError } = await supabase
        .from("reclamations")
        .insert({
          contact_id: tokenData.contact_id,
          session_id: tokenData.session_id,
          titre,
          description,
          categorie,
          priorite,
        });

      if (insertError) throw insertError;

      // Mark token as used
      await supabase
        .from("enquete_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);

      setSubmitted(true);
      toast.success("Réclamation enregistrée avec succès");
    } catch (err: any) {
      toast.error("Erreur lors de l'envoi: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getNPSLabel = (score: number) => {
    if (score >= 9) return { label: "Promoteur", icon: ThumbsUp, color: "text-green-600" };
    if (score >= 7) return { label: "Passif", icon: Minus, color: "text-yellow-600" };
    return { label: "Détracteur", icon: ThumbsDown, color: "text-red-600" };
  };

  const npsInfo = getNPSLabel(npsScore);
  const NPSIcon = npsInfo.icon;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Lien invalide</h2>
            <p className="text-muted-foreground text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {tokenData?.type === "satisfaction" ? "Merci pour votre avis !" : "Réclamation enregistrée"}
            </h2>
            <p className="text-muted-foreground text-center">
              {tokenData?.type === "satisfaction"
                ? "Votre retour nous aide à améliorer la qualité de nos formations."
                : "Votre réclamation a été transmise à notre équipe qui vous contactera dans les meilleurs délais."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSatisfaction = tokenData?.type === "satisfaction";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            isSatisfaction ? "bg-primary/10" : "bg-destructive/10"
          }`}>
            {isSatisfaction ? (
              <Star className="h-8 w-8 text-primary" />
            ) : (
              <AlertCircle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {isSatisfaction ? "Questionnaire de satisfaction" : "Formulaire de réclamation"}
          </h1>
          <p className="text-muted-foreground">
            Bonjour {tokenData?.contact?.prenom} {tokenData?.contact?.nom}
          </p>
          {tokenData?.session && (
            <Badge variant="secondary" className="mt-2">
              {tokenData.session.nom}
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isSatisfaction ? "Votre avis nous intéresse" : "Décrivez votre réclamation"}
            </CardTitle>
            <CardDescription>
              {isSatisfaction
                ? "Merci de prendre quelques minutes pour évaluer votre formation"
                : "Nous prenons en compte toutes les réclamations pour améliorer nos services"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isSatisfaction ? (
              <>
                {/* Note globale */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Note globale de la formation
                    <span className="ml-2 text-2xl font-bold text-primary">{noteGlobale}/10</span>
                  </Label>
                  <Slider
                    value={[noteGlobale]}
                    onValueChange={([v]) => setNoteGlobale(v)}
                    min={1}
                    max={10}
                    step={1}
                    className="py-4"
                  />
                </div>

                {/* Note formateur */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Qualité du formateur
                    <span className="ml-2 text-lg font-semibold">{noteFormateur}/10</span>
                  </Label>
                  <Slider
                    value={[noteFormateur]}
                    onValueChange={([v]) => setNoteFormateur(v)}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                {/* Note supports */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Supports pédagogiques
                    <span className="ml-2 text-lg font-semibold">{noteSupports}/10</span>
                  </Label>
                  <Slider
                    value={[noteSupports]}
                    onValueChange={([v]) => setNoteSupports(v)}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                {/* Note locaux */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Locaux et équipements
                    <span className="ml-2 text-lg font-semibold">{noteLocaux}/10</span>
                  </Label>
                  <Slider
                    value={[noteLocaux]}
                    onValueChange={([v]) => setNoteLocaux(v)}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                {/* NPS Score */}
                <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                  <Label className="text-base font-medium">
                    Recommanderiez-vous notre formation à un proche ?
                  </Label>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold">{npsScore}</span>
                    <NPSIcon className={`h-6 w-6 ${npsInfo.color}`} />
                    <Badge variant={npsScore >= 9 ? "default" : npsScore >= 7 ? "secondary" : "destructive"}>
                      {npsInfo.label}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Pas du tout</span>
                    <span>Certainement</span>
                  </div>
                  <Slider
                    value={[npsScore]}
                    onValueChange={([v]) => setNpsScore(v)}
                    min={0}
                    max={10}
                    step={1}
                  />
                </div>

                {/* Objectifs atteints */}
                <div className="space-y-2">
                  <Label>Les objectifs de la formation ont-ils été atteints ?</Label>
                  <Select value={objectifsAtteints} onValueChange={setObjectifsAtteints}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui, totalement</SelectItem>
                      <SelectItem value="partiellement">Partiellement</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Commentaire */}
                <div className="space-y-2">
                  <Label>Commentaire libre (facultatif)</Label>
                  <Textarea
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    placeholder="Partagez vos suggestions d'amélioration, ce que vous avez apprécié..."
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleSubmitSatisfaction}
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer mon avis"
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Catégorie */}
                <div className="space-y-2">
                  <Label>Catégorie de la réclamation</Label>
                  <Select value={categorie} onValueChange={setCategorie}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formation">Contenu de la formation</SelectItem>
                      <SelectItem value="formateur">Formateur</SelectItem>
                      <SelectItem value="organisation">Organisation</SelectItem>
                      <SelectItem value="administratif">Administratif</SelectItem>
                      <SelectItem value="locaux">Locaux / Équipements</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priorité */}
                <div className="space-y-2">
                  <Label>Niveau d'urgence</Label>
                  <Select value={priorite} onValueChange={setPriorite}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basse">Basse - Suggestion d'amélioration</SelectItem>
                      <SelectItem value="moyenne">Moyenne - Problème à résoudre</SelectItem>
                      <SelectItem value="haute">Haute - Problème urgent</SelectItem>
                      <SelectItem value="critique">Critique - Situation bloquante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Titre */}
                <div className="space-y-2">
                  <Label>Sujet de la réclamation *</Label>
                  <Input
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    placeholder="Résumez votre réclamation en quelques mots"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description détaillée *</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez précisément votre réclamation, les circonstances, et ce que vous attendez comme résolution..."
                    rows={6}
                    required
                  />
                </div>

                <Button
                  onClick={handleSubmitReclamation}
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                  variant="destructive"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer ma réclamation"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Vos données sont traitées de manière confidentielle conformément au RGPD.
        </p>
      </div>
    </div>
  );
}
