import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  KeyRound,
  RefreshCw,
  ShieldOff,
  Loader2,
  Check,
  AlertTriangle,
  Code,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CentreApiKey {
  id: string;
  centre_id: string;
  key_prefix: string;
  label: string | null;
  actif: boolean;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

interface CentreLite {
  id: string;
  nom: string;
}

export default function SuperAdminApiKeys() {
  const queryClient = useQueryClient();
  const [selectedCentreId, setSelectedCentreId] = useState<string>("");
  const [labelInput, setLabelInput] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<CentreApiKey | null>(null);

  const { data: centres = [] } = useQuery({
    queryKey: ["sa-centres-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centres")
        .select("id, nom")
        .order("nom");
      if (error) throw error;
      return data as CentreLite[];
    },
  });

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["centre-api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centre_api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CentreApiKey[];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (params: {
      centre_id: string;
      label: string;
      action: "create" | "regenerate";
    }) => {
      const { data, error } = await supabase.functions.invoke("manage-centre-api-key", {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setGeneratedKey(data.api_key);
      setLabelInput("");
      queryClient.invalidateQueries({ queryKey: ["centre-api-keys"] });
      toast.success("Clé API générée");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (centre_id: string) => {
      const { data, error } = await supabase.functions.invoke("manage-centre-api-key", {
        body: { centre_id, action: "revoke" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centre-api-keys"] });
      toast.success("Clé révoquée");
      setRevokeTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCopy = async () => {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    toast.success("Clé copiée dans le presse-papiers");
    setTimeout(() => setCopied(false), 2000);
  };

  const centreNameOf = (id: string) =>
    centres.find((c) => c.id === id)?.nom ?? id.slice(0, 8);

  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-v1`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Clés API par centre
          </CardTitle>
          <CardDescription>
            Générez une clé API pour permettre à un centre d'intégrer son CRM avec des
            services externes (site web, Zapier, Codex, etc.). Une seule clé active par
            centre.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Génération */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Générer une nouvelle clé</CardTitle>
          <CardDescription>
            La génération révoque automatiquement toute clé active existante pour ce
            centre.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Centre</Label>
              <Select value={selectedCentreId} onValueChange={setSelectedCentreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un centre" />
                </SelectTrigger>
                <SelectContent>
                  {centres.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Libellé (optionnel)</Label>
              <Input
                placeholder="ex: Intégration site web"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={!selectedCentreId || generateMutation.isPending}
                onClick={() =>
                  generateMutation.mutate({
                    centre_id: selectedCentreId,
                    label: labelInput,
                    action: "create",
                  })
                }
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4 mr-2" />
                )}
                Générer la clé
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clés existantes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune clé API générée pour l'instant.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Centre</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Préfixe</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créée</TableHead>
                  <TableHead>Dernière utilisation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">
                      {centreNameOf(k.centre_id)}
                    </TableCell>
                    <TableCell>{k.label ?? "—"}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {k.key_prefix}…
                      </code>
                    </TableCell>
                    <TableCell>
                      {k.actif ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Révoquée</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(k.created_at), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.last_used_at
                        ? format(new Date(k.last_used_at), "dd/MM/yyyy HH:mm", {
                            locale: fr,
                          })
                        : "Jamais"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {k.actif && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              generateMutation.mutate({
                                centre_id: k.centre_id,
                                label: k.label ?? "",
                                action: "regenerate",
                              })
                            }
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Régénérer
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRevokeTarget(k)}
                          >
                            <ShieldOff className="h-3.5 w-3.5 mr-1" />
                            Révoquer
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-4 w-4" />
            Utilisation de l'API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium mb-1">Endpoint de base</p>
            <code className="block bg-muted p-2 rounded text-xs break-all">
              {apiBaseUrl}
            </code>
          </div>
          <div>
            <p className="font-medium mb-1">Authentification</p>
            <p className="text-muted-foreground mb-2">
              Inclure la clé dans l'en-tête HTTP <code>x-api-key</code>.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Exemple — lister les contacts</p>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`curl -H "x-api-key: ct3p_..." \\
  "${apiBaseUrl}/contacts?limit=20"`}
            </pre>
          </div>
          <div>
            <p className="font-medium mb-1">Exemple — créer un prospect</p>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`curl -X POST -H "x-api-key: ct3p_..." \\
  -H "Content-Type: application/json" \\
  -d '{"nom":"Dupont","prenom":"Jean","email":"j@d.fr"}' \\
  "${apiBaseUrl}/prospects"`}
            </pre>
          </div>
          <div>
            <p className="font-medium mb-1">Ressources disponibles</p>
            <p className="text-xs text-muted-foreground">
              contacts, prospects, sessions, session_inscriptions, factures, paiements,
              catalogue_formations, formateurs, vehicules, creneaux_conduite,
              contact_documents, contact_historique, emargements, rappels
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Méthodes HTTP</p>
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
              <li><code>GET /api-v1/&lt;resource&gt;</code> — liste (filtres ?field=value)</li>
              <li><code>GET /api-v1/&lt;resource&gt;/&lt;id&gt;</code> — détail</li>
              <li><code>POST /api-v1/&lt;resource&gt;</code> — création</li>
              <li><code>PATCH /api-v1/&lt;resource&gt;/&lt;id&gt;</code> — mise à jour</li>
              <li><code>DELETE /api-v1/&lt;resource&gt;/&lt;id&gt;</code> — suppression</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Modal affichage clé fraîchement générée */}
      <Dialog open={!!generatedKey} onOpenChange={(open) => !open && setGeneratedKey(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Votre nouvelle clé API</DialogTitle>
            <DialogDescription>
              Copiez-la maintenant — elle ne sera plus jamais affichée.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Stockage sécurisé requis</AlertTitle>
            <AlertDescription>
              Cette clé donne un accès complet aux données du centre. Ne la partagez
              jamais publiquement, ne la commitez jamais dans un dépôt Git.
            </AlertDescription>
          </Alert>
          <div className="flex items-center gap-2 bg-muted p-3 rounded-md">
            <code className="flex-1 text-xs break-all font-mono">{generatedKey}</code>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setGeneratedKey(null)}>J'ai sauvegardé la clé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation révocation */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer cette clé API ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les intégrations utilisant cette clé cesseront immédiatement de
              fonctionner. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.centre_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Révoquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
