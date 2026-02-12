import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  Award,
  Receipt,
  Plus,
  Edit
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAddInscription, useRemoveInscription } from '@/hooks/useSessions';
import { useDocumentGenerator, type DocumentType } from '@/hooks/useDocumentGenerator';
import { useBulkCreateDocumentEnvois } from '@/hooks/useDocumentEnvois';
import { useFactures, type FactureWithDetails } from '@/hooks/useFactures';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BulkDocumentPreviewDialog, TemplateSelection } from './BulkDocumentPreviewDialog';
import { FactureFormDialog } from '@/components/paiements/FactureFormDialog';
import { FactureDetailSheet } from '@/components/paiements/FactureDetailSheet';
import { SendDocumentsToContactDialog } from './SendDocumentsToContactDialog';
import { ContactDetailSheet } from '@/components/contacts/ContactDetailSheet';
import { ContactFormDialog } from '@/components/contacts/ContactFormDialog';
import { useDocumentTemplateFiles } from '@/hooks/useDocumentTemplateFiles';
import { fetchContactsDocumentData } from '@/lib/documents/fetchContactDocumentData';
import { useCentreFormation } from '@/hooks/useCentreFormation';
import { processDocxWithVariables, buildVariableData } from '@/lib/docx-processor';
import type { Contact } from '@/hooks/useContacts';

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
  const { data: allFactures = [] } = useFactures();
  const addInscription = useAddInscription();
  const removeInscription = useRemoveInscription();
  const { generateDocument, generateBulkDocuments } = useDocumentGenerator();
  const bulkCreateEnvois = useBulkCreateDocumentEnvois();
  const { data: fileTemplates = [] } = useDocumentTemplateFiles();
  const { centreFormation } = useCentreFormation();
  
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
  
  // Facture dialogs
  const [factureFormOpen, setFactureFormOpen] = useState(false);
  const [factureDetailOpen, setFactureDetailOpen] = useState(false);
  const [selectedContactIdForFacture, setSelectedContactIdForFacture] = useState<string | null>(null);
  const [selectedFactureId, setSelectedFactureId] = useState<string | null>(null);
  const [editingFacture, setEditingFacture] = useState<FactureWithDetails | null>(null);
  
  // Send documents to single contact dialog
  const [sendDocsDialogOpen, setSendDocsDialogOpen] = useState(false);
  const [selectedContactForDocs, setSelectedContactForDocs] = useState<any>(null);
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
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  
  // Helper to get facture for a contact
  const getFactureForContact = (contactId: string): FactureWithDetails | undefined => {
    return allFactures.find(f => f.contact_id === contactId);
  };

  // Open facture creation for a contact
  const handleCreateFacture = (contactId: string) => {
    setSelectedContactIdForFacture(contactId);
    setEditingFacture(null);
    setFactureFormOpen(true);
  };

  // Open facture editing
  const handleEditFacture = (facture: FactureWithDetails) => {
    setEditingFacture(facture);
    setSelectedContactIdForFacture(facture.contact_id);
    setFactureFormOpen(true);
  };

  // View facture details
  const handleViewFacture = (factureId: string) => {
    setSelectedFactureId(factureId);
    setFactureDetailOpen(true);
  };
  // Session info pour la génération de documents
  const sessionInfo = session ? {
    id: session.id, // Nécessaire pour générer le numéro de certificat
    nom: session.nom,
    formation_type: session.formation_type,
    date_debut: session.date_debut,
    date_fin: session.date_fin,
    lieu: session.lieu || undefined,
    heure_debut: session.heure_debut || undefined,
    heure_fin: session.heure_fin || undefined,
    duree_heures: session.duree_heures || 35,
    prix: session.prix ? Number(session.prix) : undefined,
  } : null;

  // Générer un document pour un seul stagiaire
  const handleGenerateSingleDocument = (type: DocumentType, contact: any) => {
    if (!sessionInfo || !contact) {
      toast.error("Données manquantes pour la génération");
      return;
    }
    
    // Mapping complet incluant carte pro, permis, naissance
    const contactInfo = {
      id: contact.id, // Nécessaire pour générer le numéro de certificat
      civilite: contact.civilite || undefined,
      nom: contact.nom || '',
      prenom: contact.prenom || '',
      email: contact.email || undefined,
      telephone: contact.telephone || undefined,
      rue: contact.rue || undefined,
      code_postal: contact.code_postal || undefined,
      ville: contact.ville || undefined,
      date_naissance: contact.date_naissance || undefined,
      ville_naissance: contact.ville_naissance || undefined,
      pays_naissance: contact.pays_naissance || undefined,
      numero_carte_professionnelle: contact.numero_carte_professionnelle || undefined,
      prefecture_carte: contact.prefecture_carte || undefined,
      date_expiration_carte: contact.date_expiration_carte || undefined,
      numero_permis: contact.numero_permis || undefined,
      prefecture_permis: contact.prefecture_permis || undefined,
      date_delivrance_permis: contact.date_delivrance_permis || undefined,
      formation: contact.formation || undefined,
    };
    
    generateDocument(type, contactInfo, sessionInfo);
  };

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
  const handleConfirmBulkGeneration = async (selection?: TemplateSelection) => {
    if (!previewDocumentType || !sessionInfo || !inscrits?.length) return;
    
    // Check if using a file template (DOCX)
    if (selection?.type === 'file' && selection.templateId) {
      const template = fileTemplates.find(t => t.id === selection.templateId);
      
      if (template && template.type_fichier === 'docx') {
        // Generate DOCX files with variable replacement for each trainee
        toast.info(`Génération de ${inscrits.length} document(s)...`);
        
        try {
          // Download the template file
          const { data: templateBlob, error: downloadError } = await supabase.storage
            .from('document-templates')
            .download(template.file_path);
          
          if (downloadError || !templateBlob) {
            throw new Error('Impossible de télécharger le modèle');
          }
          
          let successCount = 0;

          let contactsById: Record<string, any> = {};
          try {
            const ids = inscrits
              .map((i) => i.contact?.id)
              .filter(Boolean) as string[];
            contactsById = await fetchContactsDocumentData(ids);
          } catch (e) {
            console.warn('[DOCX] Impossible de précharger les contacts (bulk UI)', e);
          }
          
          for (const inscrit of inscrits) {
            const contact = inscrit.contact;
            if (!contact) continue;

            const fullContact: any = contactsById[contact.id]
              ? { ...contact, ...contactsById[contact.id] }
              : contact;
            
            // Build variable data for this contact - mapping complet
            const variableData = buildVariableData(
              {
                civilite: fullContact.civilite || undefined,
                nom: fullContact.nom || '',
                prenom: fullContact.prenom || '',
                email: fullContact.email || undefined,
                telephone: fullContact.telephone || undefined,
                rue: fullContact.rue || undefined,
                code_postal: fullContact.code_postal || undefined,
                ville: fullContact.ville || undefined,
                date_naissance: fullContact.date_naissance || undefined,
                ville_naissance: fullContact.ville_naissance || undefined,
                pays_naissance: fullContact.pays_naissance || undefined,
                numero_carte_professionnelle: fullContact.numero_carte_professionnelle || undefined,
                prefecture_carte: fullContact.prefecture_carte || undefined,
                date_expiration_carte: fullContact.date_expiration_carte || undefined,
                numero_permis: fullContact.numero_permis || undefined,
                prefecture_permis: fullContact.prefecture_permis || undefined,
                date_delivrance_permis: fullContact.date_delivrance_permis || undefined,
                formation: fullContact.formation || undefined,
              },
              {
                nom: sessionInfo.nom,
                date_debut: sessionInfo.date_debut,
                date_fin: sessionInfo.date_fin,
                lieu: sessionInfo.lieu,
                heure_debut: sessionInfo.heure_debut,
                heure_fin: sessionInfo.heure_fin,
                formation_type: sessionInfo.formation_type,
                duree_heures: sessionInfo.duree_heures,
              },
              centreFormation ? {
                nom: centreFormation.nom_commercial || centreFormation.nom_legal,
                adresse: centreFormation.adresse_complete,
                telephone: centreFormation.telephone,
                email: centreFormation.email,
                siret: centreFormation.siret,
                nda: centreFormation.nda,
              } : undefined
            );
            
            try {
              // Process the DOCX with variable replacement
              const processedBlob = await processDocxWithVariables(templateBlob, variableData);
              
              // Create download link
              const url = URL.createObjectURL(processedBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${template.nom}_${contact.nom}_${contact.prenom}.docx`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              successCount++;
            } catch (docError) {
              console.error(`Error processing document for ${contact.nom}:`, docError);
            }
          }
          
          toast.success(`${successCount} document(s) généré(s) avec succès`);
        } catch (error) {
          console.error('Error in bulk DOCX generation:', error);
          toast.error('Erreur lors de la génération des documents');
        }
        
        setPreviewDocumentType(null);
        return;
      }
    }
    
    // Default: use the built-in PDF generation - mapping complet
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
        pays_naissance: contact?.pays_naissance || undefined,
        numero_carte_professionnelle: contact?.numero_carte_professionnelle || undefined,
        prefecture_carte: contact?.prefecture_carte || undefined,
        date_expiration_carte: contact?.date_expiration_carte || undefined,
        numero_permis: contact?.numero_permis || undefined,
        prefecture_permis: contact?.prefecture_permis || undefined,
        date_delivrance_permis: contact?.date_delivrance_permis || undefined,
        formation: contact?.formation || undefined,
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
      
      // Si génération demandée, générer d'abord les documents - mapping complet
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
            pays_naissance: contact?.pays_naissance || undefined,
            numero_carte_professionnelle: contact?.numero_carte_professionnelle || undefined,
            prefecture_carte: contact?.prefecture_carte || undefined,
            date_expiration_carte: contact?.date_expiration_carte || undefined,
            numero_permis: contact?.numero_permis || undefined,
            prefecture_permis: contact?.prefecture_permis || undefined,
            date_delivrance_permis: contact?.date_delivrance_permis || undefined,
            formation: contact?.formation || undefined,
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
          sessionInfo: sessionInfo ? {
            formation_type: sessionInfo.formation_type,
            date_debut: sessionInfo.date_debut,
            date_fin: sessionInfo.date_fin,
            lieu: sessionInfo.lieu,
            heure_debut: sessionInfo.heure_debut,
            heure_fin: sessionInfo.heure_fin,
            duree_heures: sessionInfo.duree_heures,
            formateur: session?.formateur || undefined,
          } : undefined,
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

  const inscriptionStatuts = [
    { value: 'valide', label: 'Validé', class: 'bg-success/10 text-success border-success/20' },
    { value: 'encours', label: 'En cours', class: 'bg-warning/10 text-warning border-warning/20' },
    { value: 'document', label: 'Document', class: 'bg-info/10 text-info border-info/20' },
    { value: 'annule', label: 'Annulé', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  ];

  const queryClient = useQueryClient();

  const handleStatutChange = async (inscriptionId: string, newStatut: string) => {
    try {
      const { error } = await supabase
        .from('session_inscriptions')
        .update({ statut: newStatut })
        .eq('id', inscriptionId);
      if (error) throw error;
      toast.success(`Statut mis à jour : ${inscriptionStatuts.find(s => s.value === newStatut)?.label}`);
      queryClient.invalidateQueries({ queryKey: ['session-inscrits-detail', sessionId] });
    } catch {
      toast.error("Erreur lors de la mise à jour du statut");
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
                <TableHead className="hidden md:table-cell">Facture</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inscrits && inscrits.length > 0 ? (
                inscrits.map(inscrit => {
                  const facture = getFactureForContact(inscrit.contact_id);
                  const paidPercent = facture ? (facture.total_paye / Number(facture.montant_total)) * 100 : 0;
                  
                  return (
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
                        <Select
                          value={inscrit.statut}
                          onValueChange={(value) => handleStatutChange(inscrit.id, value)}
                        >
                          <SelectTrigger className="h-7 w-[130px] text-xs" onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {inscriptionStatuts.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${s.class}`}>
                                  {s.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {facture ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleViewFacture(facture.id)}
                                className="flex flex-col gap-1 text-left hover:opacity-80 transition-opacity"
                              >
                                <span className="font-mono text-xs">{facture.numero_facture}</span>
                                <div className="flex items-center gap-1">
                                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        paidPercent >= 100 ? 'bg-success' : paidPercent > 0 ? 'bg-warning' : 'bg-destructive'
                                      }`}
                                      style={{ width: `${Math.min(paidPercent, 100)}%` }}
                                    />
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1 py-0 ${
                                      facture.statut === 'payee' ? 'border-success text-success' :
                                      facture.statut === 'partiel' ? 'border-warning text-warning' :
                                      facture.statut === 'impayee' ? 'border-destructive text-destructive' :
                                      ''
                                    }`}
                                  >
                                    {facture.statut}
                                  </Badge>
                                </div>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{facture.total_paye.toFixed(2)}€ / {Number(facture.montant_total).toFixed(2)}€</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Generate document for this contact */}
                          <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    aria-label="Générer un document"
                                  >
                                    <FileDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Générer un document</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleGenerateSingleDocument('attestation', inscrit.contact)}>
                                <Award className="h-4 w-4 mr-2" />
                                Attestation
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateSingleDocument('convention', inscrit.contact)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Convention
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateSingleDocument('convocation', inscrit.contact)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Convocation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          {/* Send documents to this contact */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary"
                                onClick={() => {
                                  setSelectedContactForDocs(inscrit.contact);
                                  setSendDocsDialogOpen(true);
                                }}
                                aria-label="Envoyer des documents"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Envoyer des documents</TooltipContent>
                          </Tooltip>
                          
                          {/* Facture actions */}
                          {facture ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleEditFacture(facture)}
                                  aria-label="Modifier la facture"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Modifier la facture</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleCreateFacture(inscrit.contact_id)}
                                  aria-label="Créer une facture"
                                >
                                  <Receipt className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Créer une facture</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setSelectedContactId(inscrit.contact_id)}
                                aria-label="Voir la fiche contact"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Voir la fiche contact</TooltipContent>
                          </Tooltip>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveInscription(inscrit.contact_id)}
                            aria-label="Supprimer l'inscription"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                <SelectItem value="Convocation">Convocation</SelectItem>
                <SelectItem value="Convention">Convention</SelectItem>
                <SelectItem value="Contrat de formation">Contrat de formation</SelectItem>
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

      {/* Contact Detail Sheet - Fiche complète du stagiaire */}
      <ContactDetailSheet
        contactId={selectedContactId}
        open={!!selectedContactId}
        onOpenChange={(open) => {
          if (!open) setSelectedContactId(null);
        }}
        onEdit={(contact) => {
          setEditingContact(contact);
          setContactFormOpen(true);
        }}
      />

      {/* Contact Form Dialog for editing */}
      <ContactFormDialog
        open={contactFormOpen}
        onOpenChange={setContactFormOpen}
        contact={editingContact}
      />

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
                  <SelectItem value="contrat">Contrat de formation</SelectItem>
                  <SelectItem value="attestation">Attestation</SelectItem>
                  <SelectItem value="programme">Programme</SelectItem>
                  <SelectItem value="reglement">Règlement intérieur</SelectItem>
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

      {/* Facture form dialog - only mount when open to avoid useEffect loops */}
      {factureFormOpen && (
        <FactureFormDialog
          open={factureFormOpen}
          onOpenChange={(open) => {
            setFactureFormOpen(open);
            if (!open) {
              setSelectedContactIdForFacture(null);
              setEditingFacture(null);
            }
          }}
          facture={editingFacture}
          defaultContactId={selectedContactIdForFacture || undefined}
        />
      )}

      {/* Facture detail sheet */}
      <FactureDetailSheet
        factureId={selectedFactureId}
        open={factureDetailOpen}
        onOpenChange={setFactureDetailOpen}
        onEdit={() => {
          // Close detail and open edit with the current facture
          const factureToEdit = allFactures.find(f => f.id === selectedFactureId);
          if (factureToEdit) {
            setFactureDetailOpen(false);
            handleEditFacture(factureToEdit);
          }
        }}
      />

      {/* Send documents to single contact dialog */}
      {selectedContactForDocs && session && (
        <SendDocumentsToContactDialog
          open={sendDocsDialogOpen}
          onOpenChange={(open) => {
            setSendDocsDialogOpen(open);
            if (!open) setSelectedContactForDocs(null);
          }}
          contact={selectedContactForDocs}
          sessionInfo={{
            id: session.id,
            nom: session.nom,
            formation_type: session.formation_type,
            date_debut: session.date_debut,
            date_fin: session.date_fin,
            lieu: session.lieu,
            duree_heures: session.duree_heures || 35,
            prix: session.prix ? Number(session.prix) : undefined,
          }}
        />
      )}
    </div>
  );
}
