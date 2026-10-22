/**
 * Antes cada pantalla que necesitaba mostrar algo distinto por rol (el sidebar
 * en AppShell.tsx, el badge de ProfilePage.tsx) tenía su PROPIA lista de
 * colores e íconos por rol, copiada por separado — y las dos listas no
 * coincidían entre sí (colores distintos, hasta el mismo ícono repetido para
 * dos roles diferentes en una de ellas). Este archivo es el único lugar de
 * donde debe salir esa información de ahora en adelante: si el día de mañana
 * quieren cambiar el color de un rol, se cambia aquí una sola vez y se refleja
 * en todas las pantallas que lo usen.
 *
 * ¿Qué? Íconos de rol = personas (UserRound, HardHat, UserCog, ShieldUser).
 * ¿Para qué? Antes el rol Admin. de Conjunto usaba Building2, el mismo ícono
 *           que "conjunto residencial", y cada dashboard tenía además una marca
 *           de agua distinta (llave, maletín). Ahora Icon es el único ícono del
 *           rol: sidebar, perfil, registro, pestañas del panel admin, encabezado
 *           y marca de agua de cada dashboard.
 * ¿Impacto? Cambiar el ícono de un rol aquí lo cambia en todas esas pantallas.
 */

import type { LucideIcon } from "lucide-react";
import { ShieldUser, UserRound, HardHat, UserCog } from "lucide-react";
import { RoleId } from "@/types/auth";

export interface RoleTheme {
  label: string;
  Icon: LucideIcon;
  dashboardHref: string;
  /** Color del texto/ícono de acento en el sidebar (verde de marca; en oscuro, menta). */
  sidebarAccentText: string;
  /** Fondo + texto del ítem de menú activo en el sidebar. */
  sidebarActiveNav: string;
  /** Texto del badge de rol en ProfilePage (fondo claro en modo claro, oscuro en modo oscuro). */
  badgeText: string;
  /** Fondo del badge de rol en ProfilePage. */
  badgeBg: string;
}

// ¿Qué? Los 4 roles comparten UN solo acento (verde de marca en claro, menta
//       en oscuro). El rol se distingue por su ícono y su nombre, no por color.
// ¿Para qué? Antes cada rol tenía un tinte propio (pizarra, lima, naranja, cielo)
//           que no tenía nada que ver con la paleta verde y "no combinaba":
//           con el tema oscuro rediseñado (issue #503) el menta es el único
//           acento de toda la app.
// ¿Impacto? Si algún día se quiere un color por rol, se cambia aquí una sola vez:
//           los 4 apuntan a las mismas constantes.
const ACENTO_SIDEBAR = "text-accent-200 dark:text-accent-300";
const NAV_ACTIVO = "bg-white/15 text-white font-semibold dark:bg-accent-300/15 dark:text-accent-300";
const BADGE_TEXTO = "text-accent-800 dark:text-accent-300";
const BADGE_FONDO = "bg-accent-50 dark:bg-accent-300/10";

export const ROLE_THEME: Record<RoleId, RoleTheme> = {
  [RoleId.ADMIN_SISTEMA]: {
    label: "Administrador",
    Icon: ShieldUser,
    dashboardHref: "/dashboard/admin",
    sidebarAccentText: ACENTO_SIDEBAR,
    sidebarActiveNav: NAV_ACTIVO,
    badgeText: BADGE_TEXTO,
    badgeBg: BADGE_FONDO,
  },
  [RoleId.RESIDENTE]: {
    label: "Residente",
    Icon: UserRound,
    dashboardHref: "/dashboard/residente",
    sidebarAccentText: ACENTO_SIDEBAR,
    sidebarActiveNav: NAV_ACTIVO,
    badgeText: BADGE_TEXTO,
    badgeBg: BADGE_FONDO,
  },
  [RoleId.RECICLADOR]: {
    label: "Reciclador",
    Icon: HardHat,
    dashboardHref: "/dashboard/reciclador",
    sidebarAccentText: ACENTO_SIDEBAR,
    sidebarActiveNav: NAV_ACTIVO,
    badgeText: BADGE_TEXTO,
    badgeBg: BADGE_FONDO,
  },
  [RoleId.ADMIN_CONJUNTO]: {
    label: "Admin. de Conjunto",
    Icon: UserCog,
    dashboardHref: "/dashboard/admin-conjunto",
    sidebarAccentText: ACENTO_SIDEBAR,
    sidebarActiveNav: NAV_ACTIVO,
    badgeText: BADGE_TEXTO,
    badgeBg: BADGE_FONDO,
  },
};
