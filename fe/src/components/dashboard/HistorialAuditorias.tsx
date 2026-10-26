/**
 * Archivo: components/dashboard/HistorialAuditorias.tsx
 * ¿Qué? Lista, de a páginas, de las auditorías (RQF-009) — a diferencia del
 *       aviso de AUDITORIA_PUBLICADA (que se pierde al marcarlo leído), esto
 *       queda siempre disponible para volver a consultar.
 * ¿Para qué? La usan el Residente (las de su conjunto, `listarHistorial`) y el
 *           Reciclador (las que él envió, `listarMisAuditorias`): mismo
 *           componente, cada uno le pasa su función `cargar`. Antes la lista
 *           traía solo las 50 más recientes y cortaba el resto sin avisar.
 * ¿Impacto? Reutiliza AuditoriaResultadoModal para el detalle completo — la
 *           fila solo muestra lo justo para ubicar cuál es cuál (fecha,
 *           nivel, tema). `recargar` es un número que, al cambiar, vuelve a
 *           pedir la página (el Reciclador lo sube al enviar una auditoría).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { type AuditoriaConjunto, type PaginaAuditorias } from "@/lib/auditoriaConjuntoApi";
import { AuditoriaResultadoModal } from "@/components/dashboard/AuditoriaResultadoModal";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Paginacion } from "@/components/ui/Paginacion";
import { usePaginacion } from "@/hooks/usePaginacion";
import { formatearFechaCreacion } from "@/lib/dateFormat";

// ¿Qué? Auditorías por página.
const TAMANO_PAGINA = 10;

interface HistorialAuditoriasProps {
  cargar: (limit: number, offset: number) => Promise<PaginaAuditorias>;
  // ¿Qué? Escribir siempre el nombre del conjunto en cada fila.
  // ¿Para qué? Un Reciclador audita varios conjuntos; un Residente siempre ve el mismo.
  mostrarSiempreElConjunto?: boolean;
  recargar?: number;
}

export function HistorialAuditorias({ cargar, mostrarSiempreElConjunto = false, recargar = 0 }: HistorialAuditoriasProps) {
  const { t } = useTranslation();
  const [auditorias, setAuditorias] = useState<AuditoriaConjunto[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [idAbierta, setIdAbierta] = useState<string | null>(null);
  const paginacion = usePaginacion(TAMANO_PAGINA, total);
  const { offset } = paginacion;

  useEffect(() => {
    let vigente = true;
    cargar(TAMANO_PAGINA, offset)
      .then((pagina) => {
        if (!vigente) return;
        setAuditorias(pagina.items);
        setTotal(pagina.total);
      })
      .catch(() => {
        if (!vigente) return;
        setAuditorias([]);
        setTotal(0);
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [cargar, offset, recargar]);

  // ¿Qué? El nombre del conjunto solo se muestra por fila si hay más de
  //       uno en la página (o si se pidió siempre) — un Residente siempre ve
  //       el mismo, así que repetirlo ahí sobra.
  const variosConjuntos = new Set(auditorias.map((a) => a.id_conjunto_residencial)).size > 1;
  const conNombreDeConjunto = mostrarSiempreElConjunto || variosConjuntos;

  return (
    <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line shadow-sm p-5">
      <div className="mb-4 flex items-center gap-2">
        <History className="icon-md text-gray-500 dark:text-gray-400" />
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("auditoriaResultado.historialTitle")}</h2>
      </div>

      {cargando ? (
        <LoadingState message={t("common.loading")} />
      ) : auditorias.length === 0 ? (
        <EmptyState icon={History} message={t("auditoriaResultado.historialEmpty")} />
      ) : (
        <>
          <ul className="divide-y divide-gray-50 dark:divide-gray-800">
            {auditorias.map((a) => {
              const nivel = NIVELES_DESEMPENO[a.nivel_desempeno];
              return (
                <li key={a.id_auditoria}>
                  <button
                    onClick={() => setIdAbierta(a.id_auditoria)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-night-inset/60"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {conNombreDeConjunto ? `${a.nombre_conjunto} — ` : ""}
                        {a.tema_educativo}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {formatearFechaCreacion(a.created_at)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${nivel.claseBadge}`}
                    >
                      <nivel.icon className="icon-sm" />
                      {t(`dashboards.reciclador.auditoria.niveles.${a.nivel_desempeno.toLowerCase()}`)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {total > TAMANO_PAGINA && (
            <div className="mt-2 border-t border-gray-50 dark:border-night-line">
              <Paginacion
                desde={paginacion.desde}
                hasta={paginacion.hasta}
                total={total}
                pagina={paginacion.pagina}
                totalPaginas={paginacion.totalPaginas}
                puedeAnterior={paginacion.puedeAnterior}
                puedeSiguiente={paginacion.puedeSiguiente}
                onAnterior={paginacion.irAAnterior}
                onSiguiente={paginacion.irASiguiente}
              />
            </div>
          )}
        </>
      )}

      {idAbierta && (
        <AuditoriaResultadoModal idAuditoria={idAbierta} onClose={() => setIdAbierta(null)} />
      )}
    </div>
  );
}
