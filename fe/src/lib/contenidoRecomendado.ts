/**
 * Archivo: lib/contenidoRecomendado.ts
 * Descripción: Dice a qué página de "Aprende a reciclar" lleva una notificación de contenido
 *              recomendado (RQF-013).
 * ¿Para qué? Issue #516 — esa notificación se puede tocar desde dos lugares: la lista
 *           del panel del Residente y el menú de la campanita. Antes la lógica vivía
 *           solo en ResidenteDashboard.tsx; así las dos usan la misma.
 * ¿Impacto? Devuelve la ruta (o null si la notificación no es de contenido, o no trae
 *           referencia) y deja que quien la llame navegue y decida qué hacer si falla.
 *           Issue #705: cada lección tiene su propia página. El aviso manual (el Administrador eligió un
 *           módulo) abre esa lección; el aviso automático (después de una auditoría) solo conoce la
 *           categoría, así que abre la primera lección de esa categoría que el Residente no ha visto (o la
 *           lista de la categoría si ya las vio todas), igual que el bloque "Tu semana".
 */
import { obtenerAuditoria } from "@/lib/auditoriaConjuntoApi";
import { listarContenido, listarVistos } from "@/lib/contenidoEducativoApi";
import type { NotificacionItem } from "@/lib/notificaciones";
import { destinoDeCategoria, rutaCategoria, rutaLeccion } from "@/lib/progresoEducativo";

export const TIPOS_CONTENIDO_RECOMENDADO = ["CONTENIDO_RECOMENDADO", "CONTENIDO_RECOMENDADO_MANUAL"];

export async function rutaDeContenidoRecomendado(notif: NotificacionItem): Promise<string | null> {
  if (!notif.id_referencia) return null;
  // ¿Qué? tema_educativo se guarda igual que modulo_categoria a propósito (ver
  //       models/auditoria_conjunto.py) — se pide la auditoría por su id_referencia
  //       solo para leer ese texto.
  if (notif.tipo === "CONTENIDO_RECOMENDADO") {
    const auditoria = await obtenerAuditoria(notif.id_referencia);
    // ¿Impacto? Si no se puede leer el catálogo o las vistas, se cae a la lista de la categoría: llega a un
    //           lugar útil en vez de mostrar un error.
    try {
      const [contenido, vistos] = await Promise.all([listarContenido(), listarVistos().catch(() => [] as string[])]);
      return destinoDeCategoria(contenido, auditoria.tema_educativo, new Set(vistos));
    } catch {
      return rutaCategoria(auditoria.tema_educativo);
    }
  }
  // ¿Qué? CONTENIDO_RECOMENDADO_MANUAL (Flujo C): el Admin del Sistema envió el módulo
  //       a mano, sin auditoría de por medio — id_referencia apunta directo al módulo.
  //       Si el módulo ya no existe, la página de la lección lo avisa.
  if (notif.tipo === "CONTENIDO_RECOMENDADO_MANUAL") {
    return rutaLeccion(notif.id_referencia);
  }
  return null;
}
