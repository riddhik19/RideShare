import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthForm } from "./components/auth/AuthForm";
import { ForgotPassword } from "./components/auth/ForgotPassword";
import { ResetPassword } from "./components/auth/ResetPassword";
import { AppSelection } from "./pages/AppSelection";
import { DriverApp } from "./pages/DriverApp";
import { PassengerApp } from "./pages/PassengerApp";
import RidesManagement from "./pages/RidesManagement";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useState } from "react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={
                <PublicRoute>
                  <AuthForm />
                </PublicRoute>
              } />
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<Index />} />
              <Route path="/app-selection" element={
                <ProtectedRoute>
                  <AppSelection />
                </ProtectedRoute>
              } />
              <Route path="/driver" element={
                <ProtectedRoute>
                  <DriverApp />
                </ProtectedRoute>
              } />
              <Route path="/rides-management" element={
                <ProtectedRoute>
                  <RidesManagement />
                </ProtectedRoute>
              } />
              <Route path="/passenger" element={
                <ProtectedRoute>
                  <PassengerApp />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
