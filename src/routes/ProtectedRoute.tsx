import { Navigate } from "react-router-dom";
import { useScheduler } from "../context/SchedulerContext";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { SubscriptionCheckout } from "../pages/SubscriptionCheckout";

type Props = {
  children: React.ReactNode;
  requiredRole?: string | string[]; // Role(s) permitido(s). Se não especificado, qualquer usuário autenticado pode acessar
};

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { currentUser, sessionLoading } = useScheduler();
  const [orgStatus, setOrgStatus] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (currentUser?.clinicId && currentUser?.role !== "super_admin") {
      checkOrganizationStatus();
    } else {
      setCheckingStatus(false);
    }
  }, [currentUser]);

  const checkOrganizationStatus = async () => {
    if (!currentUser?.clinicId) {
      setCheckingStatus(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("status")
        .eq("id", currentUser.clinicId)
        .maybeSingle();

      if (error) throw error;
      setOrgStatus(data?.status || null);
    } catch (err) {
      console.error("Erro ao verificar status da organização:", err);
    } finally {
      setCheckingStatus(false);
    }
  };

  console.log("🔒 ProtectedRoute - Verificando acesso:", {
    hasCurrentUser: !!currentUser,
    sessionLoading,
    currentUserId: currentUser?.id,
    currentUserRole: currentUser?.role,
    requiredRole,
    orgStatus,
    checkingStatus,
  });

  if (sessionLoading || checkingStatus) {
    console.log("⏳ ProtectedRoute - Aguardando carregamento da sessão...");
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-600">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-gray-400 animate-pulse" />
          Carregando...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    console.warn("🚫 ProtectedRoute - Sem currentUser, redirecionando para /login");
    return <Navigate to="/login" replace />;
  }

  // Super Admin sempre tem acesso
  if (currentUser.role === "super_admin") {
    console.log("✅ ProtectedRoute - Super Admin, acesso permitido");
    return <>{children}</>;
  }

  // Verificar status da organização (gated access)
  if (orgStatus && orgStatus !== "active") {
    console.warn(
      `🚫 ProtectedRoute - Organização com status '${orgStatus}', redirecionando para checkout`
    );
    return <SubscriptionCheckout />;
  }

  // Verificar role se especificado
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const userRole = currentUser?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      console.warn(
        `🚫 ProtectedRoute - Role '${userRole}' não permitido. Roles permitidos:`,
        allowedRoles
      );
      return <Navigate to="/unauthorized" replace />;
    }
  }

  console.log("✅ ProtectedRoute - Acesso permitido para:", currentUser.id);
  return <>{children}</>;
}
