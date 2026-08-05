import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
// Asumimos que tu hook de autenticación se exporta desde authContext.tsx o un archivo useAuth.ts
// Ajusta esta importación según la estructura real de tus hooks
import { useAuth } from "@/hooks/useAuth";
import { RoleId } from "@/types/auth";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: RoleId[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Si el rol del usuario no está en la lista de permitidos, lo mandamos para su propia zona.
  if (!allowedRoles.includes(user.role_id)) {
    if (user.role_id === RoleId.ADMIN_SISTEMA) return <Navigate to="/dashboard/admin" replace />;
    if (user.role_id === RoleId.RESIDENTE) return <Navigate to="/dashboard/residente" replace />;
    if (user.role_id === RoleId.RECICLADOR) return <Navigate to="/dashboard/reciclador" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}