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
import { AceptarInvitacionPage } from "@/pages/AceptarInvitacionPage";

// ¿Qué? Páginas-ruta legales nuevas: cada documento legal y el contacto
//       tienen su propia URL, mostrada como modal sobre el Landing —
//       mismo patrón que ya usan LoginPage y RegisterPage.
import { TerminosModalPage } from "@/pages/TerminosModalPage";
import { PrivacidadModalPage } from "@/pages/PrivacidadModalPage";
import { CookiesModalPage } from "@/pages/CookiesModalPage";
import { ContactoModalPage } from "@/pages/ContactoModalPage";
// Dashboards Especializados por Rol
import { ResidenteDashboard } from "@/pages/dashboards/ResidenteDashboard";
import { RecicladorDashboard } from "@/pages/dashboards/RecicladorDashboard";
import { AdminDashboard } from "@/pages/dashboards/AdminDashboard";
import { AdminConjuntoDashboard } from "@/pages/dashboards/AdminConjuntoDashboard";
import { ChangePasswordPage } from "@/pages/ChangePasswordPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { DirectorioPage } from "@/pages/DirectorioPage";

interface CustomUser {
  role_id?: number;
  id_rol?: number;
  [key: string]: unknown;
}

function DashboardRedirect() {
  const { user } = useAuth();

  const typedUser = user as CustomUser | null;
  const userRole = typedUser?.role_id || typedUser?.id_rol;

  if (userRole === 1) return <Navigate to="/dashboard/admin" replace />;
  if (userRole === 3) return <Navigate to="/dashboard/reciclador" replace />;
  if (userRole === 4) return <Navigate to="/dashboard/admin-conjunto" replace />;
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
          <Route path="/aceptar-invitacion" element={<AceptarInvitacionPage />} />

          {/* 🔓 Rutas legales — cada una abre su modal sobre el Landing */}
          <Route path="/terminos-de-uso" element={<TerminosModalPage />} />
          <Route path="/privacidad" element={<PrivacidadModalPage />} />
          <Route path="/politica-cookies" element={<CookiesModalPage />} />
          <Route path="/contacto" element={<ContactoModalPage />} />

          {/* 🔒 Rutas Protegidas y Segregadas por Rol de Usuario */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

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

          <Route
            path="/dashboard/admin-conjunto"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[4]}>
                  <AppShell>
                    <AdminConjuntoDashboard />
                  </AppShell>
                </RoleGuard>
              </ProtectedRoute>
            }
          />

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

          {/* Directorio — Residente (tabs: recicladores + puntos de acopio) */}
          <Route
            path="/directorio"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[2]}>
                  <AppShell>
                    <DirectorioPage />
                  </AppShell>
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Puntos de acopio — Reciclador (solo puntos de acopio) */}
          <Route
            path="/puntos-acopio"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[3]}>
                  <AppShell>
                    <DirectorioPage soloAcopio />
                  </AppShell>
                </RoleGuard>
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