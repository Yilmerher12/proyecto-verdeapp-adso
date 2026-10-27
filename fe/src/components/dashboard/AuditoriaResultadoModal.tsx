/**
 * Archivo: components/dashboard/AuditoriaResultadoModal.tsx
 * ¿Qué? Detalle completo de una auditoría (RQF-009) — lo que se abre al
 *       hacer clic en "Ver" desde el aviso de AUDITORIA_PUBLICADA, el
 *       historial y la lista de la semana en Desempeño.
 * ¿Para qué? Se lee como una ficha de auditoría: arriba el veredicto (cara,
 *           nivel y conjunto), a la izquierda la evidencia en grande con
 *           flechas sobre la foto, y a la derecha el tema, las observaciones
 *           y quién y cuándo auditó. El nombre del reciclador se muestra a
 *           propósito (decisión del issue #5: es una evaluación en su rol
 *           formal, no un dato de contacto personal que deba ocultarse).
 * ¿Impacto? La foto se ve completa (aspect 4/3, sin recortar) para poder
 *           revisar la evidencia; al tocarla se abre ampliada en un modal
 *           encima (layer="stacked"). Las observaciones largas se cortan a 5
 *           líneas con "Ver más" — el botón solo aparece si el texto no cabe.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { InsigniaAccionImagen } from "@/components/ui/InsigniaAccionImagen";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { obtenerAuditoria, type AuditoriaConjunto } from "@/lib/auditoriaConjuntoApi";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";
import { tiempoRelativo } from "@/lib/notificaciones";
import { formatearFechaCreacion } from "@/lib/dateFormat";

interface AuditoriaResultadoModalProps {
  idAuditoria: string;
  onClose: () => void;
}

const CLASE_FLECHA =
  "focus-ring absolute top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/80";

export function AuditoriaResultadoModal({ idAuditoria, onClose }: AuditoriaResultadoModalProps) {
  const { t } = useTranslation();
  const [auditoria, setAuditoria] = useState<AuditoriaConjunto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [indice, setIndice] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  const [textoAbierto, setTextoAbierto] = useState(false);
  const [hayMas, setHayMas] = useState(false);
  const refObservaciones = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    obtenerAuditoria(idAuditoria)
      .then(setAuditoria)
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [idAuditoria]);

  // ¿Qué? Solo las fotos cuya ruta pasa enlaceAdjuntoSeguro (issue #400).
  const fotos = auditoria
    ? [auditoria.ruta_evidencia, auditoria.ruta_evidencia_2, auditoria.ruta_evidencia_3].filter(
        (ruta): ruta is string => Boolean(enlaceAdjuntoSeguro(ruta)),
      )
    : [];
  const actual = Math.min(indice, Math.max(fotos.length - 1, 0));
  const cambiarFoto = (paso: number) => setIndice((actual + paso + fotos.length) % fotos.length);

  // ¿Qué? Mide si el texto cortado a 5 líneas deja algo oculto.
  // ¿Para qué? "Ver más" solo aparece cuando hace falta, no en cada auditoría.
  useLayoutEffect(() => {
    const el = refObservaciones.current;
    if (el && !textoAbierto) setHayMas(el.scrollHeight > el.clientHeight + 1);
  }, [auditoria, textoAbierto]);

  useEffect(() => {
    if (fotos.length < 2) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") cambiarFoto(-1);
      if (e.key === "ArrowRight") cambiarFoto(1);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  });

  const nivel = auditoria ? NIVELES_DESEMPENO[auditoria.nivel_desempeno] : null;
  const srcActual = enlaceAdjuntoSeguro(fotos[actual]) ?? undefined;
  const contador = t("auditoriaResultado.evidenciaContador", {
    actual: actual + 1,
    total: fotos.length,
  });

  return (
    <Modal onClose={onClose} extraWide aria-label={t("auditoriaResultado.modalTitle")}>
      {cargando && (
        <div className="p-6">
          <LoadingState message={t("common.loading")} />
        </div>
      )}
      {error && (
        <div className="p-6">
          <Alert type="error" message={t("auditoriaResultado.errorLoad")} />
        </div>
      )}

      {auditoria && nivel && (
        <div className="overflow-hidden rounded-2xl">
          <div className={`flex items-center gap-4 px-6 py-4 ${nivel.claseBadge}`}>
            <nivel.icon className="icon-xl shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide opacity-80">
                {t("auditoriaResultado.modalTitle")}
              </p>
              <h3 className="text-xl font-bold leading-tight">
                {t(
                  `dashboards.reciclador.auditoria.niveles.${auditoria.nivel_desempeno.toLowerCase()}`,
                )}
              </h3>
              <p className="truncate text-sm">{auditoria.nombre_conjunto}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-[1.4fr_1fr]">
            <div className="p-5">
              {fotos.length > 0 && (
                <>
                  <div className="relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-night-line">
                    <button
                      type="button"
                      onClick={() => setAmpliada(true)}
                      aria-label={t("auditoriaResultado.evidenciaAmpliar")}
                      title={t("auditoriaResultado.evidenciaAmpliar")}
                      className="focus-ring relative block aspect-[4/3] w-full cursor-zoom-in"
                    >
                      <img
                        src={srcActual}
                        alt={t("auditoriaResultado.evidenciaAlt")}
                        className="h-full w-full object-contain"
                      />
                      <InsigniaAccionImagen icono={Maximize2} />
                    </button>
                    {fotos.length > 1 && (
                      <>
                        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white">
                          {contador}
                        </span>
                        <button
                          type="button"
                          onClick={() => cambiarFoto(-1)}
                          aria-label={t("auditoriaResultado.fotoAnterior")}
                          title={t("auditoriaResultado.fotoAnterior")}
                          className={`${CLASE_FLECHA} left-3`}
                        >
                          <ChevronLeft className="icon-lg" />
                        </button>
                        <button
                          type="button"
                          onClick={() => cambiarFoto(1)}
                          aria-label={t("auditoriaResultado.fotoSiguiente")}
                          title={t("auditoriaResultado.fotoSiguiente")}
                          className={`${CLASE_FLECHA} right-3`}
                        >
                          <ChevronRight className="icon-lg" />
                        </button>
                      </>
                    )}
                  </div>
                  {fotos.length > 1 && (
                    <div className="mt-3 flex justify-center gap-2">
                      {fotos.map((ruta, i) => (
                        <button
                          key={ruta}
                          type="button"
                          onClick={() => setIndice(i)}
                          aria-label={t("auditoriaResultado.irAFoto", { n: i + 1 })}
                          title={t("auditoriaResultado.irAFoto", { n: i + 1 })}
                          className="flex h-6 w-11 cursor-pointer items-center"
                        >
                          <span
                            className={`h-2 w-full rounded-full ${i === actual ? "bg-accent-600" : "bg-gray-200 dark:bg-night-line"}`}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-col gap-4 border-t border-gray-100 p-5 dark:border-night-line md:border-l md:border-t-0">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("auditoriaResultado.temaLabel")}
                </p>
                <h4 className="mt-0.5 text-lg font-bold leading-snug text-gray-900 dark:text-white">
                  {auditoria.tema_educativo}
                </h4>
              </div>

              {auditoria.descripcion && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t("auditoriaResultado.descripcionLabel")}
                  </p>
                  <p
                    ref={refObservaciones}
                    className={`mt-0.5 break-words text-sm text-gray-800 dark:text-gray-200 ${textoAbierto ? "" : "line-clamp-5"}`}
                  >
                    {auditoria.descripcion}
                  </p>
                  {(hayMas || textoAbierto) && (
                    <button
                      type="button"
                      onClick={() => setTextoAbierto((v) => !v)}
                      aria-expanded={textoAbierto}
                      className="focus-ring mt-1 cursor-pointer text-sm font-semibold text-accent-700 hover:underline dark:text-accent-400"
                    >
                      {t(
                        textoAbierto ? "auditoriaResultado.verMenos" : "auditoriaResultado.verMas",
                      )}
                    </button>
                  )}
                </div>
              )}

              <dl className="mt-auto grid gap-2 border-t border-gray-100 pt-3 text-sm dark:border-night-line">
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t("auditoriaResultado.auditorLabel")}
                  </dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">
                    {auditoria.nombre_reciclador}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t("auditoriaResultado.fechaLabel")}
                  </dt>
                  <dd className="text-gray-700 dark:text-gray-300">
                    {formatearFechaCreacion(auditoria.created_at)} (
                    {tiempoRelativo(auditoria.created_at)})
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {ampliada && srcActual && (
        <Modal
          onClose={() => setAmpliada(false)}
          layer="stacked"
          wide
          aria-label={t("auditoriaResultado.evidenciaAlt")}
        >
          <div className="relative">
            <img
              src={srcActual}
              alt={t("auditoriaResultado.evidenciaAlt")}
              className="max-h-[80vh] w-full rounded-2xl object-contain"
            />
            {fotos.length > 1 && (
              <>
                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {contador}
                </span>
                <button
                  type="button"
                  onClick={() => cambiarFoto(-1)}
                  aria-label={t("auditoriaResultado.fotoAnterior")}
                  title={t("auditoriaResultado.fotoAnterior")}
                  className={`${CLASE_FLECHA} left-3`}
                >
                  <ChevronLeft className="icon-lg" />
                </button>
                <button
                  type="button"
                  onClick={() => cambiarFoto(1)}
                  aria-label={t("auditoriaResultado.fotoSiguiente")}
                  title={t("auditoriaResultado.fotoSiguiente")}
                  className={`${CLASE_FLECHA} right-3`}
                >
                  <ChevronRight className="icon-lg" />
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </Modal>
  );
}
