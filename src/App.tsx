import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Enquete from "./pages/Enquete";
import { InstallPage as Install } from "./pages/Install";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { InstallPWA } from "./components/pwa/InstallPWA";
import { AIAssistantFloatingButton } from "./components/ai/AIAssistantFloatingButton";

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
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/enquete/:token" element={<Enquete />} />
          <Route path="/install" element={<Install />} />

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
                <Index />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <InstallPWA />
        <AIAssistantFloatingButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
