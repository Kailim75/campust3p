import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, BarChart3, ClipboardList, CheckSquare, Calendar } from 'lucide-react';
import QualiopiDashboard from './QualiopiDashboard';
import QualiopiCriteres from './QualiopiCriteres';
import QualiopiActions from './QualiopiActions';
import QualiopiAudits from './QualiopiAudits';

export default function QualiopiPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Certification QUALIOPI</h1>
            <p className="text-muted-foreground">
              Suivi de conformité au référentiel national qualité (7 critères, 32 indicateurs)
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Tableau de bord</span>
            <span className="sm:hidden">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="criteres" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Critères & Indicateurs</span>
            <span className="sm:hidden">Critères</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Actions</span>
          </TabsTrigger>
          <TabsTrigger value="audits" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Audits</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <QualiopiDashboard />
        </TabsContent>

        <TabsContent value="criteres">
          <QualiopiCriteres />
        </TabsContent>

        <TabsContent value="actions">
          <QualiopiActions />
        </TabsContent>

        <TabsContent value="audits">
          <QualiopiAudits />
        </TabsContent>
      </Tabs>
    </div>
  );
}
