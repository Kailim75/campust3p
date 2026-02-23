import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Enquete from "./pages/Enquete";
import LearnerPortal from "./pages/LearnerPortal";
import VerifyCertificate from "./pages/VerifyCertificate";
import SignaturePage from "./pages/SignaturePage";
import LandingPage from "./pages/LandingPage";
import Onboarding from "./pages/Onboarding";
import MentionsLegales from "./pages/MentionsLegales";
import PolitiqueConfidentialite from "./pages/PolitiqueConfidentialite";
import FlyerPage from "./pages/FlyerPage";
import FlyerVTCPage from "./pages/FlyerVTCPage";
import FlyerTaxiPage from "./pages/FlyerTaxiPage";
import FlyerVMDTRPage from "./pages/FlyerVMDTRPage";
import FlyersPDFPage from "./pages/FlyersPDFPage";
import FormateurPortal from "./pages/FormateurPortal";
import ReserverConduite from "./pages/ReserverConduite";
import { InstallPage as Install } from "./pages/Install";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { InstallPWA } from "./components/pwa/InstallPWA";
import { OfflineIndicator } from "./components/pwa/OfflineIndicator";
import { AIAssistantFloatingButton } from "./components/ai/AIAssistantFloatingButton";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";
import { CentreProvider } from "@/contexts/CentreContext";
import { AdminModeProvider } from "@/contexts/AdminModeContext";
import { MainApp } from "@/components/MainApp";

const queryClient = new QueryClient();

function SectionRedirect({ section }: { section: string }) {
  const location = useLocation();
  return <Navigate to={`/?section=${section}${location.search}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/enquete/:token" element={<Enquete />} />
              <Route path="/signature/:id" element={<SignaturePage />} />
              <Route path="/apprenant" element={<LearnerPortal />} />
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
