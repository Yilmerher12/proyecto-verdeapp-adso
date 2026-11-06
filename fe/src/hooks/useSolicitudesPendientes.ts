/**
 * Archivo: hooks/useSolicitudesPendientes.ts
 * Descripción: Cuántas solicitudes tiene pendientes el Administrador del Sistema: consultas de soporte
 *              técnico (nuevas o en revisión) más solicitudes de desvinculación.
 * ¿Para qué? El menú lateral (contador de "Solicitudes") y el panel principal (franja de aviso) necesitan
 *           el mismo número aunque la persona no tenga abierta la página de Solicitudes. Antes ese número
 *           lo reportaba, por una instancia oculta, el componente que dibujaba la bandeja.
 * ¿Impacto? Usa las listas que ya existen (sin endpoint nuevo): pide solo 1 consulta de soporte para leer
 *           su total, y la lista de desvinculaciones. Se repite cada 20 s (usePolling) y al instante cuando
 *           alguien atiende una solicitud (lib/solicitudesEvents.ts). Con `enabled: false` no pide nada.
 */
import { useCallback, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import { listarSolicitudesDesvinculacion } from "@/lib/adminConjuntoApi";
import { listarSoporte } from "@/lib/novedadesEnviadasApi";
import { onSolicitudesActualizadas } from "@/lib/solicitudesEvents";

export interface SolicitudesPendientes {
  /** ¿Qué? null mientras llega la primera respuesta (no se confunde con "cero"). */
  soporte: number | null;
  desvinculaciones: number | null;
  /** ¿Qué? Suma de las dos; null hasta que llegaron las dos. */
  total: number | null;
}

export function useSolicitudesPendientes(enabled: boolean): SolicitudesPendientes {
  const [conteo, setConteo] = useState<{ soporte: number | null; desvinculaciones: number | null }>({
    soporte: null,
    desvinculaciones: null,
  });

  const pedir = useCallback(() => {
    // ¿Qué? Cada petición actualiza lo suyo; si una falla, la otra no se pierde ni se pone en cero.
    listarSoporte(1, 0)
      .then((pagina) => setConteo((c) => ({ ...c, soporte: pagina.total })))
      .catch(() => {});
    listarSolicitudesDesvinculacion()
      .then((lista) => setConteo((c) => ({ ...c, desvinculaciones: lista.length })))
      .catch(() => {});
  }, []);

  usePolling(pedir, { enabled, onExternalTrigger: onSolicitudesActualizadas });

  const total = conteo.soporte !== null && conteo.desvinculaciones !== null ? conteo.soporte + conteo.desvinculaciones : null;
  return { ...conteo, total };
}
