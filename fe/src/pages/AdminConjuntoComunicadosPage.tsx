import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, Clock, Megaphone, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ImagenAdjuntaField } from "@/components/ui/ImagenAdjuntaField";
import { Alert } from "@/components/ui/Alert";
import { Paginacion } from "@/components/ui/Paginacion";
import { Pestanas } from "@/components/ui/Pestanas";
import { ContadorCaracteres } from "@/components/ui/ContadorCaracteres";
import { FechaEnPalabras } from "@/components/ui/FechaEnPalabras";
import {
  COMUNICADO_TEXTO_MAX_LENGTH,
  DIAS_MAX_EXPIRACION,
  rangoFechaAviso,
  validarFechaAviso,
} from "@/lib/validacion";
import { usePaginacion } from "@/hooks/usePaginacion";
import { obtenerMisConjuntos, type ConjuntoAdministrado } from "@/lib/conjuntoPanelApi";
import { formatearFechaUTC, formatearFechaCreacion, isoToDateInputUTC } from "@/lib/dateFormat";
import { TextoRecortable } from "@/components/ui/TextoRecortable";
import { Button } from "@/components/ui/Button";
import {
  crearComunicado,
  editarComunicado,
  eliminarComunicado,
  listarMisComunicados,
  type Comunicado,
  type DestinatariosComunicado,
  type TipoComunicado,
  type VigenciaComunicado,
} from "@/lib/comunicadosApi";

// ¿Qué? Comunicados por página: el estándar del proyecto (10), igual que el resto de las listas (issue #632).
const TAMANO_PAGINA = 10;

interface FormState {
  id_conjunto_residencial: string | "";
  destinatarios: DestinatariosComunicado;
  tipo: TipoComunicado;
  texto: string;
  url_adjunto: string;
  fecha_evento: string;
  fecha_expiracion: string;
}

const FORM_VACIO: FormState = {
  id_conjunto_residencial: "",
  destinatarios: "AMBOS",
  tipo: "INFORMATIVO",
  texto: "",
  url_adjunto: "",
  fecha_evento: "",
  fecha_expiracion: "",
};

const TIPOS: TipoComunicado[] = [
  "INFORMATIVO",
  "URGENTE",
  "CONVOCATORIA",
  "MANTENIMIENTO",
  "RECICLAJE",
];
const DESTINATARIOS: DestinatariosComunicado[] = ["RESIDENTES", "RECICLADORES", "AMBOS"];

// ¿Qué? Issue #7 (hallazgo F2 de la auditoría) — un comunicado no tiene
//       título, solo texto libre; se usa un recorte corto como el nombre
//       que distingue cada fila en los aria-label de editar/eliminar.
function resumirTexto(texto: string): string {
  return texto.length > 40 ? `${texto.slice(0, 40)}…` : texto;
}

// ¿Qué? Color por tipo — Urgente en rojo para que salte a la vista, igual
//       que en el feed que ven residentes/recicladores.
const TIPO_ESTILO: Record<TipoComunicado, string> = {
  INFORMATIVO: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  URGENTE: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  CONVOCATORIA: "bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300",
  MANTENIMIENTO: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
  RECICLAJE: "bg-accent-100 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400",
};

// ¿Qué? Barra delgada (3 px) a la izquierda del contenido de cada fila, con aire alrededor: el mismo color de la etiqueta del tipo
//       (issue #632). Antes era una franja gruesa pegada al borde de la tarjeta, que se veía rara.
// ¿Para qué? Que el tipo se distinga de un vistazo sin leer, sobre todo "Urgente". Cuando el comunicado ya venció la
//           franja se vuelve gris (ver más abajo): el color queda para lo que sigue vigente.
const TIPO_FRANJA: Record<TipoComunicado, string> = {
  INFORMATIVO: "bg-blue-500 dark:bg-blue-400",
  URGENTE: "bg-red-500 dark:bg-red-400",
  CONVOCATORIA: "bg-purple-500 dark:bg-purple-400",
  MANTENIMIENTO: "bg-amber-500 dark:bg-amber-400",
  RECICLAJE: "bg-accent-600 dark:bg-accent-400",
};

/**
 * ¿Qué? Panel del Administrador de Conjunto para publicar, editar y
 *       eliminar comunicados (RQF-014, HU-027/029/030).
 * ¿Para qué? Un mismo admin puede manejar varios conjuntos — por eso al
 *           crear un comunicado hay que elegir para cuál es, y la lista
 *           muestra el nombre del conjunto en cada fila.
 * ¿Impacto? Issue #632: la lista es UNA tarjeta con las pestañas "Vigentes" y "Vencidos" arriba (el servidor filtra
 *           cada una), filas separadas por una línea con una franja de color según el tipo, y la paginación de 10 en 10
 *           como pie. Un comunicado vencido se distingue por su franja gris y por el texto "Venció el", no solo por el
 *           color. Los vencidos siguen a mano para reutilizarlos (editar su fecha) o borrarlos.
 */
export function AdminConjuntoComunicadosPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [conjuntos, setConjuntos] = useState<ConjuntoAdministrado[]>([]);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [total, setTotal] = useState(0);
  const [vigencia, setVigencia] = useState<VigenciaComunicado>("VIGENTES");
  // ¿Qué? Se sube cada vez que hay que volver a pedir la lista (después de crear, editar o eliminar).
  const [version, setVersion] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Comunicado | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  // ¿Qué? Issue #367 — error de cada campo de fecha, mostrado debajo del campo al salir de él.
  const [errorFechaEvento, setErrorFechaEvento] = useState<string | null>(null);
  const [errorFechaExpiracion, setErrorFechaExpiracion] = useState<string | null>(null);

  const [aEliminar, setAEliminar] = useState<Comunicado | null>(null);
  // ¿Qué? true mientras corre la acción de la confirmación (issue #458).
  // ¿Para qué? Antes no pasaba nada visible mientras tardaba y se podía confirmar dos veces.
  const [eliminando, setEliminando] = useState(false);

  const paginacion = usePaginacion(TAMANO_PAGINA, total);
  const { offset, pagina, irAAnterior, reiniciar } = paginacion;

  // ¿Qué? Los conjuntos del admin se piden una sola vez (sirven para el formulario), no con cada página de la lista.
  useEffect(() => {
    if (!user) return;
    obtenerMisConjuntos()
      .then(setConjuntos)
      .catch((err) => console.error("Error cargando conjuntos", err));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    listarMisComunicados(TAMANO_PAGINA, offset, vigencia)
      .then((p) => {
        setComunicados(p.items);
        setTotal(p.total);
        setErrorCarga(false);
      })
      .catch((err) => {
        console.error("Error cargando comunicados", err);
        setErrorCarga(true);
      })
      .finally(() => setCargando(false));
  }, [user, offset, vigencia, version]);

  // ¿Qué? Si se vació la última página (se borró su único comunicado, o uno vencido pasó a vigente), se retrocede una.
  useEffect(() => {
    if (comunicados.length === 0 && total > 0 && pagina > 0) irAAnterior();
  }, [comunicados, total, pagina, irAAnterior]);

  const recargar = () => setVersion((v) => v + 1);

  // ¿Qué? Al cambiar de pestaña se vacía la lista y se vuelve a la primera página, para no mostrar un instante los
  //       comunicados de la otra pestaña.
  const cambiarVigencia = (nueva: VigenciaComunicado) => {
    if (nueva === vigencia) return;
    setComunicados([]);
    setTotal(0);
    setCargando(true);
    reiniciar();
    setVigencia(nueva);
  };

  const abrirCrear = () => {
    setForm({
      ...FORM_VACIO,
      id_conjunto_residencial: conjuntos[0]?.id_conjunto_residencial ?? "",
    });
    setCreando(true);
  };

  const abrirEditar = (item: Comunicado) => {
    setForm({
      id_conjunto_residencial: item.id_conjunto_residencial,
      destinatarios: item.destinatarios,
      tipo: item.tipo,
      texto: item.texto,
      url_adjunto: item.url_adjunto ?? "",
      fecha_evento: item.fecha_evento ?? "",
      // ¿Qué? Se precarga con la expiración ACTUAL del comunicado (no
      //       vacío) — si no la tocas, se reenvía tal cual al guardar.
      fecha_expiracion: isoToDateInputUTC(item.fecha_expiracion),
    });
    setEditando(item);
  };

  const cerrarFormulario = () => {
    setCreando(false);
    setEditando(null);
    setErrorMsg(null);
    setErrorFechaEvento(null);
    setErrorFechaExpiracion(null);
  };

  const mensajeFecha = (valor: string): string | null => {
    const motivo = validarFechaAviso(valor);
    return motivo ? t(`common.${motivo}`, { dias: DIAS_MAX_EXPIRACION }) : null;
  };
  const rangoFecha = rangoFechaAviso();

  // ¿Qué? Mismas condiciones que ya revisaba "guardar" al hacer clic, pero
  //       calculadas ANTES, para deshabilitar el botón en vez de dejar que
  //       el Admin de Conjunto se entere del campo que falta después.
  const formularioIncompleto =
    !form.texto.trim() ||
    (creando && !form.id_conjunto_residencial) ||
    (form.tipo === "CONVOCATORIA" && !form.fecha_evento);

  const guardar = async () => {
    if (!user) return;
    if (!form.texto.trim()) {
      setErrorMsg(t("comunicados.admin.validation.textoRequerido"));
      return;
    }
    if (creando && !form.id_conjunto_residencial) {
      setErrorMsg(t("comunicados.admin.validation.conjuntoRequerido"));
      return;
    }
    if (form.tipo === "CONVOCATORIA" && !form.fecha_evento) {
      setErrorMsg(t("comunicados.admin.validation.fechaEventoRequerida"));
      return;
    }
    // ¿Qué? Un comunicado vencido al editarlo trae su fecha pasada precargada:
    //       aquí se le pide al admin una fecha nueva antes de guardar.
    const errorEvento = form.tipo === "CONVOCATORIA" ? mensajeFecha(form.fecha_evento) : null;
    const errorExpiracion = mensajeFecha(form.fecha_expiracion);
    setErrorFechaEvento(errorEvento);
    setErrorFechaExpiracion(errorExpiracion);
    if (errorEvento || errorExpiracion) return;

    setGuardando(true);
    setErrorMsg(null);
    const fechaExpiracion = form.fecha_expiracion ? `${form.fecha_expiracion}T23:59:59` : null;

    try {
      if (editando) {
        await editarComunicado(editando.id_comunicado, {
          tipo: form.tipo,
          texto: form.texto.trim(),
          url_adjunto: form.url_adjunto.trim() || null,
          fecha_evento: form.tipo === "CONVOCATORIA" ? form.fecha_evento : null,
          fecha_expiracion: fechaExpiracion,
        });
      } else {
        await crearComunicado({
          id_conjunto_residencial: form.id_conjunto_residencial as string,
          destinatarios: form.destinatarios,
          tipo: form.tipo,
          texto: form.texto.trim(),
          url_adjunto: form.url_adjunto.trim() || null,
          fecha_evento: form.tipo === "CONVOCATORIA" ? form.fecha_evento : null,
          fecha_expiracion: fechaExpiracion,
        });
      }
      cerrarFormulario();
      // ¿Qué? Un comunicado nuevo nace vigente (y uno vencido editado con fecha nueva pasa a vigente): se muestra la
      //       pestaña "Vigentes" desde su primera página.
      if (vigencia !== "VIGENTES") cambiarVigencia("VIGENTES");
      else {
        reiniciar();
        recargar();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorMsg(err.message || t("common.saveError"));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!user || !aEliminar) return;
    setEliminando(true);
    try {
      await eliminarComunicado(aEliminar.id_comunicado);
      setAEliminar(null);
      recargar();
    } catch {
      setErrorMsg(t("comunicados.admin.deleteError"));
    } finally {
      setEliminando(false);
    }
  };

  const clasesInput =
    "w-full rounded-xl border border-edge bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-night-edge dark:bg-night-field dark:text-white";
  const claseFecha = (error: string | null) =>
    `w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:bg-night-field dark:text-white ${
      error
        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400"
        : "border-edge focus:border-accent-500 focus:ring-accent-500 dark:border-night-edge"
    }`;

  return (
    <div className={`${ANCHO_PAGINA.normal} space-y-6 pt-6`}>
      {/* ¿Qué? Título y botón "Nuevo comunicado": en un espacio angosto (menos de 36 rem de ancho de la tarjeta, no de la
                ventana) el botón baja debajo del texto, a todo el ancho; desde ahí van en una fila.
          ¿Para qué? Issue #632 — con el botón al lado del texto en una tarjeta angosta no quedaba espacio entre ambos y el
                    nombre del botón se partía en dos líneas. */}
      <div className="@container">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-night-line dark:bg-night-card @xl:flex-row @xl:items-center @xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("comunicados.admin.title")}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("comunicados.admin.subtitle")}
            </p>
          </div>
          <Button variant="primary" onClick={abrirCrear} disabled={conjuntos.length === 0}>
            <Plus className="icon-md" />
            {t("comunicados.admin.newButton")}
          </Button>
        </div>
      </div>

      {errorMsg && !creando && !editando && (
        <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />
      )}

      {!cargando && conjuntos.length === 0 && !errorCarga && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("comunicados.admin.noConjuntos")}
        </p>
      )}

      {/* ¿Qué? Una sola tarjeta: pestañas subrayadas arriba, filas separadas por una línea y la paginación como pie
                (issue #632). Antes las pestañas no existían, cada comunicado era una tarjeta suelta y la paginación otra caja. */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-night-line dark:bg-night-card">
        <Pestanas
          variante="subrayadas"
          className="mx-5"
          ariaLabel={t("comunicados.admin.tabs.label")}
          idBase="comunicados-tab"
          idPanel="comunicados-panel"
          activa={vigencia}
          onCambiar={cambiarVigencia}
          pestanas={[
            { id: "VIGENTES", etiqueta: t("comunicados.admin.tabs.vigentes") },
            { id: "VENCIDOS", etiqueta: t("comunicados.admin.tabs.vencidos") },
          ]}
        />

        <div id="comunicados-panel" role="tabpanel" aria-labelledby={`comunicados-tab-${vigencia}`}>
          {cargando && (
            <div className="p-5">
              <LoadingState message={t("common.loading")} />
            </div>
          )}

          {!cargando && errorCarga && (
            <div className="p-5">
              <Alert type="error" message={t("common.loadError")} />
            </div>
          )}

          {!cargando && !errorCarga && comunicados.length === 0 && conjuntos.length > 0 && (
            <div className="p-5">
              <EmptyState
                icon={Megaphone}
                message={
                  vigencia === "VIGENTES"
                    ? t("comunicados.admin.emptyVigentes")
                    : t("comunicados.admin.emptyVencidos")
                }
              />
            </div>
          )}

          {comunicados.length > 0 && (
            <ul className="divide-y divide-gray-200 dark:divide-night-line">
              {comunicados.map((item) => {
                // ¿Qué? Vencido = su fecha de expiración ya pasó (la misma que usa el servidor para filtrar las pestañas).
                const vencido = new Date(item.fecha_expiracion).getTime() < Date.now();
                return (
                  <li key={item.id_comunicado} className="flex gap-3 px-5 py-4">
                    <span
                      aria-hidden="true"
                      className={`w-[3px] shrink-0 rounded-full ${vencido ? "bg-gray-300 dark:bg-night-line" : TIPO_FRANJA[item.tipo]}`}
                    />
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_ESTILO[item.tipo]}`}
                          >
                            {t(`comunicados.tipos.${item.tipo}`)}
                          </span>
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-night-field dark:text-gray-300">
                            {item.nombre_conjunto}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t(`comunicados.destinatarios.${item.destinatarios}`)}
                          </span>
                          {item.editado && (
                            <span className="text-xs italic text-gray-500 dark:text-gray-400">
                              {t("comunicados.editedBadge")}
                            </span>
                          )}
                        </div>
                        <TextoRecortable
                          texto={item.texto}
                          className="mt-2 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line"
                        />
                        {enlaceAdjuntoSeguro(item.url_adjunto) && (
                          <a
                            href={enlaceAdjuntoSeguro(item.url_adjunto) ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-text mt-2 inline-flex items-center gap-1.5 text-xs"
                          >
                            <Paperclip className="icon-sm" />
                            {t("comunicados.viewAttachment")}
                          </a>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-night-line dark:text-gray-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="icon-sm" />
                            {t("comunicados.admin.creadoEl", {
                              fecha: formatearFechaCreacion(item.created_at),
                            })}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarClock className="icon-sm" />
                            {t(
                              vencido ? "comunicados.admin.vencioEl" : "comunicados.admin.expiraEl",
                              {
                                fecha: formatearFechaUTC(item.fecha_expiracion),
                              },
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => abrirEditar(item)}
                          className="cursor-pointer rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50 dark:border-night-line dark:text-gray-300 dark:hover:bg-night-hover"
                          aria-label={t("comunicados.admin.editAria", {
                            resumen: resumirTexto(item.texto),
                          })}
                          title={t("comunicados.admin.editAria", {
                            resumen: resumirTexto(item.texto),
                          })}
                        >
                          <Pencil className="icon-md" />
                        </button>
                        <button
                          onClick={() => setAEliminar(item)}
                          className="cursor-pointer rounded-lg border border-gray-200 p-2 text-red-500 transition-colors hover:bg-red-50 dark:border-night-line dark:hover:bg-red-400/15"
                          aria-label={t("comunicados.admin.deleteAria", {
                            resumen: resumirTexto(item.texto),
                          })}
                          title={t("comunicados.admin.deleteAria", {
                            resumen: resumirTexto(item.texto),
                          })}
                        >
                          <Trash2 className="icon-md" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!cargando && total > 0 && (
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
          )}
        </div>
      </div>

      {(creando || editando) && (
        <Modal
          onClose={cerrarFormulario}
          wide
          closeOnBackdrop={false}
          aria-label={
            editando ? t("comunicados.admin.editTitle") : t("comunicados.admin.newButton")
          }
        >
          {/* ¿Qué? Issue #632 — el formulario sigue el orden en que se piensa un comunicado: para quién (conjunto y
                    destinatarios), qué dices (tipo y mensaje), cuándo (las dos fechas juntas) y, al final, lo opcional
                    (la imagen). Antes la fecha del evento quedaba antes del mensaje y la de expiración después de la imagen. */}
          <div className="p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editando ? t("comunicados.admin.editTitle") : t("comunicados.admin.newButton")}
            </h2>

            {errorMsg && (
              <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />
            )}

            {!editando && (
              <>
                <div>
                  <label
                    htmlFor="comunicado-conjunto"
                    className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
                  >
                    {t("comunicados.admin.fields.conjunto")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="comunicado-conjunto"
                    value={form.id_conjunto_residencial}
                    onChange={(e) => setForm({ ...form, id_conjunto_residencial: e.target.value })}
                    className={`cursor-pointer ${clasesInput}`}
                  >
                    {conjuntos.map((c) => (
                      <option key={c.id_conjunto_residencial} value={c.id_conjunto_residencial}>
                        {c.nombre_conjunto}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  {/* ¿Qué? "Destinatarios" no es un <select>/<input> único, es un
                      grupo de botones mutuamente excluyentes — un
                      <label htmlFor> no aplica aquí.
                      ¿Para qué? role="radiogroup" + aria-labelledby asocia el
                                texto descriptivo al grupo (WAI-ARIA), y
                                role="radio" + aria-checked en cada botón
                                comunica cuál está elegido — antes solo se
                                sabía por una clase CSS (mismo patrón que ya
                                usa AuditoriaConjuntoForm.tsx). */}
                  <span
                    id="comunicado-destinatarios-label"
                    className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
                  >
                    {t("comunicados.admin.fields.destinatarios")}{" "}
                    <span className="text-red-500">*</span>
                  </span>
                  <div
                    role="radiogroup"
                    aria-labelledby="comunicado-destinatarios-label"
                    className="flex gap-2"
                  >
                    {DESTINATARIOS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={form.destinatarios === d}
                        onClick={() => setForm({ ...form, destinatarios: d })}
                        className={`flex-1 cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                          form.destinatarios === d
                            ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400"
                            : "border-gray-200 text-gray-600 hover:border-accent-300 dark:border-night-line dark:text-gray-300"
                        }`}
                      >
                        {t(`comunicados.destinatarios.${d}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {editando && (
              <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-night-field/60">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("comunicados.admin.fields.conjunto")} ·{" "}
                  {t("comunicados.admin.fields.destinatarios")}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {editando.nombre_conjunto} ·{" "}
                  {t(`comunicados.destinatarios.${editando.destinatarios}`)}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t("comunicados.admin.destinatariosNoEditable")}
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="comunicado-tipo"
                className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
              >
                {t("comunicados.admin.fields.tipo")} <span className="text-red-500">*</span>
              </label>
              <select
                id="comunicado-tipo"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoComunicado })}
                className={`cursor-pointer ${clasesInput}`}
              >
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {t(`comunicados.tipos.${tipo}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="comunicado-texto"
                className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
              >
                {t("comunicados.admin.fields.texto")} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="comunicado-texto"
                value={form.texto}
                onChange={(e) => setForm({ ...form, texto: e.target.value })}
                maxLength={COMUNICADO_TEXTO_MAX_LENGTH}
                aria-describedby="comunicado-texto-contador"
                rows={5}
                className={clasesInput}
              />
              <ContadorCaracteres
                id="comunicado-texto-contador"
                actual={form.texto.length}
                max={COMUNICADO_TEXTO_MAX_LENGTH}
              />
            </div>

            {/* ¿Qué? Las dos fechas juntas: la del evento (solo en una Convocatoria, obligatoria) y la de expiración
                      (opcional). Lado a lado desde `sm`; sin Convocatoria, la expiración va sola a todo el ancho. */}
            <div>
              <div className={`grid gap-4 ${form.tipo === "CONVOCATORIA" ? "sm:grid-cols-2" : ""}`}>
                {form.tipo === "CONVOCATORIA" && (
                  <div>
                    <label
                      htmlFor="comunicado-fecha-evento"
                      className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
                    >
                      {t("comunicados.admin.fields.fechaEvento")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="comunicado-fecha-evento"
                      type="date"
                      value={form.fecha_evento}
                      min={rangoFecha.min}
                      max={rangoFecha.max}
                      onChange={(e) => setForm({ ...form, fecha_evento: e.target.value })}
                      onBlur={() => setErrorFechaEvento(mensajeFecha(form.fecha_evento))}
                      aria-invalid={!!errorFechaEvento}
                      aria-describedby={
                        errorFechaEvento ? "comunicado-fecha-evento-error" : undefined
                      }
                      className={claseFecha(errorFechaEvento)}
                    />
                    <FechaEnPalabras valor={form.fecha_evento} frase="comunicados.admin.eventoEl" />
                    {errorFechaEvento && (
                      <p
                        id="comunicado-fecha-evento-error"
                        className="mt-1 text-sm text-red-600 dark:text-red-300"
                        role="alert"
                      >
                        {errorFechaEvento}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="comunicado-fecha-expiracion"
                    className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
                  >
                    {t("comunicados.admin.fields.fechaExpiracion")}
                  </label>
                  <input
                    id="comunicado-fecha-expiracion"
                    type="date"
                    value={form.fecha_expiracion}
                    min={rangoFecha.min}
                    max={rangoFecha.max}
                    onChange={(e) => setForm({ ...form, fecha_expiracion: e.target.value })}
                    onBlur={() => setErrorFechaExpiracion(mensajeFecha(form.fecha_expiracion))}
                    aria-invalid={!!errorFechaExpiracion}
                    aria-describedby={
                      errorFechaExpiracion ? "comunicado-fecha-expiracion-error" : undefined
                    }
                    className={claseFecha(errorFechaExpiracion)}
                  />
                  <FechaEnPalabras valor={form.fecha_expiracion} frase="comunicados.admin.expiraEl" />
                  {errorFechaExpiracion && (
                    <p
                      id="comunicado-fecha-expiracion-error"
                      className="mt-1 text-sm text-red-600 dark:text-red-300"
                      role="alert"
                    >
                      {errorFechaExpiracion}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("comunicados.admin.fields.fechaExpiracionHint")}
              </p>
            </div>

            <ImagenAdjuntaField
              label={t("comunicados.admin.fields.urlAdjunto")}
              value={form.url_adjunto}
              onChange={(url) => setForm({ ...form, url_adjunto: url })}
              permitirDocumentos
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={cerrarFormulario}
                className="flex-1 cursor-pointer rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-night-line dark:text-gray-300 dark:hover:bg-night-hover transition-colors"
              >
                {t("common.cancel")}
              </button>
              <Button variant="primary" fullWidth onClick={guardar} disabled={guardando || formularioIncompleto}>
                {guardando
                  ? t("common.saving")
                  : formularioIncompleto
                    ? t("common.formIncomplete")
                    : t("common.save")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {aEliminar && (
        <ConfirmModal
          icon={Trash2}
          variant="danger"
          ariaLabel={t("comunicados.admin.deleteConfirm.ariaLabel")}
          title={t("comunicados.admin.deleteConfirm.title")}
          description={t("comunicados.admin.deleteConfirm.warning")}
          confirmLabel={t("comunicados.admin.deleteConfirm.confirm")}
          onConfirm={confirmarEliminar}
          isConfirming={eliminando}
          onClose={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
