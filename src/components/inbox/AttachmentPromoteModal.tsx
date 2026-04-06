import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, FolderPlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface AttachmentPromoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: {
    id: string;
    filename: string;
    mime_type: string | null;
    size_bytes: number | null;
    promoted_to_document_id: string | null;
  };
  centreId: string;
}

const DOC_TYPES = [
  { value: "piece_identite", label: "Pièce d'identité" },
  { value: "justificatif_domicile", label: "Justificatif de domicile" },
  { value: "photo", label: "Photo" },
  { value: "permis", label: "Permis de conduire" },
  { value: "assr", label: "ASSR" },
  { value: "contrat", label: "Contrat" },
  { value: "attestation", label: "Attestation" },
  { value: "certificat_medical", label: "Certificat médical" },
  { value: "autre", label: "Autre" },
];

export function AttachmentPromoteModal({
  open,
  onOpenChange,
  attachment,
  centreId,
}: AttachmentPromoteModalProps) {
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [typeDocument, setTypeDocument] = useState("autre");
  const [nomDocument, setNomDocument] = useState(attachment.filename);
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading: searching } = useQuery({
    queryKey: ["promote-contact-search", contactSearch, centreId],
    queryFn: async () => {
      if (contactSearch.trim().length < 2) return [];
      const term = `%${contactSearch.trim()}%`;
      const { data } = await supabase
        .from("contacts")
        .select("id, nom, prenom, email")
        .eq("centre_id", centreId)
        .eq("archived", false)
        .or(`nom.ilike.${term},prenom.ilike.${term},email.ilike.${term}`)
        .limit(8);
      return data || [];
    },
    enabled: contactSearch.trim().length >= 2,
  });

  const promote = useMutation({
    mutationFn: async () => {
      if (!selectedContactId || !typeDocument) throw new Error("Champs manquants");

      const { data, error } = await supabase.functions.invoke("promote-attachment", {
        body: {
          attachmentId: attachment.id,
          centreId,
          contactId: selectedContactId,
          typeDocument,
          nomDocument: nomDocument.trim() || attachment.filename,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-email-attachments"] });
      toast.success("Document ajouté au dossier");
      onOpenChange(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setContactSearch("");
    setSelectedContactId(null);
    setTypeDocument("autre");
    setNomDocument(attachment.filename);
  };

  const selectedContact = contacts.find((c) => c.id === selectedContactId);
  const alreadyPromoted = !!attachment.promoted_to_document_id;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-primary" />
            Ajouter au dossier
          </DialogTitle>
        </DialogHeader>

        {alreadyPromoted ? (
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">Déjà ajouté au dossier</p>
              <p className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">
                Cette pièce jointe a déjà été promue en document.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {/* File info */}
            <div className="bg-muted/40 rounded-md px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{attachment.filename}</span>
              {attachment.size_bytes && (
                <span className="ml-2">
                  ({attachment.size_bytes < 1024 * 1024
                    ? `${(attachment.size_bytes / 1024).toFixed(1)} Ko`
                    : `${(attachment.size_bytes / (1024 * 1024)).toFixed(1)} Mo`})
                </span>
              )}
            </div>

            {/* Contact search */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Contact destinataire</Label>
              {selectedContact ? (
                <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
                  <span className="text-sm font-medium">{selectedContact.prenom} {selectedContact.nom}</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setSelectedContactId(null); setContactSearch(""); }}>
                    Changer
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Rechercher un contact…"
                      className="h-9 text-sm pl-8"
                    />
                  </div>
                  {searching && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Recherche…
                    </div>
                  )}
                  {contacts.length > 0 && (
                    <div className="max-h-[120px] overflow-y-auto space-y-0.5 border rounded-md p-1">
                      {contacts.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedContactId(c.id)}
                          className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors"
                        >
                          <span className="font-medium">{c.prenom} {c.nom}</span>
                          {c.email && <span className="text-muted-foreground ml-1.5">{c.email}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Document type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type de document</Label>
              <Select value={typeDocument} onValueChange={setTypeDocument}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nom du document</Label>
              <Input
                value={nomDocument}
                onChange={(e) => setNomDocument(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => { resetForm(); onOpenChange(false); }}>
            {alreadyPromoted ? "Fermer" : "Annuler"}
          </Button>
          {!alreadyPromoted && (
            <Button
              size="sm"
              onClick={() => promote.mutate()}
              disabled={!selectedContactId || !typeDocument || promote.isPending}
            >
              {promote.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Ajout…</>
              ) : (
                <><FolderPlus className="h-3.5 w-3.5 mr-1.5" />Ajouter au dossier</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
