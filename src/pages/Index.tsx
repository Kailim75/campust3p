import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState("dashboard");
  const isMobile = useIsMobile();

  // Support deep-links like /?section=contacts&id=...
  useEffect(() => {
    const section = searchParams.get("section");
    if (section) {
      setActiveSection(section);
      // Remove section from URL but keep other params (ex: id)
      const next = new URLSearchParams(searchParams);
      next.delete("section");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
