import { useState } from 'react';
import { useSessionInscrits } from '@/hooks/useSessionInscrits';
import { useContacts } from '@/hooks/useContacts';
import { useSession } from '@/hooks/useSessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  UserPlus, 
  CheckSquare, 
  Eye,
  Send,
  Loader2,
  Trash2,
  FileDown,
  FileText,
  Mail,
  Award
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAddInscription, useRemoveInscription } from '@/hooks/useSessions';
import { useDocumentGenerator, type DocumentType } from '@/hooks/useDocumentGenerator';
import { useBulkCreateDocumentEnvois } from '@/hooks/useDocumentEnvois';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BulkDocumentPreviewDialog } from './BulkDocumentPreviewDialog';

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
  
  const { data: session } = useSession(sessionId);
  const { data: allContacts } = useContacts();
  const addInscription = useAddInscription();
  const removeInscription = useRemoveInscription();
  const { generateDocument, generateBulkDocuments } = useDocumentGenerator();
  const bulkCreateEnvois = useBulkCreateDocumentEnvois();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [contactsToAdd, setContactsToAdd] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Bulk send email dialog
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);
  const [bulkEmailType, setBulkEmailType] = useState('');
  const [bulkEmailMessage, setBulkEmailMessage] = useState('');
  const [isSendingBulkEmails, setIsSendingBulkEmails] = useState(false);
  const [generateAndSend, setGenerateAndSend] = useState(true);
  
  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewDocumentType, setPreviewDocumentType] = useState<DocumentType | null>(null);
  
  // Contacts disponibles (non inscrits)
  const inscribedContactIds = new Set(inscrits?.map(i => i.contact_id) || []);
  const availableContacts = allContacts?.filter(c => !inscribedContactIds.has(c.id)) || [];
  
  // Filtrer par recherche
  const filteredContacts = availableContacts.filter(c => 
    `${c.prenom} ${c.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogEnvoi, setDialogEnvoi] = useState(false);
  const [typeDocumentEnvoi, setTypeDocumentEnvoi] = useState('');
  const [contactDetail, setContactDetail] = useState<any>(null);
  
  // Session info pour la génération de documents
  const sessionInfo = session ? {
    nom: session.nom,
    formation_type: session.formation_type,
    date_debut: session.date_debut,
    date_fin: session.date_fin,
    lieu: session.lieu || undefined,
    duree_heures: session.duree_heures || 35,
    prix: session.prix ? Number(session.prix) : undefined,
  } : null;

  // Ouvrir la prévisualisation avant génération
  const handlePreviewBulkDocuments = (type: DocumentType) => {
    if (!sessionInfo || !inscrits?.length) {
      toast.error("Aucun stagiaire inscrit");
      return;
    }
    setPreviewDocumentType(type);
    setPreviewDialogOpen(true);
  };

  // Générer les documents en masse (appelé après confirmation de la prévisualisation)
  const handleConfirmBulkGeneration = () => {
    if (!previewDocumentType || !sessionInfo || !inscrits?.length) return;
    
    const contactsInfo = inscrits.map((inscrit) => {
      const contact = inscrit.contact;
      return {
        civilite: contact?.civilite || undefined,
        nom: contact?.nom || '',
        prenom: contact?.prenom || '',
        email: contact?.email || undefined,
        telephone: contact?.telephone || undefined,
        rue: contact?.rue || undefined,
        code_postal: contact?.code_postal || undefined,
        ville: contact?.ville || undefined,
        date_naissance: contact?.date_naissance || undefined,
        ville_naissance: contact?.ville_naissance || undefined,
      };
    });
    
    generateBulkDocuments(previewDocumentType, contactsInfo, sessionInfo);
    setPreviewDocumentType(null);
  };

  // Envoyer documents par email à tous
  const handleBulkSendEmails = async () => {
    if (!bulkEmailType || !inscrits?.length) return;
    
    setIsSendingBulkEmails(true);
    
    try {
      // Filtrer les inscrits avec email
      const inscribedWithEmail = inscrits.filter(i => i.contact?.email);
      
      if (inscribedWithEmail.length === 0) {
        toast.error("Aucun stagiaire n'a d'adresse email");
        return;
      }
      
      // Si génération demandée, générer d'abord les documents
      if (generateAndSend && sessionInfo) {
        const contactsInfo = inscribedWithEmail.map((inscrit) => {
          const contact = inscrit.contact;
          return {
            civilite: contact?.civilite || undefined,
            nom: contact?.nom || '',
            prenom: contact?.prenom || '',
            email: contact?.email || undefined,
            telephone: contact?.telephone || undefined,
            rue: contact?.rue || undefined,
            code_postal: contact?.code_postal || undefined,
            ville: contact?.ville || undefined,
            date_naissance: contact?.date_naissance || undefined,
            ville_naissance: contact?.ville_naissance || undefined,
          };
        });
        
        generateBulkDocuments(bulkEmailType as DocumentType, contactsInfo, sessionInfo);
      }
      
      // Créer les entrées document_envois
      const envoisData = inscribedWithEmail.map(inscrit => ({
        contact_id: inscrit.contact_id,
        session_id: sessionId,
        document_type: bulkEmailType,
        document_name: `${bulkEmailType} - ${inscrit.contact?.prenom} ${inscrit.contact?.nom}`,
        statut: 'envoyé',
      }));
      
      await bulkCreateEnvois.mutateAsync(envoisData);
      
      // Appeler l'edge function pour envoyer les emails
      const { error } = await supabase.functions.invoke('send-automated-emails', {
        body: {
          type: 'bulk_document',
          recipients: inscribedWithEmail.map(i => ({
            email: i.contact?.email,
            name: `${i.contact?.prenom} ${i.contact?.nom}`,
            contactId: i.contact_id,
          })),
          documentType: bulkEmailType,
          sessionName: session?.nom,
          customMessage: bulkEmailMessage || undefined,
        },
      });
      
      if (error) throw error;
      
      toast.success(`Documents envoyés à ${inscribedWithEmail.length} stagiaire(s)`);
      setBulkEmailDialogOpen(false);
      setBulkEmailType('');
      setBulkEmailMessage('');
    } catch (error: any) {
      console.error('Erreur envoi emails:', error);
      toast.error("Erreur lors de l'envoi des emails");
    } finally {
      setIsSendingBulkEmails(false);
    }
  };

  // Compter les emails disponibles
  const emailsCount = inscrits?.filter(i => i.contact?.email).length || 0;

  // Toggle sélection pour ajout
  const toggleContactToAdd = (contactId: string) => {
    setContactsToAdd(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Ajouter plusieurs stagiaires
  const handleAddMultipleInscriptions = async () => {
    if (contactsToAdd.length === 0) return;
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const contactId of contactsToAdd) {
      try {
        await addInscription.mutateAsync({ sessionId, contactId });
        successCount++;
      } catch {
        errorCount++;
      }
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} stagiaire(s) inscrit(s) avec succès`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} inscription(s) en erreur`);
    }
    
    setContactsToAdd([]);
    setSearchQuery('');
    setAddDialogOpen(false);
  };

  // Supprimer une inscription
  const handleRemoveInscription = async (contactId: string) => {
    try {
      await removeInscription.mutateAsync({ sessionId, contactId });
      toast.success("Inscription annulée");
    } catch {
      toast.error("Erreur lors de l'annulation");
    }
  };

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

      {/* Actions en masse pour tous les stagiaires */}
      {inscrits && inscrits.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Générer documents
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handlePreviewBulkDocuments("convocation")}>
                <Send className="h-4 w-4 mr-2" />
                Convocations ({inscrits.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePreviewBulkDocuments("convention")}>
                <FileText className="h-4 w-4 mr-2" />
                Conventions ({inscrits.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePreviewBulkDocuments("attestation")}>
                <Award className="h-4 w-4 mr-2" />
                Attestations ({inscrits.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setBulkEmailDialogOpen(true)}
            disabled={emailsCount === 0}
          >
            <Mail className="h-4 w-4 mr-2" />
            Envoyer par email ({emailsCount})
          </Button>
        </div>
      )}

      {/* Actions groupées pour sélection */}
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
            Tracer envoi
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Stagiaires ({inscrits?.length || 0})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Inscrire
          </Button>
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setContactDetail(inscrit.contact)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveInscription(inscrit.contact_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

      {/* Dialog ajout stagiaires multiples */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) {
          setContactsToAdd([]);
          setSearchQuery('');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inscrire des stagiaires</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Command className="rounded-lg border">
              <CommandInput 
                placeholder="Rechercher un contact..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-64">
                <CommandEmpty>Aucun contact trouvé</CommandEmpty>
                <CommandGroup>
                  {filteredContacts.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      onSelect={() => toggleContactToAdd(contact.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Checkbox
                          checked={contactsToAdd.includes(contact.id)}
                          onCheckedChange={() => toggleContactToAdd(contact.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {`${contact.prenom?.[0] ?? ""}${contact.nom?.[0] ?? ""}`.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {contact.prenom} {contact.nom}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {contact.email || contact.telephone || "Pas de contact"}
                          </p>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            
            {contactsToAdd.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {contactsToAdd.length} contact(s) sélectionné(s)
              </div>
            )}
            
            <Button 
              className="w-full" 
              onClick={handleAddMultipleInscriptions}
              disabled={contactsToAdd.length === 0 || addInscription.isPending}
            >
              {addInscription.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Inscrire {contactsToAdd.length > 0 ? `(${contactsToAdd.length})` : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog envoi email en masse */}
      <Dialog open={bulkEmailDialogOpen} onOpenChange={setBulkEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Envoyer documents par email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{emailsCount}</strong> stagiaire(s) avec email sur <strong>{inscrits?.length || 0}</strong> inscrit(s)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={bulkEmailType} onValueChange={setBulkEmailType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type de document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="convocation">Convocation</SelectItem>
                  <SelectItem value="convention">Convention</SelectItem>
                  <SelectItem value="attestation">Attestation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="generate-and-send" className="text-sm">
                Générer les documents avant envoi
              </Label>
              <Switch
                id="generate-and-send"
                checked={generateAndSend}
                onCheckedChange={setGenerateAndSend}
              />
            </div>

            <div className="space-y-2">
              <Label>Message personnalisé (optionnel)</Label>
              <Textarea
                placeholder="Ajoutez un message personnalisé à l'email..."
                value={bulkEmailMessage}
                onChange={(e) => setBulkEmailMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleBulkSendEmails}
              disabled={!bulkEmailType || emailsCount === 0 || isSendingBulkEmails}
            >
              {isSendingBulkEmails && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Mail className="h-4 w-4 mr-2" />
              Envoyer à {emailsCount} stagiaire(s)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog before bulk generation */}
      {previewDocumentType && sessionInfo && inscrits && (
        <BulkDocumentPreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          documentType={previewDocumentType}
          inscrits={inscrits}
          sessionInfo={sessionInfo}
          onConfirm={handleConfirmBulkGeneration}
        />
      )}
    </div>
  );
}
