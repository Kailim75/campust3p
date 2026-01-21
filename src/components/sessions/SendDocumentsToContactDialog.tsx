import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Loader2, 
  Mail, 
  FileText, 
  Send, 
  Award,
  BookOpen,
  ScrollText,
  FileCheck
} from 'lucide-react';
import { useDocumentGenerator, type DocumentType } from '@/hooks/useDocumentGenerator';
import { useCreateDocumentEnvoi } from '@/hooks/useDocumentEnvois';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  civilite?: string | null;
  rue?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  date_naissance?: string | null;
  ville_naissance?: string | null;
}

interface SessionInfo {
  id: string;
  nom: string;
  formation_type: string;
  date_debut: string;
  date_fin: string;
  lieu?: string | null;
  duree_heures?: number;
  prix?: number;
}

interface SendDocumentsToContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  sessionInfo: SessionInfo;
}

const DOCUMENT_OPTIONS = [
  { id: 'convocation', label: 'Convocation', icon: Send },
  { id: 'convention', label: 'Convention de formation', icon: FileText },
  { id: 'attestation', label: 'Attestation de formation', icon: Award },
  { id: 'programme', label: 'Programme de formation', icon: BookOpen },
  { id: 'reglement', label: 'Règlement intérieur', icon: ScrollText },
  { id: 'cgv', label: 'Conditions générales de vente', icon: FileCheck },
] as const;

export function SendDocumentsToContactDialog({
  open,
  onOpenChange,
  contact,
  sessionInfo,
}: SendDocumentsToContactDialogProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { generateDocument } = useDocumentGenerator();
  const createEnvoi = useCreateDocumentEnvoi();

  const hasEmail = !!contact.email;

  const toggleDocument = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleSend = async () => {
    if (selectedDocuments.length === 0) {
      toast.error('Sélectionnez au moins un document');
      return;
    }

    setIsSending(true);

    try {
      // Générer et tracer chaque document
      for (const docType of selectedDocuments) {
        // Générer le document PDF
        const contactInfo = {
          civilite: contact.civilite || undefined,
          nom: contact.nom,
          prenom: contact.prenom,
          email: contact.email || undefined,
          telephone: contact.telephone || undefined,
          rue: contact.rue || undefined,
          code_postal: contact.code_postal || undefined,
          ville: contact.ville || undefined,
          date_naissance: contact.date_naissance || undefined,
          ville_naissance: contact.ville_naissance || undefined,
        };

        const sessionData = {
          nom: sessionInfo.nom,
          formation_type: sessionInfo.formation_type,
          date_debut: sessionInfo.date_debut,
          date_fin: sessionInfo.date_fin,
          lieu: sessionInfo.lieu || undefined,
          duree_heures: sessionInfo.duree_heures || 35,
          prix: sessionInfo.prix,
        };

        // Générer le document si c'est un type supporté
        if (['convocation', 'convention', 'attestation'].includes(docType)) {
          generateDocument(docType as DocumentType, contactInfo, sessionData);
        }

        // Tracer l'envoi dans la base
        await createEnvoi.mutateAsync({
          contact_id: contact.id,
          session_id: sessionInfo.id,
          document_type: docType,
          document_name: `${DOCUMENT_OPTIONS.find(d => d.id === docType)?.label} - ${contact.prenom} ${contact.nom}`,
          statut: sendEmail && hasEmail ? 'envoyé' : 'généré',
        });
      }

      // Envoyer l'email si demandé
      if (sendEmail && hasEmail) {
        const { error } = await supabase.functions.invoke('send-automated-emails', {
          body: {
            type: 'bulk_document',
            recipients: [{
              email: contact.email,
              name: `${contact.prenom} ${contact.nom}`,
              contactId: contact.id,
            }],
            documentTypes: selectedDocuments,
            sessionName: sessionInfo.nom,
            customMessage: customMessage || undefined,
          },
        });

        if (error) {
          console.error('Erreur envoi email:', error);
          toast.warning('Documents générés mais erreur lors de l\'envoi par email');
        } else {
          toast.success(`${selectedDocuments.length} document(s) envoyé(s) à ${contact.prenom} ${contact.nom}`);
        }
      } else {
        toast.success(`${selectedDocuments.length} document(s) généré(s) pour ${contact.prenom} ${contact.nom}`);
      }

      // Reset et fermer
      setSelectedDocuments([]);
      setCustomMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'envoi des documents');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setSelectedDocuments([]);
      setCustomMessage('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envoyer des documents
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Destinataire */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {`${contact.prenom?.[0] ?? ''}${contact.nom?.[0] ?? ''}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{contact.prenom} {contact.nom}</p>
              {contact.email ? (
                <p className="text-sm text-muted-foreground">{contact.email}</p>
              ) : (
                <Badge variant="outline" className="text-xs text-warning">
                  Pas d'email
                </Badge>
              )}
            </div>
          </div>

          {/* Sélection des documents */}
          <div className="space-y-2">
            <Label>Documents à envoyer</Label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {DOCUMENT_OPTIONS.map((doc) => {
                const Icon = doc.icon;
                const isSelected = selectedDocuments.includes(doc.id);
                
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => toggleDocument(doc.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleDocument(doc.id)}
                    />
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm">{doc.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Option envoi email */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="send-email" className="text-sm cursor-pointer">
                Envoyer par email
              </Label>
            </div>
            <Switch
              id="send-email"
              checked={sendEmail}
              onCheckedChange={setSendEmail}
              disabled={!hasEmail}
            />
          </div>

          {!hasEmail && sendEmail && (
            <p className="text-xs text-warning">
              Ce contact n'a pas d'adresse email. Les documents seront uniquement générés.
            </p>
          )}

          {/* Message personnalisé */}
          {sendEmail && hasEmail && (
            <div className="space-y-2">
              <Label>Message personnalisé (optionnel)</Label>
              <Textarea
                placeholder="Ajoutez un message personnalisé à l'email..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Annuler
          </Button>
          <Button 
            onClick={handleSend}
            disabled={selectedDocuments.length === 0 || isSending}
          >
            {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {sendEmail && hasEmail ? (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Envoyer ({selectedDocuments.length})
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Générer ({selectedDocuments.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
