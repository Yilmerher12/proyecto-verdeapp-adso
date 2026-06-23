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
  Leaf,
  Building2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

interface AppShellProps {
  children: ReactNode;
}

const ROLE_META: Record<number, { label: string; emoji: string; dashboardHref: string }> = {
  1: { label: "Administrador", emoji: "🛠️", dashboardHref: "/dashboard/admin" },
  2: { label: "Residente", emoji: "🏠", dashboardHref: "/dashboard/residente" },
  3: { label: "Reciclador", emoji: "♻️", dashboardHref: "/dashboard/reciclador" },
  4: { label: "Admin. de Conjunto", emoji: "🏢", dashboardHref: "/dashboard/admin-conjunto" },
};

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const userData = user as any;
  const roleId = (userData?.role_id || userData?.id_rol || 2) as number;
  const roleMeta = ROLE_META[roleId] ?? ROLE_META[2];

  const rawEmail = userData?.correo_electronico || userData?.email || userData?.sub || "usuario@verdeapp.com";
  const fallbackName = rawEmail.split("@")[0].toUpperCase();
  const displayName = userData?.first_name && userData.first_name !== "Usuario"
    ? `${userData.first_name} ${userData.last_name || ""}`.toUpperCase()
    : fallbackName;

  const getNavItemsByRole = () => {
    const commonStart = [
      { icon: LayoutDashboard, label: "Panel Principal", href: roleMeta.dashboardHref, enabled: true },
    ];

    const commonEnd = [
      { icon: ShieldCheck, label: "Seguridad", href: "/change-password", enabled: true },
    ];

    if (roleId === 1) {
      return [
        ...commonStart,
        { icon: Newspaper, label: "Crear Novedades", href: null, enabled: false },
        { icon: BookOpen, label: "Contenido Educativo", href: null, enabled: false },
        ...commonEnd,
      ];
    }

    if (roleId === 3) {
      return [
        ...commonStart,
        { icon: User, label: "Mi Perfil", href: "/profile", enabled: true },
        { icon: Newspaper, label: "Novedades Gobierno", href: null, enabled: false },
        { icon: MapPin, label: "Puntos de Acopio", href: null, enabled: false },
        ...commonEnd,
      ];
    }

    if (roleId === 4) {
      return [
        ...commonStart,
        { icon: User, label: "Mi Perfil", href: "/profile", enabled: true },
        { icon: Building2, label: "Mis Conjuntos", href: "/dashboard/admin-conjunto", enabled: true },
        { icon: Newspaper, label: "Novedades de mis Conjuntos", href: null, enabled: false },
        ...commonEnd,
      ];
    }

    return [
      ...commonStart,
      { icon: User, label: "Mi Perfil", href: "/profile", enabled: true },
      { icon: Newspaper, label: "Novedades Conjunto", href: null, enabled: false },
      { icon: BookOpen, label: "Aprender (Guías)", href: null, enabled: false },
      { icon: MapPin, label: "Directorio Zona", href: null, enabled: false },
      ...commonEnd,
    ];
  };

  const navItems = getNavItemsByRole();

  return (
    // ¿Qué? w-full en el contenedor raíz + min-w-0 en cada nivel flex hijo.
    // ¿Para qué? La barra de scroll horizontal del sidebar venía de que algún
    //           hijo flex (el <nav>, un <li>, o el badge "Pronto") no se
    //           encogía por debajo de su ancho de contenido natural — el
    //           comportamiento DEFAULT de flexbox es min-width:auto, que
    //           respeta el ancho del contenido aunque el padre sea más angosto.
    //           overflow-x-hidden en el padre NO arregla esto: solo oculta
    //           visualmente el desborde sin quitar la causa, y en navegadores/
    //           casos distintos puede igual disparar la barra. La solución
    //           correcta es forzar min-w-0 en cada contenedor flex de la cadena.
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-950 flex-col sm:flex-row">
      <aside
        className={`
          flex min-w-0 shrink-0 flex-col bg-green-800 dark:bg-gray-950 border-r border-green-900/20
          transition-[width] duration-200 ease-in-out text-gray-100
          overflow-hidden
          ${collapsed ? "sm:w-16 h-16 sm:h-screen" : "sm:w-64 h-auto sm:h-screen"}
        `}
      >
        {/* Identidad de marca */}
        <div className={`flex min-w-0 shrink-0 items-center border-b border-white/10 h-16 ${collapsed ? "justify-center" : "gap-3 px-5"}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <Leaf className="h-5 w-5 text-green-200" />
          </div>
          {!collapsed && (
            <span className="min-w-0 truncate text-base font-bold text-white tracking-tight">Verde App</span>
          )}
        </div>

        {/* Tarjeta de perfil */}
        {!collapsed && user && (
          <div className="min-w-0 px-5 py-5 border-b border-white/10">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white font-bold text-sm select-none">
                {displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-bold text-white">
                  {displayName}
                </p>
                <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-green-100/90 mt-0.5">
                  <span className="shrink-0" aria-hidden="true">{roleMeta.emoji}</span>
                  <span className="truncate">{roleMeta.label}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navegación */}
        <nav className={`min-w-0 flex-1 overflow-y-auto overflow-x-hidden py-3 ${collapsed ? "hidden sm:block" : "block"}`} aria-label="Navegación VerdeApp">
          <ul className="min-w-0 space-y-0.5 px-3">
            {navItems.map(({ icon: Icon, label, href, enabled }, idx) => {
              if (enabled && href) {
                return (
                  <li key={idx} className="min-w-0">
                    <NavLink
                      to={href}
                      className={({ isActive }) =>
                        `flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
                        ${collapsed ? "justify-center" : ""}
                        ${
                          isActive
                            ? "bg-white/15 text-white font-semibold"
                            : "text-green-50/80 hover:bg-white/10 hover:text-white"
                        }`
                      }
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      {!collapsed && <span className="min-w-0 truncate">{label}</span>}
                    </NavLink>
                  </li>
                );
              }

              return (
                <li key={idx} className="min-w-0">
                  <div
                    className={`
                      flex min-w-0 cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5
                      text-sm font-medium text-green-100/40
                      ${collapsed ? "justify-center" : ""}
                    `}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    {!collapsed && (
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="min-w-0 truncate">{label}</span>
                        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-green-100/70">
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

        {/* Footer — cerrar sesión */}
        <div className={`min-w-0 border-t border-white/10 px-3 py-3 ${collapsed ? "hidden sm:block" : "block"}`}>
          <button
            type="button"
            onClick={handleLogout}
            className={`
              flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
              text-green-50/70 transition-colors hover:bg-red-900/30 hover:text-red-200
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span className="truncate">Cerrar sesión</span>}
          </button>
        </div>

        {/* Alternador de ancho (solo desktop) */}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="hidden sm:flex h-9 w-full shrink-0 items-center justify-center border-t border-white/10
            text-green-100/50 transition-colors hover:bg-white/5 hover:text-white"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Área de contenido */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-end gap-3 border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
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