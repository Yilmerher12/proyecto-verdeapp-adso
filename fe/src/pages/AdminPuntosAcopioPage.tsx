import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, MapPin, MapPinOff, Pencil, Plus, Search, Trash2, Warehouse } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/api/axios";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Alert } from "@/components/ui/Alert";
import { PuntoAcopioForm } from "@/components/PuntoAcopioForm";
import { PuntoAcopioPanel } from "@/components/PuntoAcopioPanel";
import { googleMapsUrl } from "@/lib/mapsLink";
import {
  crearPuntoAcopio,
  darDeBajaPuntoAcopio,
  editarPuntoAcopio,
  eliminarPuntoAcopioDefinitivo,
  listarPuntosAcopio,
  reactivarPuntoAcopio,
  type PuntoAcopioAdmin,
  type PuntoAcopioPayload,
} from "@/lib/puntosAcopioApi";

interface Localidad {
  id_localidad: number;
  nombre_localidad: string;
}

type FiltroEstado = "todos" | "activos" | "baja";

interface GrupoLocalidad {
  id: number;
  nombre: string;
  puntos: PuntoAcopioAdmin[];
}

const FORM_VACIO: PuntoAcopioPayload = {
  nombre: "",
  direccion: "",
  id_localidad: 0,
  nombre_encargado: "",
  telefono_contacto: "",
};

// ¿Qué? Minúsculas y sin tildes, para que "engativa" encuentre "Engativá".
const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function AdminPuntosAcopioPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [puntos, setPuntos] = useState<PuntoAcopioAdmin[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [cargando, setCargando] = useState(true);
  // ¿Qué? Errores del formulario (crear/editar) — se muestran dentro de él.
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // ¿Qué? Errores de dar de baja / reactivar / eliminar — antes se guardaban
  //       en errorMsg, que solo se veía dentro del formulario, así que nunca
  //       se mostraban. Ahora salen arriba de la lista.
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  // ¿Qué? Issue #6 (hallazgo F1 de la auditoría) — mismo problema que
  //       AdminContenidoEducativoPage: la carga inicial fallida no se veía.
  const [cargaError, setCargaError] = useState(false);

  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // ¿Qué? El punto abierto en el panel lateral. Se guarda solo el id y el
  //       punto se busca en la lista, para que el panel refleje al instante
  //       lo que quedó guardado tras editar o dar de baja.
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [abrirEditando, setAbrirEditando] = useState(false);
  const [versionComentarios, setVersionComentarios] = useState(0);

  const [aDarDeBaja, setADarDeBaja] = useState<PuntoAcopioAdmin | null>(null);
  const [aEliminar, setAEliminar] = useState<PuntoAcopioAdmin | null>(null);

  // ¿Qué? Búsqueda y filtro de estado — se aplican en el navegador: el backend
  //       ya devuelve la lista completa (incluidos los dados de baja).
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  // ¿Qué? Secciones de localidad que el admin abrió o cerró a mano (id → abierta).
  //       Sin decisión manual, una sección está cerrada, salvo que haya un
  //       filtro activo: entonces se abren solas las que tienen coincidencias.
  const [abiertasManual, setAbiertasManual] = useState<Record<number, boolean>>({});

  const cargar = useCallback(() => {
    if (!user) return;
    setCargando(true);
    setCargaError(false);
    listarPuntosAcopio()
      .then(setPuntos)
      .catch(() => setCargaError(true))
      .finally(() => setCargando(false));
  }, [user]);

  // ¿Qué? Issue #225 — "cargar" faltaba en las dependencias; se silenciaba
  //       la advertencia en vez de arreglarla. Envolverla en useCallback
  //       (arriba) la vuelve estable salvo cuando "user" cambia de verdad,
  //       así que agregarla aquí no dispara peticiones de más.
  useEffect(() => {
    cargar();
    axios
      .get<Localidad[]>(`${API_BASE_URL}/api/v1/geography/localidades`)
      .then((res) => setLocalidades(res.data))
      .catch(() => {});
  }, [cargar]);

  const seleccionado = puntos.find((p) => p.id_punto_acopio === seleccionadoId) ?? null;

  const abrirPanel = (item: PuntoAcopioAdmin, editando: boolean) => {
    setErrorMsg(null);
    setAbrirEditando(editando);
    setSeleccionadoId(item.id_punto_acopio);
  };

  const cerrarCrear = () => {
    setCreando(false);
    setErrorMsg(null);
  };

  const crear = async (payload: PuntoAcopioPayload) => {
    setGuardando(true);
    setErrorMsg(null);
    try {
      await crearPuntoAcopio(payload);
      cerrarCrear();
      cargar();
    } catch {
      setErrorMsg(t("common.saveError"));
    } finally {
      setGuardando(false);
    }
  };

  // ¿Qué? Devuelve si se guardó, para que el panel sepa si vuelve a su vista
  //       de datos o se queda en el formulario mostrando el error.
  const guardarEdicion = async (payload: PuntoAcopioPayload): Promise<boolean> => {
    if (!seleccionado) return false;
    setGuardando(true);
    setErrorMsg(null);
    try {
      await editarPuntoAcopio(seleccionado.id_punto_acopio, payload);
      setVersionComentarios((v) => v + 1);
      cargar();
      return true;
    } catch {
      setErrorMsg(t("common.saveError"));
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const confirmarDarDeBaja = async () => {
    if (!aDarDeBaja) return;
    try {
      await darDeBajaPuntoAcopio(aDarDeBaja.id_punto_acopio);
      setADarDeBaja(null);
      cargar();
    } catch {
      setADarDeBaja(null);
      setErrorAccion(t("adminPuntosAcopio.deactivateError"));
    }
  };

  const reactivar = async (item: PuntoAcopioAdmin) => {
    try {
      await reactivarPuntoAcopio(item.id_punto_acopio);
      cargar();
    } catch {
      setErrorAccion(t("adminPuntosAcopio.reactivateError"));
    }
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    try {
      await eliminarPuntoAcopioDefinitivo(aEliminar.id_punto_acopio);
      setAEliminar(null);
      cargar();
    } catch {
      setAEliminar(null);
      setErrorAccion(t("adminPuntosAcopio.deleteError"));
    }
  };

  const visibles = puntos.filter((p) => {
    if (filtroEstado === "activos" && !p.activo) return false;
    if (filtroEstado === "baja" && p.activo) return false;
    const q = normalizar(busqueda.trim());
    return !q || normalizar(`${p.nombre} ${p.direccion}`).includes(q);
  });

  // ¿Qué? Los puntos visibles agrupados por localidad, en orden alfabético.
  // ¿Para qué? Con decenas de puntos, una lista plana muestra un muro de
  //            direcciones; agrupada, el admin abre solo la zona que busca.
  const grupos: GrupoLocalidad[] = [];
  for (const p of visibles) {
    let grupo = grupos.find((g) => g.id === p.id_localidad);
    if (!grupo) {
      grupo = { id: p.id_localidad, nombre: p.nombre_localidad, puntos: [] };
      grupos.push(grupo);
    }
    grupo.puntos.push(p);
  }
  grupos.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const filtrosActivos = busqueda.trim() !== "" || filtroEstado !== "todos";
  const estaAbierta = (id: number) => abiertasManual[id] ?? filtrosActivos;
  // ¿Qué? Cambiar el filtro o la búsqueda descarta lo abierto/cerrado a mano,
  //       para que las secciones con coincidencias se abran de nuevo solas.
  const cambiarBusqueda = (valor: string) => {
    setBusqueda(valor);
    setAbiertasManual({});
  };
  const cambiarEstado = (estado: FiltroEstado) => {
    setFiltroEstado(estado);
    setAbiertasManual({});
  };

  const totalActivos = puntos.filter((p) => p.activo).length;
  const totalDeBaja = puntos.length - totalActivos;
  const totalLocalidades = new Set(puntos.map((p) => p.id_localidad)).size;
  const chips: { id: FiltroEstado; cantidad: number }[] = [
    { id: "todos", cantidad: puntos.length },
    { id: "activos", cantidad: totalActivos },
    { id: "baja", cantidad: totalDeBaja },
  ];

  const botonAccion =
    "cursor-pointer rounded-lg border border-gray-200 p-2 transition-colors dark:border-[#23392b]";

  const renderFila = (item: PuntoAcopioAdmin) => (
    <div
      key={item.id_punto_acopio}
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-100 bg-white p-3 dark:border-[#23392b] dark:bg-[#0f2018] ${
        item.activo ? "" : "opacity-70"
      }`}
    >
      <div className="min-w-0 flex-1 basis-56">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => abrirPanel(item, false)}
            className="cursor-pointer truncate text-left text-sm font-bold text-gray-900 hover:underline dark:text-white"
          >
            {item.nombre}
          </button>
          {!item.activo && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-[#23392b] dark:text-gray-400">
              {t("adminPuntosAcopio.inactiveBadge")}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {item.direccion}{" "}
          <a
            href={googleMapsUrl(item.direccion, item.nombre_localidad)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("adminPuntosAcopio.mapAria", { nombre: item.nombre })}
            className="cursor-pointer font-semibold text-accent-700 underline dark:text-accent-400"
          >
            {t("adminPuntosAcopio.mapLink")}
          </a>
        </p>
      </div>

      <div className="hidden w-40 shrink-0 text-xs leading-snug md:block">
        <p className="truncate text-gray-500 dark:text-gray-400">{item.nombre_encargado || t("adminPuntosAcopio.noManager")}</p>
        {item.telefono_contacto ? (
          <p className="font-semibold text-gray-700 dark:text-gray-200">{item.telefono_contacto}</p>
        ) : (
          item.activo && (
            <span className="mt-0.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              {t("adminPuntosAcopio.noPhone")}
            </span>
          )
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => abrirPanel(item, true)}
          className={`${botonAccion} text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-[#23392b]`}
          aria-label={t("adminPuntosAcopio.editAria", { nombre: item.nombre })}
        >
          <Pencil className="h-4 w-4" />
        </button>
        {item.activo ? (
          <button
            onClick={() => setADarDeBaja(item)}
            className={`${botonAccion} text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20`}
            aria-label={t("adminPuntosAcopio.deactivateAria", { nombre: item.nombre })}
          >
            <MapPinOff className="h-4 w-4 icon-draw" />
          </button>
        ) : (
          <>
            <button
              onClick={() => reactivar(item)}
              className={`${botonAccion} text-accent-600 hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-900/20`}
              aria-label={t("adminPuntosAcopio.reactivateAria", { nombre: item.nombre })}
            >
              <MapPin className="h-4 w-4 icon-draw" />
            </button>
            <button
              onClick={() => setAEliminar(item)}
              className={`${botonAccion} text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20`}
              aria-label={t("adminPuntosAcopio.deleteAria", { nombre: item.nombre })}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-6">
      <div className="flex items-center justify-between bg-[#ffffff] dark:bg-[#12231a] rounded-2xl border border-gray-100 dark:border-[#23392b] p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("adminPuntosAcopio.title")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("adminPuntosAcopio.subtitle")}
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setCreando(true);
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("adminPuntosAcopio.newPoint")}
        </button>
      </div>

      {puntos.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-[#ffffff] p-3 dark:border-[#23392b] dark:bg-[#12231a]">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => cambiarBusqueda(e.target.value)}
                aria-label={t("adminPuntosAcopio.search.placeholder")}
                placeholder={t("adminPuntosAcopio.search.placeholder")}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/20 dark:border-[#23392b] dark:bg-[#1a3324] dark:text-white"
              />
            </div>
            <div className="flex gap-1.5">
              {chips.map(({ id, cantidad }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => cambiarEstado(id)}
                  aria-pressed={filtroEstado === id}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filtroEstado === id
                      ? "bg-accent-700 text-white"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-[#23392b] dark:bg-[#1a3324] dark:text-gray-200 dark:hover:bg-[#23392b]"
                  }`}
                >
                  {t(`adminPuntosAcopio.search.status.${id}`)} · {cantidad}
                </button>
              ))}
            </div>
          </div>

          <p className="px-1 text-sm text-gray-600 dark:text-gray-300">
            {t("adminPuntosAcopio.summary.pointsIn", {
              puntos: t("adminPuntosAcopio.summary.points", { count: puntos.length }),
              localidades: t("adminPuntosAcopio.summary.localities", { count: totalLocalidades }),
            })}
            {totalDeBaja > 0 && ` · ${t("adminPuntosAcopio.summary.inactive", { count: totalDeBaja })}`}
          </p>
        </>
      )}

      {errorAccion && <Alert type="error" message={errorAccion} onClose={() => setErrorAccion(null)} />}
      {cargando && <LoadingState message={t("common.loading")} />}
      {!cargando && cargaError && <Alert type="error" message={t("adminPuntosAcopio.loadError")} />}

      {!cargando && !cargaError && puntos.length === 0 && (
        <EmptyState icon={Warehouse} message={t("adminPuntosAcopio.emptyState")} />
      )}
      {!cargando && puntos.length > 0 && visibles.length === 0 && (
        <EmptyState icon={Search} message={t("adminPuntosAcopio.search.noResults")} />
      )}

      <div className="space-y-3">
        {grupos.map((grupo) => {
          const abierta = estaAbierta(grupo.id);
          const deBaja = grupo.puntos.filter((p) => !p.activo).length;
          return (
            <section
              key={grupo.id}
              className="rounded-2xl border border-gray-100 bg-[#ffffff] dark:border-[#23392b] dark:bg-[#12231a]"
            >
              <button
                type="button"
                onClick={() => setAbiertasManual((prev) => ({ ...prev, [grupo.id]: !abierta }))}
                aria-expanded={abierta}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl px-4 py-3.5 text-left"
              >
                <span className="text-sm font-bold text-gray-900 dark:text-white">{grupo.nombre}</span>
                <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-accent-800 dark:bg-accent-900/30 dark:text-accent-300">
                  {grupo.puntos.length}
                </span>
                {deBaja > 0 && (
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                    {t("adminPuntosAcopio.summary.inactive", { count: deBaja })}
                  </span>
                )}
                <ChevronDown
                  className={`ml-auto h-4 w-4 text-gray-400 transition-transform ${abierta ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {abierta && <div className="space-y-2 px-3 pb-3">{grupo.puntos.map(renderFila)}</div>}
            </section>
          );
        })}
      </div>

      {creando && (
        <Modal onClose={cerrarCrear} wide closeOnBackdrop={false} aria-label={t("adminPuntosAcopio.newPoint")}>
          <div className="space-y-4 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("adminPuntosAcopio.newPoint")}</h2>
            <PuntoAcopioForm
              inicial={FORM_VACIO}
              localidades={localidades}
              esEdicion={false}
              guardando={guardando}
              errorMsg={errorMsg}
              onErrorClose={() => setErrorMsg(null)}
              onSubmit={crear}
              onCancel={cerrarCrear}
            />
          </div>
        </Modal>
      )}

      {seleccionado && (
        <PuntoAcopioPanel
          // ¿Qué? La key reinicia el panel (modo edición, comentarios) al abrir otro punto.
          key={seleccionado.id_punto_acopio}
          punto={seleccionado}
          localidades={localidades}
          iniciarEditando={abrirEditando}
          version={versionComentarios}
          guardando={guardando}
          errorMsg={errorMsg}
          // ¿Qué? Con una confirmación abierta encima, Esc cierra solo esa.
          cerrarConEscape={!aDarDeBaja && !aEliminar}
          onErrorClose={() => setErrorMsg(null)}
          onClose={() => setSeleccionadoId(null)}
          onGuardar={guardarEdicion}
          onDarDeBaja={setADarDeBaja}
          onReactivar={reactivar}
          onEliminar={setAEliminar}
        />
      )}

      {aDarDeBaja && (
        <ConfirmModal
          icon={MapPinOff}
          variant="danger"
          ariaLabel={t("adminPuntosAcopio.modal.deactivateAriaLabel")}
          title={t("adminPuntosAcopio.deactivateConfirm.title", { nombre: aDarDeBaja.nombre })}
          description={t("adminPuntosAcopio.deactivateConfirm.warning")}
          confirmLabel={t("adminPuntosAcopio.deactivateConfirm.confirm")}
          onConfirm={confirmarDarDeBaja}
          onClose={() => setADarDeBaja(null)}
        />
      )}

      {aEliminar && (
        <ConfirmModal
          icon={Trash2}
          variant="danger"
          ariaLabel={t("adminPuntosAcopio.modal.deleteAriaLabel")}
          title={t("adminPuntosAcopio.deleteConfirm.title", { nombre: aEliminar.nombre })}
          description={t("adminPuntosAcopio.deleteConfirm.warning")}
          confirmLabel={t("adminPuntosAcopio.deleteConfirm.confirm")}
          onConfirm={confirmarEliminar}
          onClose={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
