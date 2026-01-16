import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileSignature,
  Send,
  Eye,
  Trash2,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Copy,
  User,
  FileText,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  useSignatureRequests,
  useSendSignatureRequest,
  useDeleteSignatureRequest,
  SignatureRequest,
} from "@/hooks/useSignatures";
import { useSendSignatureEmail } from "@/hooks/useSendSignatureEmail";

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  en_attente: { label: "En attente", color: "bg-muted text-muted-foreground", icon: Clock },
  envoye: { label: "Envoyé", color: "bg-info/10 text-info", icon: Mail },
  signe: { label: "Signé", color: "bg-success/10 text-success", icon: CheckCircle },
  refuse: { label: "Refusé", color: "bg-destructive/10 text-destructive", icon: XCircle },
  expire: { label: "Expiré", color: "bg-warning/10 text-warning", icon: AlertTriangle },
};

export function SignaturesPage() {
  const [showForm, setShowForm] = useState(false);
  const [signingRequest, setSigningRequest] = useState<SignatureRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statutFilter, setStatutFilter] = useState<string>("all");

  const { data: signatures = [], isLoading } = useSignatureRequests();
  const sendRequest = useSendSignatureRequest();
  const deleteRequest = useDeleteSignatureRequest();
  const sendEmail = useSendSignatureEmail();

  const filteredSignatures = statutFilter === "all"
    ? signatures
    : signatures.filter((s) => s.statut === statutFilter);

  // Stats
  const stats = {
    total: signatures.length,
    enAttente: signatures.filter((s) => s.statut === "en_attente").length,
    envoyes: signatures.filter((s) => s.statut === "envoye").length,
    signes: signatures.filter((s) => s.statut === "signe").length,
    refuses: signatures.filter((s) => s.statut === "refuse").length,
  };

  const handleSend = async (id: string) => {
    try {
      await sendEmail.mutateAsync({
        signatureRequestId: id,
        type: "signature_request",
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRequest.mutateAsync(deleteId);
      toast.success("Demande supprimée");
      setDeleteId(null);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const copySigningLink = (id: string) => {
    const link = `${window.location.origin}/signature/${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien copié dans le presse-papier");
  };

  const renderStatutBadge = (statut: string) => {
    const config = STATUT_CONFIG[statut] || STATUT_CONFIG.en_attente;
    const Icon = config.icon;
    return (
      <Badge className={cn("gap-1", config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Signatures électroniques"
        subtitle="Gestion des documents à signer"
        addLabel="Nouvelle demande"
        onAddClick={() => setShowForm(true)}
      />

      <main className="p-6 space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileSignature className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">En attente</p>
                  <p className="text-xl font-bold">{stats.enAttente}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-info/10">
                  <Mail className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Envoyés</p>
                  <p className="text-xl font-bold">{stats.envoyes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Signés</p>
                  <p className="text-xl font-bold text-success">{stats.signes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Refusés</p>
                  <p className="text-xl font-bold text-destructive">{stats.refuses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <Select value={statutFilter} onValueChange={setStatutFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="envoye">Envoyé</SelectItem>
              <SelectItem value="signe">Signé</SelectItem>
              <SelectItem value="refuse">Refusé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Document</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Créé le</TableHead>
                <TableHead className="font-semibold">Expiration</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSignatures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune demande de signature</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => setShowForm(true)}
                    >
                      Créer une demande
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSignatures.map((sig) => {
                  const contact = sig.contact as any;
                  const isExpired = sig.date_expiration && isPast(parseISO(sig.date_expiration));

                  return (
                    <TableRow key={sig.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{sig.titre}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {sig.type_document}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {contact?.prenom} {contact?.nom}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {renderStatutBadge(isExpired && sig.statut === "envoye" ? "expire" : sig.statut)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(sig.created_at), "dd/MM/yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sig.date_expiration ? (
                          <span className={cn(
                            "text-sm",
                            isExpired && "text-destructive"
                          )}>
                            {format(parseISO(sig.date_expiration), "dd/MM/yyyy")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {sig.statut === "en_attente" && (
                              <DropdownMenuItem onClick={() => handleSend(sig.id)}>
                                <Send className="h-4 w-4 mr-2" />
                                Envoyer
                              </DropdownMenuItem>
                            )}
                            {(sig.statut === "envoye" || sig.statut === "en_attente") && (
                              <>
                                <DropdownMenuItem onClick={() => setSigningRequest(sig)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Signer (test)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copySigningLink(sig.id)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copier le lien
                                </DropdownMenuItem>
                              </>
                            )}
                            {sig.statut === "signe" && sig.signature_url && (
                              <DropdownMenuItem onClick={() => window.open(sig.signature_url!, "_blank")}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir signature
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setDeleteId(sig.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      {/* Form Dialog */}
      <SignatureFormDialog open={showForm} onOpenChange={setShowForm} />

      {/* Signing Dialog */}
      <SignatureSigningDialog
        open={!!signingRequest}
        onOpenChange={(open) => !open && setSigningRequest(null)}
        signatureRequest={signingRequest}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette demande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
