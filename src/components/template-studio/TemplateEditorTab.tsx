import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Save, Send, CheckCircle, Rocket, Loader2,
  AlertTriangle, CheckCircle2, XCircle, Eye, Code, Shield, Wand2, Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useStudioTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useTemplateWorkflow,
  TEMPLATE_TYPES,
  TEMPLATE_FORMATS,
  TEMPLATE_STATUSES,
} from "@/hooks/useTemplateStudio";
import {
  runComplianceCheck,
  COMPLIANCE_GATED_TYPES,
  TEMPLATE_GENERATORS,
  type ComplianceReport,
} from "./complianceEngine";
import DOMPurify from "dompurify";
import { toast } from "sonner";

interface Props {
  templateId: string | null;
  isCreating: boolean;
  onBack: () => void;
}

export default function TemplateEditorTab({ templateId, isCreating, onBack }: Props) {
  const { data: template, isLoading } = useStudioTemplate(templateId);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const workflow = useTemplateWorkflow();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("autre");
  const [format, setFormat] = useState("html");
  const [scenario, setScenario] = useState("");
  const [body, setBody] = useState("");
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [editorTab, setEditorTab] = useState("edit");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setType(template.type);
      setFormat(template.format);
      setScenario(template.scenario || "");
      setBody(template.template_body);
      if (template.compliance_report_json) {
        setComplianceReport(template.compliance_report_json);
      } else {
        setComplianceReport(runComplianceCheck(template.template_body, template.type));
      }
    } else if (isCreating) {
      setName("");
      setDescription("");
      setType("autre");
      setFormat("html");
      setScenario("");
      setBody("");
      setComplianceReport(null);
    }
  }, [template, isCreating]);

  const handleSave = async () => {
    if (isCreating) {
      const result = await createTemplate.mutateAsync({
        name,
        description: description || null,
        type: type as any,
        format: format as any,
        template_body: body,
        scenario: scenario || null,
      });
      if (result) onBack();
    } else if (templateId) {
      await updateTemplate.mutateAsync({
        id: templateId,
        name,
        description: description || null,
        template_body: body,
        scenario: scenario || null,
      });
    }
  };

  const handleRunCompliance = () => {
    const report = runComplianceCheck(body, type);
    setComplianceReport(report);
    // Also persist to DB if editing existing template
    if (templateId) {
      updateTemplate.mutate({
        id: templateId,
        compliance_score: report.score,
        compliance_report_json: report as any,
      });
    }
  };

  const handleSubmitReview = async () => {
    if (!template) return;
    await workflow.submitForReview(template);
  };

  const handleApprove = async () => {
    if (!template) return;
    await workflow.approve(template);
  };

  const handlePublish = async () => {
    if (!template) return;
    setIsPublishing(true);
    try {
      // Run fresh compliance check
      const report = runComplianceCheck(body, template.type);
      setComplianceReport(report);
      await workflow.publish(template, report);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleArchive = async () => {
    if (!template) return;
    await workflow.archive(template);
  };

  const handleGenerate = () => {
    const gen = TEMPLATE_GENERATORS[type];
    if (gen) {
      setBody(gen.generator());
      setComplianceReport(null);
      toast.success(`Template "${gen.label}" généré — personnalisez-le avant publication`);
    }
  };

  const statusCfg = TEMPLATE_STATUSES.find((s) => s.value === template?.status);
  const isSaving = createTemplate.isPending || updateTemplate.isPending;
  const hasGenerator = !!TEMPLATE_GENERATORS[type];
  const isComplianceGated = COMPLIANCE_GATED_TYPES.includes(type);
  const canShowPublish = template?.status === "approved";
  const complianceBlocking = isComplianceGated && complianceReport && !complianceReport.ready_to_publish;

  if (!isCreating && !templateId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Code className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sélectionnez un template à éditer</p>
          <p className="text-sm">Ou créez-en un nouveau depuis l'onglet Templates</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground">
              {isCreating ? "Nouveau template" : name}
            </h2>
            {template && (
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={cn("text-[10px]", statusCfg?.color)}>
                  {statusCfg?.label}
                </Badge>
                <Badge variant="outline" className="text-[10px]">v{template.version}</Badge>
                {template.is_active && (
                  <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">Actif</Badge>
                )}
                {template.compliance_validated_at && (
                  <Badge variant="outline" className="text-[10px] text-green-600">
                    ✓ Validé {new Date(template.compliance_validated_at).toLocaleDateString("fr-FR")}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasGenerator && (
            <Button variant="outline" onClick={handleGenerate} className="gap-2">
              <Wand2 className="h-4 w-4" />
              {TEMPLATE_GENERATORS[type]?.label || "Générer"}
            </Button>
          )}
          <Button variant="outline" onClick={handleRunCompliance} className="gap-2">
            <Shield className="h-4 w-4" />
            Vérifier conformité
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
          {template?.status === "draft" && (
            <Button variant="outline" onClick={handleSubmitReview} className="gap-2">
              <Send className="h-4 w-4" />
              Soumettre
            </Button>
          )}
          {template?.status === "review" && (
            <Button variant="outline" onClick={handleApprove} className="gap-2 text-blue-600">
              <CheckCircle className="h-4 w-4" />
              Approuver
            </Button>
          )}
          {canShowPublish && (
            <Button
              onClick={handlePublish}
              disabled={isPublishing || complianceBlocking}
              className="gap-2 bg-green-600 hover:bg-green-700"
              title={complianceBlocking ? "Conformité bloquante — vérifiez le rapport" : undefined}
            >
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Publier
            </Button>
          )}
          {template && template.status !== "archived" && template.status !== "draft" && (
            <Button variant="ghost" size="icon" onClick={handleArchive} title="Archiver">
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Metadata + Editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Metadata */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nom</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du template" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description optionnelle" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType} disabled={!isCreating}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Format</Label>
                  <Select value={format} onValueChange={setFormat} disabled={!isCreating}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_FORMATS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Scénario <span className="text-muted-foreground">(emails)</span></Label>
                  <Input
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    placeholder="ex: relance, convocation..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editor + Preview */}
          <Card>
            <CardHeader className="pb-2">
              <Tabs value={editorTab} onValueChange={setEditorTab}>
                <TabsList>
                  <TabsTrigger value="edit" className="gap-1.5">
                    <Code className="h-3.5 w-3.5" />
                    Éditeur
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    Aperçu
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {editorTab === "edit" ? (
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Contenu du template (HTML, Markdown, etc.)..."
                  className="min-h-[400px] font-mono text-sm"
                />
              ) : (
                <ScrollArea className="max-h-[400px] border rounded-lg p-4">
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }}
                  />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Compliance Report */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Rapport de Conformité
                {isComplianceGated && (
                  <Badge variant="outline" className="text-[10px] ml-auto">Bloquant</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!complianceReport ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Cliquez "Vérifier conformité" pour analyser
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Score</span>
                    <span className={cn(
                      "text-lg font-bold",
                      complianceReport.score >= 80 ? "text-green-500" :
                      complianceReport.score >= 50 ? "text-yellow-500" : "text-red-500"
                    )}>
                      {complianceReport.score}%
                    </span>
                  </div>
                  <Progress value={complianceReport.score} className="h-2" />

                  <Badge
                    variant={complianceReport.ready_to_publish ? "default" : "destructive"}
                    className="text-xs w-full justify-center"
                  >
                    {complianceReport.ready_to_publish
                      ? "✓ Prêt à publier"
                      : `✗ ${complianceReport.blocking_issues.length} mention(s) critique(s) manquante(s)`}
                  </Badge>

                  {!complianceReport.ready_to_publish && (
                    <div className="p-2 rounded-lg border border-destructive/30 bg-destructive/5 text-xs">
                      <p className="font-medium text-destructive mb-1">
                        {isComplianceGated ? "Publication bloquée :" : "Recommandations :"}
                      </p>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        {complianceReport.blocking_issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {complianceReport.checks.map((check) => (
                        <div key={check.id} className={cn(
                          "p-2 rounded-lg border text-xs",
                          check.status === "ok" ? "border-green-500/20 bg-green-500/5" :
                          check.status === "missing" ? "border-red-500/20 bg-red-500/5" :
                          "border-yellow-500/20 bg-yellow-500/5"
                        )}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {check.status === "ok" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            ) : check.status === "missing" ? (
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                            )}
                            <span className="font-medium">{check.label}</span>
                          </div>
                          <p className="text-muted-foreground pl-5">{check.reference}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variables hint */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Variables disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><code className="bg-muted px-1 rounded">{"{{nom}}"}</code> Nom du stagiaire</p>
                <p><code className="bg-muted px-1 rounded">{"{{prenom}}"}</code> Prénom</p>
                <p><code className="bg-muted px-1 rounded">{"{{session_nom}}"}</code> Session</p>
                <p><code className="bg-muted px-1 rounded">{"{{session_date_debut}}"}</code> Date début</p>
                <p><code className="bg-muted px-1 rounded">{"{{session_date_fin}}"}</code> Date fin</p>
                <p><code className="bg-muted px-1 rounded">{"{{centre_nom}}"}</code> Centre</p>
                <p><code className="bg-muted px-1 rounded">{"{{centre_siret}}"}</code> SIRET</p>
                <p><code className="bg-muted px-1 rounded">{"{{centre_nda}}"}</code> N° NDA</p>
                <p><code className="bg-muted px-1 rounded">{"{{date_jour}}"}</code> Date du jour</p>
                <p><code className="bg-muted px-1 rounded">{"{{duree_heures}}"}</code> Durée (heures)</p>
                <p><code className="bg-muted px-1 rounded">{"{{prix_total}}"}</code> Prix total</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
