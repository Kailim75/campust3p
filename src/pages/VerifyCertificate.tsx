import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Search,
  Loader2,
  Award,
  Calendar,
  User,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CertificateData {
  id: string;
  numero_certificat: string;
  type_attestation: string;
  date_emission: string;
  status: "generated" | "cancelled" | "revoked";
  revoked_at: string | null;
  revocation_reason: string | null;
  metadata: Record<string, unknown>;
  contact?: {
    nom: string;
    prenom: string;
  };
  session?: {
    nom: string;
    formation_type: string;
  };
}

export default function VerifyCertificate() {
  const [searchNumber, setSearchNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<CertificateData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmed = searchNumber.trim().toUpperCase();
    if (!trimmed) return;

    setIsSearching(true);
    setNotFound(false);
    setResult(null);
    setHasSearched(true);

    try {
      // Use the public verification - limited data exposure
      const { data, error } = await supabase
        .from("attestation_certificates")
        .select(`
          id,
          numero_certificat,
          type_attestation,
          date_emission,
          status,
          revoked_at,
          revocation_reason,
          metadata,
          contact:contacts(nom, prenom),
          session:sessions(nom, formation_type)
        `)
        .eq("numero_certificat", trimmed)
        .maybeSingle();

      if (error) {
        console.error("Erreur recherche:", error);
        setNotFound(true);
      } else if (!data) {
        setNotFound(true);
      } else {
        setResult(data as unknown as CertificateData);
      }
    } catch (err) {
      console.error("Erreur:", err);
      setNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "generated":
        return {
          label: "Valide",
          icon: ShieldCheck,
          variant: "default" as const,
          color: "text-green-600",
          bgColor: "bg-green-50 border-green-200",
        };
      case "cancelled":
        return {
          label: "Annulé",
          icon: ShieldX,
          variant: "secondary" as const,
          color: "text-gray-600",
          bgColor: "bg-gray-50 border-gray-200",
        };
      case "revoked":
        return {
          label: "Révoqué",
          icon: AlertTriangle,
          variant: "destructive" as const,
          color: "text-red-600",
          bgColor: "bg-red-50 border-red-200",
        };
      default:
        return {
          label: status,
          icon: Shield,
          variant: "outline" as const,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
        };
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      formation: "Attestation de formation",
      competences: "Attestation de compétences",
      mobilite: "Attestation de mobilité",
    };
    return labels[type] || type;
  };

  const statusConfig = result ? getStatusConfig(result.status) : null;
  const StatusIcon = statusConfig?.icon || Shield;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Vérification de certificat</h1>
              <p className="text-sm text-muted-foreground">
                Portail de vérification des attestations de formation
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Search Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Vérifier un certificat
            </CardTitle>
            <CardDescription>
              Saisissez le numéro de certificat pour vérifier son authenticité et sa validité
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-3">
              <Input
                placeholder="Ex: T3P-COMP-2024-000001"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                className="font-mono"
                disabled={isSearching}
              />
              <Button type="submit" disabled={isSearching || !searchNumber.trim()}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Vérifier</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {hasSearched && (
          <>
            {notFound ? (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center py-6">
                    <div className="p-3 rounded-full bg-orange-100 mb-4">
                      <XCircle className="h-8 w-8 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Certificat non trouvé</h3>
                    <p className="text-muted-foreground max-w-md">
                      Aucun certificat ne correspond au numéro{" "}
                      <span className="font-mono font-medium">{searchNumber.toUpperCase()}</span>.
                      Vérifiez le numéro et réessayez.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : result ? (
              <Card className={cn("border-2", statusConfig?.bgColor)}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-3 rounded-full", 
                        result.status === "generated" ? "bg-green-100" : 
                        result.status === "revoked" ? "bg-red-100" : "bg-gray-100"
                      )}>
                        <StatusIcon className={cn("h-6 w-6", statusConfig?.color)} />
                      </div>
                      <div>
                        <CardTitle className="text-xl">
                          {result.status === "generated" ? "Certificat valide" : 
                           result.status === "revoked" ? "Certificat révoqué" : 
                           "Certificat annulé"}
                        </CardTitle>
                        <p className="font-mono text-sm text-muted-foreground mt-1">
                          {result.numero_certificat}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusConfig?.variant}>
                      {statusConfig?.label}
                    </Badge>
                  </div>
                </CardHeader>

                <Separator />

                <CardContent className="pt-6 space-y-6">
                  {/* Certificate Info Grid */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Type d'attestation</p>
                        <p className="font-medium">{getTypeLabel(result.type_attestation)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date d'émission</p>
                        <p className="font-medium">
                          {format(new Date(result.date_emission), "dd MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>

                    {result.contact && (
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Bénéficiaire</p>
                          <p className="font-medium">
                            {result.contact.prenom} {result.contact.nom}
                          </p>
                        </div>
                      </div>
                    )}

                    {result.session && (
                      <div className="flex items-start gap-3">
                        <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Formation</p>
                          <p className="font-medium">
                            {result.session.formation_type?.toUpperCase() || result.session.nom}
                          </p>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Revocation info */}
                  {result.status === "revoked" && result.revoked_at && (
                    <div className="p-4 rounded-lg bg-red-100/50 border border-red-200">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">Ce certificat a été révoqué</p>
                          <p className="text-sm text-red-700 mt-1">
                            Le {format(new Date(result.revoked_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                          </p>
                          {result.revocation_reason && (
                            <p className="text-sm text-red-600 mt-2">
                              Motif : {result.revocation_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Valid certificate message */}
                  {result.status === "generated" && (
                    <div className="p-4 rounded-lg bg-green-100/50 border border-green-200">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800">
                            Ce certificat est authentique et valide
                          </p>
                          <p className="text-sm text-green-700 mt-1">
                            Il a été émis par notre organisme de formation et n'a pas été révoqué.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </>
        )}

        {/* Info section */}
        {!hasSearched && (
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="text-center py-4">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Comment ça fonctionne ?</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Chaque attestation délivrée par notre centre de formation possède un
                  numéro unique. Ce portail vous permet de vérifier l'authenticité
                  et la validité de tout certificat.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
                  <div className="p-3 rounded-lg bg-background">
                    <span className="font-medium text-primary">1.</span> Saisissez le numéro
                  </div>
                  <div className="p-3 rounded-lg bg-background">
                    <span className="font-medium text-primary">2.</span> Cliquez sur Vérifier
                  </div>
                  <div className="p-3 rounded-lg bg-background">
                    <span className="font-medium text-primary">3.</span> Consultez le résultat
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Portail de vérification des certificats - Conforme Qualiopi</p>
        </div>
      </footer>
    </div>
  );
}
