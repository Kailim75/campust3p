import React, { useState } from "react";
import { useNoShowDetection } from "@/hooks/useNoShowDetection";
import { GraduationCap } from "lucide-react";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { ExpressEnrollmentDialog } from "@/components/contacts/ExpressEnrollmentDialog";
import { HealthScoreCard } from "./HealthScoreCard";
import { PriorityActionsGrouped } from "./PriorityActionsGrouped";
import { StrategicPillars } from "./StrategicPillars";
import { SessionsUpcoming } from "./SessionsUpcoming";
import { PredictiveScoreCard } from "./PredictiveScoreCard";
import { BlockageDashboardWidget } from "@/components/blockage/BlockageDashboardWidget";

interface DashboardProps {
  onNavigate?: (section: string) => void;
  onNavigateWithContact?: (section: string, contactId?: string) => void;
}

export function Dashboard({ onNavigate, onNavigateWithContact }: DashboardProps) {
  useNoShowDetection();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expressOpen, setExpressOpen] = useState(false);
  

  const handleNavigate = (section: string) => {
    onNavigate?.(section);
  };

  const handleNavigateWithContact = (section: string, contactId?: string) => {
    if (contactId) {
      setSelectedContactId(contactId);
      setDetailOpen(true);
    } else {
      onNavigateWithContact?.(section, contactId);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground">Pilotage stratégique de votre centre</p>
          </div>
          <button
            onClick={() => setExpressOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sidebar text-sidebar-foreground hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <GraduationCap className="h-4 w-4" />
            Inscription Express
          </button>
        </div>
      </div>

      <main className="px-6 pb-6 space-y-5">
        {/* BLOC 1 — Santé + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2">
            <HealthScoreCard />
          </div>
          <div className="lg:col-span-2">
            <PriorityActionsGrouped
              onNavigate={handleNavigate}
              onNavigateWithContact={handleNavigateWithContact}
            />
          </div>
          <div className="lg:col-span-1">
            <BlockageDashboardWidget onOpenPanel={() => {
              window.dispatchEvent(new CustomEvent('open-blockage-panel'));
            }} />
          </div>
        </div>

        {/* BLOC 2 — Prédictif 30 jours */}
        <PredictiveScoreCard onNavigate={handleNavigate} />

        {/* BLOC 3 — Pilotage stratégique */}
        <StrategicPillars onNavigate={handleNavigate} />

        {/* BLOC 4 — Sessions à venir */}
        <SessionsUpcoming onClick={() => handleNavigate("sessions")} />
      </main>

      {/* Dialogs */}
      <ExpressEnrollmentDialog
        open={expressOpen}
        onOpenChange={setExpressOpen}
        onSuccess={(contactId) => {
          if (contactId) {
            setSelectedContactId(contactId);
            setDetailOpen(true);
          }
        }}
      />
      <ApprenantDetailSheet
        contactId={selectedContactId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
