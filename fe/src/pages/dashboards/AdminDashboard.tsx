import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Database, UserPlus, Search, ChevronLeft, ChevronRight, ChevronDown, Building, UserX, UserCheck, ArrowUp, ArrowDown, ArrowUpDown, ClipboardList, BarChart3 } from "lucide-react";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { InvitarAdminConjuntoForm } from "@/components/InvitarAdminConjuntoForm";
import { SolicitudesDesvinculacion } from "@/components/SolicitudesDesvinculacion";
import { AsignarConjuntoAdicionalForm } from "@/components/AsignarConjuntoAdicionalForm";
import { ConjuntoCombobox } from "@/components/ui/ConjuntoCombobox";
import type { ConjuntoOption } from "@/components/ui/ConjuntoCombobox";
import { PerfilUsuarioPanel } from "@/components/PerfilUsuarioPanel";
import { cambiarHabilitado, MOTIVO_MAX_LENGTH } from "@/lib/adminUsuariosApi";
import { formatearFechaCreacion } from "@/lib/dateFormat";

interface ResidenteRow {
  Correo: string;
  Nombre: string;
  Apellido: string;
  Conjunto: string;
  Bloque: string;
  Apartamento: string;
  Habilitado: boolean;
  Fecha_Desactivacion?: string | null;
  Motivo_Desactivacion?: string | null;
}

interface RecicladorRow {
  Correo: string;
  Nombre_Completo: string;
  Asociacion: string;
  Habilitado: boolean;
  Fecha_Desactivacion?: string | null;
  Motivo_Desactivacion?: string | null;
}

interface AdminConjuntoRow {
  Correo: string;
  Nombre: string;
  Apellido: string;
  Teléfono: string;
  Conjuntos: string;
  Habilitado: boolean;
  Fecha_Desactivacion?: string | null;
  Motivo_Desactivacion?: string | null;
}

type TabUsuarios = "residentes" | "recicladores" | "administradores";
type OrderDir = "asc" | "desc";

// ¿Qué? Filas por página — el mismo número que ya se manda como límite al
//       backend en cada endpoint.
// ¿Para qué? 8 en vez de 10: con las 3 tarjetas de resumen nuevas arriba
//           (Administradores / Solicitudes / Totales), la tabla ya arranca
//           más abajo en la pantalla que antes — un ancho de página más
//           chico ayuda a que quepa completa sin bajar tanto, sin perder
//           el propósito real de la paginación (nunca traer todo de golpe).
const TAMANO_PAGINA = 8;

// Íconos de rol desde roleTheme (una sola fuente): encabezado y pestañas de usuarios.
const AdminIcon = ROLE_THEME[RoleId.ADMIN_SISTEMA].Icon;
const ResidenteIcon = ROLE_THEME[RoleId.RESIDENTE].Icon;
const RecicladorIcon = ROLE_THEME[RoleId.RECICLADOR].Icon;
const AdminConjuntoIcon = ROLE_THEME[RoleId.ADMIN_CONJUNTO].Icon;

const ENDPOINT_POR_TAB: Record<TabUsuarios, string> = {
  residentes: "vista-residentes",
  recicladores: "sp-recicladores",
  administradores: "administradores-conjunto",
};

export function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
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
  //       activa, con búsqueda + filtro de conjunto + paginación — el
  //       mismo patrón de "pestañas por tipo + filtro compartido" que ya
  //       usa el Directorio (DirectorioPage.tsx).
  const [tab, setTab] = useState<TabUsuarios>("residentes");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  // ¿Qué? Filtro de Conjunto — mismo patrón que ya usa
  //       InvitarAdminConjuntoForm (ConjuntoCombobox con búsqueda, nunca un
  //       <select> con miles de opciones de golpe).
  // ¿Para qué? El filtro de Localidad se quitó: el buscador de conjunto ya
  //           acota el lugar por sí solo, y un filtro más era ruido.
  const [conjuntoSeleccionado, setConjuntoSeleccionado] = useState<ConjuntoOption | null>(null);
  const [pagina, setPagina] = useState(0);
  // ¿Qué? Botón "Inactivos": apagado muestra todas las cuentas, encendido
  //       solo las desactivadas. Se queda encendido al cambiar de pestaña.
  const [soloInactivos, setSoloInactivos] = useState(false);
  // ¿Qué? Se incrementa cada vez que cambia el estado de una cuenta.
  // ¿Para qué? Vuelve a pedir la lista, los contadores y el perfil abierto,
  //           en vez de parchar filas a mano (con "Inactivos" encendido, una
  //           cuenta reactivada tiene que salir de la lista).
  const [version, setVersion] = useState(0);
  const [perfilAbierto, setPerfilAbierto] = useState<string | null>(null);
  // ¿Qué? Cada pestaña tiene sus propias columnas ordenables, así que
  //       cambiar de pestaña reinicia el orden (ver cambiarTab) — sin
  //       columna elegida (orderBy null), el backend usa su propio orden
  //       por defecto (por nombre, ascendente).
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [orderDir, setOrderDir] = useState<OrderDir>("asc");

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

  // ¿Qué? "Usuarios registrados" empieza desplegada — sin exigir un clic
  //       extra solo para ver los datos que se vino a ver.
  // ¿Impacto? El "reguero" de filas que se quería evitar al plegarla por
  //           defecto ya no aplica: con TAMANO_PAGINA más chico (8) la
  //           tabla no se desborda ni obliga a bajar mucho la página.
  const [usuariosAbierto, setUsuariosAbierto] = useState(true);
  // ¿Qué? "Solicitudes pendientes" ahora vive en un modal (ver más abajo,
  //       junto a mostrarModalInvitar/mostrarModalAsignar) en vez de un
  //       segundo acordeón aparte — la tarjeta de resumen de arriba y ese
  //       acordeón hacían exactamente lo mismo, mostrar la misma lista.
  const [mostrarModalSolicitudes, setMostrarModalSolicitudes] = useState(false);
  // ¿Para qué? El número de pendientes lo reporta SolicitudesDesvinculacion
  //           vía onCountChange, sin duplicar la petición solo para contar.
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);

  // ¿Qué? Los 3 totales de la tarjeta "Totales del sistema" — una petición
  //       liviana (limit=1) a cada uno de los 3 listados que ya existen,
  //       solo para leer su "total"; no hace falta un endpoint nuevo.
  const [totales, setTotales] = useState<{ residentes: number; recicladores: number; administradores: number } | null>(null);
  // ¿Qué? Cuántas cuentas inactivas hay en cada pestaña — para el botón
  //       "Inactivos" y el numerito rojo de cada pestaña.
  const [inactivos, setInactivos] = useState<Record<TabUsuarios, number> | null>(null);
  useEffect(() => {
    if (!user) return;
    const contar = (pestana: TabUsuarios, filtro?: { habilitado: boolean }) =>
      axios.get(`${API_BASE_URL}/api/v1/admin/${ENDPOINT_POR_TAB[pestana]}`, { params: { limit: 1, ...filtro } });
    Promise.all([
      contar("residentes"),
      contar("recicladores"),
      contar("administradores"),
      contar("residentes", { habilitado: false }),
      contar("recicladores", { habilitado: false }),
      contar("administradores", { habilitado: false }),
    ])
      .then(([res, rec, adm, resI, recI, admI]) => {
        setTotales({ residentes: res.data.total, recicladores: rec.data.total, administradores: adm.data.total });
        setInactivos({ residentes: resI.data.total, recicladores: recI.data.total, administradores: admI.data.total });
      })
      .catch(() => {});
  }, [user, version]);

  // ¿Qué? Conjuntos verificados para el combobox — igual que
  //       InvitarAdminConjuntoForm, buscando por nombre y acotado a 20
  //       resultados para no traer miles de conjuntos de golpe.
  const fetchConjuntos = (query: string): Promise<ConjuntoOption[]> =>
    axios
      .get(`${API_BASE_URL}/api/v1/geography/conjuntos/todos`, {
        params: { search: query || undefined, limit: 20 },
      })
      .then((res) => res.data)
      .catch(() => []);

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
    if (!user) return;
    // ¿Qué? Reiniciar "cargando"/"error" antes de disparar la petición —
    //       mismo patrón exacto que ya usa DirectorioPage.tsx sin que la
    //       regla lo marque ahí. No forma un ciclo: ninguno de los dos
    //       estados es dependencia de este efecto.
     
    setCargando(true);
    setError(false);

    const params: Record<string, string | number> = {
      limit: TAMANO_PAGINA,
      offset: pagina * TAMANO_PAGINA,
    };
    if (search.trim()) params.search = search.trim();
    if (soloInactivos) params.habilitado = "false";
    if (conjuntoSeleccionado) params.conjunto_id = conjuntoSeleccionado.id_conjunto_residencial;
    if (orderBy) {
      params.order_by = orderBy;
      params.order_dir = orderDir;
    }

    axios
      .get(`${API_BASE_URL}/api/v1/admin/${ENDPOINT_POR_TAB[tab]}`, { params })
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
  }, [user, tab, search, conjuntoSeleccionado, soloInactivos, orderBy, orderDir, pagina, version]);

  // ¿Qué? Cada uno de estos manejadores cambia un filtro Y reinicia la
  //       página a la primera — evita quedar "varado" en una página que ya
  //       no tiene resultados con el filtro nuevo (antes esto vivía en un
  //       useEffect aparte, solo para llamar setPagina).
  const cambiarTab = (nuevaTab: TabUsuarios) => {
    setTab(nuevaTab);
    // ¿Qué? Cada pestaña tiene sus propias columnas — el orden de una no
    //       tiene sentido en la otra.
    setOrderBy(null);
    setOrderDir("asc");
    setPagina(0);
  };

  // ¿Qué? Clic en una columna nueva ordena ascendente; clic de nuevo sobre
  //       la misma invierte la dirección — sin un tercer estado "sin
  //       orden", que agregaría un ciclo más sin necesidad real.
  const ordenarPor = (columna: string) => {
    if (orderBy === columna) {
      setOrderDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(columna);
      setOrderDir("asc");
    }
    setPagina(0);
  };

  const alternarInactivos = () => {
    setSoloInactivos((v) => !v);
    setPagina(0);
  };

  const cambiarConjunto = (valor: ConjuntoOption | null) => {
    setConjuntoSeleccionado(valor);
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
  // ¿Qué? Motivo opcional al desactivar — se guarda junto con la fecha y se
  //       ve en la tabla y en el perfil.
  const [motivo, setMotivo] = useState("");

  const pedirConfirmacion = (correo: string, nuevoEstado: boolean) => {
    setMotivo("");
    setErrorAccion(null);
    setConfirmando({ correo, nuevoEstado });
  };

  const ejecutarCambioHabilitado = async () => {
    if (!confirmando || !user) return;
    setActualizando(true);
    setErrorAccion(null);
    try {
      await cambiarHabilitado(confirmando.correo, confirmando.nuevoEstado, motivo.trim());
      setVersion((v) => v + 1);
      setConfirmando(null);
    } catch {
      setErrorAccion(t("dashboards.admin.usersSection.status.updateError"));
    } finally {
      setActualizando(false);
    }
  };

  // ¿Qué? Encabezado ordenable compartido por las 3 tablas — clic para
  //       ordenar por esa columna, con una flecha que indica el estado:
  //       doble flecha tenue si no es la columna activa, flecha simple
  //       (▲/▼) si sí lo es.
  // ¿Para qué? Reutilizado en vez de repetir el mismo <button> + ícono en
  //           cada una de las columnas de las 3 tablas.
  const thOrdenable = (columna: string, label: string) => {
    const activo = orderBy === columna;
    // ¿Qué? aria-sort en el <th> (patrón WCAG para encabezados ordenables
    //       de tabla) + un aria-label del botón que anuncia el ESTADO
    //       actual (ordenado ascendente/descendente), no solo la acción
    //       "ordenar por X" — antes un lector de pantalla nunca se enteraba
    //       de si esa columna ya estaba ordenada ni en qué dirección.
    const ariaSort = activo ? (orderDir === "asc" ? "ascending" : "descending") : "none";
    const ariaLabel = activo
      ? t(
          orderDir === "asc"
            ? "dashboards.admin.usersSection.sortAriaAscending"
            : "dashboards.admin.usersSection.sortAriaDescending",
          { columna: label }
        )
      : t("dashboards.admin.usersSection.sortAria", { columna: label });
    return (
      <th
        className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
        aria-sort={ariaSort}
      >
        <button
          type="button"
          onClick={() => ordenarPor(columna)}
          className="flex cursor-pointer items-center gap-1 transition-colors hover:text-gray-800 dark:hover:text-gray-200"
          aria-label={ariaLabel}
        >
          {label}
          {activo ? (
            orderDir === "asc" ? (
              <ArrowUp className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-3 w-3" aria-hidden="true" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
          )}
        </button>
      </th>
    );
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
  const celdaBadgeEstado = (habilitado: boolean, fecha?: string | null, motivoDesactivacion?: string | null) => (
    <td className="px-5 py-3">
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          habilitado
            ? "bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400"
            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
        }`}
      >
        {habilitado
          ? t("dashboards.admin.usersSection.status.active")
          : t("dashboards.admin.usersSection.status.inactive")}
      </span>
      {!habilitado && (
        <p className="mt-1 max-w-[16rem] text-[11px] text-gray-500 dark:text-gray-400">
          {fecha && <span className="font-semibold text-gray-700 dark:text-gray-300">{formatearFechaCreacion(fecha)}</span>}
          {fecha && " · "}
          {motivoDesactivacion ? `“${motivoDesactivacion}”` : t("dashboards.admin.usersSection.noReason")}
        </p>
      )}
    </td>
  );

  // ¿Qué? El nombre es un botón (se alcanza con teclado) y toda la fila
  //       también abre el perfil con un clic — la celda de Acciones
  //       frena el clic para no abrir el perfil al desactivar/activar.
  const celdaNombre = (correo: string, nombre: string) => (
    <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">
      <button
        type="button"
        onClick={() => setPerfilAbierto(correo)}
        aria-label={t("dashboards.admin.profilePanel.openProfile", { nombre })}
        className="cursor-pointer text-left underline decoration-gray-200 underline-offset-4 transition-colors hover:text-accent-700 hover:decoration-accent-600 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:decoration-[#23392b] dark:hover:text-accent-400"
      >
        {nombre}
      </button>
    </td>
  );

  const celdaAcciones = (correo: string, habilitado: boolean) => (
    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
      {correo !== user?.email && (
        <Button
          type="button"
          size="sm"
          variant={habilitado ? "danger" : "secondary"}
          onClick={() => pedirConfirmacion(correo, !habilitado)}
        >
          {habilitado ? <UserX className="mr-1 h-3.5 w-3.5 icon-draw" /> : <UserCheck className="mr-1 h-3.5 w-3.5 icon-draw" />}
          {habilitado
            ? t("dashboards.admin.usersSection.status.disable")
            : t("dashboards.admin.usersSection.status.enable")}
        </Button>
      )}
    </td>
  );

  const fullName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || t("roles.adminSistema");

  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const desde = total === 0 ? 0 : pagina * TAMANO_PAGINA + 1;
  const hasta = Math.min(total, (pagina + 1) * TAMANO_PAGINA);

  // ¿Qué? +2 en cada caso por las columnas nuevas de Estado y Acciones.
  const colSpanActivo = tab === "recicladores" ? 5 : tab === "administradores" ? 6 : 6;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* ¿Qué? Antes llevaba también un ícono grande (Shield) muy tenue de
          fondo, encima de la foto del panel.
          ¿Para qué? Con la foto de hoja detrás de todo el panel, ese
          segundo elemento decorativo se sentía como "dos fondos" a la vez
          — se quitó, dejando solo la foto (retroalimentación directa). */}
      <div className="relative overflow-hidden bg-[#ffffff] dark:bg-[#12231a] rounded-2xl border border-gray-100 dark:border-[#23392b] p-6 shadow-sm">
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-100 dark:bg-accent-900/30">
            <AdminIcon className="h-7 w-7 text-accent-700 dark:text-accent-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("dashboards.admin.title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t("dashboards.common.welcomePrefix")}{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200 uppercase">{fullName}</span>
              .
            </p>
            <p className="text-xs text-accent-700 dark:text-accent-400 font-semibold mt-1">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* ¿Qué? Instancia oculta de SolicitudesDesvinculacion — SIEMPRE
          montada (con "hidden", no deja de renderizarse) solo para que
          reporte su conteo a la tarjeta de arriba desde antes de que el
          usuario abra el modal. El modal (más abajo, junto a
          mostrarModalInvitar/mostrarModalAsignar) monta su propia
          instancia cuando se abre.
          ¿Para qué? Antes esto vivía en un segundo acordeón aparte, que
          mostraba exactamente la misma lista que ya se veía al abrir el
          modal desde la tarjeta de resumen — contenido duplicado en dos
          partes distintas de la misma pantalla. */}
      <div hidden>{user && <SolicitudesDesvinculacion onCountChange={setSolicitudesPendientes} mostrarEncabezado={false} />}</div>

      {/* Franja de resumen — Administradores de conjunto / Solicitudes
          pendientes / Totales del sistema. Va ANTES de la tabla: primero
          las acciones y los números del sistema, y debajo el detalle de
          los usuarios. (Antes la tabla iba arriba, a pedido del profesor;
          se volvió a invertir por decisión del equipo tras probar el panel.) */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-100 bg-[#ffffff] p-5 shadow-sm dark:border-[#23392b] dark:bg-[#12231a]">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-accent-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("dashboards.admin.inviteSection.title")}</h3>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <button
              type="button"
              onClick={() => setMostrarModalInvitar(true)}
              className="cursor-pointer rounded-xl bg-accent-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-600"
            >
              {t("dashboards.admin.inviteSection.show")}
            </button>
            <button
              type="button"
              onClick={() => setMostrarModalAsignar(true)}
              className="cursor-pointer rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#23392b] dark:text-gray-300 dark:hover:bg-[#23392b]"
            >
              {t("desvinculacion.asignarAdicional.openButton")}
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-100 bg-[#ffffff] p-5 shadow-sm dark:border-[#23392b] dark:bg-[#12231a]">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-accent-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("dashboards.admin.pendingRequests.title")}</h3>
            {solicitudesPendientes > 0 && (
              <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {solicitudesPendientes}
              </span>
            )}
          </div>
          <p className="flex-1 text-xs text-gray-500 dark:text-gray-400">
            {solicitudesPendientes > 0
              ? t("dashboards.admin.pendingRequests.withCount", { count: solicitudesPendientes })
              : t("desvinculacion.adminSistema.empty")}
          </p>
          <button
            type="button"
            onClick={() => setMostrarModalSolicitudes(true)}
            className="cursor-pointer self-start rounded-xl bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 transition-colors hover:bg-accent-100 dark:bg-accent-900/20 dark:text-accent-400 dark:hover:bg-accent-900/30"
          >
            {t("dashboards.admin.pendingRequests.viewButton")}
          </button>
        </div>

        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-100 bg-[#ffffff] p-5 shadow-sm dark:border-[#23392b] dark:bg-[#12231a]">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("dashboards.admin.totals.title")}</h3>
          </div>
          {/* ¿Qué? grid-cols-3 en vez de un flex con justify-between — Tailwind
              define sus columnas de grid como minmax(0, 1fr), así que cada
              una se reparte exactamente un tercio del ancho SIN importar el
              contenido (a diferencia de flex, donde un item nunca se encoge
              más allá del ancho de su propio contenido por defecto). Antes,
              en pantallas angostas, "Residentes" y "Recicladores" terminaban
              superpuestos porque ninguno de los dos cedía espacio al otro.
              break-words dentro de cada columna deja que la etiqueta pase a
              una segunda línea en vez de desbordarse. */}
          <div className="grid flex-1 grid-cols-3 items-center gap-2">
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{totales ? totales.residentes : "—"}</p>
              <p className="break-words text-[11px] text-gray-500 dark:text-gray-400">{t("dashboards.admin.usersSection.tabs.residentes")}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{totales ? totales.recicladores : "—"}</p>
              <p className="break-words text-[11px] text-gray-500 dark:text-gray-400">{t("dashboards.admin.usersSection.tabs.recicladores")}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{totales ? totales.administradores : "—"}</p>
              <p className="break-words text-[11px] text-gray-500 dark:text-gray-400">{t("dashboards.admin.totals.administradoresShort")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Usuarios registrados — ya no empieza plegada (ver estado
          usuariosAbierto arriba). Adentro va todo: pestañas, buscador,
          filtros de Localidad/Conjunto, tabla y paginación. */}
      <div className="bg-[#ffffff] dark:bg-[#12231a] rounded-2xl border border-gray-100 dark:border-[#23392b] shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setUsuariosAbierto((v) => !v)}
          className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-4 text-left"
          aria-expanded={usuariosAbierto}
          aria-controls="usuarios-registrados-body"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Database className="h-4 w-4 shrink-0 text-accent-600" />
            <h3 className="truncate text-sm font-bold text-gray-900 dark:text-white">{t("dashboards.admin.usersSection.title")}</h3>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {totales && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-[#0c1a12] dark:text-gray-300">
                {t("dashboards.admin.usersSection.totalBadge", {
                  count: totales.residentes + totales.recicladores + totales.administradores,
                })}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${usuariosAbierto ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
        </button>

        {usuariosAbierto && (
        <div id="usuarios-registrados-body">
        <div className="px-5 py-4 border-t border-b border-gray-100 dark:border-[#23392b] space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-[#23392b] dark:bg-[#0c1a12]/60">
              {(
                [
                  { id: "residentes" as TabUsuarios, label: t("dashboards.admin.usersSection.tabs.residentes"), icon: <ResidenteIcon className="h-3.5 w-3.5" /> },
                  { id: "recicladores" as TabUsuarios, label: t("dashboards.admin.usersSection.tabs.recicladores"), icon: <RecicladorIcon className="h-3.5 w-3.5" /> },
                  { id: "administradores" as TabUsuarios, label: t("dashboards.admin.usersSection.tabs.administradores"), icon: <AdminConjuntoIcon className="h-3.5 w-3.5" /> },
                ] as const
              ).map(({ id, label, icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => cambiarTab(id)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === id
                      ? "bg-accent-700 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  {icon}
                  {label}
                  {soloInactivos && inactivos && inactivos[id] > 0 && (
                    <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{inactivos[id]}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("dashboards.admin.usersSection.searchPlaceholder")}
                className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-[#23392b] dark:bg-[#0f2018] dark:text-gray-200 sm:w-48"
              />
            </div>
          </div>

          {/* ¿Qué? Buscador de conjunto + botón "Inactivos". El buscador acota
              el lugar por sí solo (no hace falta un filtro de localidad
              aparte); el botón apagado muestra todas las cuentas y
              encendido solo las desactivadas. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1.5 sm:w-64">
              <Building className="h-3.5 w-3.5 shrink-0 text-accent-600" />
              <div className="flex-1 [&_input]:!mt-0 [&_input]:!py-1.5 [&_input]:!text-xs">
                <ConjuntoCombobox
                  value={conjuntoSeleccionado}
                  onChange={cambiarConjunto}
                  fetchOptions={fetchConjuntos}
                  placeholder={t("dashboards.admin.conjuntoFilter.placeholder")}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={alternarInactivos}
              aria-pressed={soloInactivos}
              className={`flex cursor-pointer items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                soloInactivos
                  ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-[#23392b] dark:bg-[#0f2018] dark:text-gray-300 dark:hover:bg-[#23392b]"
              }`}
            >
              <UserX className="h-3.5 w-3.5" aria-hidden="true" />
              {t("dashboards.admin.usersSection.inactiveButton", { count: inactivos ? inactivos[tab] : 0 })}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#23392b] bg-gray-50 dark:bg-[#0c1a12]/60">
                {tab === "residentes" && (
                  <>
                    {thOrdenable("correo", t("dashboards.admin.residentsTable.headers.email"))}
                    {thOrdenable("nombre", t("dashboards.admin.residentsTable.headers.name"))}
                    {thOrdenable("conjunto", t("dashboards.admin.residentsTable.headers.conjunto"))}
                    {thOrdenable("unidad", t("dashboards.admin.residentsTable.headers.unit"))}
                    {thOrdenable("estado", t("dashboards.admin.usersSection.status.header"))}
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.usersSection.status.actionsHeader")}</th>
                  </>
                )}
                {tab === "recicladores" && (
                  <>
                    {thOrdenable("correo", t("dashboards.admin.recyclersTable.headers.email"))}
                    {thOrdenable("nombre", t("dashboards.admin.recyclersTable.headers.fullName"))}
                    {thOrdenable("asociacion", t("dashboards.admin.recyclersTable.headers.association"))}
                    {thOrdenable("estado", t("dashboards.admin.usersSection.status.header"))}
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.usersSection.status.actionsHeader")}</th>
                  </>
                )}
                {tab === "administradores" && (
                  <>
                    {thOrdenable("correo", t("dashboards.admin.adminsTable.headers.email"))}
                    {thOrdenable("nombre", t("dashboards.admin.adminsTable.headers.name"))}
                    {thOrdenable("telefono", t("dashboards.admin.adminsTable.headers.phone"))}
                    {thOrdenable("conjuntos", t("dashboards.admin.adminsTable.headers.conjuntos"))}
                    {thOrdenable("estado", t("dashboards.admin.usersSection.status.header"))}
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("dashboards.admin.usersSection.status.actionsHeader")}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {cargando ? (
                <tr>
                  <td colSpan={colSpanActivo} className="px-5 py-6">
                    <LoadingState message={t("dashboards.admin.loadingData")} />
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
                      {soloInactivos ? t("dashboards.admin.usersSection.noInactive") : t("dashboards.admin.residentsTable.empty")}
                    </td>
                  </tr>
                ) : (
                  residentesData.map((r, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setPerfilAbierto(r.Correo)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0c1a12]/40 transition-colors"
                    >
                      <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{r.Correo}</td>
                      {celdaNombre(r.Correo, `${r.Nombre} ${r.Apellido}`)}
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{r.Conjunto}</td>
                      <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {t("dashboards.admin.residentsTable.unitFormat", { bloque: r.Bloque, apto: r.Apartamento })}
                      </td>
                      {celdaBadgeEstado(r.Habilitado, r.Fecha_Desactivacion, r.Motivo_Desactivacion)}
                      {celdaAcciones(r.Correo, r.Habilitado)}
                    </tr>
                  ))
                )
              ) : tab === "recicladores" ? (
                recicladoresData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      {soloInactivos ? t("dashboards.admin.usersSection.noInactive") : t("dashboards.admin.recyclersTable.empty")}
                    </td>
                  </tr>
                ) : (
                  recicladoresData.map((r, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setPerfilAbierto(r.Correo)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0c1a12]/40 transition-colors"
                    >
                      <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{r.Correo}</td>
                      {celdaNombre(r.Correo, r.Nombre_Completo)}
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-accent-50 dark:bg-accent-900/20 px-2.5 py-0.5 text-xs font-semibold text-accent-700 dark:text-accent-400">
                          {r.Asociacion}
                        </span>
                      </td>
                      {celdaBadgeEstado(r.Habilitado, r.Fecha_Desactivacion, r.Motivo_Desactivacion)}
                      {celdaAcciones(r.Correo, r.Habilitado)}
                    </tr>
                  ))
                )
              ) : administradoresData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    {soloInactivos ? t("dashboards.admin.usersSection.noInactive") : t("dashboards.admin.adminsTable.empty")}
                  </td>
                </tr>
              ) : (
                administradoresData.map((a, idx) => (
                  <tr
                      key={idx}
                      onClick={() => setPerfilAbierto(a.Correo)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0c1a12]/40 transition-colors"
                    >
                    <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{a.Correo}</td>
                    {celdaNombre(a.Correo, `${a.Nombre} ${a.Apellido}`)}
                    <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">{a.Teléfono || "—"}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{a.Conjuntos}</td>
                    {celdaBadgeEstado(a.Habilitado, a.Fecha_Desactivacion, a.Motivo_Desactivacion)}
                    {celdaAcciones(a.Correo, a.Habilitado)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!cargando && !error && total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-[#23392b]">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t("dashboards.admin.usersSection.pagination.showing", { from: desde, to: hasta, total })}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={pagina === 0}
                className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-[#23392b]"
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
                className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-[#23392b]"
                aria-label={t("dashboards.admin.usersSection.pagination.next")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        </div>
        )}
      </div>

      {mostrarModalInvitar && (
        <Modal onClose={() => setMostrarModalInvitar(false)} wide aria-label={t("invitarAdminConjunto.title")}>
          <div className="p-6 sm:p-8">
            <InvitarAdminConjuntoForm />
          </div>
        </Modal>
      )}

      {mostrarModalAsignar && (
        <Modal onClose={() => setMostrarModalAsignar(false)} wide aria-label={t("desvinculacion.asignarAdicional.sectionTitle")}>
          <div className="p-6 sm:p-8">
            <AsignarConjuntoAdicionalForm />
          </div>
        </Modal>
      )}

      {mostrarModalSolicitudes && (
        <Modal onClose={() => setMostrarModalSolicitudes(false)} wide aria-label={t("dashboards.admin.pendingRequests.title")}>
          <div className="p-6 sm:p-8">
            {user && (
              <SolicitudesDesvinculacion onCountChange={setSolicitudesPendientes} mostrarEncabezado dentroDeModal />
            )}
          </div>
        </Modal>
      )}

      {perfilAbierto && (
        <PerfilUsuarioPanel
          correo={perfilAbierto}
          version={version}
          esPropiaCuenta={perfilAbierto === user?.email}
          cerrarConEscape={!confirmando}
          onClose={() => setPerfilAbierto(null)}
          onCambiarEstado={pedirConfirmacion}
        />
      )}

      {confirmando && (
        <ConfirmModal
          layer={perfilAbierto ? "stacked" : "base"}
          icon={confirmando.nuevoEstado ? UserCheck : UserX}
          variant={confirmando.nuevoEstado ? "primary" : "danger"}
          ariaLabel={t("dashboards.admin.usersSection.status.confirmButton")}
          title={
            confirmando.nuevoEstado
              ? t("dashboards.admin.usersSection.status.confirmEnableTitle")
              : t("dashboards.admin.usersSection.status.confirmDisableTitle")
          }
          description={
            confirmando.nuevoEstado
              ? t("dashboards.admin.usersSection.status.confirmEnableBody", { correo: confirmando.correo })
              : t("dashboards.admin.usersSection.status.confirmDisableBody", { correo: confirmando.correo })
          }
          error={errorAccion}
          onDismissError={() => setErrorAccion(null)}
          isConfirming={actualizando}
          confirmLabel={t("dashboards.admin.usersSection.status.confirmButton")}
          onConfirm={ejecutarCambioHabilitado}
          onClose={() => setConfirmando(null)}
        >
          {!confirmando.nuevoEstado && (
            <div>
              <label htmlFor="motivo-desactivacion" className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                {t("dashboards.admin.usersSection.status.reasonLabel")}
                <span className="font-normal text-gray-400">
                  {motivo.length} / {MOTIVO_MAX_LENGTH}
                </span>
              </label>
              <textarea
                id="motivo-desactivacion"
                value={motivo}
                maxLength={MOTIVO_MAX_LENGTH}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={t("dashboards.admin.usersSection.status.reasonPlaceholder")}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-accent-500 dark:border-[#23392b] dark:bg-[#1a3324] dark:text-white"
              />
            </div>
          )}
        </ConfirmModal>
      )}
    </div>
  );
}
