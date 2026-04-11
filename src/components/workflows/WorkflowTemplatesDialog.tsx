import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WORKFLOW_TEMPLATES, TRIGGER_TYPES } from '@/hooks/useWorkflows';
import type { WorkflowTemplate } from '@/hooks/useWorkflows';
import { Zap, ArrowRight, Mail, Bell, RefreshCw, FileText, Clock, Globe, LucideIcon } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: WorkflowTemplate) => void;
}

const ACTION_ICONS: Record<string, LucideIcon> = {
  send_email: Mail,
  create_notification: Bell,
  update_status: RefreshCw,
  create_historique: FileText,
  add_delay: Clock,
  webhook: Globe
};

const CATEGORY_COLORS: Record<string, string> = {
  Onboarding: 'bg-blue-500/10 text-blue-600',
  Paiements: 'bg-green-500/10 text-green-600',
  Sessions: 'bg-purple-500/10 text-purple-600',
  Documents: 'bg-amber-500/10 text-amber-600',
};

export function WorkflowTemplatesDialog({ open, onOpenChange, onSelect }: Props) {
  const getTriggerLabel = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Templates de workflows
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Démarrez rapidement avec un workflow prédéfini et personnalisez-le à vos besoins.
          </p>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2 mt-2">
          {WORKFLOW_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
              onClick={() => onSelect(template)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{template.nom}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                  </div>
                  <Badge className={`text-[10px] ${CATEGORY_COLORS[template.category] || ''}`} variant="secondary">
                    {template.category}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Zap className="h-2.5 w-2.5" />
                    {getTriggerLabel(template.trigger_type)}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  {template.actions.map((action, idx) => {
                    const Icon = ACTION_ICONS[action.type] || Zap;
                    return (
                      <Badge key={idx} variant="secondary" className="gap-1 text-[10px] px-1.5">
                        <Icon className="h-2.5 w-2.5" />
                      </Badge>
                    );
                  })}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  Utiliser ce template
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
