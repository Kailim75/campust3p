import { ReactNode } from "react";
import { SuperAdminSidebar } from "./SuperAdminSidebar";
import { SuperAdminHeader } from "./SuperAdminHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface SuperAdminLayoutProps {
  children: ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function SuperAdminLayout({ 
  children, 
  activeSection, 
  onSectionChange 
}: SuperAdminLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="h-screen bg-superadmin-background overflow-hidden">
      <SuperAdminSidebar 
        activeSection={activeSection} 
        onSectionChange={onSectionChange} 
      />
      
      <main className={cn(
        "transition-all duration-300 h-full overflow-auto",
        isMobile ? "ml-0 pt-14" : "ml-64" // SuperAdmin sidebar is always 256px (w-64)
      )}>
        {children}
      </main>
    </div>
  );
}
