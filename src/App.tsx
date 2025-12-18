import { Routes, Route, Navigate } from "react-router-dom";
import { ReceptionistPanel } from "./panels/ReceptionistPanel";
import { LoginView } from "./pages/LoginView";
import { ClientDashboard } from "./pages/Client/ClientDashboard";
import { Unauthorized } from "./pages/Unauthorized";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AutoRedirect } from "./components/AutoRedirect";
import { SuperAdminPanel } from "./panels/SuperAdminPanel";
import { AdminPanel } from "./panels/AdminPanel";
import { ProfessionalPanel } from "./panels/ProfessionalPanel";
import { ClientPanel } from "./panels/ClientPanel";
import { SubscriptionCheckout } from "./pages/SubscriptionCheckout";
import { LandingPage } from "./pages/LandingPage";
import { SignUpView } from "./pages/SignUpView";

function App() {
  return (
    <Routes>
      {/* Landing Page - Página pública de vendas */}
      <Route path="/" element={<LandingPage />} />

      {/* Rotas públicas */}
      <Route path="/signup" element={<SignUpView />} />
      <Route path="/login" element={<LoginView />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/subscription/checkout" element={<SubscriptionCheckout />} />

      {/* Rota de redirecionamento automático (mantida para compatibilidade) */}
      <Route path="/dashboard" element={<AutoRedirect />} />

      {/* Rotas de painéis isolados por perfil */}
      <Route
        path="/sa/dashboard"
        element={
          <ProtectedRoute>
            <SuperAdminPanel />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reception/dashboard"
        element={
          <ProtectedRoute>
            <ReceptionistPanel />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/schedule"
        element={
          <ProtectedRoute>
            <ProfessionalPanel />
          </ProtectedRoute>
        }
      />

      <Route
        path="/client/dashboard"
        element={
          <ProtectedRoute requiredRole="client">
            <ClientPanel />
          </ProtectedRoute>
        }
      />

      {/* Rotas legadas (mantidas para compatibilidade temporária) */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ReceptionistPanel />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
