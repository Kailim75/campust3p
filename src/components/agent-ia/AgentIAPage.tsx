import { CRMAnalysisTab } from "@/components/dashboard/CRMAnalysisTab";

export default function AgentIAPage() {
  return (
    <div className="min-h-screen">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Agent IA</h1>
        <p className="text-sm text-muted-foreground">Analyse intelligente de votre CRM en temps réel</p>
      </div>
      <main className="px-6 pb-6">
        <CRMAnalysisTab />
      </main>
    </div>
  );
}
