/**
 * Archivo: components/PuntoAcopioPanel.tsx
 * Descripción: Perfil de un punto de acopio dentro de un panel lateral (ver
 *              PanelLateral): sus datos, los comentarios del administrador y
 *              la edición del punto sin salir de la lista.
 * ¿Para qué? El Admin Sistema abre esto con un clic en una fila de su lista de
 *           puntos de acopio. Sirve para actualizar datos (ej. cambio de
 *           encargado o dueño) y dejar constancia del porqué, con autor y fecha.
 * ¿Impacto? Los comentarios son internos: solo los ve el Admin Sistema.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { PanelLateral } from "@/components/ui/PanelLateral";
import { PuntoAcopioForm } from "@/components/PuntoAcopioForm";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { googleMapsUrl } from "@/lib/mapsLink";
import {
  agregarComentario,
  listarComentarios,
  type ComentarioPunto,
  type PuntoAcopioAdmin,
  type PuntoAcopioPayload,
} from "@/lib/puntosAcopioApi";

interface Localidad {
  id_localidad: number;
  nombre_localidad: string;
}

interface PuntoAcopioPanelProps {
  punto: PuntoAcopioAdmin;
  localidades: Localidad[];
  /** ¿Qué? Abre directo en modo edición (cuando se llega desde el lápiz de la fila). */
  iniciarEditando: boolean;
  /** ¿Qué? Cambia cada vez que se guarda una edición — fuerza a recargar los
   *  comentarios, porque el "motivo del cambio" acaba de quedar como uno nuevo. */
  version: number;
  guardando: boolean;
  errorMsg: string | null;
  cerrarConEscape: boolean;
  onErrorClose: () => void;
  onClose: () => void;
  onGuardar: (payload: PuntoAcopioPayload) => Promise<boolean>;
  onDarDeBaja: (punto: PuntoAcopioAdmin) => void;
  onReactivar: (punto: PuntoAcopioAdmin) => void;
  onEliminar: (punto: PuntoAcopioAdmin) => void;
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <>
      <dt className="text-gray-500 dark:text-gray-400">{etiqueta}</dt>
      <dd className="break-words font-medium text-gray-900 dark:text-white">{valor}</dd>
    </>
  );
}

export function PuntoAcopioPanel({
  punto,
  localidades,
  iniciarEditando,
  version,
  guardando,
  errorMsg,
  cerrarConEscape,
  onErrorClose,
  onClose,
  onGuardar,
  onDarDeBaja,
  onReactivar,
  onEliminar,
}: PuntoAcopioPanelProps) {
  const { t } = useTranslation();
  const p = "adminPuntosAcopio";
  const [editando, setEditando] = useState(iniciarEditando);
  const [comentarios, setComentarios] = useState<ComentarioPunto[] | null>(null);
  const [errorComentarios, setErrorComentarios] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarComentarios(punto.id_punto_acopio)
      .then((data) => {
        if (!vigente) return;
        setComentarios(data);
        setErrorComentarios(false);
      })
      .catch(() => {
        if (vigente) setErrorComentarios(true);
      });
    return () => {
      vigente = false;
    };
  }, [punto.id_punto_acopio, version]);

  const enviarComentario = async () => {
    const texto = nuevoComentario.trim();
    if (!texto) return;
    setEnviando(true);
    setErrorEnvio(false);
    try {
      const creado = await agregarComentario(punto.id_punto_acopio, texto);
      setComentarios((prev) => [creado, ...(prev ?? [])]);
      setNuevoComentario("");
    } catch {
      setErrorEnvio(true);
    } finally {
      setEnviando(false);
    }
  };

  const guardar = async (payload: PuntoAcopioPayload) => {
    if (await onGuardar(payload)) setEditando(false);
  };

  const botonSecundario =
    "flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors";

  return (
    <PanelLateral onClose={onClose} aria-label={t(`${p}.panel.ariaLabel`, { nombre: punto.nombre })} cerrarConEscape={cerrarConEscape}>
      <div className="flex items-center gap-4 border-b border-gray-100 p-5 pr-14 dark:border-[#2a4d34]">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-300">
          <MapPin className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h2 className="break-words text-base font-bold text-gray-900 dark:text-white">{punto.nombre}</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                punto.activo
                  ? "bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-300"
                  : "bg-gray-100 text-gray-600 dark:bg-[#2a4d34] dark:text-gray-300"
              }`}
            >
              {punto.activo ? t(`${p}.panel.active`) : t(`${p}.inactiveBadge`)}
            </span>
            <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-[11px] font-semibold text-accent-800 dark:bg-accent-900/20 dark:text-accent-300">
              {punto.nombre_localidad}
            </span>
          </div>
        </div>
      </div>

      {editando ? (
        <div className="p-5">
          <PuntoAcopioForm
            inicial={{
              nombre: punto.nombre,
              direccion: punto.direccion,
              id_localidad: punto.id_localidad,
              nombre_encargado: punto.nombre_encargado ?? "",
              telefono_contacto: punto.telefono_contacto ?? "",
            }}
            localidades={localidades}
            esEdicion
            guardando={guardando}
            errorMsg={errorMsg}
            onErrorClose={onErrorClose}
            onSubmit={guardar}
            onCancel={() => {
              onErrorClose();
              setEditando(false);
            }}
          />
        </div>
      ) : (
        <>
          <section className="border-b border-gray-100 p-5 dark:border-[#2a4d34]">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t(`${p}.panel.dataSection`)}
            </h3>
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <Fila
                etiqueta={t(`${p}.fields.address`)}
                valor={
                  <>
                    {punto.direccion}{" "}
                    <a
                      href={googleMapsUrl(punto.direccion, punto.nombre_localidad)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer text-xs font-semibold text-accent-700 underline dark:text-accent-400"
                    >
                      {t(`${p}.mapLink`)}
                    </a>
                  </>
                }
              />
              <Fila etiqueta={t(`${p}.fields.locality`)} valor={punto.nombre_localidad} />
              <Fila etiqueta={t(`${p}.panel.manager`)} valor={punto.nombre_encargado || t(`${p}.noManager`)} />
              <Fila etiqueta={t(`${p}.panel.phone`)} valor={punto.telefono_contacto || t(`${p}.noPhone`)} />
            </dl>
          </section>

          <section className="flex-1 space-y-3 p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t(`${p}.comments.title`)}
            </h3>

            {errorComentarios && <Alert type="error" message={t(`${p}.comments.loadError`)} />}
            {!errorComentarios && comentarios === null && <LoadingState message={t("common.loading")} />}
            {comentarios?.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t(`${p}.comments.empty`)}</p>
            )}
            {comentarios?.map((c) => (
              <div
                key={c.id_comentario}
                className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 dark:border-[#2a4d34] dark:bg-[#1c341b]"
              >
                <div className="flex justify-between gap-2 text-[11px] text-gray-400">
                  <span className="min-w-0 truncate font-semibold text-gray-600 dark:text-gray-300">
                    {c.autor ?? t(`${p}.comments.deletedAuthor`)}
                  </span>
                  <span className="shrink-0">{formatearFechaCreacion(c.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-700 dark:text-gray-200">{c.texto}</p>
              </div>
            ))}

            <div className="space-y-2 pt-1">
              <textarea
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                maxLength={1000}
                rows={2}
                aria-label={t(`${p}.comments.placeholder`)}
                placeholder={t(`${p}.comments.placeholder`)}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/20 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
              />
              {errorEnvio && <Alert type="error" message={t(`${p}.comments.addError`)} onClose={() => setErrorEnvio(false)} />}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={enviarComentario}
                  disabled={enviando || !nuevoComentario.trim()}
                  className="cursor-pointer rounded-xl bg-accent-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enviando ? t("common.saving") : t(`${p}.comments.add`)}
                </button>
              </div>
            </div>
          </section>

          <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-gray-100 bg-[#f7f9f3] p-5 dark:border-[#2a4d34] dark:bg-[#132a1c]">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
            >
              <Pencil className="h-4 w-4" />
              {t("common.edit")}
            </button>
            {punto.activo ? (
              <button
                type="button"
                onClick={() => onDarDeBaja(punto)}
                className={`${botonSecundario} border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20`}
              >
                <PowerOff className="h-4 w-4" />
                {t(`${p}.panel.deactivate`)}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onReactivar(punto)}
                  className={`${botonSecundario} border-accent-200 text-accent-700 hover:bg-accent-50 dark:border-accent-900/40 dark:text-accent-400 dark:hover:bg-accent-900/20`}
                >
                  <Power className="h-4 w-4" />
                  {t(`${p}.panel.reactivate`)}
                </button>
                <button
                  type="button"
                  onClick={() => onEliminar(punto)}
                  className={`${botonSecundario} border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20`}
                >
                  <Trash2 className="h-4 w-4" />
                  {t(`${p}.panel.deleteForever`)}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </PanelLateral>
  );
}
