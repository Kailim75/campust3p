import { useState } from 'react';
import { useSessionInscrits } from '@/hooks/useSessionInscrits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  CheckSquare, 
  Eye,
  Send,
  Loader2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface SessionInscritsTableProps {
  sessionId: string;
}

export default function SessionInscritsTable({ sessionId }: SessionInscritsTableProps) {
  const { 
    inscrits, 
    isLoading, 
    stats,
    emargerMultiples,
    tracerEnvoiGroupe,
    isEmargement,
    isEnvoi
  } = useSessionInscrits(sessionId);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogEnvoi, setDialogEnvoi] = useState(false);
  const [typeDocumentEnvoi, setTypeDocumentEnvoi] = useState('');
  const [contactDetail, setContactDetail] = useState<any>(null);

  // Toggle sélection
  const toggleSelectAll = () => {
    if (selectedIds.length === inscrits?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inscrits?.map(i => i.contact_id) || []);
    }
  };

  const toggleSelect = (contactId: string) => {
    setSelectedIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId) 
        : [...prev, contactId]
    );
  };

  // Actions
  const handleEmarger = () => {
    if (selectedIds.length > 0) {
      emargerMultiples(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleEnvoyerDocument = () => {
    if (typeDocumentEnvoi && selectedIds.length > 0) {
      tracerEnvoiGroupe({ contactIds: selectedIds, typeDocument: typeDocumentEnvoi });
      setDialogEnvoi(false);
      setSelectedIds([]);
      setTypeDocumentEnvoi('');
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
      inscrit: 'secondary',
      confirme: 'default',
      present: 'default',
      absent: 'destructive'
    };
    return <Badge variant={variants[statut] || 'outline'}>{statut}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats rapides */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-2">
          <div className="text-center">
            <p className="text-lg font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </Card>
        <Card className="p-2">
          <div className="text-center">
            <p className="text-lg font-bold text-info">{stats.inscrits}</p>
            <p className="text-xs text-muted-foreground">Inscrits</p>
          </div>
        </Card>
        <Card className="p-2">
          <div className="text-center">
            <p className="text-lg font-bold text-warning">{stats.confirmes}</p>
            <p className="text-xs text-muted-foreground">Confirmés</p>
          </div>
        </Card>
        <Card className="p-2">
          <div className="text-center">
            <p className="text-lg font-bold text-success">{stats.presents}</p>
            <p className="text-xs text-muted-foreground">Présents</p>
          </div>
        </Card>
      </div>

      {/* Actions groupées */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} sélectionné(s)
          </span>
          <Button size="sm" variant="outline" onClick={handleEmarger} disabled={isEmargement}>
            {isEmargement && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            <CheckSquare className="h-3 w-3 mr-1" />
            Émarger
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialogEnvoi(true)} disabled={isEnvoi}>
            <Send className="h-3 w-3 mr-1" />
            Envoyer document
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Stagiaires ({inscrits?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.length === inscrits?.length && (inscrits?.length || 0) > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Statut</TableHead>
                <TableHead className="w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inscrits && inscrits.length > 0 ? (
                inscrits.map(inscrit => (
                  <TableRow key={inscrit.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(inscrit.contact_id)}
                        onCheckedChange={() => toggleSelect(inscrit.contact_id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {inscrit.contact?.prenom} {inscrit.contact?.nom}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {inscrit.contact?.email}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {getStatutBadge(inscrit.statut)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setContactDetail(inscrit.contact)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucun stagiaire inscrit
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog envoi document */}
      <Dialog open={dialogEnvoi} onOpenChange={setDialogEnvoi}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer un document à {selectedIds.length} stagiaire(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={typeDocumentEnvoi} onValueChange={setTypeDocumentEnvoi}>
              <SelectTrigger>
                <SelectValue placeholder="Type de document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Convention">Convention</SelectItem>
                <SelectItem value="Attestation">Attestation</SelectItem>
                <SelectItem value="Programme">Programme</SelectItem>
                <SelectItem value="Règlement intérieur">Règlement intérieur</SelectItem>
                <SelectItem value="Facture">Facture</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              className="w-full" 
              onClick={handleEnvoyerDocument}
              disabled={!typeDocumentEnvoi || isEnvoi}
            >
              {isEnvoi && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Envoyer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog fiche contact */}
      <Dialog open={!!contactDetail} onOpenChange={() => setContactDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {contactDetail?.prenom} {contactDetail?.nom}
            </DialogTitle>
          </DialogHeader>
          {contactDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{contactDetail.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{contactDetail.telephone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Formation</p>
                  <Badge variant="outline">{contactDetail.formation || '-'}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <Badge variant="secondary">{contactDetail.statut || '-'}</Badge>
                </div>
              </div>
              {contactDetail.ville && (
                <div>
                  <p className="text-sm text-muted-foreground">Ville</p>
                  <p className="font-medium">{contactDetail.ville}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
