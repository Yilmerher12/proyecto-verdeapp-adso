/**
 * Archivo: lib/contenidoRecomendado.ts
 * Descripción: Dice a qué página de "Aprender" lleva una notificación de contenido
 *              recomendado (RQF-013).
 * ¿Para qué? Issue #516 — esa notificación se puede tocar desde dos lugares: la lista
 *           del panel del Residente y el menú de la campanita. Antes la lógica vivía
 *           solo en ResidenteDashboard.tsx; así las dos usan la misma.
 * ¿Impacto? Devuelve la ruta (o null si la notificación no es de contenido, o no trae
 *           referencia) y deja que quien la llame navegue y decida qué hacer si falla.
 */
import { obtenerAuditoria } from "@/lib/auditoriaConjuntoApi";
import { obtenerContenido } from "@/lib/contenidoEducativoApi";
import type { NotificacionItem } from "@/lib/notificaciones";

export const TIPOS_CONTENIDO_RECOMENDADO = ["CONTENIDO_RECOMENDADO", "CONTENIDO_RECOMENDADO_MANUAL"];

export async function rutaDeContenidoRecomendado(notif: NotificacionItem): Promise<string | null> {
  if (!notif.id_referencia) return null;
  // ¿Qué? tema_educativo se guarda igual que modulo_categoria a propósito (ver
  //       models/auditoria_conjunto.py) — se pide la auditoría por su id_referencia
  //       solo para leer ese texto.
  if (notif.tipo === "CONTENIDO_RECOMENDADO") {
    const auditoria = await obtenerAuditoria(notif.id_referencia);
    return `/catalogo-educativo/${encodeURIComponent(auditoria.tema_educativo)}`;
  }
  // ¿Qué? CONTENIDO_RECOMENDADO_MANUAL (Flujo C): el Admin del Sistema envió el módulo
  //       a mano, sin auditoría de por medio — id_referencia apunta directo al módulo.
  if (notif.tipo === "CONTENIDO_RECOMENDADO_MANUAL") {
    const contenido = await obtenerContenido(notif.id_referencia);
    return `/catalogo-educativo/${encodeURIComponent(contenido.modulo_categoria)}`;
  }
  return null;
}
