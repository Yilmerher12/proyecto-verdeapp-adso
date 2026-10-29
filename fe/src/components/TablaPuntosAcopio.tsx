/**
 * Archivo: components/TablaPuntosAcopio.tsx
 * Descripción: Tabla de puntos de acopio con una fila compacta por punto; cada
 *              fila se despliega y muestra su ficha (FichaPuntoAcopio).
 * ¿Para qué? Una sola tabla para los 3 roles. En "lectura" (Residente y Reciclador)
 *           la fila se despliega con una flecha al final o con un clic en la fila.
 *           En "gestion" (Admin del Sistema) no hay flecha: el kebab de la última
 *           columna trae "Ver ficha" y las demás acciones.
 * ¿Impacto? Solo hay una fila abierta a la vez (la controla quien usa la tabla).
 *           Sin secciones cerradas por localidad, cada punto ocupa una sola línea.
 */

import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { FichaPuntoAcopio, type PuntoFicha } from "@/components/FichaPuntoAcopio";

interface TablaPuntosAcopioProps<T extends PuntoFicha> {
  puntos: T[];
  variante: "lectura" | "gestion";
  abiertoId: string | null;
  onAlternar: (id: string) => void;
  /** ¿Qué? Solo "gestion": el kebab de cada fila. */
  renderMenu?: (punto: T) => ReactNode;
  /** ¿Qué? Solo "gestion": lo que va debajo de la ficha (los comentarios internos). */
  renderExtra?: (punto: T) => ReactNode;
  /** ¿Qué? Punto con una acción en curso (reactivar): se ve un spinner en su estado. */
  ocupadoId?: string | null;
}

const ENCABEZADO = "px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

export function TablaPuntosAcopio<T extends PuntoFicha>({
  puntos,
  variante,
  abiertoId,
  onAlternar,
  renderMenu,
  renderExtra,
  ocupadoId = null,
}: TablaPuntosAcopioProps<T>) {
  const { t } = useTranslation();
  const k = "puntosAcopioTabla";
  const gestion = variante === "gestion";
  const columnas = gestion ? 4 : 3;

  const ordenados = [...puntos].sort(
    (a, b) => a.nombre_localidad.localeCompare(b.nombre_localidad) || a.nombre.localeCompare(b.nombre),
  );

  return (
    <div className="@container overflow-x-auto rounded-2xl border border-gray-100 bg-white dark:border-night-line dark:bg-night-card">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 dark:border-night-line dark:bg-night-inset/60">
            <th className={ENCABEZADO}>{t(`${k}.headers.point`)}</th>
            <th className={`${ENCABEZADO} hidden sm:table-cell`}>{t(`${k}.headers.locality`)}</th>
            {gestion && <th className={ENCABEZADO}>{t(`${k}.headers.status`)}</th>}
            <th className="w-14 px-3 py-3">
              <span className="sr-only">{t(gestion ? `${k}.headers.actions` : `${k}.headers.details`)}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
          {ordenados.map((p) => {
            const abierto = abiertoId === p.id_punto_acopio;
            return (
              <Fragment key={p.id_punto_acopio}>
                <tr
                  onClick={gestion ? undefined : () => onAlternar(p.id_punto_acopio)}
                  className={`transition-colors hover:bg-gray-50 dark:hover:bg-night-inset/40 ${gestion ? "" : "cursor-pointer"} ${
                    p.activo === false ? "opacity-70" : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.nombre}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {p.direccion}
                      <span className="sm:hidden"> · {p.nombre_localidad}</span>
                    </p>
                  </td>
                  <td className="hidden px-5 py-3 text-sm text-gray-600 dark:text-gray-300 sm:table-cell">{p.nombre_localidad}</td>
                  {gestion && (
                    <td className="px-5 py-3">
                      {ocupadoId === p.id_punto_acopio ? (
                        <Spinner size="sm" />
                      ) : (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            p.activo === false
                              ? "bg-gray-100 text-gray-600 dark:bg-night-hover dark:text-gray-300"
                              : "bg-accent-50 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400"
                          }`}
                        >
                          {p.activo === false ? t("adminPuntosAcopio.inactiveBadge") : t("adminPuntosAcopio.panel.active")}
                        </span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-3 text-right">
                    {gestion ? (
                      renderMenu?.(p)
                    ) : (
                      <button
                        type="button"
                        aria-expanded={abierto}
                        aria-label={t(abierto ? `${k}.collapse` : `${k}.expand`, { nombre: p.nombre })}
                        title={t(abierto ? `${k}.collapse` : `${k}.expand`, { nombre: p.nombre })}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAlternar(p.id_punto_acopio);
                        }}
                        className="touch-target focus-ring inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-night-hover"
                      >
                        <ChevronDown className={`icon-md transition-transform ${abierto ? "rotate-180" : ""}`} aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
                {abierto && (
                  <tr className="bg-gray-50 dark:bg-night-inset/40">
                    <td colSpan={columnas}>
                      {/* ¿Qué? Pegajoso al borde izquierdo y tan ancho como lo visible (100cqw).
                          ¿Para qué? Si la tabla tiene scroll horizontal, la ficha no queda cortada. */}
                      <div className="sticky left-0 w-[100cqw]">
                        <FichaPuntoAcopio punto={p} variante={variante} />
                        {renderExtra?.(p)}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
