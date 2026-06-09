import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
// Asumimos que tu hook de autenticación se exporta desde authContext.tsx o un archivo useAuth.ts
// Ajusta esta importación según la estructura real de tus hooks
import { useAuth } from "@/hooks/useAuth"; 

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: number[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Si el rol numérico del usuario no está en la lista de permitidos, lo redirigimos a su zona segura.
  if (!allowedRoles.includes(user.role_id)) {
    if (user.role_id === 1) return <Navigate to="/dashboard/admin" replace />;
    if (user.role_id === 2) return <Navigate to="/dashboard/residente" replace />;
    if (user.role_id === 3) return <Navigate to="/dashboard/reciclador" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}