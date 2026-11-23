 
import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { usePolling } from "@/hooks/usePolling";
import { useAvisoTemporal } from "@/hooks/useAvisoTemporal";
import {
  Mail,
  Info,
  BadgeCheck,
  OctagonX,
  Building,
  Truck,
  TriangleAlert,
  PackageCheck,
  DoorOpen,
  ClipboardList,
  CircleCheck,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL, motivoDelServidor } from "@/api/axios";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";
import { NotificationFeed } from "@/components/dashboard/NotificationFeed";
import { rutaDeNotificacion, type NotificacionItem } from "@/lib/notificaciones";
import { HistorialAuditorias } from "@/components/dashboard/HistorialAuditorias";
import { notificarNotificacionesActualizadas, onCambioDesdeCampanita } from "@/lib/notificationEvents";
import { Alert } from "@/components/ui/Alert";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AuditoriaConjuntoForm } from "@/components/AuditoriaConjuntoForm";
import { listarMisAuditorias, listarUltimasAuditorias } from "@/lib/auditoriaConjuntoApi";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { Button } from "@/components/ui/Button";

// ¿Qué? Cada cuántos días se le vuelve a sugerir al reciclador auditar el
//       mismo conjunto. Ver issue #5: se decidió semanal porque no todos
//       los recicladores visitan un conjunto la misma cantidad de veces
//       por semana — 7 días es un punto medio razonable, no una regla del
//       negocio grabada en piedra.
const DIAS_ENTRE_AUDITORIAS = 7;

interface InvitacionPendiente {
  id: string;
  nombre_conjunto: string;
  direccion_conjunto: string;
  invitado_por_nombre: string;
  estado: string;
  expires_at: string;
}

interface ConjuntoAutorizado {
  id_conjunto_residencial: string;
  nombre_conjunto: string;
  direccion: string;
  nombre_localidad: string;
}

// ¿Qué? Estado de "control de presencia" (issue: control de notificaciones
//       del reciclador según si está en el conjunto) — uno por cada
//       conjunto autorizado, calculado por el backend en
//       GET /notificaciones/mi-estado-reciclador.
interface EstadoRecicladorConjunto {
  id_conjunto_residencial: string;
  presente: boolean;
  shut_lleno: boolean;
  puede_avisar_llegada: boolean;
}

// ¿Qué? Dado un tipo de notificación y el estado real de ESE conjunto,
//       ¿por qué no se podría enviar ahora mismo? `null` = sí se puede.
// ¿Para qué? Antes el reciclador solo se enteraba de estos rechazos
//           DESPUÉS de hacer clic, por la respuesta del backend — con
//           esto, el modal explica el motivo ANTES de intentar enviar.
// ¿Impacto? Espeja EXACTAMENTE las mismas reglas que ya aplica
//           be/app/routers/notificaciones.py — si el backend cambia
//           estas reglas, hay que actualizar esta función también.
type ClaveBloqueo = "yaPresente" | "avisoLlegadaReciente" | "debesLlegarPrimero" | "yaEstaLleno" | "yaEstaLibre";

function claveBloqueo(tipo: string | null, estado: EstadoRecicladorConjunto | undefined): ClaveBloqueo | null {
  if (!tipo || !estado) return null;

  if (tipo === "LLEGADA_RECICLADOR") {
    if (estado.presente) return "yaPresente";
    if (!estado.puede_avisar_llegada) return "avisoLlegadaReciente";
    return null;
  }

  if (!estado.presente) return "debesLlegarPrimero";
  if (tipo === "SHUT_LLENO" && estado.shut_lleno) return "yaEstaLleno";
  if (tipo === "SHUT_LIBRE" && !estado.shut_lleno) return "yaEstaLibre";
  return null;
}

// ¿Qué? El motivo largo (el que se lee dentro de la ventana de confirmación). Los botones usan la
//       razón corta de la misma clave (dashboards.reciclador.razon.*).
function motivoBloqueo(
  tipo: string | null,
  estado: EstadoRecicladorConjunto | undefined,
  t: (key: string) => string
): string | null {
  const clave = claveBloqueo(tipo, estado);
  return clave ? t(`dashboards.reciclador.modal.${clave}`) : null;
}

// ¿Qué? El color cuenta algo: verde = lo positivo y disponible (llegar, SHUT libre), ámbar = la alerta
//       (SHUT lleno) y neutro oscuro = el cierre (finalizar). `apagado` es la versión suave del MISMO
//       color, para cuando el botón no se puede usar ahora (así no se ve gris ni "roto").
// ¿Para qué? Antes eran 4 colores y dos eran casi el mismo verde: el color no distinguía nada.
// ¿Impacto? El ícono y el texto siempre acompañan al color: el significado no depende solo de él.
const VERDE = "bg-accent-700 hover:bg-accent-600 text-white dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200";
const VERDE_APAGADO = "border-accent-200 bg-accent-50 text-accent-800 dark:border-accent-300/30 dark:bg-accent-300/10 dark:text-accent-300";

const ACCIONES_META = [
  { tipo: "LLEGADA_RECICLADOR", key: "llegada", icon: Truck, color: VERDE, apagado: VERDE_APAGADO },
  {
    tipo: "SHUT_LLENO",
    key: "shutLleno",
    icon: TriangleAlert,
    color: "bg-amber-700 hover:bg-amber-600 text-white dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200",
    apagado: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-200",
  },
  { tipo: "SHUT_LIBRE", key: "shutLibre", icon: PackageCheck, color: VERDE, apagado: VERDE_APAGADO },
  {
    tipo: "FINALIZACION_RECICLADOR",
    key: "finalizacion",
    icon: DoorOpen,
    color: "bg-gray-800 hover:bg-gray-700 text-white dark:border-night-edge dark:bg-night-field dark:hover:bg-night-hover",
    apagado: "border-gray-200 bg-gray-100 text-gray-600 dark:border-night-line dark:bg-night-inset dark:text-gray-400",
  },
] as const;

export function RecicladorDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || t("roles.reciclador");
  const { Icon: RolIcon } = ROLE_THEME[RoleId.RECICLADOR];

  const ACCIONES = ACCIONES_META.map(({ tipo, key, icon, color, apagado }) => ({
    tipo,
    key,
    icon,
    color,
    apagado,
    label: t(`dashboards.reciclador.acciones.${key}`),
  }));

  const [invitaciones, setInvitaciones] = useState<InvitacionPendiente[]>([]);
  const [conjuntosAutorizados, setConjuntosAutorizados] = useState<ConjuntoAutorizado[]>([]);
  const [estadoReciclador, setEstadoReciclador] = useState<EstadoRecicladorConjunto[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  // ¿Qué? Fecha (ISO) de la última auditoría de este reciclador en cada conjunto, por id de conjunto.
  // ¿Para qué? Calcular el aviso "necesita auditoría" sin depender de la lista paginada del historial.
  const [ultimasAuditorias, setUltimasAuditorias] = useState<Record<string, string>>({});
  // ¿Qué? Sube al enviar una auditoría; HistorialAuditorias vuelve a pedir su página al cambiar.
  const [versionHistorial, setVersionHistorial] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [errorAccion, setErrorAccion] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // ¿Qué? El conjunto que el Reciclador eligió arriba (pastillas de "Mis conjuntos autorizados").
  //       null = todavía no eligió ninguno: se usa el conjunto donde ya está presente, o el primero.
  // ¿Para qué? Todo el panel (estado, botones de aviso, auditoría pendiente, actividad e
  //           historial) muestra un conjunto a la vez, así los botones se apagan y se encienden
  //           según el estado de ESE conjunto, y no según una mezcla de varios.
  const [conjuntoElegido, setConjuntoElegido] = useState<string | null>(null);

  // Confirmación corta del aviso (el conjunto ya es el elegido arriba)
  const [modalTipo, setModalTipo] = useState<string | null>(null);
  const [enviandoNotif, setEnviandoNotif] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [feedbackOk, mostrarFeedbackOk] = useAvisoTemporal<string>();

  // Formulario de auditoría (RQF-009)
  const [conjuntoParaAuditar, setConjuntoParaAuditar] = useState<string | null>(null);
  const [feedbackAuditoria, mostrarFeedbackAuditoria] = useAvisoTemporal<string>();

  // ¿Qué? Issue #406 — allSettled en vez de all: cada una de las 5 peticiones
  //       guarda su resultado por separado.
  // ¿Para qué? Con Promise.all, si UNA sola fallaba no se guardaba NINGUNA de
  //           las otras 4 y el panel quedaba vacío, aunque ya hubieran llegado
  //           bien (por ejemplo, las notificaciones).
  // ¿Impacto? Lo que falla conserva su último valor bueno (el polling de 20s
  //           lo reintenta) y se muestra el aviso de errorCarga; el resto del
  //           panel se pinta igual.
  const cargarDatos = () => {
    Promise.allSettled([
      axios.get(`${API_BASE_URL}/api/v1/reciclador-conjunto/mis-invitaciones`),
      axios.get(`${API_BASE_URL}/api/v1/reciclador-conjunto/mis-conjuntos-autorizados`),
      axios.get(`${API_BASE_URL}/api/v1/notificaciones/mis-notificaciones`),
      listarUltimasAuditorias(),
      // ¿Qué? Estado de presencia por conjunto — issue de "control de
      //       notificaciones del reciclador según si está en el conjunto".
      axios.get(`${API_BASE_URL}/api/v1/notificaciones/mi-estado-reciclador`),
    ])
      .then(([resInv, resConj, resNotifs, ultimas, resEstado]) => {
        if (resInv.status === "fulfilled") setInvitaciones(resInv.value.data);
        if (resConj.status === "fulfilled") setConjuntosAutorizados(resConj.value.data);
        if (resNotifs.status === "fulfilled") setNotificaciones(resNotifs.value.data);
        if (ultimas.status === "fulfilled") {
          setUltimasAuditorias(Object.fromEntries(ultimas.value.map((u) => [u.id_conjunto_residencial, u.ultima_auditoria])));
        }
        if (resEstado.status === "fulfilled") setEstadoReciclador(resEstado.value.data);
        // ¿Qué? Antes un .catch(() => {}) vacío no dejaba ningún rastro de que
        //       algo falló — el dashboard se quedaba tal cual, sin avisar.
        // ¿Impacto? Ahora se muestra un aviso; como cargarDatos() también
        //           corre cada 20s (polling), el aviso desaparece solo en
        //           cuanto una siguiente carga sí funcione.
        setErrorCarga(
          [resInv, resConj, resNotifs, ultimas, resEstado].some((r) => r.status === "rejected")
        );
      })
      .finally(() => setCargando(false));
  };

  // ¿Qué? Issue #516 — se actualiza también al instante cuando se marca o limpia algo
  //       desde el menú de la campanita (ver ResidenteDashboard.tsx).
  usePolling(cargarDatos, { enabled: !!user, onExternalTrigger: onCambioDesdeCampanita });

  const responderInvitacion = async (id: string, aceptar: boolean) => {
    setProcesandoId(id);
    setErrorAccion(false);
    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/reciclador-conjunto/invitaciones/${id}/responder`,
        { aceptar }
      );
      cargarDatos();
    } catch {
      // ¿Qué? Antes, si esto fallaba, el botón simplemente dejaba de girar
      //       sin decir si la invitación se aceptó/rechazó de verdad o no.
      setErrorAccion(true);
    } finally {
      setProcesandoId(null);
    }
  };

  const estadoDe = (idConjunto: string): EstadoRecicladorConjunto | undefined =>
    estadoReciclador.find((e) => e.id_conjunto_residencial === idConjunto);

  // ¿Qué? El conjunto activo: el que eligió; si no ha elegido (o ya no está autorizado), donde ya
  //       está presente; y si tampoco, el primero.
  // ¿Impacto? Se calcula en cada render (no es un estado aparte), así que si el Reciclador pierde
  //           un conjunto mientras el panel está abierto, no queda apuntando a uno que ya no existe.
  const conjuntoActivo =
    conjuntosAutorizados.find((c) => c.id_conjunto_residencial === conjuntoElegido) ??
    conjuntosAutorizados.find((c) => estadoDe(c.id_conjunto_residencial)?.presente) ??
    conjuntosAutorizados[0] ??
    null;
  const idConjuntoActivo = conjuntoActivo?.id_conjunto_residencial ?? null;
  const estadoActivo = idConjuntoActivo ? estadoDe(idConjuntoActivo) : undefined;

  // ¿Qué? Abre la confirmación del aviso para el conjunto activo, y lo "fija" como elegido.
  // ¿Para qué? Si el Reciclador no había elegido ninguno (se usó el de por defecto) y el estado
  //           cambia mientras confirma, el aviso no se manda a otro conjunto por sorpresa.
  const abrirModal = (tipo: string) => {
    if (!idConjuntoActivo) return;
    setErrorEnvio(null);
    setConjuntoElegido(idConjuntoActivo);
    setModalTipo(tipo);
  };

  // ¿Qué? Motivo (si hay alguno) por el que el aviso que se está confirmando AHORA MISMO
  //       no se podría enviar — null si sí se puede.
  const motivoModal = modalTipo ? motivoBloqueo(modalTipo, estadoActivo, t) : null;

  const enviarNotificacion = async () => {
    if (!modalTipo || !idConjuntoActivo || motivoModal) return;
    setEnviandoNotif(true);
    setErrorEnvio(null);
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notificaciones/enviar`, {
        tipo: modalTipo,
        id_conjunto_residencial: idConjuntoActivo,
      });
      const accion = ACCIONES.find((a) => a.tipo === modalTipo);
      mostrarFeedbackOk(accion?.label ?? t("dashboards.reciclador.genericNotificationSent"));
      setModalTipo(null);
      cargarDatos();
    } catch (err) {
      // ¿Qué? Antes, si el envío fallaba, el modal se cerraba igual sin
      //       avisar — el reciclador creía que el aviso salió y no fue así.
      // ¿Para qué? Issue #414: el motivo exacto que manda el backend (aviso
      //           reciente, SHUT ya lleno, presencia...) se muestra DENTRO del
      //           modal, donde el reciclador está mirando; la alerta de arriba
      //           queda tapada por el modal.
      // ¿Impacto? Se recargan los datos: si el rechazo fue porque el estado
      //           cambió, el modal ya refleja el motivo real.
      setErrorEnvio(motivoDelServidor(err) ?? t("common.actionError"));
      cargarDatos();
    } finally {
      setEnviandoNotif(false);
    }
  };

  // ¿Qué? Tocar el aviso de un comunicado, una novedad o una respuesta de soporte lleva a su página
  //       (y NotificationFeed ya lo marca leído). Los avisos de SHUT o de llegada no tienen otra
  //       página: se ven aquí mismo, así que solo se marcan leídos.
  // ¿Para qué? Antes tocar un comunicado solo lo marcaba leído y no pasaba nada más.
  const irALaPaginaDeLaNotificacion = (n: NotificacionItem) => {
    const ruta = rutaDeNotificacion(n, RoleId.RECICLADOR);
    if (ruta) navigate(ruta);
  };
  const tienePagina = (n: NotificacionItem) => rutaDeNotificacion(n, RoleId.RECICLADOR) !== null;

  const marcarLeida = async (id: string) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notificaciones/${id}/leer`, {});
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      notificarNotificacionesActualizadas();
    } catch {
      setErrorAccion(true);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notificaciones/marcar-todas-leidas`, {});
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      notificarNotificacionesActualizadas();
    } catch {
      setErrorAccion(true);
    }
  };

  const limpiarLeidas = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/notificaciones/limpiar-leidas`);
      setNotificaciones((prev) => prev.filter((n) => !n.leida));
    } catch {
      setErrorAccion(true);
    }
  };

  // ¿Qué? Un conjunto "necesita auditoría" si nunca se ha auditado, o si la
  //       última auditoría ya tiene 7 días o más (ver DIAS_ENTRE_AUDITORIAS).
  // ¿Para qué? En vez de un recordatorio programado (que requeriría un job
  //           corriendo en segundo plano), se calcula al cargar el panel —
  //           mismo resultado para el usuario, sin infraestructura nueva.
  const necesitaAuditoria = (idConjunto: string): boolean => {
    const masReciente = ultimasAuditorias[idConjunto];
    if (!masReciente) return true;
    const dias = (Date.now() - new Date(masReciente).getTime()) / (1000 * 60 * 60 * 24);
    return dias >= DIAS_ENTRE_AUDITORIAS;
  };

  // ¿Qué? "Sin conjuntos" solo cuando la carga ya terminó.
  // ¿Para qué? Mientras carga, la lista está vacía por defecto; sin esperar, a todo
  //           Reciclador le saldría un instante el aviso de "no tienes conjuntos".
  const sinConjuntos = !cargando && conjuntosAutorizados.length === 0;

  // ¿Qué? El aviso "ya puedes auditar" solo del conjunto activo; los demás conjuntos que lo
  //       necesitan se marcan con un puntito en su pastilla.
  const auditoriaPendienteActivo = !!idConjuntoActivo && necesitaAuditoria(idConjuntoActivo);
  // ¿Qué? Fecha de la última auditoría que este Reciclador envió al conjunto activo (si hay).
  // ¿Para qué? Cuando NO hay una pendiente, la tarjeta de auditoría dice que está al día y cuándo se envió.
  const ultimaAuditoriaActiva = idConjuntoActivo ? ultimasAuditorias[idConjuntoActivo] : undefined;

  // ¿Qué? Las notificaciones del conjunto activo, más las que no son de ningún conjunto.
  // ¿Para qué? El panel muestra un conjunto a la vez. Las generales del sistema no llevan
  //           conjunto y se siguen viendo siempre.
  const notificacionesDelConjunto = idConjuntoActivo
    ? notificaciones.filter((n) => !n.id_conjunto_residencial || n.id_conjunto_residencial === idConjuntoActivo)
    : notificaciones;

  // ¿Qué? El historial pide solo las auditorías del conjunto activo.
  // ¿Impacto? useCallback: HistorialAuditorias vuelve a pedir cada vez que cambia `cargar`, así
  //           que debe cambiar únicamente al cambiar de conjunto, no en cada render.
  const cargarHistorial = useCallback(
    (limit: number, offset: number) => listarMisAuditorias(limit, offset, idConjuntoActivo ?? undefined),
    [idConjuntoActivo]
  );

  const alEnviarAuditoria = () => {
    setConjuntoParaAuditar(null);
    mostrarFeedbackAuditoria(t("dashboards.reciclador.auditoria.successMessage"));
    setVersionHistorial((v) => v + 1);
    cargarDatos();
  };

  return (
    <div className={`${ANCHO_PAGINA.normal} space-y-6 pt-6`}>
      {/* Encabezado compacto.
          ¿Qué? El título y la bienvenida van en una sola línea con el ícono del rol, dentro de una
                tarjeta baja (menos relleno que la de antes y sin la marca de agua).
          ¿Para qué? Sigue diciendo en qué pantalla está y con qué cuenta entró, pero ya no empuja
                    hacia abajo lo que el Reciclador viene a hacer.
          ¿Impacto? Va en tarjeta porque sin ella, en modo claro, se perdía con el fondo de la página. */}
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-night-line dark:bg-night-card">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-300/10">
          <RolIcon className="icon-lg text-accent-700 dark:text-accent-300" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("dashboards.reciclador.title")}</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t("dashboards.common.welcomePrefix")}{" "}
            <span className="font-semibold uppercase text-gray-800 dark:text-gray-200">{fullName}</span>.
          </p>
        </div>
      </div>

      {!cargando && errorCarga && <Alert type="error" message={t("common.loadError")} />}
      {errorAccion && (
        <Alert type="error" message={t("common.actionError")} onClose={() => setErrorAccion(false)} />
      )}

      {/* Invitaciones pendientes.
          ¿Qué? Issue #515 — van primero: son globales (no son de ningún conjunto) y un Reciclador
                nuevo no tiene conjuntos hasta que acepta una.
          ¿Para qué? Sin una invitación aceptada, los botones de aviso no sirven. Solo se muestra
                    cuando hay invitaciones, así que no ocupa lugar el resto del tiempo.
          ¿Impacto? Orden del panel: invitaciones, mis conjuntos, auditoría, avisos y, en pantalla
                    ancha, a la derecha las notificaciones recibidas y mis auditorías. */}
      {!cargando && invitaciones.length > 0 && (
        <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="icon-md text-amber-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("dashboards.reciclador.invitations.title")}</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
              {invitaciones.length}
            </span>
          </div>
          <div className="space-y-3">
            {invitaciones.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-300/30 dark:bg-amber-400/10 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{inv.nombre_conjunto}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{inv.direccion_conjunto}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t("dashboards.reciclador.invitations.invitedBy", { nombre: inv.invitado_por_nombre })}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="primary" size="sm" onClick={() => responderInvitacion(inv.id, true)} disabled={procesandoId === inv.id}>
                    <BadgeCheck className="icon-sm icon-draw" />
                    {t("dashboards.reciclador.invitations.accept")}
                  </Button>
                  <Button variant="dangerOutline" size="sm" onClick={() => responderInvitacion(inv.id, false)} disabled={procesandoId === inv.id}>
                    <OctagonX className="icon-sm icon-draw" />
                    {t("dashboards.reciclador.invitations.reject")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Una sola columna en todos los tamaños.
          ¿Qué? Primero lo que el Reciclador HACE (conjunto, auditoría, avisos) y debajo lo que CONSULTA
                (notificaciones recibidas y mis auditorías).
          ¿Para qué? Antes, desde 1536 px el panel pasaba a dos columnas de alturas distintas, que se
                    veían como cuadros sueltos. El espacio ancho lo resuelve el ancho estándar de las
                    páginas (ver docs/gestion-proyecto/decision-ancho-de-paginas.md), no una segunda columna.
          ¿Impacto? El orden de lectura y de tabulación es el mismo en todos los tamaños. */}
      <div className="space-y-5">
        <div className="space-y-5">
          {/* Mis conjuntos autorizados — el selector del panel.
              ¿Qué? Los conjuntos del Reciclador como pastillas (sin desplegable): elige uno y todo
                    lo de abajo (estado, botones de aviso, auditoría, actividad e historial) pasa a
                    ser de ESE conjunto. La pastilla que necesita auditoría lleva un puntito.
              ¿Para qué? Antes los conjuntos eran una lista de tarjetas al final y los botones
                        de aviso se mezclaban con un modal para elegir el conjunto.
              ¿Impacto? Ya no hay una caja gris debajo que repetía el nombre del conjunto que la pastilla
                        marcada ya dice: solo quedan la dirección y el estado. Con un solo conjunto se
                        ve una sola pastilla, ya elegida. Sin conjuntos, el mismo aviso de siempre. */}
          <section
            aria-labelledby="reciclador-conjuntos-titulo"
            className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2">
              <Building className="icon-md text-accent-600" />
              <h2 id="reciclador-conjuntos-titulo" className="text-lg font-bold text-gray-900 dark:text-white">{t("dashboards.reciclador.myConjuntos.title")}</h2>
            </div>
            {cargando ? (
              <Esqueleto mensaje={t("common.loading")} variante="bloque" />
            ) : conjuntosAutorizados.length === 0 ? (
              <EmptyState icon={Building} message={t("dashboards.reciclador.myConjuntos.empty")} />
            ) : (
              <>
                <div role="group" aria-label={t("dashboards.reciclador.myConjuntos.selectorLabel")} className="flex flex-wrap gap-2">
                  {conjuntosAutorizados.map((c) => {
                    const activo = c.id_conjunto_residencial === idConjuntoActivo;
                    return (
                      <button
                        key={c.id_conjunto_residencial}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => setConjuntoElegido(c.id_conjunto_residencial)}
                        className={`flex max-w-full cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2 text-left text-sm font-semibold leading-snug transition-colors ${
                          activo
                            ? "border-accent-700 bg-accent-700 text-white dark:border-accent-300 dark:bg-accent-300 dark:text-accent-950"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-night-line dark:bg-night-panel dark:text-gray-300 dark:hover:bg-night-hover"
                        }`}
                      >
                        {c.nombre_conjunto}
                        {necesitaAuditoria(c.id_conjunto_residencial) && (
                          <>
                            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                            <span className="sr-only">{`, ${t("dashboards.reciclador.myConjuntos.necesitaAuditoria")}`}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                {conjuntoActivo && (
                  // ¿Qué? Dirección y estado apilados, sin caja ni repetir el nombre.
                  // ¿Para qué? Con el nombre a un lado y las etiquetas de estado al otro, en una ventana
                  //           angosta el nombre quedaba aplastado; apilado, las etiquetas pasan de línea.
                  <div className="mt-4 space-y-2">
                    <p className="break-words text-xs text-gray-500 dark:text-gray-400">
                      {conjuntoActivo.direccion} · {conjuntoActivo.nombre_localidad}
                    </p>
                    {/* ¿Qué? El estado de este conjunto: si ya llegó y si el SHUT está lleno.
                        ¿Para qué? Es lo que explica por qué unos botones están encendidos y otros no. */}
                    {estadoActivo && (
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            estadoActivo.presente
                              ? "bg-accent-100 text-accent-800 dark:bg-accent-300/15 dark:text-accent-300"
                              : "bg-gray-200 text-gray-700 dark:bg-night-hover dark:text-gray-300"
                          }`}
                        >
                          <Truck className="icon-sm" />
                          {t(estadoActivo.presente ? "dashboards.reciclador.estado.presente" : "dashboards.reciclador.estado.ausente")}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            estadoActivo.shut_lleno
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200"
                              : "bg-gray-200 text-gray-700 dark:bg-night-hover dark:text-gray-300"
                          }`}
                        >
                          {estadoActivo.shut_lleno ? <TriangleAlert className="icon-sm" /> : <PackageCheck className="icon-sm" />}
                          {t(estadoActivo.shut_lleno ? "dashboards.reciclador.estado.shutLleno" : "dashboards.reciclador.estado.shutLibre")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          {feedbackAuditoria && (
            <div className="flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700 dark:border-accent-300/40 dark:bg-accent-300/10 dark:text-accent-400">
              <BadgeCheck className="icon-md shrink-0 icon-appear icon-hop" />
              {feedbackAuditoria}
            </div>
          )}

          {/* Auditoría semanal (RQF-009).
              ¿Qué? Una sola tarjeta (antes era una dentro de otra) con el texto de qué se califica. Cuando
                    ya se envió la de esta semana, NO desaparece: dice que está al día.
              ¿Para qué? Si la tarjeta simplemente se esconde, el Reciclador no sabe si ya cumplió o si la
                        pantalla no cargó. Que la auditoría no se puede editar se avisa solo en la
                        confirmación, que es el momento en que importa.
              ¿Impacto? Solo se muestra con un conjunto activo y con la carga terminada. */}
          {!cargando && conjuntoActivo && auditoriaPendienteActivo && (
            <section
              aria-labelledby="reciclador-auditoria-titulo"
              className="rounded-2xl border border-teal-100 bg-teal-50/60 p-6 dark:border-teal-400/30 dark:bg-teal-400/10"
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="icon-md text-teal-700 dark:text-teal-300" />
                <h2 id="reciclador-auditoria-titulo" className="text-lg font-bold text-gray-900 dark:text-white">
                  {t("dashboards.reciclador.auditoria.bannerTitle")}
                </h2>
              </div>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                {t("dashboards.reciclador.auditoria.bannerSubtitle", { conjunto: conjuntoActivo.nombre_conjunto })}
              </p>
              <button
                onClick={() => setConjuntoParaAuditar(conjuntoActivo.id_conjunto_residencial)}
                className="touch-target-h mt-3 w-full cursor-pointer rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200 sm:w-auto"
              >
                {t("dashboards.reciclador.auditoria.bannerAction")}
              </button>
            </section>
          )}
          {!cargando && conjuntoActivo && !auditoriaPendienteActivo && ultimaAuditoriaActiva && (
            <section
              aria-labelledby="reciclador-auditoria-al-dia-titulo"
              className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <CircleCheck className="icon-md text-accent-600 dark:text-accent-400" />
                <h2 id="reciclador-auditoria-al-dia-titulo" className="text-lg font-bold text-gray-900 dark:text-white">
                  {t("dashboards.reciclador.auditoria.alDiaTitle")}
                </h2>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {t("dashboards.reciclador.auditoria.alDiaText", {
                  conjunto: conjuntoActivo.nombre_conjunto,
                  fecha: formatearFechaCreacion(ultimaAuditoriaActiva),
                })}
              </p>
            </section>
          )}

          {/* Acciones de notificación.
              ¿Qué? Issue #515 — es lo que el Reciclador más usa (avisar que llegó, SHUT
                    lleno/libre, que se va).
              ¿Para qué? Cada botón se enciende o se apaga según el estado del conjunto ACTIVO. Lo que no
                        está disponible conserva una versión suave de su propio color y dice la razón
                        corta dentro del botón ("Ya llegaste", "Avisa tu llegada primero"). Antes la razón
                        salía solo al tocarlo, en un mensaje largo, y en celular no existe "pasar el mouse".
              ¿Impacto? El botón apagado NO se puede presionar (aria-disabled y no hace nada), pero sigue
                        siendo alcanzable con el teclado y con lector de pantalla, para que lea la razón.
                        El nombre accesible del botón sigue siendo solo su etiqueta (aria-label). */}
          <section
            aria-labelledby="reciclador-avisos-titulo"
            className="@container bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm"
          >
            <h2 id="reciclador-avisos-titulo" className="mb-1 text-lg font-bold text-gray-900 dark:text-white">{t("dashboards.reciclador.sendSection.title")}</h2>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              {conjuntoActivo
                ? t("dashboards.reciclador.sendSection.subtitleConjunto", { conjunto: conjuntoActivo.nombre_conjunto })
                : t("dashboards.reciclador.sendSection.subtitle")}
            </p>
            {/* ¿Qué? Sin conjuntos autorizados los 4 botones se muestran apagados, con un
                    aviso corto encima.
                ¿Para qué? Así el Reciclador nuevo ve qué va a poder hacer y por qué todavía no, y el
                          bloque no cambia de forma cuando acepta su primera invitación. */}
            {sinConjuntos && (
              <p
                id="reciclador-sin-conjuntos"
                className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-200"
              >
                <Info className="icon-sm mt-0.5 shrink-0" aria-hidden="true" />
                {t("dashboards.reciclador.sendSection.noConjuntos")}
              </p>
            )}
            {/* ¿Qué? Los 4 botones de aviso pasan a 2 columnas según el ancho de SU tarjeta (`@md`, 28 rem), no
                      el de la ventana.
                ¿Para qué? Entre 640 y 1024 px el menú lateral ya ocupa 16 rem: con `sm:grid-cols-2` cada botón
                          quedaba de unos 170 px y su motivo ("Ya llegaste...") se partía en 3 líneas.
                ¿Impacto? En un espacio angosto van en una columna, en uno ancho en dos. */}
            <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
              {ACCIONES.map(({ tipo, label, icon: Icon, color, apagado: estiloApagado }) => {
                const clave = claveBloqueo(tipo, estadoActivo);
                const razon = clave ? t(`dashboards.reciclador.razon.${clave}`) : null;
                const apagado = !!razon || sinConjuntos;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => {
                      if (!apagado) abrirModal(tipo);
                    }}
                    aria-disabled={apagado}
                    aria-label={label}
                    aria-describedby={razon ? `notif-razon-${tipo}` : sinConjuntos ? "reciclador-sin-conjuntos" : undefined}
                    className={`flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      apagado ? `${estiloApagado} cursor-not-allowed` : `${color} cursor-pointer border-transparent`
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className={`icon-md shrink-0 ${apagado ? "" : "icon-draw"}`} />
                      {label}
                    </span>
                    {razon && (
                      <span id={`notif-razon-${tipo}`} className="text-xs font-normal">
                        {razon}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {feedbackOk && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700 dark:border-accent-300/40 dark:bg-accent-300/10 dark:text-accent-400">
                <BadgeCheck className="icon-md shrink-0 icon-appear icon-hop" />
                {t("dashboards.reciclador.feedbackSent", { label: feedbackOk })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          {/* Notificaciones recibidas del conjunto activo (ej. residentes reportando SHUT lleno).
              ¿Qué? Ya no repite el nombre del conjunto en cada fila: la lista es del conjunto elegido
                    arriba. Solo las notificaciones generales de VerdeApp conservan su etiqueta. */}
          {cargando ? (
            <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line shadow-sm p-6">
              <Esqueleto mensaje={t("common.loading")} variante="bloque" />
            </div>
          ) : (
            <NotificationFeed
              title={t("dashboards.reciclador.notifications.title")}
              notifications={notificacionesDelConjunto}
              emptyMessage={t(sinConjuntos ? "dashboards.reciclador.notifications.emptyWithoutConjuntos" : "dashboards.reciclador.notifications.empty")}
              accentBg="bg-amber-700"
              accentHighlight="bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-400/10 dark:hover:bg-amber-400/15"
              onMarkRead={marcarLeida}
              onMarkAllRead={marcarTodasLeidas}
              onClearRead={limpiarLeidas}
              onItemClick={irALaPaginaDeLaNotificacion}
              esAccionable={tienePagina}
              mostrarConjunto={false}
            />
          )}

          {/* Mis auditorías: las que YO envié, de a páginas.
              ¿Qué? Con `key` el historial se vuelve a montar al cambiar de conjunto: arranca otra vez en
                    la primera página. Antes se llamaba "Historial de auditorías"; para el Reciclador
                    "mis auditorías" se entiende mejor. Ya no repite el conjunto en cada fila.
              ¿Impacto? Es el mismo componente del Residente (HistorialAuditorias), con otra fuente de
                        datos y otro título. Se muestra cuando ya terminó la carga, para no pedir primero
                        "todas" y después las de un conjunto (dos peticiones y un parpadeo). */}
          {!cargando && (
            <HistorialAuditorias
              key={idConjuntoActivo ?? "todos"}
              cargar={cargarHistorial}
              titulo={t("dashboards.reciclador.misAuditorias")}
              recargar={versionHistorial}
            />
          )}
        </div>
      </div>

      {/* Confirmación corta del aviso.
          ¿Qué? El conjunto ya está elegido arriba; esto solo confirma "¿avisar X a los residentes de Y?",
                para no mandar un aviso a todo un conjunto por un toque accidental.
          ¿Para qué? Antes era una ventana armada a mano, con título genérico y sin ícono, distinta de la
                    confirmación de la auditoría. Ahora usa el ConfirmModal compartido: el título dice
                    QUÉ se avisa y el ícono es el del botón que se tocó.
          ¿Impacto? "Estoy lleno" va en ámbar (es una alerta); los demás avisos, en verde. El motivo si el
                    estado cambió mientras confirmaba (ANTES de intentar enviar) y el rechazo exacto del
                    backend (issue #414) se siguen mostrando dentro de la ventana. */}
      {modalTipo &&
        (() => {
          const accion = ACCIONES.find((a) => a.tipo === modalTipo);
          if (!accion) return null;
          const titulo = t(`dashboards.reciclador.modal.confirmTitles.${accion.key}`);
          return (
            <ConfirmModal
              icon={accion.icon}
              variant={modalTipo === "SHUT_LLENO" ? "warning" : "primary"}
              ariaLabel={titulo}
              title={titulo}
              description={t("dashboards.reciclador.modal.confirmDescription", {
                conjunto: conjuntoActivo?.nombre_conjunto ?? "",
              })}
              confirmLabel={t("dashboards.reciclador.modal.submit")}
              confirmingLabel={t("dashboards.reciclador.modal.sending")}
              isConfirming={enviandoNotif}
              confirmDisabled={!idConjuntoActivo || !!motivoModal}
              error={errorEnvio}
              onDismissError={() => setErrorEnvio(null)}
              onConfirm={enviarNotificacion}
              onClose={() => setModalTipo(null)}
            >
              {motivoModal && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
                  {motivoModal}
                </p>
              )}
            </ConfirmModal>
          );
        })()}

      {/* Formulario de auditoría (RQF-009) */}
      {conjuntoParaAuditar && (
        <AuditoriaConjuntoForm
          conjuntos={conjuntosAutorizados}
          conjuntoPreseleccionado={conjuntoParaAuditar}
          onClose={() => setConjuntoParaAuditar(null)}
          onSuccess={alEnviarAuditoria}
        />
      )}
    </div>
  );
}
