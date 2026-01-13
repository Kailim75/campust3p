import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ContactsPage } from "@/components/contacts/ContactsPage";
import { FormationsPage } from "@/components/formations/FormationsPage";
import { SessionsPage } from "@/components/sessions/SessionsPage";
import { DocumentsPage } from "@/components/documents/DocumentsPage";
import { PaiementsPage } from "@/components/paiements/PaiementsPage";
import { AlertesPage } from "@/components/alertes/AlertesPage";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const Index = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const isMobile = useIsMobile();

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard />;
      case "contacts":
        return <ContactsPage />;
      case "formations":
        return <FormationsPage />;
      case "sessions":
        return <SessionsPage />;
      case "documents":
        return <DocumentsPage />;
      case "paiements":
        return <PaiementsPage />;
      case "alertes":
        return <AlertesPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      
      <main className={cn(
        "transition-all duration-300",
        isMobile ? "ml-0" : "ml-64"
      )}>
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
