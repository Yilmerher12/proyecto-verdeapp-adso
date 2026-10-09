/**
 * Archivo: hooks/usePaginacion.ts
 * Descripción: Hook reutilizable para el estado de "página actual" de un
 *              listado que el backend entrega de a pedazos (limit/offset).
 * ¿Para qué? Issue #227 — este mismo cálculo (número de página, "de la fila
 *           X a la Y de Z", ir a la página anterior/siguiente) ya vivía
 *           escrito a mano dentro de AdminDashboard.tsx. Los nuevos
 *           listados paginados (novedades) lo necesitan igual, así que se
 *           extrae aquí en vez de copiarlo de nuevo.
 * ¿Impacto? Este hook NO hace la petición HTTP — solo lleva la cuenta de
 *           en qué página se está y calcula el offset a pedir. Quien lo usa
 *           sigue siendo responsable de pedir los datos con ese offset.
 */
import { useState } from "react";

export function usePaginacion(tamanoPagina: number, total: number) {
  const [pagina, setPagina] = useState(0);

  const totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina));
  const offset = pagina * tamanoPagina;
  const desde = total === 0 ? 0 : offset + 1;
  const hasta = Math.min(total, offset + tamanoPagina);

  const irAAnterior = () => setPagina((p) => Math.max(0, p - 1));
  const irASiguiente = () => setPagina((p) => (p + 1 < totalPaginas ? p + 1 : p));
  const reiniciar = () => setPagina(0);

  return {
    pagina,
    offset,
    totalPaginas,
    desde,
    hasta,
    puedeAnterior: pagina > 0,
    puedeSiguiente: pagina + 1 < totalPaginas,
    irAAnterior,
    irASiguiente,
    reiniciar,
  };
}
