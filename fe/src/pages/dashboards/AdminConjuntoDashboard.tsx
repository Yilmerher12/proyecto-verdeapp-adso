import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Building2, MapPin, Pencil, Check, X, Users, Mail, Send, Clock, KeyRound, Copy, AlertTriangle } from "lucide-react";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import {
  obtenerMisConjuntos,
  editarMiConjunto,
  solicitarDesvinculacion,
  regenerarCodigoAcceso,
  type ConjuntoAdministrado,
} from "@/lib/conjuntoPanelApi";
import {
  invitarReciclador,
  obtenerInvitacionesDeConjunto,
  obtenerRecicladoresAutorizados,
  type InvitacionEnviada,
  type RecicladorAutorizado,
} from "@/lib/recicladorConjuntoApi";
import { NotificationFeed, type NotificacionItem } from "@/components/dashboard/NotificationFeed";
import { AuditoriaResultadoBanner } from "@/components/dashboard/AuditoriaResultadoBanner";
import { HistorialAuditorias } from "@/components/dashboard/HistorialAuditorias";
import { notificarNotificacionesActualizadas } from "@/lib/notificationEvents";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";

/**
 * ¿Qué? Badge de color según el estado de la invitación.
 * ¿Para qué? Distinguir visualmente PENDIENTE (ámbar) / ACEPTADA (verde) /
 *           RECHAZADA (rojo) sin tener que leer el texto con atención.
 */
function BadgeEstado({ estado }: { estado: string }) {
  const { t } = useTranslation();
  const estilos: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    ACEPTADA: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    RECHAZADA: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const etiquetas: Record<string, string> = {
    PENDIENTE: t("dashboards.adminConjunto.estado.pendiente"),
    ACEPTADA: t("dashboards.adminConjunto.estado.aceptada"),
    RECHAZADA: t("dashboards.adminConjunto.estado.rechazada"),
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estilos[estado] || "bg-gray-100 text-gray-600"}`}>
      {etiquetas[estado] || estado}
    </span>
  );
}

/**
 * ¿Qué? Código de acceso de UN conjunto específico (issue #168) — lo que
 *       el Admin de Conjunto reparte fuera de la app (cartelera, grupo
 *       del conjunto) para que un Residente demuestre que vive ahí al
 *       registrarse.
 * ¿Para qué? Componente aparte, mismo criterio que SeccionRecicladores/
 *           SeccionDesvinculacion: cada conjunto administrado tiene su
 *           propio código, y regenerarlo es una acción con su propia
 *           llamada al backend, no solo un campo de texto que se guarda.
 */
function SeccionCodigoAcceso({
  idConjunto,
  codigoAcceso,
  accessToken,
  onRegenerado,
}: {
  idConjunto: string;
  codigoAcceso: string;
  accessToken: string;
  onRegenerado: () => void;
}) {
  const { t } = useTranslation();
  const [copiado, setCopiado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ¿Qué? Mismo patrón de copiar-al-portapapeles ya usado en
  //       DirectorioPage.tsx (copiarDireccion) — ícono de check breve
  //       antes de volver al ícono de copiar.
  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(codigoAcceso);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // ¿Qué? Si el navegador niega el permiso del portapapeles (poco
      //       común, pero posible), no hay nada más que hacer desde aquí.
    }
  };

  const regenerar = async () => {
    if (!accessToken) return;
    setRegenerando(true);
    setError(null);
    try {
      await regenerarCodigoAcceso(idConjunto, accessToken);
      setConfirmando(false);
      onRegenerado();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.response?.data?.detail || t("dashboards.adminConjunto.codigoAcceso.errorDefault"));
    } finally {
      setRegenerando(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-[#0d2116]/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-green-600" />
            <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {t("dashboards.adminConjunto.codigoAcceso.title")}
            </h5>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("dashboards.adminConjunto.codigoAcceso.description")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-base font-bold tracking-widest text-gray-900 dark:border-[#2a4d34] dark:bg-[#132a1c] dark:text-white">
            {codigoAcceso}
          </span>
          <button
            type="button"
            onClick={copiarCodigo}
            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-white dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#1f4029]"
            aria-label={t(
              copiado ? "dashboards.adminConjunto.codigoAcceso.copiedAria" : "dashboards.adminConjunto.codigoAcceso.copyAria"
            )}
          >
            {copiado ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/10 dark:text-amber-400 dark:hover:bg-amber-900/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t("dashboards.adminConjunto.codigoAcceso.regenerateButton")}
          </button>
        </div>
      </div>

      {confirmando && (
        <Modal
          onClose={() => setConfirmando(false)}
          aria-label={t("dashboards.adminConjunto.codigoAcceso.confirmTitle")}
        >
          <div className="p-6 sm:p-8 max-w-sm mx-auto text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t("dashboards.adminConjunto.codigoAcceso.confirmTitle")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t("dashboards.adminConjunto.codigoAcceso.confirmWarning")}
            </p>
            {error && (
              <p className="mb-4 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 rounded-xl border border-gray-200 dark:border-[#2a4d34] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a4d34] transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={regenerar}
                disabled={regenerando}
                className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
              >
                {regenerando
                  ? t("dashboards.adminConjunto.codigoAcceso.regenerating")
                  : t("dashboards.adminConjunto.codigoAcceso.confirmButton")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * ¿Qué? Sección de Recicladores Autorizados de UN conjunto específico.
 * ¿Para qué? Componente separado para mantener legible el dashboard
 *           principal — cada conjunto administrado tiene su propia
 *           lista de invitaciones, así que esto vive por tarjeta.
 */
function SeccionRecicladores({ idConjunto, accessToken }: { idConjunto: string; accessToken: string }) {
  const { t } = useTranslation();
  const [autorizados, setAutorizados] = useState<RecicladorAutorizado[]>([]);
  const [cargandoAutorizados, setCargandoAutorizados] = useState(true);
  const [invitaciones, setInvitaciones] = useState<InvitacionEnviada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [correoNuevo, setCorreoNuevo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorInvitar, setErrorInvitar] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  // ¿Qué? Esta sección (autorizados + invitaciones) es la que más espacio
  //       ocupa dentro de la tarjeta de cada conjunto — con un admin que
  //       administra varios conjuntos, esto por sí solo empujaba el resto
  //       del dashboard fuera de la vista inicial (issue #166). Colapsada
  //       por defecto, igual que ya hace "Invitar Administradores" en el
  //       panel del Admin del Sistema.
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  // ¿Qué? Antes esta sección solo consultaba el historial de invitaciones
  //       (obtenerInvitacionesDeConjunto) — un reciclador vinculado por
  //       fuera de ese flujo (ej. seed_data.sql, que lo hace a propósito
  //       "como si ya hubiera aceptado una invitación") nunca aparecía en
  //       ningún lado, aunque sí estuviera autorizado de verdad. El admin
  //       veía "no has invitado a nadie" y, al intentar invitarlo, el
  //       backend le decía "ya está autorizado" — dos respuestas correctas
  //       por separado, pero contradictorias entre sí.
  // ¿Impacto? Ahora se consultan las dos fuentes por separado: la lista
  //           real de autorizados (recicladores_conjuntos) y el historial
  //           de invitaciones, cada una con su propio título honesto.
  const cargarAutorizados = () => {
    setCargandoAutorizados(true);
    obtenerRecicladoresAutorizados(idConjunto, accessToken)
      .then(setAutorizados)
      .catch((err) => console.error("Error cargando recicladores autorizados", err))
      .finally(() => setCargandoAutorizados(false));
  };

  const cargarInvitaciones = () => {
    setCargando(true);
    obtenerInvitacionesDeConjunto(idConjunto, accessToken)
      .then(setInvitaciones)
      .catch((err) => console.error("Error cargando invitaciones de reciclador", err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarAutorizados();
    cargarInvitaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idConjunto]);

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInvitar(null);

    if (!correoNuevo.trim()) return;

    setEnviando(true);
    try {
      await invitarReciclador(correoNuevo.trim(), idConjunto, accessToken);
      setCorreoNuevo("");
      setMostrarFormulario(false);
      cargarInvitaciones();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const detalle = err?.response?.data?.detail;
      setErrorInvitar(detalle || t("dashboards.adminConjunto.recyclersSection.errorDefault"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    // ¿Qué? Fondo tenue propio (en vez de solo el borde superior de antes)
    //       para que esta sección se lea como un bloque aparte del resto de
    //       la tarjeta del conjunto — antes todo compartía el mismo blanco y
    //       solo una línea delgada las separaba (issue #166, "se ve todo
    //       pegado").
    <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-[#0d2116]/40">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-green-600" />
          <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("dashboards.adminConjunto.recyclersSection.title")}</h5>
          {!cargandoAutorizados && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {autorizados.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarDetalle((v) => !v)}
            className="text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors dark:bg-[#132a1c] dark:text-gray-300 dark:border-[#2a4d34] dark:hover:bg-[#1f4029]"
          >
            {mostrarDetalle
              ? t("dashboards.adminConjunto.recyclersSection.hideDetail")
              : t("dashboards.adminConjunto.recyclersSection.showDetail")}
          </button>
          <button
            type="button"
            onClick={() => setMostrarFormulario((v) => !v)}
            className="text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
          >
            {t("dashboards.adminConjunto.recyclersSection.invite")}
          </button>
        </div>
      </div>

      {mostrarFormulario && (
        <form onSubmit={handleInvitar} className="flex flex-col sm:flex-row gap-2 mb-4 bg-white dark:bg-[#132a1c] p-3 rounded-xl">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              placeholder={t("dashboards.adminConjunto.recyclersSection.emailPlaceholder")}
              value={correoNuevo}
              onChange={(e) => setCorreoNuevo(e.target.value)}
              className="w-full pl-9 p-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:ring-2 focus:ring-green-500 outline-none dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={enviando || !correoNuevo.trim()}
            className="flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {enviando ? t("dashboards.adminConjunto.recyclersSection.sending") : t("dashboards.adminConjunto.recyclersSection.inviteButton")}
          </button>
        </form>
      )}

      {errorInvitar && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3 dark:bg-red-900/20 dark:text-red-400">{errorInvitar}</p>
      )}

      {mostrarDetalle && (
        <div className="mt-1">
          {/* Recicladores YA autorizados — el dato real (recicladores_conjuntos) */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {t("dashboards.adminConjunto.recyclersSection.authorizedTitle")}
          </p>
          {cargandoAutorizados ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {t("dashboards.adminConjunto.recyclersSection.authorizedLoading")}
            </p>
          ) : autorizados.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {t("dashboards.adminConjunto.recyclersSection.authorizedEmpty")}
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {autorizados.map((r) => (
                <div
                  key={r.id_reciclador}
                  className="flex items-center justify-between gap-3 bg-green-50 dark:bg-green-900/10 rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {r.nombre} {r.apellidos}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.correo_electronico}</p>
                  </div>
                  {r.asociacion && (
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {r.asociacion}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Historial de invitaciones enviadas — puede estar vacío aunque sí
              haya recicladores autorizados arriba (ver comentario más arriba). */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {t("dashboards.adminConjunto.recyclersSection.invitationsTitle")}
          </p>
          {cargando ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("dashboards.adminConjunto.recyclersSection.loading")}</p>
          ) : invitaciones.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("dashboards.adminConjunto.recyclersSection.empty")}
            </p>
          ) : (
            <div className="space-y-2">
              {invitaciones.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 bg-white dark:bg-[#132a1c] rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {inv.nombre_reciclador} {inv.apellidos_reciclador}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{inv.correo_reciclador}</p>
                  </div>
                  <BadgeEstado estado={inv.estado} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ¿Qué? Botón/formulario para pedir dejar de administrar UN conjunto
 *       específico (RQF-016, HU-022).
 * ¿Para qué? Si ya hay una solicitud pendiente para ese conjunto, se
 *           muestra un badge en vez del botón — evita que el usuario
 *           choque con el error de "ya tienes una solicitud pendiente".
 */
function SeccionDesvinculacion({
  idConjunto,
  tieneSolicitudPendiente,
  accessToken,
  onSolicitudEnviada,
}: {
  idConjunto: string;
  tieneSolicitudPendiente: boolean;
  accessToken: string;
  onSolicitudEnviada: () => void;
}) {
  const { t } = useTranslation();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSolicitar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await solicitarDesvinculacion(idConjunto, motivo.trim() || undefined, accessToken);
      setMostrarFormulario(false);
      setMotivo("");
      onSolicitudEnviada();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const detalle = err?.response?.data?.detail;
      setError(detalle || t("desvinculacion.errorDefault"));
    } finally {
      setEnviando(false);
    }
  };

  // ¿Qué? Antes este botón decía solo "Solicitar desvinculación", sin decir
  //       DE QUÉ — y estaba pegado justo debajo de la sección de
  //       Recicladores, lo que hacía parecer que ambas cosas estaban
  //       relacionadas. Un usuario real lo probó pensando que iba a
  //       desvincular a un reciclador, cuando en realidad desvincula al
  //       ADMIN de la administración de este conjunto (RQF-016) — los
  //       recicladores autorizados no se ven afectados en absoluto.
  // ¿Impacto? Título propio + texto del botón explícito + aclaración corta
  //           dejan claro, sin necesidad de leer el código, que esto es
  //           sobre el rol del admin, no sobre los recicladores.
  return (
    // ¿Qué? Mismo criterio que en SeccionRecicladores — fondo propio en vez
    //       de solo un borde arriba, para que se vea como un bloque aparte
    //       (issue #166).
    <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-[#0d2116]/40">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {t("desvinculacion.sectionTitle")}
      </p>

      {tieneSolicitudPendiente ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2.5 py-1 rounded-full">
          <Clock className="w-3.5 h-3.5" /> {t("desvinculacion.pendingBadge")}
        </span>
      ) : !mostrarFormulario ? (
        <div>
          <button
            type="button"
            onClick={() => setMostrarFormulario(true)}
            className="text-xs font-semibold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t("desvinculacion.solicitarButton")}
          </button>
          <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">{t("desvinculacion.clarification")}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#132a1c] p-3 rounded-xl space-y-2">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("desvinculacion.clarification")}</p>
          <label className="text-xs font-bold text-gray-600 dark:text-gray-400">
            {t("desvinculacion.motivoLabel")}
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={t("desvinculacion.motivoPlaceholder")}
            rows={2}
            className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:ring-2 focus:ring-green-500 outline-none dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSolicitar}
              disabled={enviando}
              className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {enviando ? t("desvinculacion.sending") : t("desvinculacion.submit")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarFormulario(false);
                setError(null);
              }}
              className="text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-[#1f4029] dark:text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ¿Qué? Dashboard del rol Administrador de Conjunto (id_rol = 4).
 * ¿Para qué? Mostrar SOLO los conjuntos que esta persona administra,
 *           permitirle editar nombre/NIT/dirección de cada uno, y ahora
 *           también invitar recicladores autorizados por conjunto.
 */
export function AdminConjuntoDashboard() {
  const { t } = useTranslation();
  const { user, accessToken } = useAuth();
  const { WatermarkIcon } = ROLE_THEME[RoleId.ADMIN_CONJUNTO];
  const [conjuntos, setConjuntos] = useState<ConjuntoAdministrado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formEdicion, setFormEdicion] = useState({ nombre_conjunto: "", nit: "", direccion: "" });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [cargandoNotifs, setCargandoNotifs] = useState(true);
  const [errorNotifs, setErrorNotifs] = useState(false);
  const [errorAccionNotif, setErrorAccionNotif] = useState(false);

  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  const cargarConjuntos = () => {
    if (!accessToken) return;
    setCargando(true);
    obtenerMisConjuntos(accessToken)
      .then(setConjuntos)
      .catch((err) => console.error("Error cargando mis conjuntos", err))
      .finally(() => setCargando(false));
  };

  const cargarNotificaciones = () => {
    if (!accessToken) return;
    axios
      .get(`${API_BASE_URL}/api/v1/notificaciones/mis-notificaciones`, { headers: authHeaders })
      .then((res) => {
        setNotificaciones(res.data);
        setErrorNotifs(false);
      })
      // ¿Qué? Antes esto fallaba en silencio — el panel se quedaba con
      //       notificaciones viejas sin ningún aviso de que algo salió mal.
      // ¿Impacto? Como esto también corre cada 20s (polling), el aviso
      //           desaparece solo apenas una siguiente carga funcione.
      .catch(() => setErrorNotifs(true))
      .finally(() => setCargandoNotifs(false));
  };

  const marcarLeida = async (id: string) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notificaciones/${id}/leer`, {}, { headers: authHeaders });
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      notificarNotificacionesActualizadas();
    } catch {
      setErrorAccionNotif(true);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notificaciones/marcar-todas-leidas`, {}, { headers: authHeaders });
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      notificarNotificacionesActualizadas();
    } catch {
      setErrorAccionNotif(true);
    }
  };

  const limpiarLeidas = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/notificaciones/limpiar-leidas`, { headers: authHeaders });
      setNotificaciones((prev) => prev.filter((n) => !n.leida));
    } catch {
      setErrorAccionNotif(true);
    }
  };

  useEffect(() => {
    cargarConjuntos();
    cargarNotificaciones();
    const interval = setInterval(cargarNotificaciones, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const iniciarEdicion = (c: ConjuntoAdministrado) => {
    setEditandoId(c.id_conjunto_residencial);
    setFormEdicion({
      nombre_conjunto: c.nombre_conjunto,
      nit: c.nit || "",
      direccion: c.direccion,
    });
    setMensaje(null);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
  };

  const guardarEdicion = async (id: string) => {
    if (!accessToken) return;
    setGuardando(true);
    try {
      await editarMiConjunto(
        id,
        {
          nombre_conjunto: formEdicion.nombre_conjunto,
          nit: formEdicion.nit || null,
          direccion: formEdicion.direccion,
        },
        accessToken
      );
      setMensaje(t("dashboards.adminConjunto.editForm.successMessage"));
      setEditandoId(null);
      cargarConjuntos();
    } catch (err) {
      console.error("Error al editar conjunto", err);
      setMensaje(t("dashboards.adminConjunto.editForm.errorMessage"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* TARJETA DE PERFIL — el maletín de fondo es solo un detalle tenue,
          para que este panel se sienta del Admin de Conjunto, sin estorbar
          la lectura del texto encima. */}
      <div className="relative overflow-hidden bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <WatermarkIcon className="pointer-events-none absolute right-4 top-4 h-20 w-20 text-amber-900/5 dark:text-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <Building2 className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("dashboards.adminConjunto.title")}</h1>
            <p className="text-gray-600 dark:text-gray-300">
              {t("dashboards.common.welcomePrefix")} <span className="font-bold uppercase">{user?.first_name} {user?.last_name}</span>.
            </p>
            <p className="text-xs text-green-700 dark:text-green-400 font-semibold mt-1 tracking-wide">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Actividad reciente (resultado de auditoría + notificaciones) — es
          la información más urgente de este panel (avisos que requieren
          reacción), así que va primero, justo después del encabezado. Antes
          vivía al final, debajo de "Mis conjuntos", que por sí sola ya podía
          medir más que una pantalla completa (issue #166). */}
      {!cargandoNotifs && (
        <AuditoriaResultadoBanner
          notificaciones={notificaciones}
          token={accessToken ?? ""}
          onMarcarLeida={marcarLeida}
        />
      )}

      {cargandoNotifs ? (
        <div className="bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] shadow-sm p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
        </div>
      ) : (
        <>
          {errorNotifs && <Alert type="error" message={t("common.loadError")} />}
          {errorAccionNotif && (
            <Alert
              type="error"
              message={t("common.actionError")}
              onClose={() => setErrorAccionNotif(false)}
            />
          )}
          <NotificationFeed
            title={t("dashboards.adminConjunto.notifications.title")}
            notifications={notificaciones.filter((n) => n.tipo !== "AUDITORIA_PUBLICADA")}
            emptyMessage={t("dashboards.adminConjunto.notifications.empty")}
            accentBg="bg-amber-700"
            accentHighlight="bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
            onMarkRead={marcarLeida}
            onMarkAllRead={marcarTodasLeidas}
            onClearRead={limpiarLeidas}
          />
        </>
      )}

      {mensaje && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl dark:border-green-700/40 dark:bg-green-900/15 dark:text-green-400">
          {mensaje}
        </div>
      )}

      <div className="bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-[#2a4d34] pb-2">
          <Building2 className="text-green-600 w-5 h-5" />
          <h3 className="font-bold text-gray-800 dark:text-white">{t("dashboards.adminConjunto.myConjuntos.title")}</h3>
        </div>

        {cargando ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">{t("dashboards.adminConjunto.myConjuntos.loading")}</p>
        ) : conjuntos.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
            {t("dashboards.adminConjunto.myConjuntos.empty")}
          </p>
        ) : (
          <div className="space-y-4">
            {conjuntos.map((c) => (
              <div
                key={c.id_conjunto_residencial}
                className="border border-gray-200 dark:border-[#2a4d34] rounded-xl p-4"
              >
                {editandoId === c.id_conjunto_residencial ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("dashboards.adminConjunto.editForm.name")}</label>
                      <input
                        type="text"
                        value={formEdicion.nombre_conjunto}
                        onChange={(e) =>
                          setFormEdicion((p) => ({ ...p, nombre_conjunto: e.target.value }))
                        }
                        className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 bg-white text-gray-900 focus:ring-2 focus:ring-green-500 outline-none dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("dashboards.adminConjunto.editForm.nit")}</label>
                      <input
                        type="text"
                        value={formEdicion.nit}
                        onChange={(e) => setFormEdicion((p) => ({ ...p, nit: e.target.value }))}
                        className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 bg-white text-gray-900 focus:ring-2 focus:ring-green-500 outline-none dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("dashboards.adminConjunto.editForm.address")}</label>
                      <input
                        type="text"
                        value={formEdicion.direccion}
                        onChange={(e) =>
                          setFormEdicion((p) => ({ ...p, direccion: e.target.value }))
                        }
                        className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 bg-white text-gray-900 focus:ring-2 focus:ring-green-500 outline-none dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => guardarEdicion(c.id_conjunto_residencial)}
                        disabled={guardando}
                        className="flex items-center gap-1 text-sm font-semibold text-white bg-green-700 hover:bg-green-800 px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
                      >
                        <Check className="w-4 h-4" /> {t("common.save")}
                      </button>
                      <button
                        type="button"
                        onClick={cancelarEdicion}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors dark:bg-[#1f4029] dark:text-gray-300 dark:hover:bg-[#2a4d34]"
                      >
                        <X className="w-4 h-4" /> {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-gray-800 dark:text-white">{c.nombre_conjunto}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {c.direccion} — {c.nombre_localidad}
                        </p>
                        {c.nit && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("dashboards.adminConjunto.nitLabel", { nit: c.nit })}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => iniciarEdicion(c)}
                        className="flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                      >
                        <Pencil className="w-3.5 h-3.5" /> {t("common.edit")}
                      </button>
                    </div>

                    {/*
                      ¿Qué? Sección nueva de Recicladores Autorizados,
                            anidada DENTRO de cada conjunto — solo se
                            muestra cuando NO se está editando ese conjunto.
                      ¿Para qué? Cada conjunto tiene sus propios recicladores
                                autorizados; tiene más sentido vivir aquí
                                que en una sección global aparte.
                    */}
                    {accessToken && (
                      <>
                        <SeccionCodigoAcceso
                          idConjunto={c.id_conjunto_residencial}
                          codigoAcceso={c.codigo_acceso}
                          accessToken={accessToken}
                          onRegenerado={cargarConjuntos}
                        />
                        <SeccionRecicladores idConjunto={c.id_conjunto_residencial} accessToken={accessToken} />
                        <SeccionDesvinculacion
                          idConjunto={c.id_conjunto_residencial}
                          tieneSolicitudPendiente={c.tiene_solicitud_pendiente}
                          accessToken={accessToken}
                          onSolicitudEnviada={cargarConjuntos}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de auditorías — log histórico, sin urgencia, va al final. */}
      <HistorialAuditorias token={accessToken ?? ""} />
    </div>
  );
}