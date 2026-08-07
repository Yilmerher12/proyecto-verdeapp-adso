/**
 * Antes cada pantalla que necesitaba mostrar algo distinto por rol (el sidebar
 * en AppShell.tsx, el badge de ProfilePage.tsx) tenía su PROPIA lista de
 * colores e íconos por rol, copiada por separado — y las dos listas no
 * coincidían entre sí (colores distintos, hasta el mismo ícono repetido para
 * dos roles diferentes en una de ellas). Este archivo es el único lugar de
 * donde debe salir esa información de ahora en adelante: si el día de mañana
 * quieren cambiar el color de un rol, se cambia aquí una sola vez y se refleja
 * en todas las pantallas que lo usen.
 */

import type { LucideIcon } from "lucide-react";
import { Shield, Home, Recycle, Building2, KeyRound, Briefcase } from "lucide-react";
import { RoleId } from "@/types/auth";

export interface RoleTheme {
  label: string;
  Icon: LucideIcon;
  dashboardHref: string;
  /** Ícono grande y tenue de fondo para el banner de bienvenida de cada dashboard. */
  WatermarkIcon: LucideIcon;
  /** Color del texto/ícono de acento en el sidebar — trae su propio par claro/oscuro
   *  porque el fondo del sidebar ahora cambia con el tema (blanco en modo claro,
   *  verde oscuro en modo oscuro). */
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
    Icon: Shield,
    dashboardHref: "/dashboard/admin",
    WatermarkIcon: Shield,
    sidebarAccentText: "text-slate-600 dark:text-slate-300",
    sidebarActiveNav: "bg-slate-100 text-slate-800 dark:bg-slate-400/20 dark:text-slate-100 font-semibold",
    badgeText: "text-slate-600 dark:text-slate-300",
    badgeBg: "bg-slate-100 dark:bg-slate-800/60",
  },
  [RoleId.RESIDENTE]: {
    label: "Residente",
    Icon: Home,
    dashboardHref: "/dashboard/residente",
    WatermarkIcon: KeyRound,
    sidebarAccentText: "text-lime-700 dark:text-lime-400",
    sidebarActiveNav: "bg-lime-100 text-lime-800 dark:bg-lime-400/20 dark:text-lime-100 font-semibold",
    badgeText: "text-lime-700 dark:text-lime-400",
    badgeBg: "bg-lime-50 dark:bg-lime-900/30",
  },
  [RoleId.RECICLADOR]: {
    label: "Reciclador",
    Icon: Recycle,
    dashboardHref: "/dashboard/reciclador",
    WatermarkIcon: Recycle,
    sidebarAccentText: "text-teal-700 dark:text-teal-300",
    sidebarActiveNav: "bg-teal-100 text-teal-800 dark:bg-teal-400/20 dark:text-teal-100 font-semibold",
    badgeText: "text-teal-700 dark:text-teal-400",
    badgeBg: "bg-teal-50 dark:bg-teal-900/30",
  },
  [RoleId.ADMIN_CONJUNTO]: {
    label: "Admin. de Conjunto",
    Icon: Building2,
    dashboardHref: "/dashboard/admin-conjunto",
    WatermarkIcon: Briefcase,
    sidebarAccentText: "text-amber-700 dark:text-amber-300",
    sidebarActiveNav: "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-100 font-semibold",
    badgeText: "text-amber-700 dark:text-amber-400",
    badgeBg: "bg-amber-50 dark:bg-amber-900/30",
  },
};
