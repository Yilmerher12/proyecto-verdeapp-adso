/**
 * Archivo: components/dashboard/HistorialAuditorias.tsx
 * ¿Qué? Lista de todas las auditorías del conjunto (RQF-009) — a diferencia
 *       del aviso de AUDITORIA_PUBLICADA (que se pierde al marcarlo leído),
 *       esto queda siempre disponible para volver a consultar.
 * ¿Para qué? Lo usan tanto el Residente como el Admin de Conjunto — mismo
 *           componente, el backend ya resuelve solo a qué conjunto(s)
 *           pertenece cada uno (ver GET /auditorias-conjunto/historial).
 * ¿Impacto? Reutiliza AuditoriaResultadoModal para el detalle completo — la
 *           fila solo muestra lo justo para ubicar cuál es cuál (fecha,
 *           nivel, tema).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { listarHistorial, type AuditoriaConjunto } from "@/lib/auditoriaConjuntoApi";
import { AuditoriaResultadoModal } from "@/components/dashboard/AuditoriaResultadoModal";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";

interface HistorialAuditoriasProps {
  token: string;
}

export function HistorialAuditorias({ token }: HistorialAuditoriasProps) {
  const { t } = useTranslation();
  const [auditorias, setAuditorias] = useState<AuditoriaConjunto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [idAbierta, setIdAbierta] = useState<string | null>(null);

  useEffect(() => {
    listarHistorial(token)
      .then(setAuditorias)
      .catch(() => setAuditorias([]))
      .finally(() => setCargando(false));
  }, [token]);

  // ¿Qué? El nombre del conjunto solo se muestra por fila si hay más de
  //       uno en la lista — un Admin puede administrar varios conjuntos,
  //       un Residente siempre ve el mismo, así que repetirlo ahí sobra.
  const variosConjuntos = new Set(auditorias.map((a) => a.id_conjunto_residencial)).size > 1;

  if (cargando) return null;

  return (
    <div className="bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] shadow-sm p-5">
      <div className="mb-4 flex items-center gap-2">
        <History className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("auditoriaResultado.historialTitle")}</h2>
      </div>

      {auditorias.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("auditoriaResultado.historialEmpty")}</p>
      ) : (
        <ul className="divide-y divide-gray-50 dark:divide-gray-800">
          {auditorias.map((a) => {
            const nivel = NIVELES_DESEMPENO[a.nivel_desempeno];
            return (
              <li key={a.id_auditoria}>
                <button
                  onClick={() => setIdAbierta(a.id_auditoria)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-[#0d2116]/60"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {variosConjuntos ? `${a.nombre_conjunto} — ` : ""}
                      {a.tema_educativo}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${nivel.claseBadge}`}
                  >
                    <nivel.icon className="h-3.5 w-3.5" />
                    {t(`dashboards.reciclador.auditoria.niveles.${a.nivel_desempeno.toLowerCase()}`)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {idAbierta && (
        <AuditoriaResultadoModal idAuditoria={idAbierta} token={token} onClose={() => setIdAbierta(null)} />
      )}
    </div>
  );
}
