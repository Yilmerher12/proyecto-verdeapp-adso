/**
 * Archivo: App.tsx
 * Descripción: Enrutador maestro y control de acceso basado en roles para VerdeApp.
 * ¿Para qué? Aislar los módulos de los Dashboards cumpliendo con la rúbrica del SENA.
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard"; 
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";

// Vistas públicas y de acceso
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { LandingPage } from "@/pages/LandingPage";

// Dashboards Especializados por Rol
import { ResidenteDashboard } from "@/pages/dashboards/ResidenteDashboard";
import { RecicladorDashboard } from "@/pages/dashboards/RecicladorDashboard";
import { AdminDashboard } from "@/pages/dashboards/AdminDashboard";
import { ChangePasswordPage } from "@/pages/ChangePasswordPage";
import { ProfilePage } from "@/pages/ProfilePage";

// Interfaz limpia para evitar usar explícitamente 'any'
interface CustomUser {
  role_id?: number;
  id_rol?: number;
  [key: string]: unknown;
}

// Componente Intermedio para solucionar el redireccionamiento roto
function DashboardRedirect() {
  const { user } = useAuth();
  
  // Moldeamos la variable con la interfaz segura en lugar de usar any
  const typedUser = user as CustomUser | null;
  const userRole = typedUser?.role_id || typedUser?.id_rol;

  if (userRole === 1) return <Navigate to="/dashboard/admin" replace />;
  if (userRole === 3) return <Navigate to="/dashboard/reciclador" replace />;
  return <Navigate to="/dashboard/residente" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 🔓 Rutas públicas base */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* 🔒 Rutas Protegidas y Segregadas por Rol de Usuario */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

          {/* 1. Dashboard del Residente (role_id: 2) */}
          <Route
            path="/dashboard/residente"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[2]}>
                  <AppShell>
                    <ResidenteDashboard />
                  </AppShell>
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* 2. Dashboard del Reciclador (role_id: 3) */}
          <Route
            path="/dashboard/reciclador"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[3]}>
                  <AppShell>
                    <RecicladorDashboard />
                  </AppShell>
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* 3. Dashboard del Administrador (role_id: 1) */}
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[1]}>
                  <AppShell>
                    <AdminDashboard />
                  </AppShell>
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Gestión común de perfil */}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ChangePasswordPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          {/* Vista común de gestión de perfil de usuario */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ProfilePage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Catch-all global */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;