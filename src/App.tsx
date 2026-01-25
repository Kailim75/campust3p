import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Enquete from "./pages/Enquete";
import LearnerPortal from "./pages/LearnerPortal";
import VerifyCertificate from "./pages/VerifyCertificate";
import LandingPage from "./pages/LandingPage";
import Onboarding from "./pages/Onboarding";
import SuperAdmin from "./pages/SuperAdmin";
import { InstallPage as Install } from "./pages/Install";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { InstallPWA } from "./components/pwa/InstallPWA";
import { AIAssistantFloatingButton } from "./components/ai/AIAssistantFloatingButton";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";
import { CentreProvider } from "@/contexts/CentreContext";

const queryClient = new QueryClient();

function SectionRedirect({ section }: { section: string }) {
  const location = useLocation();
  return <Navigate to={`/?section=${section}${location.search}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/enquete/:token" element={<Enquete />} />
            <Route path="/apprenant" element={<LearnerPortal />} />
            <Route path="/certificat" element={<VerifyCertificate />} />
            <Route path="/install" element={<Install />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route 
              path="/super-admin" 
              element={
                <ProtectedRoute>
                  <CentreProvider>
                    <SuperAdmin />
                  </CentreProvider>
                </ProtectedRoute>
              } 
            />

            {/* Legacy deep-links */}
            <Route
              path="/contacts"
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

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <CentreProvider>
                    <Index />
                  </CentreProvider>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <InstallPWA />
          <AIAssistantFloatingButton />
        </BrowserRouter>
      </AppErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
