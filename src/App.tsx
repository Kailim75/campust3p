import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";
import Auth from "./pages/Auth";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { InstallPWA } from "./components/pwa/InstallPWA";
import { OfflineIndicator } from "./components/pwa/OfflineIndicator";
import { AIAssistantFloatingButton } from "./components/ai/AIAssistantFloatingButton";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";
import { CentreProvider } from "@/contexts/CentreContext";
import { AdminModeProvider } from "@/contexts/AdminModeContext";
import { MainApp } from "@/components/MainApp";

// Lazy loaded pages
const Index = lazy(() => import("./pages/Index"));
const Enquete = lazy(() => import("./pages/Enquete"));
const LearnerPortal = lazy(() => import("./pages/LearnerPortal"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const SignaturePage = lazy(() => import("./pages/SignaturePage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const PolitiqueConfidentialite = lazy(() => import("./pages/PolitiqueConfidentialite"));
const FlyerPage = lazy(() => import("./pages/FlyerPage"));
const FlyerVTCPage = lazy(() => import("./pages/FlyerVTCPage"));
const FlyerTaxiPage = lazy(() => import("./pages/FlyerTaxiPage"));
const FlyerVMDTRPage = lazy(() => import("./pages/FlyerVMDTRPage"));
const FlyersPDFPage = lazy(() => import("./pages/FlyersPDFPage"));
const FormateurPortal = lazy(() => import("./pages/FormateurPortal"));
const ReserverConduite = lazy(() => import("./pages/ReserverConduite"));
const Install = lazy(() => import("./pages/Install").then(m => ({ default: m.InstallPage })));
const NotFound = lazy(() => import("./pages/NotFound"));

const LazyFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);
const queryClient = new QueryClient();

function SectionRedirect({ section }: { section: string }) {
  const location = useLocation();
  return <Navigate to={`/?section=${section}${location.search}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppErrorBoundary>
          <BrowserRouter>
            <Suspense fallback={<LazyFallback />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/enquete/:token" element={<Enquete />} />
                <Route path="/signature/:id" element={<SignaturePage />} />
                <Route path="/apprenants/portail" element={<LearnerPortal />} />
                <Route path="/certificat" element={<VerifyCertificate />} />
                <Route path="/install" element={<Install />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/mentions-legales" element={<MentionsLegales />} />
                <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
                <Route path="/flyer" element={<FlyerPage />} />
                <Route path="/flyer-vtc" element={<FlyerVTCPage />} />
                <Route path="/flyer-taxi" element={<FlyerTaxiPage />} />
                <Route path="/flyer-vmdtr" element={<FlyerVMDTRPage />} />
                <Route path="/flyers-pdf" element={<FlyersPDFPage />} />
                <Route path="/reserver/:token" element={<ReserverConduite />} />
                <Route path="/formateur" element={
                  <ProtectedRoute>
                    <FormateurPortal />
                  </ProtectedRoute>
                } />
                {/* Legacy deep-links */}
                <Route
                  path="/apprenants"
                  element={
                    <ProtectedRoute>
                      <SectionRedirect section="contacts" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sessions"
                  element={
                    <ProtectedRoute>
                      <SectionRedirect section="sessions" />
                    </ProtectedRoute>
                  }
                />

                {/* Main App with Mode Routing */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <CentreProvider>
                        <AdminModeProvider>
                          <MainApp />
                        </AdminModeProvider>
                      </CentreProvider>
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <InstallPWA />
            <OfflineIndicator />
            <AIAssistantFloatingButton />
          </BrowserRouter>
        </AppErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
