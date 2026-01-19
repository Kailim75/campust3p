import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ContactsTable } from "./ContactsTable";
import { ContactFormDialog } from "./ContactFormDialog";

export function ContactsPage() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Header 
        title="Contacts" 
        subtitle="Gérez vos prospects et stagiaires"
        addLabel="Nouveau contact"
        onAddClick={() => setFormOpen(true)}
      />

      <main className="p-6 animate-fade-in">
        <ContactsTable />
      </main>

      <ContactFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
      />
    </div>
  );
}
