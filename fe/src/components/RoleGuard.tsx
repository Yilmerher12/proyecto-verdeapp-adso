/**
 * Archivo: components/RoleGuard.tsx
 * Descripción: Deja pasar a una ruta solo a los roles indicados.
 * ¿Para qué? Va dentro de ProtectedRoute (que ya exige sesión) en cada ruta
 *           de App.tsx que es exclusiva de uno o varios roles.
 * ¿Impacto? El backend igual rechaza la petición con 403 (require_role); esto
 *           evita que la persona vea una pantalla que no le corresponde.
 */

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { RoleId } from "@/types/auth";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: RoleId[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // ¿Qué? Un rol sin permiso vuelve a SU panel vía /dashboard (DashboardRedirect
  //       en App.tsx decide el destino según el rol).
  // ¿Impacto? Antes había un if por rol y faltaba el de Admin. de Conjunto:
  //           con sesión activa, lo mandaba a /login.
  if (!allowedRoles.includes(user.role_id)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
