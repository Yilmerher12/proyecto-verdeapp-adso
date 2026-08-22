/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  BookOpen,
  MapPin,
  Megaphone,
  Newspaper,
  User,
  Bell,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Modal } from "@/components/ui/Modal";
import { RoleId } from "@/types/auth";
import { API_BASE_URL } from "@/api/axios";
import { ROLE_THEME } from "@/config/roleTheme";
import { onNotificacionesActualizadas } from "@/lib/notificationEvents";

interface AppShellProps {
  children: ReactNode;
}

// El sidebar usa el mismo par de colores (blanco / verde oscuro) para los 4
// roles — antes cada rol tenía un color de fondo totalmente distinto y se
// sentían como 4 apps separadas. Lo único que cambia por rol viene de
// ROLE_THEME (fe/src/config/roleTheme.ts): el ícono, el color del ítem activo
// del menú, y la marca de agua del banner de bienvenida de cada dashboard.
// El verde oscuro de modo oscuro es el mismo que ya usamos en el landing page.

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const { user, logout, accessToken } = useAuth() as any;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    // ¿Qué? logout() limpia sessionStorage (síncrono), y luego una recarga
    //       completa de página lleva a "/".
    // ¿Para qué? Probé navigate("/") + logout() en varios órdenes (incluso
    //           con delays) y siempre perdían contra ProtectedRoute: aunque
    //           la URL cambiaba a "/" casi al instante, React todavía no
    //           había terminado de reemplazar el árbol de componentes (el
    //           ProtectedRoute de la ruta protegida seguía montado un
    //           instante más), así que su propio <Navigate to="/login">
    //           terminaba ganando la carrera sin importar el orden.
    // ¿Impacto? Con una recarga completa, toda la app arranca de cero — no
    //           queda ningún componente viejo montado que pueda competir.
    //           Es la forma más simple de garantizar que esto no vuelva a
    //           fallar por una condición de carrera similar en el futuro.
    logout();
    window.location.href = "/";
  };

  // Polling de notificaciones no leídas cada 20s
  useEffect(() => {
    if (!accessToken) return;
    const fetchCount = () => {
      fetch(`${API_BASE_URL}/api/v1/notificaciones/no-leidas-count`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((r) => r.json())
        .then((d) => setNoLeidas(d.count ?? 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 20000);
    // ¿Qué? Además del polling, escucha el evento que disparan los
    //       dashboards al marcar notificaciones como leídas.
    // ¿Para qué? Para que el número baje al instante en vez de esperar
    //           hasta 20s al siguiente ciclo de polling.
    const unsubscribe = onNotificacionesActualizadas(fetchCount);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [accessToken]);

  const userData = user as any;
  const roleId = (userData?.role_id || userData?.id_rol || RoleId.RESIDENTE) as RoleId;
  const roleMeta = ROLE_THEME[roleId] ?? ROLE_THEME[RoleId.RESIDENTE];

  // ¿Qué? ROLE_THEME (fe/src/config/roleTheme.ts) es un objeto de configuración
  //       plano, no un componente — no puede llamar a useTranslation() por su
  //       cuenta. Por eso la etiqueta traducida del rol se resuelve aquí, en
  //       vez de leer roleMeta.label directamente (que sigue en español fijo,
  //       usado como fallback si el rol no está mapeado).
  const ROLE_LABEL_KEY: Record<RoleId, string> = {
    [RoleId.ADMIN_SISTEMA]: "roles.adminSistema",
    [RoleId.RESIDENTE]: "roles.residente",
    [RoleId.RECICLADOR]: "roles.reciclador",
    [RoleId.ADMIN_CONJUNTO]: "roles.adminConjunto",
  };
  const roleLabel = t(ROLE_LABEL_KEY[roleId] ?? ROLE_LABEL_KEY[RoleId.RESIDENTE]);

  const rawEmail = userData?.correo_electronico || userData?.email || userData?.sub || "usuario@verdeapp.com";
  const fallbackName = rawEmail.split("@")[0].toUpperCase();
  const displayName = userData?.first_name && userData.first_name !== "Usuario"
    ? `${userData.first_name} ${userData.last_name || ""}`.toUpperCase()
    : fallbackName;

  const getNavItemsByRole = () => {
    const commonStart = [
      { icon: LayoutDashboard, label: t("appShell.nav.panelPrincipal"), href: roleMeta.dashboardHref, enabled: true },
    ];

    const commonEnd = [
      { icon: ShieldCheck, label: t("appShell.nav.seguridad"), href: "/change-password", enabled: true },
    ];

    if (roleId === RoleId.ADMIN_SISTEMA) {
      return [
        ...commonStart,
        { icon: Newspaper, label: t("appShell.nav.crearNovedades"), href: "/admin/novedades", enabled: true },
        { icon: BookOpen, label: t("appShell.nav.contenidoEducativo"), href: "/admin/contenido-educativo", enabled: true },
        ...commonEnd,
      ];
    }

    if (roleId === RoleId.RECICLADOR) {
      return [
        ...commonStart,
        { icon: User, label: t("appShell.nav.miPerfil"), href: "/profile", enabled: true },
        { icon: Megaphone, label: t("appShell.nav.comunicados"), href: "/comunicados", enabled: true },
        { icon: Newspaper, label: t("appShell.nav.novedades"), href: "/novedades", enabled: true },
        { icon: MapPin, label: t("appShell.nav.puntosAcopio"), href: "/puntos-acopio", enabled: true },
        ...commonEnd,
      ];
    }

    if (roleId === RoleId.ADMIN_CONJUNTO) {
      return [
        ...commonStart,
        { icon: User, label: t("appShell.nav.miPerfil"), href: "/profile", enabled: true },
        { icon: Megaphone, label: t("appShell.nav.gestionarComunicados"), href: "/admin-conjunto/comunicados", enabled: true },
        { icon: Newspaper, label: t("appShell.nav.novedades"), href: "/novedades", enabled: true },
        ...commonEnd,
      ];
    }

    return [
      ...commonStart,
      { icon: User, label: t("appShell.nav.miPerfil"), href: "/profile", enabled: true },
      { icon: Megaphone, label: t("appShell.nav.comunicados"), href: "/comunicados", enabled: true },
      { icon: Newspaper, label: t("appShell.nav.novedades"), href: "/novedades", enabled: true },
      { icon: BookOpen, label: t("appShell.nav.aprenderGuias"), href: "/catalogo-educativo", enabled: true },
      { icon: MapPin, label: t("appShell.nav.directorioGeneral"), href: "/directorio", enabled: true },
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
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-[#03130b] flex-col sm:flex-row">
      <aside
        className={`
          flex min-w-0 shrink-0 flex-col border-r border-white/10
          bg-[#052e16]
          transition-[width] duration-200 ease-in-out text-green-50
          overflow-hidden
          ${collapsed ? "sm:w-16 h-16 sm:h-screen" : "sm:w-64 h-auto sm:h-screen"}
        `}
      >
        {/* Identidad de marca — la barra lateral ahora es siempre verde de
            marca (en claro y oscuro), así que el logo siempre es la versión
            blanca — la de color quedaba pensada para un fondo claro que ya
            no existe aquí. */}
        <div className={`flex min-w-0 shrink-0 items-center border-b border-white/10 h-16 ${collapsed ? "justify-center px-3" : "px-5"}`}>
          <img src="/logos/logo-white.png" alt="VerdeApp" className={`${collapsed ? "h-7" : "h-8"} w-auto object-contain`} />
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
                <span className={`flex min-w-0 items-center gap-1.5 text-xs font-medium mt-0.5 ${roleMeta.sidebarAccentText}`}>
                  <roleMeta.Icon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{roleLabel}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navegación */}
        <nav className={`min-w-0 flex-1 overflow-y-auto overflow-x-hidden py-3 ${collapsed ? "hidden sm:block" : "block"}`} aria-label={t("appShell.ariaLabel")}>
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
                            ? roleMeta.sidebarActiveNav
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
                          {t("appShell.proximamente")}
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
            onClick={() => setShowLogoutConfirm(true)}
            className={`
              flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
              text-green-50/70 hover:bg-red-900/30 hover:text-red-200
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span className="truncate">{t("appShell.cerrarSesion")}</span>}
          </button>
        </div>

        {showLogoutConfirm && (
          <Modal onClose={() => setShowLogoutConfirm(false)}>
            <div className="p-6 sm:p-8 max-w-sm mx-auto text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                <LogOut className="h-6 w-6 text-red-500 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t("appShell.confirmarLogout.titulo")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t("appShell.confirmarLogout.mensaje")}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-[#2a4d34] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a4d34] transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  {t("appShell.confirmarLogout.confirmar")}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Alternador de ancho (solo desktop) */}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="hidden sm:flex h-9 w-full shrink-0 items-center justify-center border-t border-white/10
            text-green-100/50 hover:bg-white/5 hover:text-white transition-colors"
          aria-label={collapsed ? t("appShell.expandirMenu") : t("appShell.colapsarMenu")}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Área de contenido */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-end gap-3 border-b border-gray-200 bg-white px-6 dark:border-[#2a4d34] dark:bg-[#132a1c]">
          {/* Campana de notificaciones */}
          <button
            onClick={() => navigate(roleMeta.dashboardHref)}
            className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#2a4d34] dark:hover:text-gray-200"
            aria-label={t("appShell.notificaciones")}
          >
            <Bell className="h-5 w-5" />
            {noLeidas > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </button>
          <LanguageSwitcher />
          <ThemeToggle />
        </header>

        {/* ¿Qué? Fondo del área de contenido, más oscuro que el sidebar.
            ¿Para qué? Las tarjetas (bg-white dark:bg-[#132a1c]) se perdían
            contra un fondo casi del mismo tono que el sidebar — #dfeadf
            (claro) y #03130b (oscuro, notablemente más oscuro que el
            #052e16 del sidebar) marcan mejor dónde termina la barra lateral
            y dónde empieza el contenido. */}
        <main className="flex-1 overflow-y-auto bg-[#dfeadf] dark:bg-[#03130b]">
          <div className="mx-auto max-w-7xl px-6 pb-6">{children}</div>
        </main>
      </div>
    </div>
  );
}