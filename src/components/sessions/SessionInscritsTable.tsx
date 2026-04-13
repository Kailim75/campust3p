import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionInscrits } from '@/hooks/useSessionInscrits';
import { useDocumentEnvoiHistory, getLatestEnvoiForContact } from '@/hooks/useDocumentEnvoiHistory';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useContacts } from '@/hooks/useContacts';
import { useSession } from '@/hooks/useSessions';
import { useInscritsExamResults } from '@/hooks/useInscritsExamResults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users, UserPlus, Loader2, Search, X,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAddInscription, useRemoveInscription } from '@/hooks/useSessions';
import { useDocumentGenerator, type DocumentType } from '@/hooks/useDocumentGenerator';
import { useBulkCreateDocumentEnvois } from '@/hooks/useDocumentEnvois';
import { useFactures, type FactureWithDetails } from '@/hooks/useFactures';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TemplateSelection } from './BulkDocumentPreviewDialog';
import { useDocumentTemplateFiles } from '@/hooks/useDocumentTemplateFiles';
import { fetchContactsDocumentData } from '@/lib/documents/fetchContactDocumentData';
import { useCentreFormation } from '@/hooks/useCentreFormation';
import { processDocxWithVariables, buildVariableData } from '@/lib/docx-processor';
import { useEmailComposer } from '@/hooks/useEmailComposer';
import type { EmailRecipient } from '@/components/email/EmailComposerModal';
import type { Contact } from '@/hooks/useContacts';
import type { CompanyInfo, AgrementsAutre } from '@/lib/pdf-generator';

// Sub-components
import { InscritTableRow } from './inscrits/InscritTableRow';
import { InscritsGlobalActions, InscritsSelectionActions } from './inscrits/InscritsGlobalActions';
import { InscritsDialogs } from './inscrits/InscritsDialogs';
import { mapContactInfo } from './inscrits/inscrits-types';

interface SessionInscritsTableProps {
  sessionId: string;
}

export default function SessionInscritsTable({ sessionId }: SessionInscritsTableProps) {
  const {
    inscrits, isLoading, stats,
    emargerMultiples, tracerEnvoiGroupe,
    isEmargement, isEnvoi,
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
  const { composerProps, openComposer } = useEmailComposer();
  const { data: envoiEvents = [] } = useDocumentEnvoiHistory(null, sessionId);
  const queryClient = useQueryClient();

  const inscritContactIds = inscrits?.map(i => i.contact_id) || [];
  const { data: examResults = {}, setResult: setExamResult } = useInscritsExamResults(inscritContactIds);

  // ── State ──
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [contactsToAdd, setContactsToAdd] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inscritSearchQuery, setInscritSearchQuery] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferContact, setTransferContact] = useState<{ id: string; name: string } | null>(null);
  const [docSendModalOpen, setDocSendModalOpen] = useState(false);
  const [docSendSelectedIds, setDocSendSelectedIds] = useState<string[] | undefined>(undefined);
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);
  const [bulkEmailType, setBulkEmailType] = useState('');
  const [bulkEmailMessage, setBulkEmailMessage] = useState('');
  const [isSendingBulkEmails, setIsSendingBulkEmails] = useState(false);
  const [generateAndSend, setGenerateAndSend] = useState(true);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewDocumentType, setPreviewDocumentType] = useState<DocumentType | null>(null);
  const [factureFormOpen, setFactureFormOpen] = useState(false);
  const [factureDetailOpen, setFactureDetailOpen] = useState(false);
  const [selectedContactIdForFacture, setSelectedContactIdForFacture] = useState<string | null>(null);
  const [selectedFactureId, setSelectedFactureId] = useState<string | null>(null);
  const [editingFacture, setEditingFacture] = useState<FactureWithDetails | null>(null);
  const [sendDocsDialogOpen, setSendDocsDialogOpen] = useState(false);
  const [selectedContactForDocs, setSelectedContactForDocs] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogEnvoi, setDialogEnvoi] = useState(false);
  const [typeDocumentEnvoi, setTypeDocumentEnvoi] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactFormOpen, setContactFormOpen] = useState(false);

  // ── Derived ──
  const inscribedContactIds = new Set(inscrits?.map(i => i.contact_id) || []);
  const availableContacts = allContacts?.filter(c => !inscribedContactIds.has(c.id)) || [];
  const filteredContacts = availableContacts.filter(c =>
    `${c.prenom} ${c.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredInscrits = useMemo(() => {
    if (!inscrits || !inscritSearchQuery.trim()) return inscrits || [];
    const q = inscritSearchQuery.toLowerCase().trim();
    return inscrits.filter(i => {
      const c = i.contact;
      if (!c) return false;
      return (
        (c.prenom || '').toLowerCase().includes(q) ||
        (c.nom || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.telephone || '').toLowerCase().includes(q) ||
        (c.custom_id || '').toLowerCase().includes(q) ||
        `${c.prenom} ${c.nom}`.toLowerCase().includes(q)
      );
    });
  }, [inscrits, inscritSearchQuery]);

  const emailsCount = inscrits?.filter(i => i.contact?.email).length || 0;

  const getFactureForContact = (contactId: string): FactureWithDetails | undefined =>
    allFactures.find(f => f.contact_id === contactId);

  // ── Session / Company info ──
  const sessionInfo = session ? {
    id: session.id, nom: session.nom, formation_type: session.formation_type,
    date_debut: session.date_debut, date_fin: session.date_fin,
    lieu: session.lieu || undefined,
    heure_debut: session.heure_debut || undefined, heure_fin: session.heure_fin || undefined,
    heure_debut_matin: session.heure_debut_matin || undefined, heure_fin_matin: session.heure_fin_matin || undefined,
    heure_debut_aprem: session.heure_debut_aprem || undefined, heure_fin_aprem: session.heure_fin_aprem || undefined,
    duree_heures: session.duree_heures || 35,
    prix: session.prix ? Number(session.prix) : undefined,
  } : null;

  const companyInfo: CompanyInfo | undefined = centreFormation ? {
    name: centreFormation.nom_commercial || centreFormation.nom_legal,
    address: centreFormation.adresse_complete, phone: centreFormation.telephone,
    email: centreFormation.email, siret: centreFormation.siret, nda: centreFormation.nda,
    logo_url: centreFormation.logo_url || undefined,
    signature_cachet_url: centreFormation.signature_cachet_url || undefined,
    qualiopi_numero: centreFormation.qualiopi_numero || undefined,
    qualiopi_date_obtention: centreFormation.qualiopi_date_obtention || undefined,
    qualiopi_date_expiration: centreFormation.qualiopi_date_expiration || undefined,
    agrement_prefecture: centreFormation.agrement_prefecture || undefined,
    agrement_prefecture_date: centreFormation.agrement_prefecture_date || undefined,
    code_rncp: centreFormation.code_rncp || undefined, code_rs: centreFormation.code_rs || undefined,
  } : undefined;

  // ── Handlers ──
  const handleGenerateSingleDocument = (type: DocumentType, contact: any) => {
    if (!sessionInfo || !contact) { toast.error("Données manquantes pour la génération"); return; }
    generateDocument(type, mapContactInfo(contact), sessionInfo);
  };

  const handlePreviewBulkDocuments = (type: DocumentType) => {
    if (!sessionInfo || !inscrits?.length) { toast.error("Aucun stagiaire inscrit"); return; }
    setPreviewDocumentType(type);
    setPreviewDialogOpen(true);
  };

  const handleConfirmBulkGeneration = async (selection?: TemplateSelection) => {
    if (!previewDocumentType || !sessionInfo || !inscrits?.length) return;

    if (selection?.type === 'file' && selection.templateId) {
      const template = fileTemplates.find(t => t.id === selection.templateId);
      if (template && template.type_fichier === 'docx') {
        toast.info(`Génération de ${inscrits.length} document(s)...`);
        try {
          const { data: templateBlob, error: downloadError } = await supabase.storage
            .from('document-templates').download(template.file_path);
          if (downloadError || !templateBlob) throw new Error('Impossible de télécharger le modèle');

          let successCount = 0;
          let contactsById: Record<string, any> = {};
          try {
            const ids = inscrits.map(i => i.contact?.id).filter(Boolean) as string[];
            contactsById = await fetchContactsDocumentData(ids, session?.formation_type);
          } catch (e) { console.warn('[DOCX] Impossible de précharger les contacts (bulk UI)', e); }

          for (const inscrit of inscrits) {
            const contact = inscrit.contact;
            if (!contact) continue;
            const fullContact: any = contactsById[contact.id] ? { ...contact, ...contactsById[contact.id] } : contact;
            const variableData = buildVariableData(
              mapContactInfo(fullContact),
              { nom: sessionInfo.nom, date_debut: sessionInfo.date_debut, date_fin: sessionInfo.date_fin, lieu: sessionInfo.lieu, heure_debut: sessionInfo.heure_debut, heure_fin: sessionInfo.heure_fin, formation_type: sessionInfo.formation_type, duree_heures: sessionInfo.duree_heures },
              centreFormation ? { nom: centreFormation.nom_commercial || centreFormation.nom_legal, adresse: centreFormation.adresse_complete, telephone: centreFormation.telephone, email: centreFormation.email, siret: centreFormation.siret, nda: centreFormation.nda } : undefined
            );
            try {
              const processedBlob = await processDocxWithVariables(templateBlob, variableData);
              const url = URL.createObjectURL(processedBlob);
              const a = document.createElement('a');
              a.href = url; a.download = `${template.nom}_${contact.nom}_${contact.prenom}.docx`;
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              URL.revokeObjectURL(url);
              successCount++;
            } catch (docError) { console.error(`Error processing document for ${contact.nom}:`, docError); }
          }
          toast.success(`${successCount} document(s) généré(s) avec succès`);
        } catch (error) { console.error('Error in bulk DOCX generation:', error); toast.error('Erreur lors de la génération des documents'); }
        setPreviewDocumentType(null);
        return;
      }
    }

    const contactsInfo = inscrits.map(inscrit => mapContactInfo(inscrit.contact));
    generateBulkDocuments(previewDocumentType, contactsInfo, sessionInfo);
    setPreviewDocumentType(null);
  };

  const handleBulkSendEmails = async () => {
    if (!bulkEmailType || !inscrits?.length) return;
    setIsSendingBulkEmails(true);
    try {
      const inscribedWithEmail = inscrits.filter(i => i.contact?.email);
      if (inscribedWithEmail.length === 0) { toast.error("Aucun stagiaire n'a d'adresse email"); return; }
      if (generateAndSend && sessionInfo) {
        const contactsInfo = inscribedWithEmail.map(inscrit => mapContactInfo(inscrit.contact));
        generateBulkDocuments(bulkEmailType as DocumentType, contactsInfo, sessionInfo);
      }
      const envoisData = inscribedWithEmail.map(inscrit => ({
        contact_id: inscrit.contact_id, session_id: sessionId,
        document_type: bulkEmailType,
        document_name: `${bulkEmailType} - ${inscrit.contact?.prenom} ${inscrit.contact?.nom}`,
        statut: 'envoyé',
      }));
      await bulkCreateEnvois.mutateAsync(envoisData);
      const { error } = await supabase.functions.invoke('send-automated-emails', {
        body: {
          type: 'bulk_document',
          recipients: inscribedWithEmail.map(i => ({ email: i.contact?.email, name: `${i.contact?.prenom} ${i.contact?.nom}`, contactId: i.contact_id })),
          documentType: bulkEmailType, sessionName: session?.nom,
          sessionInfo: sessionInfo ? { formation_type: sessionInfo.formation_type, date_debut: sessionInfo.date_debut, date_fin: sessionInfo.date_fin, lieu: sessionInfo.lieu, heure_debut: sessionInfo.heure_debut, heure_fin: sessionInfo.heure_fin, heure_debut_matin: sessionInfo.heure_debut_matin, heure_fin_matin: sessionInfo.heure_fin_matin, heure_debut_aprem: sessionInfo.heure_debut_aprem, heure_fin_aprem: sessionInfo.heure_fin_aprem, duree_heures: sessionInfo.duree_heures, formateur: session?.formateur || undefined } : undefined,
          customMessage: bulkEmailMessage || undefined,
        },
      });
      if (error) throw error;
      toast.success(`Documents envoyés à ${inscribedWithEmail.length} stagiaire(s)`);
      setBulkEmailDialogOpen(false); setBulkEmailType(''); setBulkEmailMessage('');
    } catch (error: any) { console.error('Erreur envoi emails:', error); toast.error("Erreur lors de l'envoi des emails"); }
    finally { setIsSendingBulkEmails(false); }
  };

  const toggleContactToAdd = (contactId: string) => {
    setContactsToAdd(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]);
  };

  const handleAddMultipleInscriptions = async () => {
    if (contactsToAdd.length === 0) return;
    let successCount = 0; let errorCount = 0;
    for (const contactId of contactsToAdd) {
      try { await addInscription.mutateAsync({ sessionId, contactId }); successCount++; } catch { errorCount++; }
    }
    if (successCount > 0) toast.success(`${successCount} stagiaire(s) inscrit(s) avec succès`);
    if (errorCount > 0) toast.error(`${errorCount} inscription(s) en erreur`);
    setContactsToAdd([]); setSearchQuery(''); setAddDialogOpen(false);
  };

  const handleRemoveInscription = async (contactId: string) => {
    try { await removeInscription.mutateAsync({ sessionId, contactId }); toast.success("Inscription annulée"); }
    catch (err: any) { console.error("Erreur suppression inscription:", err); toast.error(err?.message || "Erreur lors de l'annulation"); }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === inscrits?.length) setSelectedIds([]);
    else setSelectedIds(inscrits?.map(i => i.contact_id) || []);
  };
  const toggleSelect = (contactId: string) => {
    setSelectedIds(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]);
  };

  const handleEmarger = () => { if (selectedIds.length > 0) { emargerMultiples(selectedIds); setSelectedIds([]); } };
  const handleEnvoyerDocument = () => {
    if (typeDocumentEnvoi && selectedIds.length > 0) {
      tracerEnvoiGroupe({ contactIds: selectedIds, typeDocument: typeDocumentEnvoi });
      setDialogEnvoi(false); setSelectedIds([]); setTypeDocumentEnvoi('');
    }
  };

  const handleStatutChange = async (inscriptionId: string, newStatut: string) => {
    try {
      const { error } = await supabase.from('session_inscriptions').update({ statut: newStatut }).eq('id', inscriptionId);
      if (error) throw error;
      toast.success(`Statut mis à jour`);
      queryClient.invalidateQueries({ queryKey: ['session-inscrits-detail', sessionId] });
    } catch { toast.error("Erreur lors de la mise à jour du statut"); }
  };

  const handleCreateFacture = (contactId: string) => { setSelectedContactIdForFacture(contactId); setEditingFacture(null); setFactureFormOpen(true); };
  const handleEditFacture = (facture: FactureWithDetails) => { setEditingFacture(facture); setSelectedContactIdForFacture(facture.contact_id); setFactureFormOpen(true); };
  const handleViewFacture = (factureId: string) => { setSelectedFactureId(factureId); setFactureDetailOpen(true); };

  const getSelectedRecipients = (): EmailRecipient[] => {
    const selected = inscrits?.filter(i => selectedIds.includes(i.contact_id) && i.contact?.email) || [];
    if (selected.length === 0) { toast.error("Aucun contact sélectionné avec email"); return []; }
    return selected.map(i => ({ id: i.contact_id, email: i.contact!.email!, prenom: i.contact!.prenom || "", nom: i.contact!.nom || "" }));
  };

  // ── Loading ──
  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // ── Render ──
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-2"><div className="text-center"><p className="text-lg font-bold text-primary">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div></Card>
        <Card className="p-2"><div className="text-center"><p className="text-lg font-bold text-info">{stats.inscrits}</p><p className="text-xs text-muted-foreground">Inscrits</p></div></Card>
        <Card className="p-2"><div className="text-center"><p className="text-lg font-bold text-warning">{stats.confirmes}</p><p className="text-xs text-muted-foreground">Confirmés</p></div></Card>
        <Card className="p-2"><div className="text-center"><p className="text-lg font-bold text-success">{stats.presents}</p><p className="text-xs text-muted-foreground">Présents</p></div></Card>
      </div>

      {/* Global actions */}
      <InscritsGlobalActions
        totalInscrits={inscrits?.length || 0}
        emailsCount={emailsCount}
        onPreviewBulk={handlePreviewBulkDocuments}
        onOpenDocSendAll={() => { setDocSendSelectedIds(undefined); setDocSendModalOpen(true); }}
      />

      {/* Selection actions */}
      <InscritsSelectionActions
        selectedCount={selectedIds.length}
        isEmargement={isEmargement}
        isEnvoi={isEnvoi}
        onEmarger={handleEmarger}
        onTracerEnvoi={() => setDialogEnvoi(true)}
        onOpenDocSendSelected={() => { setDocSendSelectedIds(selectedIds); setDocSendModalOpen(true); }}
        onEmailConvocation={() => {
          const recipients = getSelectedRecipients();
          if (!recipients.length) return;
          openComposer({ recipients, defaultSubject: `Convocation — ${session?.nom || "Session"}`, defaultBody: `Bonjour {{prenom}},\n\nVous êtes convoqué(e) à la session "${session?.nom || ""}".\n\nBien cordialement,\nL'équipe pédagogique`, autoNoteCategory: "session_convocation" });
        }}
        onEmailRelanceCma={() => {
          const recipients = getSelectedRecipients();
          if (!recipients.length) return;
          openComposer({ recipients, defaultSubject: `Dossier CMA — Documents manquants`, defaultBody: `Bonjour {{prenom}},\n\nNous vous rappelons que votre dossier CMA est incomplet. Merci de nous transmettre les documents manquants dans les meilleurs délais.\n\nBien cordialement,\nL'équipe administrative`, autoNoteCategory: "session_relance_cma" });
        }}
        onEmailFelicTheorie={() => {
          const admis = inscrits?.filter(i => selectedIds.includes(i.contact_id) && examResults[i.contact_id]?.theorie === 'admis' && i.contact?.email) || [];
          if (!admis.length) { toast.error("Aucun sélectionné admis en théorie"); return; }
          openComposer({ recipients: admis.map(i => ({ id: i.contact_id, email: i.contact!.email!, prenom: i.contact!.prenom || "", nom: i.contact!.nom || "", customBody: `Bonjour ${i.contact!.prenom},\n\nFélicitations pour votre réussite à l'examen théorique ! 🎉\n\nBien cordialement,\nL'équipe pédagogique` })), defaultSubject: "🎉 Félicitations — Examen théorique réussi !", defaultBody: "Contenu personnalisé par apprenant", autoNoteCategory: "examen_theorie_reussi" });
        }}
        onEmailFelicPratique={() => {
          const admis = inscrits?.filter(i => selectedIds.includes(i.contact_id) && examResults[i.contact_id]?.pratique === 'admis' && i.contact?.email) || [];
          if (!admis.length) { toast.error("Aucun sélectionné admis en pratique"); return; }
          openComposer({ recipients: admis.map(i => ({ id: i.contact_id, email: i.contact!.email!, prenom: i.contact!.prenom || "", nom: i.contact!.nom || "", customBody: `Bonjour ${i.contact!.prenom},\n\nFélicitations pour votre réussite à l'examen pratique ! 🎉\n\nVous pouvez maintenant entreprendre les démarches pour votre carte professionnelle.\n\nBien cordialement,\nL'équipe pédagogique` })), defaultSubject: "🎉 Félicitations — Examen pratique réussi + Carte Pro", defaultBody: "Contenu personnalisé par apprenant", autoNoteCategory: "examen_pratique_reussi" });
        }}
      />

      {/* Table */}
      <Card>
        <CardHeader className="py-3 space-y-3">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Stagiaires ({inscrits?.length || 0})
              {inscritSearchQuery && filteredInscrits.length !== (inscrits?.length || 0) && (
                <Badge variant="secondary" className="text-[10px]">{filteredInscrits.length} résultat{filteredInscrits.length > 1 ? 's' : ''}</Badge>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> Inscrire
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un apprenant…" value={inscritSearchQuery} onChange={(e) => setInscritSearchQuery(e.target.value)} className="pl-9 pr-9 h-9 text-sm" />
            {inscritSearchQuery && (
              <button onClick={() => setInscritSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selectedIds.length === inscrits?.length && (inscrits?.length || 0) > 0} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden sm:table-cell">CMA</TableHead>
                <TableHead className="hidden lg:table-cell w-20 text-center">T</TableHead>
                <TableHead className="hidden lg:table-cell w-20 text-center">P</TableHead>
                <TableHead className="hidden lg:table-cell w-16 text-center">Dept.</TableHead>
                <TableHead className="hidden md:table-cell">Facture</TableHead>
                <TableHead className="hidden lg:table-cell w-24">Dern. comm.</TableHead>
                <TableHead className="hidden lg:table-cell w-10 text-center">⚡</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInscrits.length > 0 ? (
                filteredInscrits.map(inscrit => (
                  <InscritTableRow
                    key={inscrit.id}
                    inscrit={{ id: inscrit.id, contact_id: inscrit.contact_id, statut: inscrit.statut, contact: inscrit.contact as InscritRow["contact"] }}
                    selected={selectedIds.includes(inscrit.contact_id)}
                    onToggleSelect={toggleSelect}
                    facture={getFactureForContact(inscrit.contact_id)}
                    examResult={examResults[inscrit.contact_id]}
                    sessionDateFin={session?.date_fin}
                    latestEnvoi={getLatestEnvoiForContact(envoiEvents, inscrit.contact_id)}
                    onStatutChange={handleStatutChange}
                    onExamToggle={(contactId, type, value, formation) => setExamResult({ contactId, type, value: value as ExamResultValue, formationType: formation })}
                    onGenerateDocument={handleGenerateSingleDocument}
                    onSendDocs={(contact) => { setSelectedContactForDocs(contact); setSendDocsDialogOpen(true); }}
                    onCreateFacture={handleCreateFacture}
                    onEditFacture={handleEditFacture}
                    onViewFacture={handleViewFacture}
                    onTransfer={(id, name) => { setTransferContact({ id, name }); setTransferDialogOpen(true); }}
                    onViewContact={setSelectedContactId}
                    onRemove={handleRemoveInscription}
                    sessionFormationType={session?.formation_type}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">Aucun stagiaire inscrit</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* All dialogs */}
      <InscritsDialogs
        sessionId={sessionId}
        dialogEnvoi={dialogEnvoi} setDialogEnvoi={setDialogEnvoi}
        typeDocumentEnvoi={typeDocumentEnvoi} setTypeDocumentEnvoi={setTypeDocumentEnvoi}
        selectedIdsCount={selectedIds.length} isEnvoi={isEnvoi} onEnvoyerDocument={handleEnvoyerDocument}
        addDialogOpen={addDialogOpen} setAddDialogOpen={setAddDialogOpen}
        filteredContacts={filteredContacts as Contact[]}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        contactsToAdd={contactsToAdd} toggleContactToAdd={toggleContactToAdd}
        handleAddMultipleInscriptions={handleAddMultipleInscriptions}
        isAddPending={addInscription.isPending}
        bulkEmailDialogOpen={bulkEmailDialogOpen} setBulkEmailDialogOpen={setBulkEmailDialogOpen}
        bulkEmailType={bulkEmailType} setBulkEmailType={setBulkEmailType}
        bulkEmailMessage={bulkEmailMessage} setBulkEmailMessage={setBulkEmailMessage}
        generateAndSend={generateAndSend} setGenerateAndSend={setGenerateAndSend}
        isSendingBulkEmails={isSendingBulkEmails} handleBulkSendEmails={handleBulkSendEmails}
        emailsCount={emailsCount} totalInscrits={inscrits?.length || 0}
        previewDialogOpen={previewDialogOpen} setPreviewDialogOpen={setPreviewDialogOpen}
        previewDocumentType={previewDocumentType} sessionInfo={sessionInfo}
        inscrits={inscrits || []} onConfirmBulkGeneration={handleConfirmBulkGeneration}
        factureFormOpen={factureFormOpen} setFactureFormOpen={setFactureFormOpen}
        editingFacture={editingFacture} setEditingFacture={setEditingFacture}
        selectedContactIdForFacture={selectedContactIdForFacture} setSelectedContactIdForFacture={setSelectedContactIdForFacture}
        factureDetailOpen={factureDetailOpen} setFactureDetailOpen={setFactureDetailOpen}
        selectedFactureId={selectedFactureId} allFactures={allFactures}
        onEditFactureFromDetail={() => {
          const f = allFactures.find(f => f.id === selectedFactureId);
          if (f) { setFactureDetailOpen(false); handleEditFacture(f); }
        }}
        selectedContactId={selectedContactId} setSelectedContactId={setSelectedContactId}
        editingContact={editingContact} setEditingContact={setEditingContact}
        contactFormOpen={contactFormOpen} setContactFormOpen={setContactFormOpen}
        sendDocsDialogOpen={sendDocsDialogOpen} setSendDocsDialogOpen={setSendDocsDialogOpen}
        selectedContactForDocs={selectedContactForDocs} setSelectedContactForDocs={setSelectedContactForDocs}
        session={session}
        docSendModalOpen={docSendModalOpen} setDocSendModalOpen={setDocSendModalOpen}
        docSendInscrits={(inscrits || []).map(i => ({ contact_id: i.contact_id, contact: i.contact }))}
        companyInfo={companyInfo} docSendSelectedIds={docSendSelectedIds} openComposer={openComposer}
        composerProps={composerProps}
        transferDialogOpen={transferDialogOpen} setTransferDialogOpen={setTransferDialogOpen}
        transferContact={transferContact} setTransferContact={setTransferContact}
        sessionFormationType={session?.formation_type}
      />
    </div>
  );
}
