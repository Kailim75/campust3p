import React from "react";
import { Button } from "@/components/ui/button";

type AppErrorBoundaryState = {
  hasError: boolean;
  error?: unknown;
  componentStack?: string;
};

/**
 * Error boundary to avoid blank screen and surface the component stack.
 * This is intentionally simple and meant for debugging runtime issues.
 */
export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // This log is important: it will show which component crashed.
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary] Caught error", error);
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary] Component stack", info.componentStack);

    this.setState({ componentStack: info.componentStack });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message =
      this.state.error instanceof Error
        ? this.state.error.message
        : "Une erreur inattendue est survenue.";

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-display font-bold">Erreur de rendu</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Détails (stack React)</p>
            <pre className="text-xs whitespace-pre-wrap rounded-lg bg-muted p-3 overflow-auto max-h-64">
              {this.state.componentStack || "(stack indisponible)"}
            </pre>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={this.handleReload}>
              Recharger
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
