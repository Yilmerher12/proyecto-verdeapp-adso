/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  BookOpen,
  MapPin,
  Newspaper,
  User,
  Leaf
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // 🛠️ MAPEÓ DE ROLES NUMÉRICOS REALES DEL BACKEND
  const userData = user as any;
  const roleId = userData?.role_id || userData?.id_rol || 2; 
  
  let userRoleLabel = "Residente";
  let dashboardHref = "/dashboard/residente";

  if (roleId === 1) {
    userRoleLabel = "Administrador";
    dashboardHref = "/dashboard/admin";
  } else if (roleId === 3) {
    userRoleLabel = "Reciclador";
    dashboardHref = "/dashboard/reciclador";
  }

  // Extraer un nombre limpio basado en el correo si no viene el nombre real en el token
  const rawEmail = userData?.correo_electronico || userData?.email || userData?.sub || "usuario@verdeapp.com";
  const fallbackName = rawEmail.split("@")[0].toUpperCase();
  const displayName = userData?.first_name && userData.first_name !== "Usuario" 
    ? `${userData.first_name} ${userData.last_name || ""}`.toUpperCase()
    : fallbackName;

  const getNavItemsByRole = () => {
    const commonStart = [
      {
        icon: LayoutDashboard,
        label: "Panel Principal",
        href: dashboardHref,
        enabled: true,
      }
    ];

    const commonEnd = [
      {
        icon: ShieldCheck,
        label: "Seguridad",
        href: "/change-password",
        enabled: true,
      }
    ];

    if (roleId === 1) {
      return [
        ...commonStart,
        { icon: Newspaper, label: "Crear Novedades", href: null, enabled: false },
        { icon: BookOpen, label: "Contenido Educativo", href: null, enabled: false },
        ...commonEnd
      ];
    }

    if (roleId === 3) {
      return [
        ...commonStart,
        { icon: User, label: "Mi Perfil", href: "/profile", enabled: true },
        { icon: Newspaper, label: "Novedades Gobierno", href: null, enabled: false },
        { icon: MapPin, label: "Puntos de Acopio", href: null, enabled: false },
        ...commonEnd
      ];
    }

    return [
      ...commonStart,
      { icon: User, label: "Mi Perfil", href: "/profile", enabled: true },
      { icon: Newspaper, label: "Novedades Conjunto", href: null, enabled: false },
      { icon: BookOpen, label: "Aprender (Guías)", href: null, enabled: false },
      { icon: MapPin, label: "Directorio Zona", href: null, enabled: false },
      ...commonEnd
    ];
  };

  const navItems = getNavItemsByRole();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* SIDEBAR: Se agrega overflow-x-hidden para matar la barra gris */}
      <aside
        className={`
          flex shrink-0 flex-col bg-green-950 dark:bg-gray-950 border-r border-green-900/30
          transition-[width] duration-200 ease-in-out text-gray-200 overflow-x-hidden
          ${collapsed ? "w-16" : "w-64"}
        `}
      >
        <div className={`flex h-16 shrink-0 items-center border-b border-green-900/40 ${collapsed ? "justify-center" : "gap-3 px-4"}`}>
          <Leaf className="h-6 w-6 text-green-400 shrink-0" />
          {!collapsed && (
            <span className="text-base font-bold text-white tracking-wide">Verde App</span>
          )}
        </div>

        {!collapsed && user && (
          <div className="px-4 py-4 border-b border-green-900/40 bg-green-900/10 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-800 flex items-center justify-center text-white font-bold shrink-0 border border-green-600/40">
              {displayName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white tracking-wide">
                {displayName}
              </p>
              <p className="truncate text-xs text-green-400 font-medium mt-0.5">
                🏡 {userRoleLabel}
              </p>
            </div>
          </div>
        )}

        {/* Listado de rutas con overflow-x-hidden para evitar barras inferiores */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4" aria-label="Navegación VerdeApp">
          <ul className="space-y-1 px-3">
            {navItems.map(({ icon: Icon, label, href, enabled }, idx) => {
              if (enabled && href) {
                return (
                  <li key={idx}>
                    <NavLink
                      to={href}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                        ${collapsed ? "justify-center" : ""}
                        ${
                          isActive
                            ? "bg-green-600/30 text-green-300 border-l-4 border-green-500 font-semibold"
                            : "text-gray-300 hover:bg-green-900/40 hover:text-white"
                        }`
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                  </li>
                );
              }

              return (
                <li key={idx}>
                  <div
                    className={`flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 ${collapsed ? "justify-center" : ""}`}
                  >
                    <Icon className="h-5 w-5 shrink-0 opacity-40" />
                    {!collapsed && (
                      <span className="flex flex-1 items-center justify-between">
                        <span className="truncate">{label}</span>
                        <span className="ml-2 shrink-0 rounded bg-green-900/40 px-1.5 py-0.5 text-[9px] font-normal text-green-400 uppercase tracking-wider">
                          Pronto
                        </span>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-green-900/40 px-3 py-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-red-950/30 hover:text-red-400 ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex h-10 w-full shrink-0 items-center justify-center border-t border-green-900/40 text-green-700 transition-colors hover:bg-green-900/20 hover:text-green-400"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-end gap-3 border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900 shadow-sm">
          <LanguageSwitcher />
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
          <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}