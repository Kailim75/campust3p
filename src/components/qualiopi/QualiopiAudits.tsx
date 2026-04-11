import { useMemo, useState } from 'react';
import { useQualiopiAudits, QualiopiAudit } from '@/hooks/useQualiopiAudits';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Calendar, Building2, Award, AlertTriangle, Trash2, ShieldCheck, RotateCcw, ClipboardList } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<QualiopiAudit['statut'], string> = {
  planifie: 'Planifié',
  en_cours: 'En cours',
  termine: 'Terminé',
  certifie: 'Certifié',
};

function formatAuditDateLabel(date: string): string {
  const parsedDate = parseISO(date);

  if (isToday(parsedDate)) return "Aujourd'hui";
  if (isTomorrow(parsedDate)) return 'Demain';

  return format(parsedDate, 'dd MMMM yyyy', { locale: fr });
}

export default function QualiopiAudits() {
  const { audits, isLoading, createAudit, updateAudit, deleteAudit, isCreating } = useQualiopiAudits();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    type_audit: 'initial' as QualiopiAudit['type_audit'],
    organisme_certificateur: '',
    date_audit: '',
    date_prochaine_echeance: '',
    observations: ''
  });

  const handleSubmit = () => {
    if (!formData.date_audit) return;
    
    createAudit({
      ...formData,
      organisme_certificateur: formData.organisme_certificateur || null,
      date_prochaine_echeance: formData.date_prochaine_echeance || null,
      observations: formData.observations || null,
      statut: 'planifie',
      score_global: null,
      non_conformites_majeures: 0,
      non_conformites_mineures: 0
    });
    
    setIsDialogOpen(false);
    setFormData({
      type_audit: 'initial',
      organisme_certificateur: '',
      date_audit: '',
      date_prochaine_echeance: '',
      observations: ''
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      initial: 'Initial',
      surveillance: 'Surveillance',
      renouvellement: 'Renouvellement',
      interne: 'Interne'
    };
    return labels[type] || type;
  };

  const getStatutBadge = (statut: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive', label: string }> = {
      planifie: { variant: 'outline', label: 'Planifié' },
      en_cours: { variant: 'secondary', label: 'En cours' },
      termine: { variant: 'default', label: 'Terminé' },
      certifie: { variant: 'default', label: 'Certifié' }
    };
    const { variant, label } = config[statut] || config.planifie;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const sortedAudits = useMemo(() => {
    const statusOrder: Record<QualiopiAudit['statut'], number> = {
      en_cours: 0,
      planifie: 1,
      termine: 2,
      certifie: 3,
    };

    return [...(audits || [])].sort((left, right) => {
      const leftOpen = left.statut === 'planifie' || left.statut === 'en_cours';
      const rightOpen = right.statut === 'planifie' || right.statut === 'en_cours';

      if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;

      if (statusOrder[left.statut] !== statusOrder[right.statut]) {
        return statusOrder[left.statut] - statusOrder[right.statut];
      }

      if (leftOpen) return left.date_audit.localeCompare(right.date_audit);
      return right.date_audit.localeCompare(left.date_audit);
    });
  }, [audits]);

  const plannedOrRunningCount = audits?.filter((audit) => audit.statut === 'planifie' || audit.statut === 'en_cours').length || 0;
  const overdueOrPastOpenCount = audits?.filter((audit) => (audit.statut === 'planifie' || audit.statut === 'en_cours') && isPast(parseISO(audit.date_audit))).length || 0;
  const completedCount = audits?.filter((audit) => audit.statut === 'termine' || audit.statut === 'certifie').length || 0;
  const nextAudit = sortedAudits.find((audit) => audit.statut === 'planifie' || audit.statut === 'en_cours') || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold">Pilotage des audits</p>
              <p className="text-xs text-muted-foreground">
                Planifie, suis et archive les audits pour garder une vision claire des échéances Qualiopi.
              </p>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2 text-xs">
              <p className="font-medium">Prochain audit</p>
              <p className="text-muted-foreground">
                {nextAudit ? `${getTypeLabel(nextAudit.type_audit)} · ${formatAuditDateLabel(nextAudit.date_audit)}` : 'Aucun audit ouvert'}
              </p>
              <p className="mt-1 text-muted-foreground">
                {nextAudit?.organisme_certificateur || 'Organisme non renseigné'}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ouverts</p>
                <p className="mt-1 text-lg font-semibold">{plannedOrRunningCount}</p>
                <p className="text-xs text-muted-foreground">Audits planifiés ou en cours</p>
              </CardContent>
            </Card>
            <Card className={overdueOrPastOpenCount > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-border/70'}>
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">À requalifier</p>
                <p className="mt-1 text-lg font-semibold">{overdueOrPastOpenCount}</p>
                <p className="text-xs text-muted-foreground">Audits passés encore ouverts</p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Clôturés</p>
                <p className="mt-1 text-lg font-semibold">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Audits terminés ou certifiés</p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Historique</p>
                <p className="mt-1 text-lg font-semibold">{audits?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Audits suivis dans le CRM</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Planifier un audit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Planifier un audit QUALIOPI</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Renseigne ici les informations utiles pour préparer l&apos;audit et garder une échéance claire dans le CRM.
              </p>
              <div>
                <Label>Type d'audit *</Label>
                <Select 
                  value={formData.type_audit} 
                  onValueChange={(v: QualiopiAudit['type_audit']) => setFormData({ ...formData, type_audit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial">Initial</SelectItem>
                    <SelectItem value="surveillance">Surveillance</SelectItem>
                    <SelectItem value="renouvellement">Renouvellement</SelectItem>
                    <SelectItem value="interne">Interne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Organisme certificateur</Label>
                <Input 
                  value={formData.organisme_certificateur}
                  onChange={(e) => setFormData({ ...formData, organisme_certificateur: e.target.value })}
                  placeholder="Ex: AFNOR, Bureau Veritas..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de l'audit *</Label>
                  <Input 
                    type="date"
                    value={formData.date_audit}
                    onChange={(e) => setFormData({ ...formData, date_audit: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Prochaine échéance</Label>
                  <Input 
                    type="date"
                    value={formData.date_prochaine_echeance}
                    onChange={(e) => setFormData({ ...formData, date_prochaine_echeance: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label>Observations</Label>
                <Textarea 
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Notes et observations..."
                />
              </div>
              
              <Button onClick={handleSubmit} disabled={isCreating} className="w-full">
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Planifier l'audit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!audits || audits.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun audit planifié ou réalisé.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedAudits.map(audit => {
            const isOpen = audit.statut === 'planifie' || audit.statut === 'en_cours';
            const isPastOpen = isOpen && isPast(parseISO(audit.date_audit));
            return (
            <Card key={audit.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {audit.statut === 'certifie' ? (
                      <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <Award className="h-5 w-5 text-primary mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium">Audit {getTypeLabel(audit.type_audit)}</h4>
                        {getStatutBadge(audit.statut)}
                        {isPastOpen && (
                          <Badge variant="destructive">Échéance passée</Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatAuditDateLabel(audit.date_audit)}
                        </span>
                        {audit.organisme_certificateur && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {audit.organisme_certificateur}
                          </span>
                        )}
                        {audit.date_prochaine_echeance && (
                          <span className="flex items-center gap-1">
                            <ClipboardList className="h-4 w-4" />
                            Prochaine échéance {format(new Date(audit.date_prochaine_echeance), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                      
                      {(audit.non_conformites_majeures > 0 || audit.non_conformites_mineures > 0) && (
                        <div className="flex gap-2 mt-2">
                          {audit.non_conformites_majeures > 0 && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {audit.non_conformites_majeures} majeure(s)
                            </Badge>
                          )}
                          {audit.non_conformites_mineures > 0 && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {audit.non_conformites_mineures} mineure(s)
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {audit.observations && (
                        <p className="text-sm text-muted-foreground mt-2">{audit.observations}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {audit.score_global !== null && (
                      <Badge variant="outline" className="text-lg font-bold">
                        {audit.score_global}%
                      </Badge>
                    )}
                    
                    <Select
                      value={audit.statut}
                      onValueChange={(value) => updateAudit({ 
                        id: audit.id, 
                        statut: value as QualiopiAudit['statut']
                      })}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planifie">Planifié</SelectItem>
                        <SelectItem value="en_cours">En cours</SelectItem>
                        <SelectItem value="termine">Terminé</SelectItem>
                        <SelectItem value="certifie">Certifié</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteAudit(audit.id)}
                      title="Supprimer l'audit"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}
    </div>
  );
}
