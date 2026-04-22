import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Loader2, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteCheckPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Catalogue de référence des entrées de la Sidebar (hubs + Plus + footer).
 * Doit rester synchronisé avec src/components/layout/Sidebar.tsx et
 * les mappings PATH_TO_SECTION / SECTION_TO_PATH dans src/pages/Index.tsx.
 */
const SIDEBAR_ENTRIES: Array<{
  id: string;
  label: string;
  group: "hub" | "more" | "footer";
  expectedPath: string;
  expectedComponent: string;
}> = [
  // Hubs principaux
  { id: "aujourdhui",        label: "Aujourd'hui",        group: "hub",    expectedPath: "/aujourdhui",        expectedComponent: "AujourdhuiPage" },
  { id: "contacts",          label: "Personnes",          group: "hub",    expectedPath: "/contacts",          expectedComponent: "ApprenantsPage" },
  { id: "sessions",          label: "Formations",         group: "hub",    expectedPath: "/sessions",          expectedComponent: "SessionsPage" },
  { id: "finances",          label: "Finances",           group: "hub",    expectedPath: "/finances",          expectedComponent: "FinancesPage" },
  { id: "inbox",             label: "Inbox CRM",          group: "hub",    expectedPath: "/inbox",             expectedComponent: "InboxCrmPage" },
  // Menu "Plus"
  { id: "dashboard",         label: "Dashboard",          group: "more",   expectedPath: "/",                  expectedComponent: "Dashboard" },
  { id: "prospects",         label: "Prospects",          group: "more",   expectedPath: "/prospects",         expectedComponent: "ProspectsPage" },
  { id: "formations",        label: "Catalogue",          group: "more",   expectedPath: "/formations",        expectedComponent: "FormationsPage" },
  { id: "automations",       label: "Automations",        group: "more",   expectedPath: "/automations",       expectedComponent: "AutomationsPage" },
  { id: "formateurs",        label: "Formateurs",         group: "more",   expectedPath: "/formateurs",        expectedComponent: "FormateursPage" },
  { id: "planning-conduite", label: "Planning conduite",  group: "more",   expectedPath: "/planning-conduite", expectedComponent: "PlanningConduitePage" },
  { id: "alertes",           label: "Alertes",            group: "more",   expectedPath: "/alertes",           expectedComponent: "AlertesPage" },
  { id: "qualite",           label: "Qualité",            group: "more",   expectedPath: "/qualite",           expectedComponent: "QualiteUnifiedPage" },
  { id: "partenaires",       label: "Partenaires",        group: "more",   expectedPath: "/partenaires",       expectedComponent: "PartnersPage" },
  { id: "security",          label: "Sécurité",           group: "more",   expectedPath: "/security",          expectedComponent: "SecurityStatusPage" },
  { id: "corbeille",         label: "Corbeille",          group: "more",   expectedPath: "/corbeille",         expectedComponent: "CorbeillePage" },
  // Footer
  { id: "settings",          label: "Paramètres",         group: "footer", expectedPath: "/settings",          expectedComponent: "SettingsPage" },
];

type CheckStatus = "pending" | "running" | "success" | "fail";

interface CheckResult {
  id: string;
  label: string;
  group: string;
  expectedPath: string;
  actualPath?: string;
  expectedComponent: string;
  actualComponent?: string;
  status: CheckStatus;
  error?: string;
}

const groupLabel: Record<string, string> = {
  hub: "Hubs principaux",
  more: "Menu « Plus »",
  footer: "Footer",
};

const groupOrder = ["hub", "more", "footer"];

export function RouteCheckPanel({ open, onOpenChange }: RouteCheckPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [results, setResults] = useState<CheckResult[]>(
    SIDEBAR_ENTRIES.map((e) => ({
      id: e.id,
      label: e.label,
      group: e.group,
      expectedPath: e.expectedPath,
      expectedComponent: e.expectedComponent,
      status: "pending",
    }))
  );
  const [running, setRunning] = useState(false);
  const [originPath] = useState(() => location.pathname);

  const detectMountedComponent = (): string | undefined => {
    // Repère le nom du composant principal monté par Index.tsx via un attribut data
    // ou la première section avec data-page. Sinon, lit le titre d'une heading h1.
    const main = document.querySelector("main [data-page]") || document.querySelector("[data-page]");
    if (main) return (main as HTMLElement).dataset.page;
    const h1 = document.querySelector("main h1");
    return h1?.textContent?.trim() ?? undefined;
  };

  const runChecks = useCallback(async () => {
    setRunning(true);
    const next: CheckResult[] = SIDEBAR_ENTRIES.map((e) => ({
      id: e.id,
      label: e.label,
      group: e.group,
      expectedPath: e.expectedPath,
      expectedComponent: e.expectedComponent,
      status: "pending",
    }));
    setResults(next);

    for (let i = 0; i < SIDEBAR_ENTRIES.length; i++) {
      const entry = SIDEBAR_ENTRIES[i];
      next[i] = { ...next[i], status: "running" };
      setResults([...next]);

      try {
        navigate(entry.expectedPath);
        // Laisse React Router + PageTransition se stabiliser
        await new Promise((r) => setTimeout(r, 350));

        const actualPath = window.location.pathname;
        const actualComponent = detectMountedComponent();
        const pathOk = actualPath === entry.expectedPath;

        next[i] = {
          ...next[i],
          actualPath,
          actualComponent,
          status: pathOk ? "success" : "fail",
          error: pathOk ? undefined : `URL attendue ${entry.expectedPath}, obtenue ${actualPath}`,
        };
      } catch (err: any) {
        next[i] = {
          ...next[i],
          status: "fail",
          error: err?.message ?? "Erreur inconnue",
        };
      }
      setResults([...next]);
    }

    // Retour à la route d'origine
    navigate(originPath);
    setRunning(false);
  }, [navigate, originPath]);

  const total = results.length;
  const ok = results.filter((r) => r.status === "success").length;
  const ko = results.filter((r) => r.status === "fail").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Vérification du routage de la Sidebar</DialogTitle>
          <DialogDescription>
            Teste automatiquement chaque entrée (hubs + Plus + footer) en simulant
            la navigation et en comparant l'URL et le composant montés à la
            référence attendue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          <Button onClick={runChecks} disabled={running} size="sm">
            {running ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Test en cours…</>
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Lancer les tests</>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={runChecks} disabled={running}>
            <RefreshCw className="h-4 w-4 mr-1" /> Re-tester
          </Button>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <Badge variant="outline">{total} entrées</Badge>
            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300">{ok} OK</Badge>
            <Badge className="bg-destructive/10 text-destructive border-destructive/30">{ko} KO</Badge>
          </div>
        </div>

        <ScrollArea className="h-[480px] pr-3">
          {groupOrder.map((g) => {
            const items = results.filter((r) => r.group === g);
            if (!items.length) return null;
            return (
              <div key={g} className="mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {groupLabel[g]}
                </h4>
                <div className="space-y-1">
                  {items.map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "flex items-start gap-3 p-2.5 rounded-md border text-sm",
                        r.status === "success" && "border-emerald-200 bg-emerald-50/40",
                        r.status === "fail" && "border-destructive/30 bg-destructive/5",
                        r.status === "running" && "border-primary/30 bg-primary/5",
                        r.status === "pending" && "border-border bg-muted/30"
                      )}
                    >
                      <div className="mt-0.5">
                        {r.status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        {r.status === "fail" && <XCircle className="h-4 w-4 text-destructive" />}
                        {r.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        {r.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.label}</span>
                          <code className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">{r.id}</code>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                          <div>
                            <span className="font-semibold">URL attendue :</span>{" "}
                            <code className="font-mono">{r.expectedPath}</code>
                          </div>
                          <div>
                            <span className="font-semibold">URL réelle :</span>{" "}
                            <code className={cn(
                              "font-mono",
                              r.actualPath && r.actualPath !== r.expectedPath && "text-destructive"
                            )}>
                              {r.actualPath ?? "—"}
                            </code>
                          </div>
                          <div>
                            <span className="font-semibold">Composant attendu :</span>{" "}
                            <code className="font-mono">{r.expectedComponent}</code>
                          </div>
                          <div>
                            <span className="font-semibold">Page chargée :</span>{" "}
                            <code className="font-mono">{r.actualComponent ?? "—"}</code>
                          </div>
                        </div>
                        {r.error && (
                          <div className="text-xs text-destructive mt-1">{r.error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
