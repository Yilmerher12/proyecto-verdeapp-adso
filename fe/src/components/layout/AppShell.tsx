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

  // Mapeó de roles numéricos reales del token JWT de VerdeApp
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

  // 🛠️ LÓGICA INTELIGENTE DE NOMBRES (FRONTEND ONLY):
  // 1. Prioridad: Usar el nombre real del token (first_name + last_name)
  // 2. Fallback: Si no hay nombre (o es "Usuario"), extraer alias del correo.
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
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 flex-col sm:flex-row">
      {/* SIDEBAR OSCURO ESTILO FIGMA */}
      <aside
        className={`
          flex shrink-0 bg-green-950 dark:bg-gray-950 border-r border-green-900/30
          transition-[width] duration-200 ease-in-out text-gray-200
          overflow-x-hidden w-full sm:flex-col
          ${collapsed ? "sm:w-16 h-16 sm:h-screen" : "sm:w-64 h-auto sm:h-screen"}
        `}
      >
        {/* Identidad de Marca */}
        <div className={`flex shrink-0 items-center border-b border-green-900/40 h-16 ${collapsed ? "justify-center" : "gap-3 px-4"}`}>
          <Leaf className="h-6 w-6 text-green-400 shrink-0" />
          {!collapsed && (
            <span className="text-base font-bold text-white tracking-wide">Verde App</span>
          )}
        </div>

        {/* 🛠️ PERFIL SIN EMOJI Y RESALTADO ELEGANTE */}
        {!collapsed && user && (
          <div className="px-4 py-4 border-b border-green-900/40 bg-green-900/10 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-800 flex items-center justify-center text-white font-bold shrink-0 border border-green-600/40 select-none">
              {displayName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white uppercase tracking-wide">
                {displayName}
              </p>
              {/* 🛠️ Resaltado de Rol: Sin emoji, fondo sutil y texto verde claro */}
              <span className="inline-block truncate text-[10px] font-bold text-green-300 bg-green-800/40 px-2.5 py-0.5 rounded-full capitalize border border-green-700/50 mt-1 shadow-inner">
                {userRoleLabel}
              </span>
            </div>
          </div>
        )}

        {/* Navegación (visible solo en desktop o si no está colapsado) */}
        <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? 'hidden sm:block' : 'block'}`} aria-label="Navegación VerdeApp">
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
                    className={`
                      flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5
                      text-sm font-medium text-gray-500 hover:bg-green-900/5
                      ${collapsed ? "justify-center" : ""}
                    `}
                  >
                    <Icon className="h-5 w-5 shrink-0 opacity-40" />
                    {!collapsed && (
                      <span className="flex flex-1 items-center justify-between">
                        <span className="truncate">{label}</span>
                        <span className="ml-2 shrink-0 rounded bg-green-900/40 px-1.5 py-0.5 text-[9px] font-normal text-green-200 uppercase tracking-wider">
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

        {/* Acciones de Footer (visible solo en desktop o si no está colapsado) */}
        <div className={`border-t border-green-900/40 px-3 py-3 ${collapsed ? 'hidden sm:block' : 'block'}`}>
          <button
            type="button"
            onClick={handleLogout}
            className={`
              flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
              text-gray-400 transition-colors hover:bg-red-950/30 hover:text-red-400
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>

        {/* Alternador de ancho (solo visible en desktop) */}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="hidden sm:flex h-10 w-full shrink-0 items-center justify-center border-t border-green-900/40
            text-green-700 transition-colors hover:bg-green-900/20 hover:text-green-400"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* ÁREA DE CONTENIDO */}
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