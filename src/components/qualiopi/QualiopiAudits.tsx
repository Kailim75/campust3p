import { useState } from 'react';
import { useQualiopiAudits, QualiopiAudit } from '@/hooks/useQualiopiAudits';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Calendar, Building2, Award, AlertTriangle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun audit planifié ou réalisé
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {audits.map(audit => (
            <Card key={audit.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Award className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">Audit {getTypeLabel(audit.type_audit)}</h4>
                        {getStatutBadge(audit.statut)}
                      </div>
                      
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(audit.date_audit), 'dd MMMM yyyy', { locale: fr })}
                        </span>
                        {audit.organisme_certificateur && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {audit.organisme_certificateur}
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
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
