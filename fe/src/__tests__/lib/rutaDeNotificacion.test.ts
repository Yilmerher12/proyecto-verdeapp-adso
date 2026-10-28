/**
 * Archivo: __tests__/lib/rutaDeNotificacion.test.ts
 * Descripción: Tests de rutaDeNotificacion: a qué página lleva tocar cada tipo de notificación.
 * ¿Para qué? Los paneles y el menú de la campanita usan esta misma función; si un tipo cambia de
 *           página o un rol recibe una ruta que no puede abrir (RoleGuard lo rebotaría), aquí falla.
 */
import { describe, expect, it } from "vitest";
import { rutaDeNotificacion } from "@/lib/notificaciones";
import { RoleId } from "@/types/auth";

describe("rutaDeNotificacion", () => {
  it.each(["COMUNICADO_NUEVO", "COMUNICADO_ACTUALIZADO"])("%s lleva a Comunicados al Residente y al Reciclador", (tipo) => {
    expect(rutaDeNotificacion({ tipo }, RoleId.RESIDENTE)).toBe("/comunicados");
    expect(rutaDeNotificacion({ tipo }, RoleId.RECICLADOR)).toBe("/comunicados");
  });

  it("un comunicado lleva al Admin de Conjunto a su gestión de comunicados (no puede abrir /comunicados)", () => {
    expect(rutaDeNotificacion({ tipo: "COMUNICADO_NUEVO" }, RoleId.ADMIN_CONJUNTO)).toBe("/admin-conjunto/comunicados");
  });

  it.each(["NOVEDAD_NUEVA", "NOVEDAD_ACTUALIZADA", "RESPUESTA_SOPORTE", "ESTADO_SOPORTE"])(
    "%s lleva a Soporte técnico, y al Admin del Sistema a su página de novedades",
    (tipo) => {
      expect(rutaDeNotificacion({ tipo }, RoleId.RESIDENTE)).toBe("/novedades");
      expect(rutaDeNotificacion({ tipo }, RoleId.RECICLADOR)).toBe("/novedades");
      expect(rutaDeNotificacion({ tipo }, RoleId.ADMIN_CONJUNTO)).toBe("/novedades");
      expect(rutaDeNotificacion({ tipo }, RoleId.ADMIN_SISTEMA)).toBe("/admin/novedades");
    }
  );

  it.each(["SHUT_LLENO", "SHUT_LIBRE", "LLEGADA_RECICLADOR", "AUDITORIA_PUBLICADA", "CONTENIDO_RECOMENDADO", "TIPO_DESCONOCIDO"])(
    "%s no tiene página propia",
    (tipo) => {
      expect(rutaDeNotificacion({ tipo }, RoleId.RECICLADOR)).toBeNull();
    }
  );
});
