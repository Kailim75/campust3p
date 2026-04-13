import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail } from "lucide-react";
import { BulkDocumentPreviewDialog, type TemplateSelection } from "../BulkDocumentPreviewDialog";
import { FactureFormDialog } from "@/components/paiements/FactureFormDialog";
import { FactureDetailSheet } from "@/components/paiements/FactureDetailSheet";
import { SendDocumentsToContactDialog } from "../SendDocumentsToContactDialog";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { SessionDocumentsSendModal, type DocSendInscrit } from "../SessionDocumentsSendModal";
import { EmailComposerModal, type EmailComposerProps } from "@/components/email/EmailComposerModal";
import { TransferStudentDialog } from "../TransferStudentDialog";
import type { FactureWithDetails } from "@/hooks/useFactures";
import type { DocumentType } from "@/hooks/useDocumentGenerator";
import type { Contact } from "@/hooks/useContacts";
import type { CompanyInfo } from "@/lib/pdf-generator";
import type { InscritContact } from "./inscrits-types";

interface InscritsDialogsProps {
  sessionId: string;

  /* Envoi document trace */
  dialogEnvoi: boolean;
  setDialogEnvoi: (v: boolean) => void;
  typeDocumentEnvoi: string;
  setTypeDocumentEnvoi: (v: string) => void;
  selectedIdsCount: number;
  isEnvoi: boolean;
  onEnvoyerDocument: () => void;

  /* Add students */
  addDialogOpen: boolean;
  setAddDialogOpen: (v: boolean) => void;
  filteredContacts: Contact[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  contactsToAdd: string[];
  toggleContactToAdd: (id: string) => void;
  handleAddMultipleInscriptions: () => void;
  isAddPending: boolean;

  /* Bulk email */
  bulkEmailDialogOpen: boolean;
  setBulkEmailDialogOpen: (v: boolean) => void;
  bulkEmailType: string;
  setBulkEmailType: (v: string) => void;
  bulkEmailMessage: string;
  setBulkEmailMessage: (v: string) => void;
  generateAndSend: boolean;
  setGenerateAndSend: (v: boolean) => void;
  isSendingBulkEmails: boolean;
  handleBulkSendEmails: () => void;
  emailsCount: number;
  totalInscrits: number;

  /* Preview bulk */
  previewDialogOpen: boolean;
  setPreviewDialogOpen: (v: boolean) => void;
  previewDocumentType: DocumentType | null;
  sessionInfo: any;
  inscrits: any[];
  onConfirmBulkGeneration: (selection?: TemplateSelection) => void;

  /* Facture */
  factureFormOpen: boolean;
  setFactureFormOpen: (v: boolean) => void;
  editingFacture: FactureWithDetails | null;
  setEditingFacture: (v: FactureWithDetails | null) => void;
  selectedContactIdForFacture: string | null;
  setSelectedContactIdForFacture: (v: string | null) => void;
  factureDetailOpen: boolean;
  setFactureDetailOpen: (v: boolean) => void;
  selectedFactureId: string | null;
  allFactures: FactureWithDetails[];
  onEditFactureFromDetail: () => void;

  /* Contact detail */
  selectedContactId: string | null;
  setSelectedContactId: (v: string | null) => void;
  editingContact: Contact | null;
  setEditingContact: (v: Contact | null) => void;
  contactFormOpen: boolean;
  setContactFormOpen: (v: boolean) => void;

  /* Send docs to single contact */
  sendDocsDialogOpen: boolean;
  setSendDocsDialogOpen: (v: boolean) => void;
  selectedContactForDocs: any;
  setSelectedContactForDocs: (v: any) => void;
  session: any;

  /* Doc send modal */
  docSendModalOpen: boolean;
  setDocSendModalOpen: (v: boolean) => void;
  docSendInscrits: DocSendInscrit[];
  companyInfo: CompanyInfo | undefined;
  docSendSelectedIds: string[] | undefined;
  openComposer: any;

  /* Email composer */
  composerProps: EmailComposerProps;

  /* Transfer */
  transferDialogOpen: boolean;
  setTransferDialogOpen: (v: boolean) => void;
  transferContact: { id: string; name: string } | null;
  setTransferContact: (v: { id: string; name: string } | null) => void;
  sessionFormationType?: string;
}

export function InscritsDialogs(props: InscritsDialogsProps) {
  return (
    <>
      {/* Dialog envoi document */}
      <Dialog open={props.dialogEnvoi} onOpenChange={props.setDialogEnvoi}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer un document à {props.selectedIdsCount} stagiaire(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={props.typeDocumentEnvoi} onValueChange={props.setTypeDocumentEnvoi}>
              <SelectTrigger><SelectValue placeholder="Type de document" /></SelectTrigger>
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
            <Button className="w-full" onClick={props.onEnvoyerDocument} disabled={!props.typeDocumentEnvoi || props.isEnvoi}>
              {props.isEnvoi && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Envoyer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact detail sheet */}
      <ApprenantDetailSheet
        contactId={props.selectedContactId}
        open={!!props.selectedContactId}
        onOpenChange={(open) => { if (!open) props.setSelectedContactId(null); }}
        onEdit={(contact) => {
          props.setEditingContact(contact);
          props.setContactFormOpen(true);
        }}
      />

      <ContactFormDialog
        open={props.contactFormOpen}
        onOpenChange={props.setContactFormOpen}
        contact={props.editingContact}
      />

      {/* Add students dialog */}
      <Dialog open={props.addDialogOpen} onOpenChange={(open) => {
        props.setAddDialogOpen(open);
        if (!open) { props.setSearchQuery(""); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Inscrire des stagiaires</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Command className="rounded-lg border">
              <CommandInput placeholder="Rechercher un contact..." value={props.searchQuery} onValueChange={props.setSearchQuery} />
              <CommandList className="max-h-64">
                <CommandEmpty>Aucun contact trouvé</CommandEmpty>
                <CommandGroup>
                  {props.filteredContacts.map((contact) => (
                    <CommandItem key={contact.id} onSelect={() => props.toggleContactToAdd(contact.id)} className="cursor-pointer">
                      <div className="flex items-center gap-3 w-full">
                        <Checkbox checked={props.contactsToAdd.includes(contact.id)} onCheckedChange={() => props.toggleContactToAdd(contact.id)} />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {`${contact.prenom?.[0] ?? ""}${contact.nom?.[0] ?? ""}`.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{contact.prenom} {contact.nom}</p>
                          <p className="text-xs text-muted-foreground">{contact.email || contact.telephone || "Pas de contact"}</p>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            {props.contactsToAdd.length > 0 && (
              <div className="text-sm text-muted-foreground">{props.contactsToAdd.length} contact(s) sélectionné(s)</div>
            )}
            <Button className="w-full" onClick={props.handleAddMultipleInscriptions} disabled={props.contactsToAdd.length === 0 || props.isAddPending}>
              {props.isAddPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Inscrire {props.contactsToAdd.length > 0 ? `(${props.contactsToAdd.length})` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk email dialog */}
      <Dialog open={props.bulkEmailDialogOpen} onOpenChange={props.setBulkEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Envoyer documents par email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{props.emailsCount}</strong> stagiaire(s) avec email sur <strong>{props.totalInscrits}</strong> inscrit(s)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={props.bulkEmailType} onValueChange={props.setBulkEmailType}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un type de document" /></SelectTrigger>
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
              <Label htmlFor="generate-and-send" className="text-sm">Générer les documents avant envoi</Label>
              <Switch id="generate-and-send" checked={props.generateAndSend} onCheckedChange={props.setGenerateAndSend} />
            </div>
            <div className="space-y-2">
              <Label>Message personnalisé (optionnel)</Label>
              <Textarea placeholder="Ajoutez un message personnalisé à l'email..." value={props.bulkEmailMessage} onChange={(e) => props.setBulkEmailMessage(e.target.value)} rows={3} />
            </div>
            <Button className="w-full" onClick={props.handleBulkSendEmails} disabled={!props.bulkEmailType || props.emailsCount === 0 || props.isSendingBulkEmails}>
              {props.isSendingBulkEmails && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Mail className="h-4 w-4 mr-2" /> Envoyer à {props.emailsCount} stagiaire(s)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      {props.previewDocumentType && props.sessionInfo && props.inscrits && (
        <BulkDocumentPreviewDialog
          open={props.previewDialogOpen}
          onOpenChange={props.setPreviewDialogOpen}
          documentType={props.previewDocumentType}
          inscrits={props.inscrits}
          sessionInfo={props.sessionInfo}
          onConfirm={props.onConfirmBulkGeneration}
        />
      )}

      {/* Facture form */}
      {props.factureFormOpen && (
        <FactureFormDialog
          open={props.factureFormOpen}
          onOpenChange={(open) => {
            props.setFactureFormOpen(open);
            if (!open) { props.setSelectedContactIdForFacture(null); props.setEditingFacture(null); }
          }}
          facture={props.editingFacture}
          defaultContactId={props.selectedContactIdForFacture || undefined}
        />
      )}

      {/* Facture detail sheet */}
      <FactureDetailSheet
        factureId={props.selectedFactureId}
        open={props.factureDetailOpen}
        onOpenChange={props.setFactureDetailOpen}
        onEdit={props.onEditFactureFromDetail}
      />

      {/* Send docs to single contact */}
      {props.selectedContactForDocs && props.session && (
        <SendDocumentsToContactDialog
          open={props.sendDocsDialogOpen}
          onOpenChange={(open) => { props.setSendDocsDialogOpen(open); if (!open) props.setSelectedContactForDocs(null); }}
          contact={props.selectedContactForDocs}
          sessionInfo={{
            id: props.session.id,
            nom: props.session.nom,
            formation_type: props.session.formation_type,
            date_debut: props.session.date_debut,
            date_fin: props.session.date_fin,
            lieu: props.session.lieu,
            heure_debut_matin: props.session.heure_debut_matin || undefined,
            heure_fin_matin: props.session.heure_fin_matin || undefined,
            heure_debut_aprem: props.session.heure_debut_aprem || undefined,
            heure_fin_aprem: props.session.heure_fin_aprem || undefined,
            duree_heures: props.session.duree_heures || 35,
            prix: props.session.prix ? Number(props.session.prix) : undefined,
          }}
        />
      )}

      {/* Doc send modal */}
      {props.session && props.sessionInfo && (
        <SessionDocumentsSendModal
          open={props.docSendModalOpen}
          onOpenChange={props.setDocSendModalOpen}
          inscrits={props.docSendInscrits}
          sessionInfo={props.sessionInfo}
          sessionName={props.session.nom}
          company={props.companyInfo}
          selectedIds={props.docSendSelectedIds}
          openComposer={props.openComposer}
        />
      )}

      <EmailComposerModal {...props.composerProps} />

      {/* Transfer dialog */}
      {props.transferContact && props.session && (
        <TransferStudentDialog
          open={props.transferDialogOpen}
          onOpenChange={(open) => { props.setTransferDialogOpen(open); if (!open) props.setTransferContact(null); }}
          contactId={props.transferContact.id}
          contactName={props.transferContact.name}
          currentSessionId={props.sessionId}
          currentSessionName={props.session.nom}
          contactFormation={props.sessionFormationType}
        />
      )}
    </>
  );
}
