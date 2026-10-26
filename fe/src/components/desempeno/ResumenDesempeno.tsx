/**
 * Archivo: components/desempeno/ResumenDesempeno.tsx
 * ¿Qué? Cuatro tarjetas con lo esencial del período: cuántas auditorías hubo,
 *       qué porcentaje salió Bueno, qué tema reforzar y cuándo fue la última.
 * ¿Para qué? Dar la respuesta corta antes de la gráfica.
 * ¿Impacto? `fechaUltima` la calcula el panel (primera auditoría de la semana
 *           más reciente con auditorías): el endpoint de desempeño solo trae
 *           conteos, no fechas. Mientras no llega, la tarjeta muestra "—".
 */
import { useTranslation } from "react-i18next";
import type { DesempenoConjunto } from "@/lib/auditoriaConjuntoApi";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { porcentajeBueno, regularOMalo, temaAReforzar, totalTema } from "@/lib/desempeno";

interface ResumenDesempenoProps {
  desempeno: DesempenoConjunto;
  fechaUltima: string | null;
}

function Tarjeta({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-night-line dark:bg-night-card">
      <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400">{titulo}</dt>
      <dd className="mt-1 break-words text-lg font-bold text-gray-900 dark:text-white">{valor}</dd>
      {detalle && <dd className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{detalle}</dd>}
    </div>
  );
}

export function ResumenDesempeno({ desempeno, fechaUltima }: ResumenDesempenoProps) {
  const { t } = useTranslation();
  const sinDato = t("desempeno.resumen.sinDato");
  const porcentaje = porcentajeBueno(desempeno);
  const buenas = desempeno.semanas.reduce((suma, s) => suma + s.bueno, 0);
  const reforzar = temaAReforzar(desempeno.temas);

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tarjeta titulo={t("desempeno.resumen.auditorias")} valor={String(desempeno.total)} />
      <Tarjeta
        titulo={t("desempeno.resumen.bueno")}
        valor={porcentaje === null ? sinDato : `${porcentaje}%`}
        detalle={porcentaje === null ? undefined : t("desempeno.resumen.buenoDetalle", { buenas, total: desempeno.total })}
      />
      <Tarjeta
        titulo={t("desempeno.resumen.temaReforzar")}
        valor={reforzar ? reforzar.tema : desempeno.total === 0 ? sinDato : t("desempeno.resumen.sinTemaReforzar")}
        detalle={
          reforzar
            ? t("desempeno.resumen.temaReforzarDetalle", { cantidad: regularOMalo(reforzar), total: totalTema(reforzar) })
            : undefined
        }
      />
      <Tarjeta
        titulo={t("desempeno.resumen.ultimaAuditoria")}
        valor={fechaUltima ? formatearFechaCreacion(fechaUltima) : sinDato}
      />
    </dl>
  );
}
