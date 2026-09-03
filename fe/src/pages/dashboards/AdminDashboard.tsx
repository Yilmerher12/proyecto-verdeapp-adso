import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Users, Database, UserPlus, UserCog, Search, MapPin, ChevronLeft, ChevronRight, Building2, Ban, CircleCheck } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { InvitarAdminConjuntoForm } from "@/components/InvitarAdminConjuntoForm";
import { SolicitudesDesvinculacion } from "@/components/SolicitudesDesvinculacion";
import { AsignarConjuntoAdicionalForm } from "@/components/AsignarConjuntoAdicionalForm";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";

interface ResidenteRow {
  Correo: string;
  Nombre: string;
  Apellido: string;
  Conjunto: string;
  Bloque: string;
  Apartamento: string;
  Habilitado: boolean;
}

interface RecicladorRow {
  Correo: string;
  Nombre_Completo: string;
  Asociacion: string;
  Habilitado: boolean;
}

interface AdminConjuntoRow {
  Correo: string;
  Nombre: string;
  Apellido: string;
  Teléfono: string;
  Conjuntos: string;
  Habilitado: boolean;
}

interface Localidad {
  id_localidad: number;
  nombre_localidad: string;
}

type TabUsuarios = "residentes" | "recicladores" | "administradores";

// ¿Qué? Filas por página — el mismo número que ya se manda como límite al
//       backend en cada endpoint.
const TAMANO_PAGINA = 10;

const ENDPOINT_POR_TAB: Record<TabUsuarios, string> = {
  residentes: "vista-residentes",
  recicladores: "sp-recicladores",
  administradores: "administradores-conjunto",
};

export function AdminDashboard() {
  const { t } = useTranslation();
  const { user, accessToken } = useAuth();
  // ¿Qué? "Invitar administrador" y "Asignar conjunto adicional" abren cada
  //       una su propio <Modal> en vez de expandirse dentro de la tarjeta.
  //       Antes, al expandir el formulario inline, esa tarjeta crecía mucho
  //       más que la de al lado (que no cambia de tamaño) y quedaba un
  //       hueco enorme junto al formulario largo — con un modal, las dos
  //       tarjetas de la fila SIEMPRE se ven igual de compactas, sin
  //       importar si el admin está usando una, la otra, ninguna o ambas.
  const [mostrarModalInvitar, setMostrarModalInvitar] = useState(false);
  const [mostrarModalAsignar, setMostrarModalAsignar] = useState(false);

  // ¿Qué? Antes había 3 tablas potencialmente pidiendo miles de filas cada
  //       una, sin buscador ni paginación. Ahora solo se pide la pestaña
  //       activa, con búsqueda + filtro de localidad + paginación — el
  //       mismo patrón de "pestañas por tipo + filtro compartido" que ya
  //       usa el Directorio (DirectorioPage.tsx).
  const [tab, setTab] = useState<TabUsuarios>("residentes");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [localidadId, setLocalidadId] = useState<number | "">("");
  const [pagina, setPagina] = useState(0);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);

  const [residentesData, setResidentesData] = useState<ResidenteRow[]>([]);
  const [recicladoresData, setRecicladoresData] = useState<RecicladorRow[]>([]);
  const [administradoresData, setAdministradoresData] = useState<AdminConjuntoRow[]>([]);
  const [total, setTotal] = useState(0);

  // Antes solo mirábamos si la lista estaba vacía para decidir si mostrar
  // "Cargando datos..." — pero una lista vacía DE VERDAD (un conjunto sin
  // residentes todavía) se veía igual que "todavía no ha llegado la
  // respuesta", y el mensaje de "Cargando..." se quedaba ahí para siempre.
  // Con esto sí distinguimos "sigue cargando" de "ya cargó y no hay nada".
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  // ¿Qué? Localidades para el filtro — mismo endpoint que ya usa el
  //       Directorio y el formulario de registro.
  useEffect(() => {
    if (!accessToken) return;
    axios
      .get(`${API_BASE_URL}/api/v1/geography/localidades`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => setLocalidades(res.data))
      .catch(() => {});
  }, [accessToken]);

  // ¿Qué? Búsqueda en tiempo real, con un pequeño "debounce" de 350ms.
  // ¿Para qué? Antes había que presionar Enter — funcional, pero incómodo.
  //           Sin el debounce, cada tecla dispararía su propia petición al
  //           backend (y una respuesta que llega tarde podría pisar a una
  //           más reciente). Esperar a que la persona deje de escribir por
  //           un instante evita ambas cosas.
  // ¿Impacto? setSearch/setPagina viven dentro del callback de
  //           setTimeout, no en el cuerpo del efecto — no dispara la regla
  //           de "no llamar setState directo en un efecto", porque no se
  //           ejecutan de forma síncrona durante el render.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagina(0);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  // ¿Qué? Antes esto eran 2 llamadas fijas, sin header de Authorization
  //       (rebotaban con 401 siempre) y sin ningún parámetro — traían la
  //       tabla completa de un golpe, sin buscador ni paginación.
  // ¿Impacto? Ahora se pide solo la pestaña activa, con el token de
  //           sesión y los filtros — escala a miles de usuarios sin
  //           traerlos todos de una vez.
  useEffect(() => {
    if (!accessToken) return;
    // ¿Qué? Reiniciar "cargando"/"error" antes de disparar la petición —
    //       mismo patrón exacto que ya usa DirectorioPage.tsx sin que la
    //       regla lo marque ahí. No forma un ciclo: ninguno de los dos
    //       estados es dependencia de este efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true);
    setError(false);

    const params: Record<string, string | number> = {
      limit: TAMANO_PAGINA,
      offset: pagina * TAMANO_PAGINA,
    };
    if (search.trim()) params.search = search.trim();
    if (localidadId) params.localidad_id = localidadId;

    axios
      .get(`${API_BASE_URL}/api/v1/admin/${ENDPOINT_POR_TAB[tab]}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      })
      .then((res) => {
        const { items, total: totalRes } = res.data as { items: unknown[]; total: number };
        if (tab === "residentes") setResidentesData(items as ResidenteRow[]);
        else if (tab === "recicladores") setRecicladoresData(items as RecicladorRow[]);
        else setAdministradoresData(items as AdminConjuntoRow[]);
        setTotal(totalRes);
      })
      .catch((err) => {
        console.error("Error cargando usuarios", err);
        setError(true);
      })
      .finally(() => setCargando(false));
  }, [accessToken, tab, search, localidadId, pagina]);

  // ¿Qué? Cada uno de estos 3 manejadores cambia un filtro Y reinicia la
  //       página a la primera — evita quedar "varado" en una página que ya
  //       no tiene resultados con el filtro nuevo (antes esto vivía en un
  //       useEffect aparte, solo para llamar setPagina).
  const cambiarTab = (nuevaTab: TabUsuarios) => {
    setTab(nuevaTab);
    setPagina(0);
  };

  const cambiarLocalidad = (valor: number | "") => {
    setLocalidadId(valor);
    setPagina(0);
  };

  // ¿Qué? El profesor pidió, en la sustentación, que esta vista permitiera
  //       HACER algo con los usuarios, no solo consultarlos — esta es esa
  //       primera acción: activar/desactivar una cuenta.
  // ¿Para qué? "confirmando" guarda el correo y el estado nuevo mientras se
  //           confirma en el modal, para no desactivar a nadie con un solo
  //           clic accidental.
  const [confirmando, setConfirmando] = useState<{ correo: string; nuevoEstado: boolean } | null>(null);
  const [actualizando, setActualizando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const ejecutarCambioHabilitado = async () => {
    if (!confirmando || !accessToken) return;
    setActualizando(true);
    setErrorAccion(null);
    try {
      await axios.patch(
        `${API_BASE_URL}/api/v1/admin/usuarios/${encodeURIComponent(confirmando.correo)}/habilitado`,
        { habilitado: confirmando.nuevoEstado },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      // ¿Qué? Actualiza la fila en el arreglo correspondiente a la pestaña
      //       activa, sin tener que recargar toda la página desde el
      //       servidor otra vez.
      const actualizarFila = <T extends { Correo: string; Habilitado: boolean }>(filas: T[]): T[] =>
        filas.map((fila) =>
          fila.Correo === confirmando.correo ? { ...fila, Habilitado: confirmando.nuevoEstado } : fila
        );
      setResidentesData(actualizarFila);
      setRecicladoresData(actualizarFila);
      setAdministradoresData(actualizarFila);
      setConfirmando(null);
    } catch {
      setErrorAccion(t("dashboards.admin.usersSection.status.updateError"));
    } finally {
      setActualizando(false);
    }
  };

  // ¿Qué? Celda compartida por las 3 tablas: muestra el estado y, si no es
  //       la propia cuenta del Admin del Sistema (el backend rechaza
  //       desactivarse a sí mismo), el botón para cambiarlo.
  // ¿Qué? Estado (insignia, solo lectura) y Acciones (botón real) van en
  //       columnas SEPARADAS a propósito — antes compartían una celda y el
  //       botón, con solo texto de color, se confundía visualmente con la
  //       insignia de al lado (ambos eran "una etiqueta de color"). El
  //       componente Button ya reutilizado en el resto de la app (relleno
  //       sólido o borde marcado) deja mucho más claro que uno es estado y
  //       el otro es una acción para pulsar.
  const celdaBadgeEstado = (habilitado: boolean) => (
    <td className="px-5 py-3">
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          habilitado
            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
        }`}
      >
        {habilitado
          ? t("dashboards.admin.usersSection.status.active")
          : t("dashboards.admin.usersSection.status.inactive")}
      </span>
    </td>
  );

  const celdaAcciones = (correo: string, habilitado: boolean) => (
    <td className="px-5 py-3">
      {correo !== user?.email && (
        <Button
          type="button"
          size="sm"
          variant={habilitado ? "danger" : "secondary"}
          onClick={() => setConfirmando({ correo, nuevoEstado: !habilitado })}
        >
          {habilitado ? <Ban className="mr-1 h-3.5 w-3.5" /> : <CircleCheck className="mr-1 h-3.5 w-3.5" />}
          {habilitado
            ? t("dashboards.admin.usersSection.status.disable")
            : t("dashboards.admin.usersSection.status.enable")}
        </Button>
      )}
    </td>
  );

  const fullName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || t("roles.adminSistema");
  const { WatermarkIcon } = ROLE_THEME[RoleId.ADMIN_SISTEMA];

  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const desde = total === 0 ? 0 : pagina * TAMANO_PAGINA + 1;
  const hasta = Math.min(total, (pagina + 1) * TAMANO_PAGINA);

  // ¿Qué? +2 en cada caso por las columnas nuevas de Estado y Acciones.
  const colSpanActivo = tab === "recicladores" ? 5 : tab === "administradores" ? 6 : 6;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header — el ícono grande de fondo (Shield) es solo un detalle visual
          tenue para que este panel se sienta del Admin del Sistema, sin
          estorbar la lectura del texto encima. */}
      <div className="relative overflow-hidden bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <WatermarkIcon className="pointer-events-none absolute right-4 top-4 h-20 w-20 text-slate-900/5 dark:text-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
            <Shield className="h-7 w-7 text-green-700 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("dashboards.admin.title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t("dashboards.common.welcomePrefix")}{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200 uppercase">{fullName}</span>
              .
            </p>
            <p className="text-xs text-green-700 dark:text-green-400 font-semibold mt-1">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Usuarios registrados — pestañas por rol + búsqueda + localidad + paginación.
          ¿Qué? Es la información PRIORITARIA de este panel (así lo señaló el
                profesor) — va primero, justo después del encabezado, para
                que se vea sin necesidad de scroll. Antes vivía al final,
                debajo de 3 secciones administrativas que la empujaban fuera
                de la vista inicial (issue #166). */}
      <div className="bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a4d34] space-y-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("dashboards.admin.usersSection.title")}</h3>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-[#2a4d34] dark:bg-[#0d2116]/60">
              {(
                [
                  { id: "residentes" as TabUsuarios, label: t("dashboards.admin.usersSection.tabs.residentes"), icon: <Users className="h-3.5 w-3.5" /> },
                  { id: "recicladores" as TabUsuarios, label: t("dashboards.admin.usersSection.tabs.recicladores"), icon: <Users className="h-3.5 w-3.5" /> },
                  { id: "administradores" as TabUsuarios, label: t("dashboards.admin.usersSection.tabs.administradores"), icon: <Building2 className="h-3.5 w-3.5" /> },
                ] as const
              ).map(({ id, label, icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => cambiarTab(id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === id
                      ? "bg-green-700 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t("dashboards.admin.usersSection.searchPlaceholder")}
                  className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#132a1c] dark:text-gray-200 sm:w-48"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-green-600" />
                <select
                  value={localidadId}
                  onChange={(e) => cambiarLocalidad(e.target.value === "" ? "" : Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#132a1c] dark:text-gray-200"
                >
                  <option value="">{t("directorio.allLocalities")}</option>
                  {localidades.map((l) => (
                    <option key={l.id_localidad} value={l.id_localidad}>
                      {l.nombre_localidad}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#2a4d34] bg-gray-50 dark:bg-[#0d2116]/60">
                {tab === "residentes" && (
                  <>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.residentsTable.headers.email")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.residentsTable.headers.name")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.residentsTable.headers.conjunto")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.residentsTable.headers.unit")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.usersSection.status.header")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.usersSection.status.actionsHeader")}</th>
                  </>
                )}
                {tab === "recicladores" && (
                  <>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.recyclersTable.headers.email")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.recyclersTable.headers.fullName")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.recyclersTable.headers.association")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.usersSection.status.header")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.usersSection.status.actionsHeader")}</th>
                  </>
                )}
                {tab === "administradores" && (
                  <>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.adminsTable.headers.email")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.adminsTable.headers.name")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.adminsTable.headers.phone")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.adminsTable.headers.conjuntos")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.usersSection.status.header")}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.usersSection.status.actionsHeader")}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {cargando ? (
                <tr>
                  <td colSpan={colSpanActivo} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("dashboards.admin.loadingData")}
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={colSpanActivo} className="px-5 py-6">
                    <Alert type="error" message={t("common.loadError")} />
                  </td>
                </tr>
              ) : tab === "residentes" ? (
                residentesData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t("dashboards.admin.residentsTable.empty")}
                    </td>
                  </tr>
                ) : (
                  residentesData.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-[#0d2116]/40 transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{r.Correo}</td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.Nombre} {r.Apellido}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{r.Conjunto}</td>
                      <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {t("dashboards.admin.residentsTable.unitFormat", { bloque: r.Bloque, apto: r.Apartamento })}
                      </td>
                      {celdaBadgeEstado(r.Habilitado)}
                      {celdaAcciones(r.Correo, r.Habilitado)}
                    </tr>
                  ))
                )
              ) : tab === "recicladores" ? (
                recicladoresData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t("dashboards.admin.recyclersTable.empty")}
                    </td>
                  </tr>
                ) : (
                  recicladoresData.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-[#0d2116]/40 transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{r.Correo}</td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.Nombre_Completo}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                          {r.Asociacion}
                        </span>
                      </td>
                      {celdaBadgeEstado(r.Habilitado)}
                      {celdaAcciones(r.Correo, r.Habilitado)}
                    </tr>
                  ))
                )
              ) : administradoresData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("dashboards.admin.adminsTable.empty")}
                  </td>
                </tr>
              ) : (
                administradoresData.map((a, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-[#0d2116]/40 transition-colors">
                    <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{a.Correo}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{a.Nombre} {a.Apellido}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">{a.Teléfono || "—"}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{a.Conjuntos}</td>
                    {celdaBadgeEstado(a.Habilitado)}
                    {celdaAcciones(a.Correo, a.Habilitado)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!cargando && !error && total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-[#2a4d34]">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t("dashboards.admin.usersSection.pagination.showing", { from: desde, to: hasta, total })}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={pagina === 0}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-[#2a4d34]"
                aria-label={t("dashboards.admin.usersSection.pagination.prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs text-gray-500 dark:text-gray-400">
                {pagina + 1} / {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPagina((p) => (p + 1 < totalPaginas ? p + 1 : p))}
                disabled={pagina + 1 >= totalPaginas}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-[#2a4d34]"
                aria-label={t("dashboards.admin.usersSection.pagination.next")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Acciones administrativas secundarias — antes iban primero y
          empujaban la tabla de usuarios (arriba) fuera de la vista inicial;
          ahora van después. "Invitar administrador" y "Asignar conjunto
          adicional" van en la misma fila, con el mismo tamaño exacto —
          antes cada una se apilaba a todo el ancho del panel para pedir un
          solo campo, con mucho espacio vacío alrededor (retroalimentación
          del profesor, issue #166).
          ¿Qué? Ninguna de las dos tarjetas cambia de tamaño al usarse — el
          formulario de cada una vive en su propio <Modal>, no expandido
          dentro de la tarjeta. Así, si el admin solo usa una de las dos, la
          otra se queda exactamente del mismo tamaño de siempre, en vez de
          quedar un hueco al lado de un formulario largo que sí creció. */}
      <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-[#2a4d34] dark:bg-[#132a1c]">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("dashboards.admin.inviteSection.title")}</h3>
          </div>
          <p className="flex-1 text-xs text-gray-500 dark:text-gray-400">{t("dashboards.admin.inviteSection.description")}</p>
          <button
            type="button"
            onClick={() => setMostrarModalInvitar(true)}
            className="self-start rounded-xl bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
          >
            {t("dashboards.admin.inviteSection.show")}
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-[#2a4d34] dark:bg-[#132a1c]">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("desvinculacion.asignarAdicional.sectionTitle")}</h3>
          </div>
          <p className="flex-1 text-xs text-gray-500 dark:text-gray-400">{t("desvinculacion.asignarAdicional.description")}</p>
          <button
            type="button"
            onClick={() => setMostrarModalAsignar(true)}
            className="self-start rounded-xl bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
          >
            {t("desvinculacion.asignarAdicional.openButton")}
          </button>
        </div>
      </div>

      {mostrarModalInvitar && (
        <Modal onClose={() => setMostrarModalInvitar(false)} wide aria-label={t("invitarAdminConjunto.title")}>
          <div className="p-6 sm:p-8">
            <InvitarAdminConjuntoForm token={accessToken || ""} />
          </div>
        </Modal>
      )}

      {mostrarModalAsignar && accessToken && (
        <Modal onClose={() => setMostrarModalAsignar(false)} wide aria-label={t("desvinculacion.asignarAdicional.sectionTitle")}>
          <div className="p-6 sm:p-8">
            <AsignarConjuntoAdicionalForm token={accessToken} />
          </div>
        </Modal>
      )}

      {accessToken && <SolicitudesDesvinculacion token={accessToken} />}

      {confirmando && (
        <Modal onClose={() => setConfirmando(null)} aria-label={t("dashboards.admin.usersSection.status.confirmButton")}>
          <div className="p-6">
            <h3 className="mb-2 text-base font-bold text-gray-900 dark:text-white">
              {confirmando.nuevoEstado
                ? t("dashboards.admin.usersSection.status.confirmEnableTitle")
                : t("dashboards.admin.usersSection.status.confirmDisableTitle")}
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              {confirmando.nuevoEstado
                ? t("dashboards.admin.usersSection.status.confirmEnableBody", { correo: confirmando.correo })
                : t("dashboards.admin.usersSection.status.confirmDisableBody", { correo: confirmando.correo })}
            </p>
            {errorAccion && (
              <div className="mb-4">
                <Alert type="error" message={errorAccion} onClose={() => setErrorAccion(null)} />
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmando(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34]"
              >
                {t("common.cancel")}
              </button>
              <div className="flex-1">
                <Button
                  type="button"
                  fullWidth
                  variant={confirmando.nuevoEstado ? "primary" : "danger"}
                  isLoading={actualizando}
                  onClick={ejecutarCambioHabilitado}
                >
                  {t("dashboards.admin.usersSection.status.confirmButton")}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
