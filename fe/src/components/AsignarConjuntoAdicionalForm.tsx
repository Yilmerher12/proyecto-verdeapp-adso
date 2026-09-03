import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Search, UserCog } from "lucide-react";
import {
  buscarAdministradoresConjunto,
  listarConjuntosSinAdministrador,
  asignarConjuntoAdicional,
  type AdministradorConjuntoResumen,
} from "@/lib/adminConjuntoApi";
import { ConjuntoCombobox, type ConjuntoOption } from "@/components/ui/ConjuntoCombobox";

interface AsignarConjuntoAdicionalFormProps {
  // ¿Qué? El token de sesión del Administrador del Sistema.
  token: string;
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
export function AsignarConjuntoAdicionalForm({ token }: AsignarConjuntoAdicionalFormProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<AdministradorConjuntoResumen[]>([]);
  const [busquedaHecha, setBusquedaHecha] = useState(false);

  const [seleccionado, setSeleccionado] = useState<AdministradorConjuntoResumen | null>(null);
  const [conjuntoElegido, setConjuntoElegido] = useState<ConjuntoOption | null>(null);

  const [asignando, setAsignando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuscando(true);
    setError(null);
    try {
      const data = await buscarAdministradoresConjunto(query.trim(), token);
      setResultados(data);
      setBusquedaHecha(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.response?.data?.detail || t("desvinculacion.asignarAdicional.errorDefault"));
    } finally {
      setBuscando(false);
    }
  };

  // ¿Qué? Busca conjuntos sin administrador que coincidan con `query`.
  // ¿Para qué? Antes se cargaba la lista completa de conjuntos sin
  //           administrador una sola vez por administrador seleccionado —
  //           con miles de conjuntos reales registrados eso ya no escala
  //           (ver ConjuntoCombobox).
  const fetchConjuntosDisponibles = (query: string): Promise<ConjuntoOption[]> =>
    listarConjuntosSinAdministrador(token, query, 20).catch(() => []);

  const seleccionarAdministrador = (admin: AdministradorConjuntoResumen) => {
    setSeleccionado(admin);
    setConjuntoElegido(null);
    setMensajeExito(null);
    setError(null);
  };

  const asignar = async () => {
    if (!seleccionado || !conjuntoElegido) return;
    setAsignando(true);
    setError(null);
    try {
      await asignarConjuntoAdicional(seleccionado.id_administrador, conjuntoElegido.id_conjunto_residencial, token);
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
      setError(err?.response?.data?.detail || t("desvinculacion.asignarAdicional.errorDefault"));
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
        <UserCog className="h-4 w-4 text-green-600" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          {t("desvinculacion.asignarAdicional.sectionTitle")}
        </h3>
      </div>

      <form onSubmit={buscar} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("desvinculacion.asignarAdicional.searchPlaceholder")}
            className="w-full pl-9 p-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:ring-2 focus:ring-green-500 outline-none dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={buscando}
          className="rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 transition-colors disabled:opacity-50"
        >
          {t("desvinculacion.asignarAdicional.searchButton")}
        </button>
      </form>

      {error && (
        <p className="mb-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
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
              className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                seleccionado?.id_administrador === admin.id_administrador
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-200 hover:border-green-300 dark:border-[#2a4d34] dark:hover:border-green-700"
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

      {seleccionado && (
        <div className="border-t border-gray-100 dark:border-[#2a4d34] pt-4">
          <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-2">
            <Building2 className="w-4 h-4" />
            {t("desvinculacion.asignarAdicional.selectConjuntoLabel")}
          </label>

          {mensajeExito && (
            <p className="mb-3 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg dark:bg-green-900/20 dark:text-green-400">
              {mensajeExito}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <ConjuntoCombobox
                value={conjuntoElegido}
                onChange={setConjuntoElegido}
                fetchOptions={fetchConjuntosDisponibles}
                placeholder={t("auth.register.fields.conjuntoSearchPlaceholder")}
                emptyLabel={t("desvinculacion.asignarAdicional.noConjuntosDisponibles")}
                loadingLabel={t("common.loading")}
              />
            </div>
            <button
              type="button"
              onClick={asignar}
              disabled={!conjuntoElegido || asignando}
              className="rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 transition-colors disabled:opacity-50 h-fit mt-1"
            >
              {asignando ? t("desvinculacion.asignarAdicional.assigning") : t("desvinculacion.asignarAdicional.assignButton")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
