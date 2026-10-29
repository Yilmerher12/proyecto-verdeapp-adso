/**
 * Archivo: components/ComentariosPunto.tsx
 * Descripción: Comentarios internos de un punto de acopio: la lista (del más
 *              reciente al más antiguo, con autor y fecha) y el campo para agregar uno.
 * ¿Para qué? Dejan constancia de por qué cambió un dato (ej. nuevo encargado). Antes
 *           vivían en el panel lateral del punto; ahora van dentro de la fila
 *           desplegada del Admin del Sistema.
 * ¿Impacto? Son internos: solo los ve el Admin del Sistema, nunca Residentes ni
 *           Recicladores. Solo se pueden agregar: no se editan ni se borran. El
 *           "motivo del cambio" de la edición queda aquí como un comentario más.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { agregarComentario, listarComentarios, type ComentarioPunto } from "@/lib/puntosAcopioApi";

interface ComentariosPuntoProps {
  idPunto: string;
  /** ¿Qué? Cambia cada vez que se guarda una edición: fuerza a recargar la lista,
   *  porque el "motivo del cambio" acaba de quedar como un comentario nuevo. */
  version: number;
}

export function ComentariosPunto({ idPunto, version }: ComentariosPuntoProps) {
  const { t } = useTranslation();
  const p = "adminPuntosAcopio.comments";
  const [comentarios, setComentarios] = useState<ComentarioPunto[] | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [nuevo, setNuevo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarComentarios(idPunto)
      .then((data) => {
        if (!vigente) return;
        setComentarios(data);
        setErrorCarga(false);
      })
      .catch(() => {
        if (vigente) setErrorCarga(true);
      });
    return () => {
      vigente = false;
    };
  }, [idPunto, version]);

  const enviar = async () => {
    const texto = nuevo.trim();
    if (!texto) return;
    setEnviando(true);
    setErrorEnvio(false);
    try {
      const creado = await agregarComentario(idPunto, texto);
      setComentarios((prev) => [creado, ...(prev ?? [])]);
      setNuevo("");
    } catch {
      setErrorEnvio(true);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="space-y-3 border-t border-gray-100 p-5 dark:border-night-line">
      <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.title`)}</h3>

      {errorCarga && <Alert type="error" message={t(`${p}.loadError`)} />}
      {!errorCarga && comentarios === null && <LoadingState message={t("common.loading")} />}
      {comentarios?.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">{t(`${p}.empty`)}</p>}
      {comentarios?.map((c) => (
        <div key={c.id_comentario} className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 dark:border-night-line dark:bg-night-card">
          <div className="flex justify-between gap-2 text-[0.6875rem] text-gray-500 dark:text-gray-400">
            <span className="min-w-0 truncate font-semibold text-gray-600 dark:text-gray-300">{c.autor ?? t(`${p}.deletedAuthor`)}</span>
            <span className="shrink-0">{formatearFechaCreacion(c.created_at)}</span>
          </div>
          <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-700 dark:text-gray-200">{c.texto}</p>
        </div>
      ))}

      <div className="space-y-2 pt-1">
        <textarea
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          maxLength={1000}
          rows={2}
          aria-label={t(`${p}.placeholder`)}
          placeholder={t(`${p}.placeholder`)}
          className="w-full resize-none rounded-xl border border-edge bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/20 dark:border-night-edge dark:bg-night-field dark:text-white"
        />
        {errorEnvio && <Alert type="error" message={t(`${p}.addError`)} onClose={() => setErrorEnvio(false)} />}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={enviar}
            disabled={enviando || !nuevo.trim()}
            className="cursor-pointer rounded-xl bg-accent-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
          >
            {enviando ? t("common.saving") : t(`${p}.add`)}
          </button>
        </div>
      </div>
    </section>
  );
}
