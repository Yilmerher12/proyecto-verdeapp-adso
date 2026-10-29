import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, MapPin, MapPinOff, Pencil, Plus, Search, Trash2, Warehouse } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/api/axios";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Alert } from "@/components/ui/Alert";
import { MenuAcciones, type OpcionMenu } from "@/components/ui/MenuAcciones";
import { ComentariosPunto } from "@/components/ComentariosPunto";
import { PuntoAcopioForm } from "@/components/PuntoAcopioForm";
import { TablaPuntosAcopio } from "@/components/TablaPuntosAcopio";
import { normalizarTexto } from "@/lib/normalizarTexto";
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

const FORM_VACIO: PuntoAcopioPayload = {
  nombre: "",
  direccion: "",
  id_localidad: 0,
  nombre_encargado: "",
  telefono_contacto: "",
};

export function AdminPuntosAcopioPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [puntos, setPuntos] = useState<PuntoAcopioAdmin[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [cargando, setCargando] = useState(true);
  // ¿Qué? Errores del formulario (crear/editar) — se muestran dentro de él.
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // ¿Qué? Errores de dar de baja / reactivar / eliminar — salen arriba de la tabla.
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  // ¿Qué? Issue #6 (hallazgo F1 de la auditoría) — mismo problema que
  //       AdminContenidoEducativoPage: la carga inicial fallida no se veía.
  const [cargaError, setCargaError] = useState(false);

  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // ¿Qué? El punto que se edita en el modal. Se guarda solo el id y el punto se
  //       busca en la lista, para que el formulario parta de lo ya guardado.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  // ¿Qué? La fila desplegada de la tabla (una a la vez) y la versión de los
  //       comentarios, que sube al guardar una edición para que se recarguen.
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [versionComentarios, setVersionComentarios] = useState(0);

  const [aDarDeBaja, setADarDeBaja] = useState<PuntoAcopioAdmin | null>(null);
  const [aEliminar, setAEliminar] = useState<PuntoAcopioAdmin | null>(null);
  // ¿Qué? true mientras corre dar de baja / eliminar, y el id del punto que se está reactivando.
  // ¿Para qué? Issue #458: estas acciones no mostraban nada mientras tardaban
  //           y se podían tocar dos veces.
  const [confirmando, setConfirmando] = useState(false);
  const [reactivandoId, setReactivandoId] = useState<string | null>(null);

  // ¿Qué? Búsqueda y filtros de estado y localidad — se aplican en el navegador:
  //       el backend ya devuelve la lista completa (incluidos los dados de baja).
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [filtroLocalidad, setFiltroLocalidad] = useState<number | "">("");

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

  const editando = puntos.find((p) => p.id_punto_acopio === editandoId) ?? null;

  const cerrarCrear = () => {
    setCreando(false);
    setErrorMsg(null);
  };

  const cerrarEditar = () => {
    setEditandoId(null);
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

  // ¿Qué? Si se guarda, el modal se cierra; si falla, se queda con el error a la vista.
  const guardarEdicion = async (payload: PuntoAcopioPayload) => {
    if (!editando) return;
    setGuardando(true);
    setErrorMsg(null);
    try {
      await editarPuntoAcopio(editando.id_punto_acopio, payload);
      setVersionComentarios((v) => v + 1);
      cerrarEditar();
      cargar();
    } catch {
      setErrorMsg(t("common.saveError"));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarDarDeBaja = async () => {
    if (!aDarDeBaja) return;
    setConfirmando(true);
    try {
      await darDeBajaPuntoAcopio(aDarDeBaja.id_punto_acopio);
      setADarDeBaja(null);
      cargar();
    } catch {
      setADarDeBaja(null);
      setErrorAccion(t("adminPuntosAcopio.deactivateError"));
    } finally {
      setConfirmando(false);
    }
  };

  const reactivar = async (item: PuntoAcopioAdmin) => {
    setReactivandoId(item.id_punto_acopio);
    try {
      await reactivarPuntoAcopio(item.id_punto_acopio);
      cargar();
    } catch {
      setErrorAccion(t("adminPuntosAcopio.reactivateError"));
    } finally {
      setReactivandoId(null);
    }
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    setConfirmando(true);
    try {
      await eliminarPuntoAcopioDefinitivo(aEliminar.id_punto_acopio);
      setAEliminar(null);
      cargar();
    } catch {
      setAEliminar(null);
      setErrorAccion(t("adminPuntosAcopio.deleteError"));
    } finally {
      setConfirmando(false);
    }
  };

  const visibles = puntos.filter((p) => {
    if (filtroEstado === "activos" && !p.activo) return false;
    if (filtroEstado === "baja" && p.activo) return false;
    if (filtroLocalidad !== "" && p.id_localidad !== filtroLocalidad) return false;
    const q = normalizarTexto(busqueda.trim());
    return !q || normalizarTexto(`${p.nombre} ${p.direccion}`).includes(q);
  });

  // ¿Qué? Cambiar la búsqueda o un filtro pliega la fila abierta: ya puede no estar a la vista.
  const cambiarBusqueda = (valor: string) => {
    setBusqueda(valor);
    setAbiertoId(null);
  };
  const cambiarEstado = (estado: FiltroEstado) => {
    setFiltroEstado(estado);
    setAbiertoId(null);
  };
  const cambiarLocalidad = (valor: number | "") => {
    setFiltroLocalidad(valor);
    setAbiertoId(null);
  };
  const alternarFila = (id: string) => setAbiertoId((actual) => (actual === id ? null : id));

  // ¿Qué? Solo las localidades que tienen algún punto: elegir una sin puntos daría una tabla vacía.
  const localidadesConPuntos = Array.from(new Map(puntos.map((p) => [p.id_localidad, p.nombre_localidad])))
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const totalActivos = puntos.filter((p) => p.activo).length;
  const totalDeBaja = puntos.length - totalActivos;
  const totalLocalidades = new Set(puntos.map((p) => p.id_localidad)).size;
  const chips: { id: FiltroEstado; cantidad: number }[] = [
    { id: "todos", cantidad: puntos.length },
    { id: "activos", cantidad: totalActivos },
    { id: "baja", cantidad: totalDeBaja },
  ];

  // ¿Qué? Menú del kebab de cada fila. Un punto activo se puede dar de baja; uno de baja,
  //       reactivar o eliminar definitivamente (solo así se borra por completo).
  // ¿Para qué? Antes eran 4 botones de ícono por fila; en el menú cada acción dice su nombre.
  const menuDe = (p: PuntoAcopioAdmin) => {
    const panel = "adminPuntosAcopio.panel";
    const grupos: OpcionMenu[][] = [
      [
        { id: "ver", label: t("puntosAcopioTabla.menu.view"), icon: Eye, onSelect: () => alternarFila(p.id_punto_acopio) },
        { id: "editar", label: t("common.edit"), icon: Pencil, onSelect: () => setEditandoId(p.id_punto_acopio) },
      ],
    ];
    if (p.activo) {
      grupos.push([{ id: "baja", label: t(`${panel}.deactivate`), icon: MapPinOff, peligrosa: true, onSelect: () => setADarDeBaja(p) }]);
    } else {
      grupos.push([{ id: "reactivar", label: t(`${panel}.reactivate`), icon: MapPin, onSelect: () => reactivar(p) }]);
      grupos.push([{ id: "eliminar", label: t(`${panel}.deleteForever`), icon: Trash2, peligrosa: true, onSelect: () => setAEliminar(p) }]);
    }
    return <MenuAcciones ariaLabel={t("puntosAcopioTabla.menu.actionsFor", { nombre: p.nombre })} grupos={grupos} />;
  };

  return (
    <div className="mx-auto max-w-5xl 2xl:max-w-6xl space-y-6 pt-6">
      <div className="flex items-center justify-between bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
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
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition-colors dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
        >
          <Plus className="icon-md" />
          {t("adminPuntosAcopio.newPoint")}
        </button>
      </div>

      {puntos.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 dark:border-night-line dark:bg-night-card">
            <div className="relative min-w-[12.5rem] flex-1">
              <Search className="icon-md pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => cambiarBusqueda(e.target.value)}
                aria-label={t("adminPuntosAcopio.search.placeholder")}
                placeholder={t("adminPuntosAcopio.search.placeholder")}
                className="w-full rounded-xl border border-edge bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/20 dark:border-night-edge dark:bg-night-field dark:text-white"
              />
            </div>
            <select
              value={filtroLocalidad}
              onChange={(e) => cambiarLocalidad(e.target.value === "" ? "" : Number(e.target.value))}
              aria-label={t("adminPuntosAcopio.fields.locality")}
              className="cursor-pointer rounded-xl border border-edge bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-night-edge dark:bg-night-field dark:text-gray-200"
            >
              <option value="">{t("directorio.allLocalities")}</option>
              {localidadesConPuntos.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
            <div className="flex gap-1.5">
              {chips.map(({ id, cantidad }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => cambiarEstado(id)}
                  aria-pressed={filtroEstado === id}
                  className={`touch-target-h cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filtroEstado === id
                      ? "bg-accent-700 text-white dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-night-line dark:bg-night-field dark:text-gray-200 dark:hover:bg-night-hover"
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

      {visibles.length > 0 && (
        <TablaPuntosAcopio
          puntos={visibles}
          variante="gestion"
          abiertoId={abiertoId}
          onAlternar={alternarFila}
          renderMenu={menuDe}
          renderExtra={(p) => <ComentariosPunto idPunto={p.id_punto_acopio} version={versionComentarios} />}
          ocupadoId={reactivandoId}
        />
      )}

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

      {editando && (
        <Modal onClose={cerrarEditar} wide closeOnBackdrop={false} aria-label={t("adminPuntosAcopio.modal.editTitle")}>
          <div className="space-y-4 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("adminPuntosAcopio.modal.editTitle")}</h2>
            <PuntoAcopioForm
              // ¿Qué? La key reinicia el formulario al editar otro punto.
              key={editando.id_punto_acopio}
              inicial={{
                nombre: editando.nombre,
                direccion: editando.direccion,
                id_localidad: editando.id_localidad,
                nombre_encargado: editando.nombre_encargado ?? "",
                telefono_contacto: editando.telefono_contacto ?? "",
              }}
              localidades={localidades}
              esEdicion
              guardando={guardando}
              errorMsg={errorMsg}
              onErrorClose={() => setErrorMsg(null)}
              onSubmit={guardarEdicion}
              onCancel={cerrarEditar}
            />
          </div>
        </Modal>
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
          isConfirming={confirmando}
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
          isConfirming={confirmando}
          onClose={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
