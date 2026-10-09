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
  /** Color del texto/ícono de acento en el sidebar — un solo valor, porque el
   *  sidebar ahora es siempre verde de marca (no cambia entre modo claro/oscuro). */
  sidebarAccentText: string;
  /** Fondo + texto del ítem de menú activo en el sidebar. */
  sidebarActiveNav: string;
  /** Texto del badge de rol en ProfilePage (fondo claro en modo claro, oscuro en modo oscuro). */
  badgeText: string;
  /** Fondo del badge de rol en ProfilePage. */
  badgeBg: string;
}

export const ROLE_THEME: Record<RoleId, RoleTheme> = {
  [RoleId.ADMIN_SISTEMA]: {
    label: "Administrador",
    Icon: ShieldUser,
    dashboardHref: "/dashboard/admin",
    // ¿Qué? Tintes suaves y apagados, uno por rol: pizarra (Administrador),
    //       lima (Residente), naranja (Reciclador) y cielo (Admin. de Conjunto).
    // ¿Para qué? Antes los 4 roles eran verdes/amarillos vecinos (emerald,
    //           lime, teal, amber) y en pantalla casi no se distinguían.
    // ¿Impacto? Se distinguen a simple vista solo en el chip y el ítem activo
    //           del sidebar y en el badge del perfil, sin recolorear los
    //           dashboards ni salirse de la paleta de marca.
    sidebarAccentText: "text-slate-300",
    sidebarActiveNav: "bg-slate-400/20 text-slate-100 font-semibold",
    badgeText: "text-slate-700 dark:text-slate-400",
    badgeBg: "bg-slate-50 dark:bg-slate-900/30",
  },
  [RoleId.RESIDENTE]: {
    label: "Residente",
    Icon: UserRound,
    dashboardHref: "/dashboard/residente",
    sidebarAccentText: "text-lime-400",
    sidebarActiveNav: "bg-lime-400/20 text-lime-100 font-semibold",
    badgeText: "text-lime-700 dark:text-lime-400",
    badgeBg: "bg-lime-50 dark:bg-lime-900/30",
  },
  [RoleId.RECICLADOR]: {
    label: "Reciclador",
    Icon: HardHat,
    dashboardHref: "/dashboard/reciclador",
    sidebarAccentText: "text-orange-300",
    sidebarActiveNav: "bg-orange-400/20 text-orange-100 font-semibold",
    badgeText: "text-orange-700 dark:text-orange-400",
    badgeBg: "bg-orange-50 dark:bg-orange-900/30",
  },
  [RoleId.ADMIN_CONJUNTO]: {
    label: "Admin. de Conjunto",
    Icon: UserCog,
    dashboardHref: "/dashboard/admin-conjunto",
    sidebarAccentText: "text-sky-300",
    sidebarActiveNav: "bg-sky-400/20 text-sky-100 font-semibold",
    badgeText: "text-sky-700 dark:text-sky-400",
    badgeBg: "bg-sky-50 dark:bg-sky-900/30",
  },
};
