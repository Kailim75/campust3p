import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ContactsTable } from "./ContactsTable";
import { ContactFormDialog } from "./ContactFormDialog";

export function ContactsPage() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Header 
        title="Apprenants" 
        subtitle="Gérez vos apprenants et stagiaires"
        addLabel="Nouvel apprenant"
        onAddClick={() => setFormOpen(true)}
      />

      <main className="p-3 sm:p-6 animate-fade-in">
        <ContactsTable />
      </main>

      <ContactFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
      />
    </div>
  );
}
