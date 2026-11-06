import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { Building, Map as MapIcon, Search, UserCog } from "lucide-react";
import { API_BASE_URL } from "@/api/axios";
import {
  buscarAdministradoresConjunto,
  listarConjuntosSinAdministrador,
  asignarConjuntoAdicional,
  type AdministradorConjuntoResumen,
} from "@/lib/adminConjuntoApi";
import { ConjuntoCombobox, type ConjuntoOption } from "@/components/ui/ConjuntoCombobox";
import { Alert } from "@/components/ui/Alert";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface Localidad {
  id_localidad: number;
  nombre_localidad: string;
}

/**
 * ¿Qué? Panel del Administrador del Sistema para vincular directamente un
 *       conjunto sin administrador a un Admin de Conjunto que ya existe
 *       en la plataforma (RQF-016, HU-024) — sin pasar por el flujo de
 *       invitación por correo de RQF-012.
 * ¿Para qué? Buscar primero AL administrador (CA-024.1), y solo entonces
 *           elegir el conjunto entre los que hoy no tienen administrador
 *           (CA-024.2) — en ese orden porque el conjunto a mostrar
 *           depende de nada más que de la lista global, pero mostrar
 *           "a quién" ayuda a confirmar que es la persona correcta antes
 *           de decidir qué asignarle.
 */
export function AsignarConjuntoAdicionalForm() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<AdministradorConjuntoResumen[]>([]);
  const [busquedaHecha, setBusquedaHecha] = useState(false);

  const [seleccionado, setSeleccionado] = useState<AdministradorConjuntoResumen | null>(null);
  const [conjuntoElegido, setConjuntoElegido] = useState<ConjuntoOption | null>(null);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [localidadId, setLocalidadId] = useState<number | "">("");

  const [asignando, setAsignando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ¿Qué? Localidades para el selector — mismo endpoint y mismo patrón que
  //       ya usa InvitarAdminConjuntoForm.
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/v1/geography/localidades`)
      .then((res) => setLocalidades(res.data))
      .catch(() => {});
  }, []);

  // ¿Qué? Búsqueda en vivo del administrador (issue #596): sin botón "Buscar" ni Enter. Espera 350 ms
  //       tras la última tecla y descarta la respuesta si ya llegó una búsqueda más nueva.
  // ¿Para qué? Mismo patrón que el buscador de usuarios del panel. Con el campo vacío no se consulta:
  //           se muestra una pista en vez de listar a todos los administradores.
  // ¿Impacto? Los setState viven dentro del temporizador, no en el cuerpo del efecto.
  useEffect(() => {
    const texto = query.trim();
    if (!texto) return;
    let vigente = true;
    const id = setTimeout(async () => {
      setBuscando(true);
      setError(null);
      try {
        const data = await buscarAdministradoresConjunto(texto);
        if (!vigente) return;
        setResultados(data);
        setBusquedaHecha(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (vigente) setError(err.message || t("desvinculacion.asignarAdicional.errorDefault"));
      } finally {
        if (vigente) setBuscando(false);
      }
    }, 350);
    return () => {
      vigente = false;
      clearTimeout(id);
    };
  }, [query, t]);

  const cambiarBusqueda = (valor: string) => {
    setQuery(valor);
    if (!valor.trim()) {
      setResultados([]);
      setBusquedaHecha(false);
    }
  };

  // ¿Qué? Busca conjuntos sin administrador que coincidan con `query`,
  //       ACOTADOS a la localidad ya elegida.
  // ¿Para qué? Antes se cargaba la lista completa de conjuntos sin
  //           administrador una sola vez por administrador seleccionado —
  //           con miles de conjuntos reales registrados eso ya no escala
  //           (ver ConjuntoCombobox). Elegir la localidad primero acota la
  //           búsqueda a un puñado de opciones, igual que ya hace
  //           InvitarAdminConjuntoForm.
  const fetchConjuntosDisponibles = (query: string): Promise<ConjuntoOption[]> =>
    listarConjuntosSinAdministrador(query, 20, localidadId || undefined).catch(() => []);

  const seleccionarAdministrador = (admin: AdministradorConjuntoResumen) => {
    setSeleccionado(admin);
    setConjuntoElegido(null);
    setLocalidadId("");
    setMensajeExito(null);
    setError(null);
  };

  const asignar = async () => {
    if (!seleccionado || !conjuntoElegido) return;
    setAsignando(true);
    setError(null);
    try {
      await asignarConjuntoAdicional(seleccionado.id_administrador, conjuntoElegido.id_conjunto_residencial);
      setMensajeExito(t("desvinculacion.asignarAdicional.successMessage"));

      const nombreNuevoConjunto = conjuntoElegido.nombre_conjunto;
      setConjuntoElegido(null);

      // ¿Qué? Se actualizan TANTO "resultados" (de donde sale el texto
      //       "Administra:" que se ve en cada tarjeta de la búsqueda) COMO
      //       "seleccionado" — son dos copias separadas del mismo admin,
      //       y solo actualizar una de las dos deja la otra desactualizada.
      setResultados((prev) =>
        prev.map((a) =>
          a.id_administrador === seleccionado.id_administrador
            ? { ...a, conjuntos_actuales: [...a.conjuntos_actuales, nombreNuevoConjunto] }
            : a
        )
      );
      setSeleccionado((prev) =>
        prev ? { ...prev, conjuntos_actuales: [...prev.conjuntos_actuales, nombreNuevoConjunto] } : prev
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("desvinculacion.asignarAdicional.errorDefault"));
    } finally {
      setAsignando(false);
    }
  };

  return (
    // ¿Qué? Igual que InvitarAdminConjuntoForm — vive dentro de un <Modal>
    //       que ya trae su propia tarjeta (fondo, borde, sombra), así que
    //       aquí no se repite esa decoración.
    <div>
      <div className="flex items-center gap-2 mb-4">
        <UserCog className="icon-md text-accent-600" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          {t("desvinculacion.asignarAdicional.sectionTitle")}
        </h3>
      </div>

      {/* Paso 1 — buscar al administrador */}
      <p className="mb-2 text-xs font-bold text-gray-600 dark:text-gray-400">{t("desvinculacion.asignarAdicional.stepSearch")}</p>
      <div className="relative mb-2">
        <Search className="icon-md absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => cambiarBusqueda(e.target.value)}
          placeholder={t("desvinculacion.asignarAdicional.searchPlaceholder")}
          aria-label={t("desvinculacion.asignarAdicional.stepSearch")}
          className="w-full pl-9 p-2.5 border border-edge rounded-xl bg-white text-sm text-gray-900 transition-colors focus:ring-2 focus:ring-accent-500 outline-none dark:border-night-edge dark:bg-night-field dark:text-white"
        />
      </div>
      {!query.trim() && (
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">{t("desvinculacion.asignarAdicional.searchHint")}</p>
      )}
      {buscando && <ProgressBar compacta label={t("common.loading")} className="mb-3" />}

      {error && (
        <div className="mb-3">
          <Alert type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {busquedaHecha && resultados.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("desvinculacion.asignarAdicional.noResults")}</p>
      )}

      {resultados.length > 0 && (
        <div className="space-y-2 mb-4">
          {resultados.map((admin) => (
            <button
              key={admin.id_administrador}
              type="button"
              onClick={() => seleccionarAdministrador(admin)}
              className={`w-full cursor-pointer text-left rounded-xl border px-4 py-3 transition-colors ${
                seleccionado?.id_administrador === admin.id_administrador
                  ? "border-accent-500 bg-accent-50 dark:bg-accent-300/10"
                  : "border-gray-200 hover:border-accent-300 dark:border-night-line dark:hover:border-accent-700"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {admin.nombre} {admin.apellidos}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{admin.correo_electronico}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("desvinculacion.asignarAdicional.currentConjuntos")}{" "}
                {admin.conjuntos_actuales.length > 0
                  ? admin.conjuntos_actuales.join(", ")
                  : t("desvinculacion.asignarAdicional.noConjuntos")}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* ¿Qué? Pasos 2 y 3 (issue #596): se ven desde el inicio, pero quedan bloqueados (atenuados e
                inertes) hasta completar el anterior.
          ¿Para qué? Quien abre el modal ve todo el recorrido de entrada, en vez de que aparezcan
                    campos nuevos a medida que avanza. */}
      <div className="border-t border-gray-100 dark:border-night-line pt-4">
        {mensajeExito && (
          <div className="mb-3">
            <Alert type="success" message={mensajeExito} onClose={() => setMensajeExito(null)} />
          </div>
        )}

        <div inert={!seleccionado} className={`mb-3 transition-opacity ${seleccionado ? "" : "opacity-50"}`}>
          <p className="mb-2 text-xs font-bold text-gray-600 dark:text-gray-400">{t("desvinculacion.asignarAdicional.stepPlace")}</p>
          <label htmlFor="asignar-localidad" className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-2">
            <MapIcon className="icon-md" />
            {t("desvinculacion.asignarAdicional.localityLabel")}
          </label>
          <select
            id="asignar-localidad"
            value={localidadId}
            onChange={(e) => {
              setLocalidadId(e.target.value === "" ? "" : Number(e.target.value));
              setConjuntoElegido(null);
            }}
            className="mb-3 w-full cursor-pointer rounded-xl border border-edge bg-white p-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-accent-500 dark:border-night-edge dark:bg-night-field dark:text-gray-100"
          >
            <option value="">{t("desvinculacion.asignarAdicional.localitySelectPlaceholder")}</option>
            {localidades.map((l) => (
              <option key={l.id_localidad} value={l.id_localidad}>
                {l.nombre_localidad}
              </option>
            ))}
          </select>

          <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-2">
            <Building className="icon-md" />
            {t("desvinculacion.asignarAdicional.selectConjuntoLabel")}
          </label>

          {localidadId === "" ? (
            <p className="rounded-xl border border-dashed border-edge px-3 py-2.5 text-xs text-gray-500 dark:border-night-edge dark:text-gray-400">
              {t("desvinculacion.asignarAdicional.selectLocalityFirst")}
            </p>
          ) : (
            <ConjuntoCombobox
              value={conjuntoElegido}
              onChange={setConjuntoElegido}
              fetchOptions={fetchConjuntosDisponibles}
              placeholder={t("auth.register.fields.conjuntoSearchPlaceholder")}
              emptyLabel={t("desvinculacion.asignarAdicional.noConjuntosDisponibles")}
              loadingLabel={t("common.loading")}
              ariaLabel={t("desvinculacion.asignarAdicional.selectConjuntoLabel")}
            />
          )}
        </div>

        <div inert={!conjuntoElegido} className={`transition-opacity ${conjuntoElegido ? "" : "opacity-50"}`}>
          <p className="mb-2 text-xs font-bold text-gray-600 dark:text-gray-400">{t("desvinculacion.asignarAdicional.stepConfirm")}</p>
          <button
            type="button"
            onClick={asignar}
            disabled={!seleccionado || !conjuntoElegido || asignando}
            className="cursor-pointer rounded-xl bg-accent-700 hover:bg-accent-800 text-white text-sm font-semibold px-4 py-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
          >
            {asignando ? t("desvinculacion.asignarAdicional.assigning") : t("desvinculacion.asignarAdicional.assignButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
