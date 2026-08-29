/**
 * Archivo: components/dashboard/AuditoriaResultadoModal.tsx
 * ¿Qué? Detalle completo de una auditoría (RQF-009) — lo que se abre al
 *       hacer clic en "Ver" desde el aviso de AUDITORIA_PUBLICADA.
 * ¿Para qué? Nivel de desempeño con su ícono/color, foto(s) de evidencia,
 *           tema, descripción y el nombre del reciclador — visible a
 *           propósito (decisión del issue #5: es una evaluación en su rol
 *           formal, no un dato de contacto personal que deba ocultarse).
 * ¿Impacto? Las fotos se ven en miniatura por defecto — al tocar una se
 *           abre ampliada en un modal encima (layer="stacked"), porque en
 *           un tamaño tan pequeño no siempre se alcanza a distinguir bien
 *           qué muestra la evidencia.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { API_BASE_URL } from "@/api/axios";
import { obtenerAuditoria, type AuditoriaConjunto } from "@/lib/auditoriaConjuntoApi";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";
import { tiempoRelativo } from "@/components/dashboard/NotificationFeed";

interface AuditoriaResultadoModalProps {
  idAuditoria: string;
  token: string;
  onClose: () => void;
}

export function AuditoriaResultadoModal({ idAuditoria, token, onClose }: AuditoriaResultadoModalProps) {
  const { t } = useTranslation();
  const [auditoria, setAuditoria] = useState<AuditoriaConjunto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);

  useEffect(() => {
    obtenerAuditoria(idAuditoria, token)
      .then(setAuditoria)
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [idAuditoria, token]);

  const nivel = auditoria ? NIVELES_DESEMPENO[auditoria.nivel_desempeno] : null;

  return (
    <Modal onClose={onClose} aria-label={t("auditoriaResultado.modalTitle")}>
      <div className="p-6">
        <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-white">
          {t("auditoriaResultado.modalTitle")}
        </h3>

        {cargando && <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>}
        {error && <Alert type="error" message={t("auditoriaResultado.errorLoad")} />}

        {auditoria && nivel && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{auditoria.nombre_conjunto}</p>

            <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${nivel.claseBadge}`}>
              <nivel.icon className="h-4 w-4" />
              {t(`dashboards.reciclador.auditoria.niveles.${auditoria.nivel_desempeno.toLowerCase()}`)}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[auditoria.ruta_evidencia, auditoria.ruta_evidencia_2, auditoria.ruta_evidencia_3]
                .filter((ruta): ruta is string => Boolean(ruta))
                .map((ruta) => (
                  <button
                    key={ruta}
                    type="button"
                    onClick={() => setImagenAmpliada(ruta)}
                    aria-label={t("auditoriaResultado.evidenciaAmpliar")}
                    className="aspect-square overflow-hidden rounded-xl border border-gray-100 transition-opacity hover:opacity-80 dark:border-[#2a4d34]"
                  >
                    <img
                      src={`${API_BASE_URL}${ruta}`}
                      alt={t("auditoriaResultado.evidenciaAlt")}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{t("auditoriaResultado.temaLabel")}</p>
              <p className="text-sm text-gray-800 dark:text-gray-200">{auditoria.tema_educativo}</p>
            </div>

            {auditoria.descripcion && (
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {t("auditoriaResultado.descripcionLabel")}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{auditoria.descripcion}</p>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("auditoriaResultado.auditadoPor", { nombre: auditoria.nombre_reciclador })} ·{" "}
              {new Date(auditoria.created_at).toLocaleDateString()} ({tiempoRelativo(auditoria.created_at)})
            </p>
          </div>
        )}
      </div>

      {imagenAmpliada && (
        <Modal onClose={() => setImagenAmpliada(null)} layer="stacked" wide aria-label={t("auditoriaResultado.evidenciaAlt")}>
          <img
            src={`${API_BASE_URL}${imagenAmpliada}`}
            alt={t("auditoriaResultado.evidenciaAlt")}
            className="max-h-[80vh] w-full rounded-2xl object-contain"
          />
        </Modal>
      )}
    </Modal>
  );
}
