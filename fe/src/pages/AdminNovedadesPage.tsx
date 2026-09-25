import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  TriangleAlert,
  Archive,
  CalendarClock,
  ChevronDown,
  Clock,
  Newspaper,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Video,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/api/axios";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { GuiaApoyoField } from "@/components/ui/GuiaApoyoField";
import type { ConjuntoOption } from "@/components/ui/ConjuntoCombobox";
import { ConjuntoComboboxMultiple } from "@/components/ui/ConjuntoComboboxMultiple";
import { Alert } from "@/components/ui/Alert";
import { Paginacion } from "@/components/ui/Paginacion";
import { usePaginacion } from "@/hooks/usePaginacion";
import { formatearFechaUTC, formatearFechaCreacion, isoToDateInputUTC } from "@/lib/dateFormat";
import {
  archivarNovedad,
  crearNovedad,
  editarNovedad,
  listarTodasLasNovedades,
  type AlcanceNovedad,
  type Novedad,
} from "@/lib/novedadesApi";

// ¿Qué? Cuántas novedades se piden por página (issue #227).
const TAMANO_PAGINA = 8;

// ¿Qué? Una novedad que vence en 7 días o menos se marca "Expira en N días"
//       — el sistema la archiva sola al vencer (RN-004), así que avisar
//       antes le da tiempo al Admin de editarla o de publicar una nueva.
const DIAS_EXPIRA_PRONTO = 7;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

interface FormState {
  alcance: AlcanceNovedad;
  texto: string;
  url_adjunto: string;
  url_video: string;
  fecha_expiracion: string;
  // ¿Qué? "elegir" = solo a los `conjuntos` marcados (uno o varios);
  //       "todos" = a todos los conjuntos del alcance. Arranca en "elegir"
  //       y sin ninguno marcado: publicar a todos tiene que ser una
  //       decisión, no algo que pase por descuido.
  modoConjunto: "elegir" | "todos";
  conjuntos: ConjuntoOption[];
}

const FORM_VACIO: FormState = {
  alcance: "TODOS",
  texto: "",
  url_adjunto: "",
  url_video: "",
  fecha_expiracion: "",
  modoConjunto: "elegir",
  conjuntos: [],
};

const ALCANCES: AlcanceNovedad[] = ["TODOS", "RESIDENTES", "RECICLADORES", "ADMIN_CONJUNTO"];

// ¿Qué? Issue #7 (hallazgo F2 de la auditoría) — una novedad no tiene
//       título, solo texto libre; se usa un recorte corto como el nombre
//       que distingue cada fila en los aria-label de editar/archivar.
function resumirTexto(texto: string): string {
  return texto.length > 40 ? `${texto.slice(0, 40)}…` : texto;
}

// ¿Qué? Días que le quedan a una novedad activa, redondeando hacia arriba;
//       null si ya está archivada o le falta más de DIAS_EXPIRA_PRONTO.
function diasParaExpirar(item: Novedad): number | null {
  if (item.archivada) return null;
  const dias = Math.ceil((new Date(item.fecha_expiracion).getTime() - Date.now()) / MS_POR_DIA);
  return dias >= 1 && dias <= DIAS_EXPIRA_PRONTO ? dias : null;
}

// ¿Qué? Mismo buscador de conjuntos que ya usa el panel principal del Admin
//       (nunca un <select> con miles de opciones: se pide solo lo escrito).
const fetchConjuntos = (query: string): Promise<ConjuntoOption[]> =>
  axios
    .get(`${API_BASE_URL}/api/v1/geography/conjuntos/todos`, { params: { search: query || undefined, limit: 20 } })
    .then((res) => res.data);

/**
 * ¿Qué? Panel del Administrador del Sistema para publicar, editar y
 *       archivar novedades generales de la plataforma (RQF-015,
 *       HU-032/034/035).
 * ¿Para qué? A diferencia de Comunicados (por conjunto), el alcance base es
 *           un rol de TODA la plataforma — un conjunto puntual es opcional
 *           y vive dentro de "Más opciones".
 */
export function AdminNovedadesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // ¿Qué? Cambia cada vez que hay que volver a pedir la lista (después de
  //       guardar o archivar) sin depender de que cambie un filtro.
  const [version, setVersion] = useState(0);

  // ---------- Filtros y lista recogible ----------
  const [listaAbierta, setListaAbierta] = useState(true);
  const [alcanceFiltro, setAlcanceFiltro] = useState<"" | AlcanceNovedad>("");
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  // ¿Qué? Lo que realmente se manda al backend — se actualiza 350 ms después
  //       de dejar de escribir, para no pedir la lista con cada tecla.
  const [busquedaAplicada, setBusquedaAplicada] = useState("");

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Novedad | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [masOpciones, setMasOpciones] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // ¿Qué? Issue #9 (hallazgo U2 de la auditoría) — archivar se ejecutaba
  //       directo al clic, sin confirmar, a diferencia de eliminar un
  //       comunicado (misma acción conceptual, otra pantalla).
  const [aArchivar, setAArchivar] = useState<Novedad | null>(null);

  const paginacion = usePaginacion(TAMANO_PAGINA, total);
  const { reiniciar, offset } = paginacion;

  useEffect(() => {
    const id = setTimeout(() => {
      setBusquedaAplicada(busqueda);
      reiniciar();
    }, 350);
    return () => clearTimeout(id);
  }, [busqueda, reiniciar]);

  useEffect(() => {
    if (!user) return;
    setCargando(true);
    listarTodasLasNovedades(TAMANO_PAGINA, offset, {
      alcance: alcanceFiltro || undefined,
      incluirArchivadas: verArchivadas,
      search: busquedaAplicada,
    })
      .then(({ items, total: totalRes }) => {
        setNovedades(items);
        setTotal(totalRes);
      })
      .catch((err) => console.error("Error cargando novedades", err))
      .finally(() => setCargando(false));
  }, [user, offset, alcanceFiltro, verArchivadas, busquedaAplicada, version]);

  const cambiarAlcanceFiltro = (valor: "" | AlcanceNovedad) => {
    setAlcanceFiltro(valor);
    reiniciar();
  };

  const cambiarVerArchivadas = () => {
    setVerArchivadas((v) => !v);
    reiniciar();
  };

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setMasOpciones(false);
    setCreando(true);
  };

  const abrirEditar = (item: Novedad) => {
    setForm({
      alcance: item.alcance,
      texto: item.texto,
      url_adjunto: item.url_adjunto ?? "",
      url_video: item.url_video ?? "",
      fecha_expiracion: isoToDateInputUTC(item.fecha_expiracion),
      modoConjunto: "elegir",
      conjuntos: [],
    });
    // ¿Qué? Si ya trae adjunto o video, "Más opciones" se abre sola para
    //       que se vea lo que ya tiene puesto.
    setMasOpciones(Boolean(item.url_adjunto || item.url_video));
    setEditando(item);
  };

  const cerrarFormulario = () => {
    setCreando(false);
    setEditando(null);
    setErrorMsg(null);
  };

  // ¿Qué? Misma condición que ya revisaba "guardar" al hacer clic, pero
  //       calculada ANTES, para deshabilitar el botón en vez de dejar que
  //       el Admin del Sistema se entere después de intentar enviar.
  //       No haber elegido ningún conjunto (ni marcado "Todos") también
  //       cuenta como incompleto — solo al crear: al editar, los conjuntos
  //       ya no cambian.
  const formularioIncompleto =
    !form.texto.trim() || (!editando && form.modoConjunto === "elegir" && form.conjuntos.length === 0);

  const guardar = async () => {
    if (!user) return;
    if (!form.texto.trim()) {
      setErrorMsg(t("novedades.admin.validation.textoRequerido"));
      return;
    }
    if (!editando && form.modoConjunto === "elegir" && form.conjuntos.length === 0) {
      setErrorMsg(t("novedades.admin.validation.conjuntoRequerido"));
      return;
    }

    setGuardando(true);
    setErrorMsg(null);
    const fechaExpiracion = form.fecha_expiracion ? `${form.fecha_expiracion}T23:59:59` : null;

    try {
      if (editando) {
        await editarNovedad(editando.id_novedad, {
          texto: form.texto.trim(),
          url_adjunto: form.url_adjunto.trim() || null,
          url_video: form.url_video.trim() || null,
          fecha_expiracion: fechaExpiracion,
        });
      } else {
        await crearNovedad({
          alcance: form.alcance,
          texto: form.texto.trim(),
          url_adjunto: form.url_adjunto.trim() || null,
          url_video: form.url_video.trim() || null,
          conjuntos: form.modoConjunto === "elegir" ? form.conjuntos.map((c) => c.id_conjunto_residencial) : [],
          fecha_expiracion: fechaExpiracion,
        });
      }
      cerrarFormulario();
      setVersion((v) => v + 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorMsg(err.message || t("common.saveError"));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarArchivar = async () => {
    if (!user || !aArchivar) return;
    try {
      await archivarNovedad(aArchivar.id_novedad);
      setAArchivar(null);
      setVersion((v) => v + 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorMsg(err.message || t("novedades.admin.archiveError"));
    }
  };

  const hayFiltros = alcanceFiltro !== "" || busquedaAplicada.trim() !== "";

  // ¿Qué? Sin conjuntos = "todos"; con uno, su nombre; con varios, la cuenta.
  const etiquetaDestino = (item: Novedad) =>
    item.conjuntos.length === 0
      ? t("novedades.admin.destino.allConjuntos")
      : item.conjuntos.length === 1
        ? item.conjuntos[0].nombre_conjunto
        : t("novedades.admin.destino.several", { count: item.conjuntos.length });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-6">
      <div className="flex items-center justify-between gap-3 bg-[#ffffff] dark:bg-[#12231a] rounded-2xl border border-gray-100 dark:border-[#23392b] p-6 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-500">
            <Newspaper className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("novedades.admin.title")}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("novedades.admin.subtitle")}</p>
          </div>
        </div>
        <button
          onClick={abrirCrear}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-accent-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("novedades.admin.newButton")}
        </button>
      </div>

      {errorMsg && !creando && !editando && (
        <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />
      )}

      {/* Barra recogible — mismo patrón que "Usuarios registrados" (un solo
          <button> que abre/cierra todo lo de abajo). */}
      <div className="bg-[#ffffff] dark:bg-[#12231a] rounded-2xl border border-gray-100 dark:border-[#23392b] shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setListaAbierta((v) => !v)}
          aria-expanded={listaAbierta}
          aria-controls="novedades-lista-cuerpo"
          className="flex w-full cursor-pointer items-center justify-between gap-2 px-5 py-4 text-left"
        >
          <span className="text-sm font-bold text-gray-900 dark:text-white">{t("novedades.admin.listBar")}</span>
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
            {listaAbierta ? t("novedades.admin.collapse") : t("novedades.admin.expand")}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${listaAbierta ? "rotate-180" : ""}`} />
          </span>
        </button>

        {listaAbierta && (
          <div id="novedades-lista-cuerpo" className="space-y-4 border-t border-gray-100 p-5 dark:border-[#23392b]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {/* ¿Qué? "Todas" ya es "sin filtro"; un chip "Todos" (alcance TODOS)
                    al lado se leía como lo mismo — por eso el alcance TODOS no
                    es un chip de filtro. */}
                {(["", ...ALCANCES.filter((a) => a !== "TODOS")] as const).map((a) => (
                  <button
                    key={a || "todas"}
                    type="button"
                    onClick={() => cambiarAlcanceFiltro(a)}
                    aria-pressed={alcanceFiltro === a}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      alcanceFiltro === a
                        ? "border-accent-600 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400"
                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-[#23392b] dark:bg-[#0f2018] dark:text-gray-400"
                    }`}
                  >
                    {a === "" ? t("novedades.admin.filters.all") : t(`novedades.alcances.${a}`)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span id="novedades-ver-archivadas" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {t("novedades.admin.filters.showArchived")}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={verArchivadas}
                  aria-labelledby="novedades-ver-archivadas"
                  onClick={cambiarVerArchivadas}
                  className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors ${
                    verArchivadas ? "bg-accent-600" : "bg-gray-300 dark:bg-[#23392b]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      verArchivadas ? "translate-x-[18px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t("novedades.admin.filters.searchPlaceholder")}
                aria-label={t("novedades.admin.filters.searchPlaceholder")}
                maxLength={100}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-[#23392b] dark:bg-[#0f2018] dark:text-gray-200"
              />
            </div>

            {cargando && <LoadingState message={t("common.loading")} />}

            {!cargando && novedades.length === 0 && (
              <EmptyState
                icon={Newspaper}
                message={hayFiltros ? t("novedades.admin.filters.noResults") : t("novedades.admin.emptyState")}
              />
            )}

            <div className="space-y-3">
              {novedades.map((item) => {
                const dias = diasParaExpirar(item);
                return (
                  <div
                    key={item.id_novedad}
                    className={`rounded-2xl border bg-white p-4 dark:bg-[#0f2018] ${
                      item.archivada ? "border-gray-100 opacity-60 dark:border-[#23392b]" : "border-gray-100 dark:border-[#23392b]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            {t(`novedades.alcances.${item.alcance}`)}
                          </span>
                          <span
                            title={item.conjuntos.map((c) => c.nombre_conjunto).join(", ") || undefined}
                            className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          >
                            {etiquetaDestino(item)}
                          </span>
                          {dias !== null && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                              {t("novedades.admin.expiraPronto", { count: dias })}
                            </span>
                          )}
                          {item.archivada && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-[#1a3324] dark:text-gray-300">
                              {t("novedades.archivedBadge")}
                            </span>
                          )}
                          {item.editado && (
                            <span className="text-xs italic text-gray-500 dark:text-gray-400">{t("comunicados.editedBadge")}</span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{item.texto}</p>
                        {item.conjuntos.length > 1 && (
                          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                            {item.conjuntos.map((c) => c.nombre_conjunto).join(" · ")}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                          {item.url_adjunto && (
                            <a
                              href={item.url_adjunto.startsWith("http") ? item.url_adjunto : `${API_BASE_URL}${item.url_adjunto}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              {t("comunicados.viewAttachment")}
                            </a>
                          )}
                          {item.url_video && (
                            <a
                              href={item.url_video}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400"
                            >
                              <Video className="h-3.5 w-3.5" />
                              {t("novedades.admin.viewVideo")}
                            </a>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-[#23392b] dark:text-gray-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {t("novedades.admin.creadoEl", { fecha: formatearFechaCreacion(item.created_at) })}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {t("novedades.admin.expiraEl", { fecha: formatearFechaUTC(item.fecha_expiracion) })}
                          </span>
                        </div>
                      </div>
                      {!item.archivada && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => abrirEditar(item)}
                            className="cursor-pointer rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50 dark:border-[#23392b] dark:text-gray-300 dark:hover:bg-[#23392b]"
                            aria-label={t("novedades.admin.editAria", { resumen: resumirTexto(item.texto) })}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setAArchivar(item)}
                            className="cursor-pointer rounded-lg border border-gray-200 p-2 text-amber-600 transition-colors hover:bg-amber-50 dark:border-[#23392b] dark:hover:bg-amber-900/20"
                            aria-label={t("novedades.admin.archiveAria", { resumen: resumirTexto(item.texto) })}
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {listaAbierta && !cargando && total > 0 && (
          <div className="border-t border-gray-100 dark:border-[#23392b]">
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
      </div>

      {(creando || editando) && (
        <Modal
          onClose={cerrarFormulario}
          wide
          closeOnBackdrop={false}
          aria-label={editando ? t("novedades.admin.editTitle") : t("novedades.admin.newButton")}
        >
          <div className="p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editando ? t("novedades.admin.editTitle") : t("novedades.admin.newButton")}
            </h2>

            {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}

            {!editando ? (
              <div>
                {/* Grupo de botones mutuamente excluyentes, no un control
                    único — role="radiogroup" + aria-labelledby asocia el
                    texto descriptivo, role="radio" + aria-checked en cada
                    botón comunica cuál está elegido (antes solo con una
                    clase CSS; mismo patrón corregido en
                    AdminConjuntoComunicadosPage.tsx). */}
                <span id="novedad-alcance-label" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {t("novedades.admin.fields.alcance")} <span className="text-red-500">*</span>
                </span>
                <div role="radiogroup" aria-labelledby="novedad-alcance-label" className="grid grid-cols-2 gap-2">
                  {ALCANCES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      role="radio"
                      aria-checked={form.alcance === a}
                      onClick={() => setForm({ ...form, alcance: a })}
                      className={`cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                        form.alcance === a
                          ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400"
                          : "border-gray-200 text-gray-600 hover:border-accent-300 dark:border-[#23392b] dark:text-gray-300"
                      }`}
                    >
                      {t(`novedades.alcances.${a}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-[#1a3324]/60">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("novedades.admin.fields.alcance")}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {t(`novedades.alcances.${editando.alcance}`)}
                  {" · "}
                  {editando.conjuntos.length === 0
                    ? t("novedades.admin.destino.allConjuntos")
                    : editando.conjuntos.map((c) => c.nombre_conjunto).join(", ")}
                </p>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{t("novedades.admin.alcanceNoEditable")}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("novedades.admin.conjunto.notEditable")}</p>
              </div>
            )}

            {!editando && (
              <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-900/10">
                <div className="flex items-center justify-between gap-2">
                  <span id="novedad-conjunto-label" className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    {t("novedades.admin.conjunto.label")} <span className="text-red-500">*</span>{" "}
                    <span className="font-medium text-gray-500 dark:text-gray-400">— {t("novedades.admin.conjunto.question")}</span>
                  </span>
                  {form.modoConjunto === "elegir" && form.conjuntos.length > 0 && (
                    <span className="shrink-0 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                      {t("novedades.admin.conjunto.count", { count: form.conjuntos.length })}
                    </span>
                  )}
                </div>

                <div role="radiogroup" aria-labelledby="novedad-conjunto-label" className="grid grid-cols-2 gap-2">
                  {(["elegir", "todos"] as const).map((modo) => (
                    <button
                      key={modo}
                      type="button"
                      role="radio"
                      aria-checked={form.modoConjunto === modo}
                      onClick={() => setForm({ ...form, modoConjunto: modo })}
                      className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                        form.modoConjunto === modo
                          ? "border-indigo-600 bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200"
                          : "border-gray-200 bg-white text-gray-500 hover:border-indigo-300 dark:border-[#23392b] dark:bg-[#0f2018] dark:text-gray-400"
                      }`}
                    >
                      {modo === "elegir" ? t("novedades.admin.conjunto.pick") : t("novedades.admin.conjunto.all")}
                    </button>
                  ))}
                </div>

                {form.modoConjunto === "elegir" ? (
                  <div className="space-y-2">
                    <ConjuntoComboboxMultiple
                      value={form.conjuntos}
                      onChange={(c) => setForm({ ...form, conjuntos: c })}
                      fetchOptions={fetchConjuntos}
                      placeholder={t("novedades.admin.conjunto.searchPlaceholder")}
                      ariaLabel={t("novedades.admin.conjunto.label")}
                      loadingLabel={t("novedades.admin.conjunto.searching")}
                      emptyLabel={t("novedades.admin.conjunto.noResults")}
                    />
                    {form.conjuntos.length === 0 && (
                      <p role="status" className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        {t("novedades.admin.conjunto.pickAtLeastOne")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div role="status" className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-snug text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                    <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 icon-appear icon-ring" />
                    {t("novedades.admin.conjunto.massWarning")}
                  </div>
                )}

                <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("novedades.admin.conjunto.example")}</p>
              </div>
            )}

            <div>
              <label htmlFor="novedad-texto" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                {t("novedades.admin.fields.texto")} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="novedad-texto"
                value={form.texto}
                onChange={(e) => setForm({ ...form, texto: e.target.value })}
                rows={5}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-[#23392b] dark:bg-[#1a3324] dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="novedad-fecha-expiracion" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                {t("novedades.admin.fields.fechaExpiracion")}
              </label>
              <input
                id="novedad-fecha-expiracion"
                type="date"
                value={form.fecha_expiracion}
                onChange={(e) => setForm({ ...form, fecha_expiracion: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-[#23392b] dark:bg-[#1a3324] dark:text-white"
              />
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{t("novedades.admin.fields.fechaExpiracionHint")}</p>
            </div>

            {/* "Más opciones": todo lo que no hace falta para un aviso rápido
                de solo texto queda recogido por defecto. */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-[#23392b]">
              <button
                type="button"
                onClick={() => setMasOpciones((v) => !v)}
                aria-expanded={masOpciones}
                aria-controls="novedad-mas-opciones"
                className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                  {t("novedades.admin.moreOptions.title")}{" "}
                  <span className="font-medium text-gray-400 dark:text-gray-500">— {t("novedades.admin.moreOptions.hint")}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  {masOpciones ? t("novedades.admin.moreOptions.hide") : t("novedades.admin.moreOptions.show")}
                  <ChevronDown className={`h-3 w-3 transition-transform ${masOpciones ? "rotate-180" : ""}`} />
                </span>
              </button>

              {masOpciones && (
                <div id="novedad-mas-opciones" className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-3 dark:border-[#23392b]">
                  <GuiaApoyoField
                    label={t("novedades.admin.fields.urlAdjunto")}
                    value={form.url_adjunto}
                    onChange={(url) => setForm({ ...form, url_adjunto: url })}
                  />

                  <div>
                    <label htmlFor="novedad-url-video" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      {t("novedades.admin.fields.urlVideo")}
                    </label>
                    <input
                      id="novedad-url-video"
                      value={form.url_video}
                      onChange={(e) => setForm({ ...form, url_video: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-[#23392b] dark:bg-[#1a3324] dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={cerrarFormulario}
                className="flex-1 cursor-pointer rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-[#23392b] dark:text-gray-300 dark:hover:bg-[#23392b] transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={guardar}
                disabled={guardando || formularioIncompleto}
                className="flex-1 cursor-pointer rounded-xl bg-accent-700 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                {guardando
                  ? t("common.saving")
                  : formularioIncompleto
                    ? t("common.formIncomplete")
                    : t("common.save")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {aArchivar && (
        <ConfirmModal
          icon={Archive}
          variant="danger"
          ariaLabel={t("novedades.admin.archiveConfirm.ariaLabel")}
          title={t("novedades.admin.archiveConfirm.title")}
          description={t("novedades.admin.archiveConfirm.warning")}
          confirmLabel={t("novedades.admin.archiveConfirm.confirm")}
          onConfirm={confirmarArchivar}
          onClose={() => setAArchivar(null)}
        />
      )}
    </div>
  );
}
