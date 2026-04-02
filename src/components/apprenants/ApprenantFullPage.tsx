import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useContact } from "@/hooks/useContact";
import { ApprenantDetailContent } from "./ApprenantDetailContent";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { useState } from "react";
import type { Contact } from "@/hooks/useContacts";

export function ApprenantFullPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading } = useContact(id ?? null);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Back header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-4 py-2 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/contacts")}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Apprenants
        </Button>
        {contact && (
          <span className="text-sm font-medium text-muted-foreground">
            {contact.prenom} {contact.nom}
          </span>
        )}
      </div>

      {/* Full-width detail content */}
      <div className="flex-1 max-w-5xl mx-auto w-full">
        <ApprenantDetailContent
          contact={contact ?? null}
          isLoading={isLoading}
          onEdit={(c) => setEditContact(c)}
          onClose={() => navigate("/contacts")}
        />
      </div>

      {editContact && (
        <ContactFormDialog
          open={!!editContact}
          onOpenChange={(open) => { if (!open) setEditContact(null); }}
          contact={editContact}
        />
      )}
    </div>
  );
}
