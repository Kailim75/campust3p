import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CentreProvider } from "@/contexts/CentreContext";
import { MaJourneeContent } from "@/components/ma-journee/MaJourneeContent";

const PageInner = lazy(async () => ({ default: MaJourneeContent }));

export default function MaJourneePage() {
  return (
    <ProtectedRoute>
      <CentreProvider>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          }
        >
          <PageInner />
        </Suspense>
      </CentreProvider>
    </ProtectedRoute>
  );
}
