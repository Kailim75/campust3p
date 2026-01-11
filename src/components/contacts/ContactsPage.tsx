import { Header } from "@/components/layout/Header";
import { ContactsTable } from "./ContactsTable";

export function ContactsPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Contacts" 
        subtitle="Gérez vos prospects et stagiaires"
        addLabel="Nouveau contact"
        onAddClick={() => console.log("Add contact")}
      />

      <main className="p-6 animate-fade-in">
        <ContactsTable />
      </main>
    </div>
  );
}
