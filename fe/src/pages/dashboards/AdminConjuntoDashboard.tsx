import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { usePolling } from "@/hooks/usePolling";
import { Building, MapPin, Pencil, Check, X, Users, Mail, Send, Clock, KeyRound, Copy, TriangleAlert, UserX, ChevronDown, ClipboardList, ImageIcon, Trash2 } from "lucide-react";
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
  revocarReciclador,
  type InvitacionEnviada,
  type RecicladorAutorizado,
} from "@/lib/recicladorConjuntoApi";
import { NotificationFeed } from "@/components/dashboard/NotificationFeed";
import { tiempoRelativo, type NotificacionItem } from "@/lib/notificaciones";
import { AuditoriaResultadoBanner } from "@/components/dashboard/AuditoriaResultadoBanner";
import { HistorialAuditoriasSemanal } from "@/components/dashboard/HistorialAuditoriasSemanal";
import { listarHistorial, type AuditoriaConjunto } from "@/lib/auditoriaConjuntoApi";
import { notificarNotificacionesActualizadas } from "@/lib/notificationEvents";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContadorCaracteres } from "@/components/ui/ContadorCaracteres";
import { ImagenAdjuntaField } from "@/components/ui/ImagenAdjuntaField";
import {
  CORREO_MAX_LENGTH,
  CORREO_REGEX,
  DESVINCULACION_MOTIVO_MAX_LENGTH,
  NIT_MAX_LENGTH,
  TOTAL_APARTAMENTOS_MAX,
} from "@/lib/validacion";
import {
  listarAgenda,
  crearItemAgenda,
  cambiarEstadoItemAgenda,
  eliminarItemAgenda,
  type ItemAgenda,
} from "@/lib/conjuntoPanelApi";
import { formatearFechaCreacion } from "@/lib/dateFormat";
import { enlaceAdjuntoSeguro } from "@/lib/enlaceSeguro";

/**
 * ¿Qué? Badge de color según el estado de la invitación.
 * ¿Para qué? Distinguir visualmente PENDIENTE (ámbar) / ACEPTADA (verde) /
 *           RECHAZADA (rojo) sin tener que leer el texto con atención.
 */
function BadgeEstado({ estado }: { estado: string }) {
  const { t } = useTranslation();
  const estilos: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    ACEPTADA: "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400",
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

// ¿Qué? A qué rol pertenece cada tipo de notificación, visto desde el
//       Admin de Conjunto — SHUT_LLENO solo lo puede avisar un Residente;
//       los otros 3 solo un Reciclador autorizado (ver test_notificaciones.py).
// ¿Para qué? Separar "De recicladores" / "De residentes" en SeccionAvisosConjunto
//           sin tener que adivinar el rol a partir del texto del mensaje.
const TIPOS_DE_RECICLADOR = new Set(["LLEGADA_RECICLADOR", "SHUT_LIBRE", "FINALIZACION_RECICLADOR"]);
const TIPOS_DE_RESIDENTE = new Set(["SHUT_LLENO"]);

/**
 * ¿Qué? Avisos recientes de UN conjunto específico, separados por quién los
 *       mandó (Reciclador / Residente).
 * ¿Para qué? Antes todos los avisos de todos los conjuntos vivían juntos en
 *           NotificationFeed, arriba del todo — un Admin que administra más
 *           de un conjunto no podía saber, a simple vista, cuáles avisos
 *           eran de cuál conjunto. Esto filtra lo mismo que ya llegó al
 *           panel (misma polling de "notificaciones"), sin pedirlo de nuevo.
 * ¿Impacto? Es de solo lectura — marcar como leída sigue siendo cosa de
 *           NotificationFeed, arriba. Si no hay avisos para este conjunto,
 *           no se muestra nada (no ocupa espacio con un estado vacío).
 */
function SeccionAvisosConjunto({
  nombreConjunto,
  notificaciones,
}: {
  nombreConjunto: string;
  notificaciones: NotificacionItem[];
}) {
  const { t } = useTranslation();
  const propias = notificaciones.filter((n) => n.nombre_conjunto === nombreConjunto);
  const deReciclador = propias.filter((n) => TIPOS_DE_RECICLADOR.has(n.tipo)).slice(0, 3);
  const deResidente = propias.filter((n) => TIPOS_DE_RESIDENTE.has(n.tipo)).slice(0, 3);

  if (deReciclador.length === 0 && deResidente.length === 0) return null;

  const grupo = (titulo: string, color: string, items: NotificacionItem[]) => (
    <div>
      <p className={`mb-1 text-[11px] font-bold uppercase tracking-wide ${color}`}>{titulo}</p>
      <ul className="space-y-1">
        {items.map((n) => (
          <li key={n.id} className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="truncate">{n.mensaje}</span>
            <span className="shrink-0 text-gray-400">{tiempoRelativo(n.created_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-night-inset/40 space-y-3">
      <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("dashboards.adminConjunto.avisosSection.title")}</h5>
      {deReciclador.length > 0 && grupo(t("dashboards.adminConjunto.avisosSection.fromRecycler"), "text-teal-700 dark:text-teal-400", deReciclador)}
      {deResidente.length > 0 && grupo(t("dashboards.adminConjunto.avisosSection.fromResident"), "text-amber-700 dark:text-amber-400", deResidente)}
    </div>
  );
}

/**
 * ¿Qué? Cobertura de UN conjunto: cuántos de sus apartamentos ya tienen al
 *       menos un residente con cuenta, contra el total que definió su Admin.
 * ¿Para qué? Que el Admin de Conjunto vea cuántos faltan por usar VerdeApp y
 *           pueda invitarlos (por ejemplo en la reunión del conjunto).
 * ¿Impacto? Si todavía no definió el total (todos los conjuntos arrancan así),
 *          solo muestra los registrados y un botón para definirlo.
 */
function SeccionCobertura({ conjunto, onDefinir }: { conjunto: ConjuntoAdministrado; onDefinir: () => void }) {
  const { t } = useTranslation();
  const { total_apartamentos: total, apartamentos_registrados: registrados, residentes_registrados: residentes } = conjunto;
  const tieneTotal = total !== null && total > 0;
  // ¿Qué? Se topa en 100% / 0 faltantes por si hay más registrados que el total escrito.
  const porcentaje = tieneTotal ? Math.min(100, Math.round((registrados / total) * 100)) : 0;
  const faltan = tieneTotal ? Math.max(0, total - registrados) : 0;

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-night-line dark:bg-night-inset/40">
      <div className="mb-2 flex items-center gap-2">
        <Building className="icon-md text-accent-600" />
        <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("dashboards.adminConjunto.coverage.title")}</h5>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-4xl font-bold leading-none text-accent-700 dark:text-accent-400">{registrados}</span>
        <span className="text-base text-gray-500 dark:text-gray-400">
          {tieneTotal
            ? t("dashboards.adminConjunto.coverage.ofTotal", { total })
            : t("dashboards.adminConjunto.coverage.alreadyHaveResidents")}
        </span>
      </div>

      {tieneTotal ? (
        <>
          <div
            role="img"
            aria-label={t("dashboards.adminConjunto.coverage.barAria", { registrados, total })}
            className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-night-line"
          >
            <div className="h-full rounded-full bg-accent-700" style={{ width: `${porcentaje}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-6">
            <div>
              <div className="text-xl font-bold text-gray-800 dark:text-white">{faltan}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t("dashboards.adminConjunto.coverage.missing")}</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-800 dark:text-white">{residentes}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t("dashboards.adminConjunto.coverage.residents")}</div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {t("dashboards.adminConjunto.coverage.explain")}
          </p>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {t("dashboards.adminConjunto.coverage.noTotal")}
          </p>
          <button
            type="button"
            onClick={onDefinir}
            className="cursor-pointer rounded-xl bg-accent-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
          >
            {t("dashboards.adminConjunto.coverage.define")}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * ¿Qué? Agenda interna de UN conjunto: temas (texto + foto opcional) que el
 *       Admin de Conjunto lleva al comité — ej. "pintar el pasillo",
 *       "arreglar la puerta del sótano".
 * ¿Para qué? Que no se le olvide lo que le piden. En el comité abre su
 *           agenda, discute los temas y va borrando los resueltos o los
 *           deja "en espera".
 * ¿Impacto? Privada: nunca llega al Admin Sistema. Sin fecha de caducidad
 *          a propósito (el comité no tiene fecha fija que la app pueda
 *          saber). Colapsada por defecto, igual que SeccionRecicladores.
 */
function SeccionAgenda({ idConjunto }: { idConjunto: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ItemAgenda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [texto, setTexto] = useState("");
  const [urlEvidencia, setUrlEvidencia] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aBorrar, setABorrar] = useState<ItemAgenda | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    listarAgenda(idConjunto)
      .then((data) => {
        setItems(data);
        setErrorCarga(false);
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargando(false));
  }, [idConjunto]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await crearItemAgenda(idConjunto, { texto: texto.trim(), url_evidencia: urlEvidencia || null });
      setAgregando(false);
      setTexto("");
      setUrlEvidencia("");
      cargar();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("dashboards.adminConjunto.agendaSection.errorDefault"));
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstado = async (item: ItemAgenda) => {
    setError(null);
    try {
      await cambiarEstadoItemAgenda(idConjunto, item.id, item.estado === "PENDIENTE" ? "EN_ESPERA" : "PENDIENTE");
      cargar();
    } catch {
      setError(t("dashboards.adminConjunto.agendaSection.actionError"));
    }
  };

  const confirmarBorrar = async () => {
    if (!aBorrar) return;
    setBorrando(true);
    setErrorBorrar(null);
    try {
      await eliminarItemAgenda(idConjunto, aBorrar.id);
      setABorrar(null);
      cargar();
    } catch {
      setErrorBorrar(t("dashboards.adminConjunto.agendaSection.actionError"));
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-night-inset/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="icon-md text-accent-600" />
          <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("dashboards.adminConjunto.agendaSection.title")}</h5>
          {!cargando && (
            <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-400">
              {items.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMostrarDetalle((v) => !v)}
          aria-expanded={mostrarDetalle}
          className="cursor-pointer text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors dark:bg-night-panel dark:text-gray-300 dark:border-night-line dark:hover:bg-night-field"
        >
          {mostrarDetalle
            ? t("dashboards.adminConjunto.agendaSection.hideDetail")
            : t("dashboards.adminConjunto.agendaSection.showDetail")}
        </button>
      </div>

      {mostrarDetalle && (
        <div className="mt-3 space-y-3">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("dashboards.adminConjunto.agendaSection.hint")}</p>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {agregando ? (
            <div className="space-y-3 rounded-lg bg-white p-3 dark:bg-night-card">
              <div>
                <label htmlFor={`agenda-texto-${idConjunto}`} className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  {t("dashboards.adminConjunto.agendaSection.textLabel")}
                </label>
                <textarea
                  id={`agenda-texto-${idConjunto}`}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  maxLength={DESVINCULACION_MOTIVO_MAX_LENGTH}
                  rows={2}
                  aria-describedby={`agenda-contador-${idConjunto}`}
                  placeholder={t("dashboards.adminConjunto.agendaSection.textPlaceholder")}
                  className="mt-1 w-full p-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 transition-colors focus:ring-2 focus:ring-accent-500 outline-none dark:border-night-line dark:bg-night-field dark:text-white"
                />
                <ContadorCaracteres id={`agenda-contador-${idConjunto}`} actual={texto.length} max={DESVINCULACION_MOTIVO_MAX_LENGTH} />
              </div>
              <ImagenAdjuntaField
                label={t("dashboards.adminConjunto.agendaSection.evidenceLabel")}
                value={urlEvidencia}
                onChange={setUrlEvidencia}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={guardar}
                  disabled={guardando || !texto.trim()}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="icon-sm" />
                  {guardando ? t("common.saving") : t("dashboards.adminConjunto.agendaSection.save")}
                </button>
                <button
                  type="button"
                  onClick={() => setAgregando(false)}
                  className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAgregando(true)}
              className="cursor-pointer text-xs font-semibold text-accent-700 hover:text-accent-800 bg-accent-50 hover:bg-accent-100 px-3 py-1.5 rounded-lg transition-colors dark:bg-accent-900/20 dark:text-accent-400 dark:hover:bg-accent-900/30"
            >
              + {t("dashboards.adminConjunto.agendaSection.add")}
            </button>
          )}

          {cargando ? (
            <LoadingState message={t("common.loading")} />
          ) : errorCarga ? (
            <Alert type="error" message={t("common.loadError")} />
          ) : items.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("dashboards.adminConjunto.agendaSection.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="rounded-lg bg-white p-3 dark:bg-night-card">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.estado === "EN_ESPERA" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Clock className="icon-sm" />
                        {t("dashboards.adminConjunto.agendaSection.stateWaiting")}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">{formatearFechaCreacion(item.created_at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200">{item.texto}</p>
                  {enlaceAdjuntoSeguro(item.url_evidencia) && (
                    <a
                      href={enlaceAdjuntoSeguro(item.url_evidencia) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:text-accent-800 dark:text-accent-400"
                    >
                      <ImageIcon className="icon-sm" />
                      {t("dashboards.adminConjunto.agendaSection.viewPhoto")}
                    </a>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => alternarEstado(item)}
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-transparent dark:text-gray-300 dark:hover:bg-night-hover"
                    >
                      {item.estado === "PENDIENTE"
                        ? t("dashboards.adminConjunto.agendaSection.putOnHold")
                        : t("dashboards.adminConjunto.agendaSection.backToPending")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setABorrar(item)}
                      aria-label={t("dashboards.adminConjunto.agendaSection.delete")}
                      className="cursor-pointer rounded-lg border border-gray-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-night-line dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="icon-sm" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {aBorrar && (
        <ConfirmModal
          icon={Trash2}
          variant="danger"
          ariaLabel={t("dashboards.adminConjunto.agendaSection.deleteTitle")}
          title={t("dashboards.adminConjunto.agendaSection.deleteTitle")}
          description={t("dashboards.adminConjunto.agendaSection.deleteWarning")}
          error={errorBorrar}
          isConfirming={borrando}
          confirmLabel={t("dashboards.adminConjunto.agendaSection.deleteConfirm")}
          confirmingLabel={t("dashboards.adminConjunto.agendaSection.deleting")}
          onConfirm={confirmarBorrar}
          onClose={() => setABorrar(null)}
        />
      )}
    </div>
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
  onRegenerado,
}: {
  idConjunto: string;
  codigoAcceso: string;
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
    setRegenerando(true);
    setError(null);
    try {
      await regenerarCodigoAcceso(idConjunto);
      setConfirmando(false);
      onRegenerado();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("dashboards.adminConjunto.codigoAcceso.errorDefault"));
    } finally {
      setRegenerando(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-night-inset/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <KeyRound className="icon-md text-accent-600" />
            <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {t("dashboards.adminConjunto.codigoAcceso.title")}
            </h5>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("dashboards.adminConjunto.codigoAcceso.description")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-base font-bold tracking-widest text-gray-900 dark:border-night-line dark:bg-night-panel dark:text-white">
            {codigoAcceso}
          </span>
          <button
            type="button"
            onClick={copiarCodigo}
            className="cursor-pointer rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-white dark:border-night-line dark:text-gray-300 dark:hover:bg-night-field"
            aria-label={t(
              copiado ? "dashboards.adminConjunto.codigoAcceso.copiedAria" : "dashboards.adminConjunto.codigoAcceso.copyAria"
            )}
          >
            {copiado ? <Check className="icon-md text-accent-600" /> : <Copy className="icon-md" />}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="cursor-pointer text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/10 dark:text-amber-400 dark:hover:bg-amber-900/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t("dashboards.adminConjunto.codigoAcceso.regenerateButton")}
          </button>
        </div>
      </div>

      {confirmando && (
        <ConfirmModal
          icon={TriangleAlert}
          variant="warning"
          ariaLabel={t("dashboards.adminConjunto.codigoAcceso.confirmTitle")}
          title={t("dashboards.adminConjunto.codigoAcceso.confirmTitle")}
          description={t("dashboards.adminConjunto.codigoAcceso.confirmWarning")}
          error={error}
          isConfirming={regenerando}
          confirmLabel={t("dashboards.adminConjunto.codigoAcceso.confirmButton")}
          confirmingLabel={t("dashboards.adminConjunto.codigoAcceso.regenerating")}
          onConfirm={regenerar}
          onClose={() => setConfirmando(false)}
        />
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
function SeccionRecicladores({ idConjunto }: { idConjunto: string }) {
  const { t } = useTranslation();
  const [autorizados, setAutorizados] = useState<RecicladorAutorizado[]>([]);
  const [cargandoAutorizados, setCargandoAutorizados] = useState(true);
  const [errorAutorizados, setErrorAutorizados] = useState(false);
  const [invitaciones, setInvitaciones] = useState<InvitacionEnviada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [correoNuevo, setCorreoNuevo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorInvitar, setErrorInvitar] = useState<string | null>(null);
  // ¿Qué? Issue #352 — con noValidate el navegador ya no revisa el formato
  //       del correo; lo revisa la app, anclado al campo como en el resto.
  const [errorCorreo, setErrorCorreo] = useState<string | null>(null);
  const validarCorreo = () => {
    const correo = correoNuevo.trim();
    const mensaje = correo && !CORREO_REGEX.test(correo) ? t("auth.register.validation.emailInvalid") : null;
    setErrorCorreo(mensaje);
    return !mensaje;
  };
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  // ¿Qué? Esta sección (autorizados + invitaciones) es la que más espacio
  //       ocupa dentro de la tarjeta de cada conjunto — con un admin que
  //       administra varios conjuntos, esto por sí solo empujaba el resto
  //       del dashboard fuera de la vista inicial (issue #166). Colapsada
  //       por defecto, igual que ya hace "Invitar Administradores" en el
  //       panel del Admin del Sistema.
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [aRevocar, setARevocar] = useState<RecicladorAutorizado | null>(null);
  const [revocando, setRevocando] = useState(false);
  const [errorRevocar, setErrorRevocar] = useState<string | null>(null);

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
  const cargarAutorizados = useCallback(() => {
    setCargandoAutorizados(true);
    obtenerRecicladoresAutorizados(idConjunto)
      .then((data) => {
        setAutorizados(data);
        setErrorAutorizados(false);
      })
      // ¿Qué? Issue #223 (f2 del diagnóstico) — antes esto fallaba en
      //       silencio: solo un console.error, y la pantalla se veía
      //       igual que si de verdad no hubiera ningún reciclador
      //       autorizado en este conjunto.
      // ¿Impacto? Ahora se distingue "no hay recicladores autorizados"
      //           de "falló la carga" con un aviso real (ver el render
      //           más abajo).
      .catch((err) => {
        console.error("Error cargando recicladores autorizados", err);
        setErrorAutorizados(true);
      })
      .finally(() => setCargandoAutorizados(false));
  }, [idConjunto]);

  const cargarInvitaciones = useCallback(() => {
    setCargando(true);
    obtenerInvitacionesDeConjunto(idConjunto)
      .then(setInvitaciones)
      .catch((err) => console.error("Error cargando invitaciones de reciclador", err))
      .finally(() => setCargando(false));
  }, [idConjunto]);

  // ¿Qué? Issue #225 — "cargarAutorizados"/"cargarInvitaciones" faltaban en
  //       las dependencias; se silenciaba la advertencia en vez de
  //       agregarlas. Envolverlas en useCallback (arriba) las vuelve
  //       estables salvo cuando "idConjunto" cambia de verdad.
  useEffect(() => {
    cargarAutorizados();
    cargarInvitaciones();
  }, [cargarAutorizados, cargarInvitaciones]);

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInvitar(null);

    if (!correoNuevo.trim() || !validarCorreo()) return;

    setEnviando(true);
    try {
      await invitarReciclador(correoNuevo.trim(), idConjunto);
      setCorreoNuevo("");
      setMostrarFormulario(false);
      cargarInvitaciones();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorInvitar(err.message || t("dashboards.adminConjunto.recyclersSection.errorDefault"));
    } finally {
      setEnviando(false);
    }
  };

  const confirmarRevocar = async () => {
    if (!aRevocar) return;
    setRevocando(true);
    setErrorRevocar(null);
    try {
      await revocarReciclador(idConjunto, aRevocar.id_reciclador);
      setARevocar(null);
      cargarAutorizados();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorRevocar(err.message || t("dashboards.adminConjunto.recyclersSection.revokeErrorDefault"));
    } finally {
      setRevocando(false);
    }
  };

  return (
    // ¿Qué? Fondo tenue propio (en vez de solo el borde superior de antes)
    //       para que esta sección se lea como un bloque aparte del resto de
    //       la tarjeta del conjunto — antes todo compartía el mismo blanco y
    //       solo una línea delgada las separaba (issue #166, "se ve todo
    //       pegado").
    <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-night-inset/40">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Users className="icon-md text-accent-600" />
          <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("dashboards.adminConjunto.recyclersSection.title")}</h5>
          {!cargandoAutorizados && (
            <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-400">
              {autorizados.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarDetalle((v) => !v)}
            aria-expanded={mostrarDetalle}
            aria-controls={`recicladores-detalle-${idConjunto}`}
            className="cursor-pointer text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors dark:bg-night-panel dark:text-gray-300 dark:border-night-line dark:hover:bg-night-field"
          >
            {mostrarDetalle
              ? t("dashboards.adminConjunto.recyclersSection.hideDetail")
              : t("dashboards.adminConjunto.recyclersSection.showDetail")}
          </button>
          <button
            type="button"
            onClick={() => setMostrarFormulario((v) => !v)}
            aria-expanded={mostrarFormulario}
            aria-controls={`recicladores-invitar-${idConjunto}`}
            className="cursor-pointer text-xs font-semibold text-accent-700 hover:text-accent-800 bg-accent-50 hover:bg-accent-100 px-3 py-1.5 rounded-lg transition-colors dark:bg-accent-900/20 dark:text-accent-400 dark:hover:bg-accent-900/30"
          >
            {t("dashboards.adminConjunto.recyclersSection.invite")}
          </button>
        </div>
      </div>

      {mostrarFormulario && (
        <form
          id={`recicladores-invitar-${idConjunto}`}
          onSubmit={handleInvitar}
          noValidate
          className="flex flex-col sm:flex-row gap-2 mb-4 bg-white dark:bg-night-card p-3 rounded-xl"
        >
          <div className="flex-1">
            <div className="relative">
              <Mail className="icon-md absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder={t("dashboards.adminConjunto.recyclersSection.emailPlaceholder")}
                aria-label={t("dashboards.adminConjunto.recyclersSection.emailPlaceholder")}
                value={correoNuevo}
                onChange={(e) => {
                  setCorreoNuevo(e.target.value);
                  setErrorCorreo(null);
                }}
                onBlur={validarCorreo}
                maxLength={CORREO_MAX_LENGTH}
                aria-invalid={!!errorCorreo}
                aria-describedby={errorCorreo ? `recicladores-correo-error-${idConjunto}` : undefined}
                className={`w-full pl-9 p-2.5 border rounded-xl bg-white text-sm text-gray-900 transition-colors focus:ring-2 focus:ring-accent-500 outline-none dark:bg-night-field dark:text-white ${
                  errorCorreo ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-night-line"
                }`}
              />
            </div>
            {errorCorreo && (
              <p id={`recicladores-correo-error-${idConjunto}`} role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errorCorreo}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={enviando || !correoNuevo.trim()}
            className="flex cursor-pointer items-center justify-center gap-1.5 bg-accent-700 hover:bg-accent-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="icon-sm" />
            {enviando ? t("dashboards.adminConjunto.recyclersSection.sending") : t("dashboards.adminConjunto.recyclersSection.inviteButton")}
          </button>
        </form>
      )}

      {errorInvitar && (
        <div className="mb-3">
          <Alert type="error" message={errorInvitar} onClose={() => setErrorInvitar(null)} />
        </div>
      )}

      {mostrarDetalle && (
        <div id={`recicladores-detalle-${idConjunto}`} className="mt-1">
          {/* Recicladores YA autorizados — el dato real (recicladores_conjuntos) */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("dashboards.adminConjunto.recyclersSection.authorizedTitle")}
          </p>
          {cargandoAutorizados ? (
            <LoadingState message={t("dashboards.adminConjunto.recyclersSection.authorizedLoading")} />
          ) : errorAutorizados ? (
            <div className="mb-4">
              <Alert type="error" message={t("common.loadError")} />
            </div>
          ) : autorizados.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {t("dashboards.adminConjunto.recyclersSection.authorizedEmpty")}
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {autorizados.map((r) => (
                <div
                  key={r.id_reciclador}
                  className="flex items-center justify-between gap-3 bg-accent-50 dark:bg-accent-900/10 rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {r.nombre} {r.apellidos}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.correo_electronico}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.asociacion && (
                      <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-accent-700 dark:bg-accent-900/30 dark:text-accent-400">
                        {r.asociacion}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setARevocar(r)}
                      className="cursor-pointer rounded-lg border border-gray-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-night-line dark:hover:bg-red-900/20"
                      aria-label={t("dashboards.adminConjunto.recyclersSection.revokeAria", { nombre: `${r.nombre} ${r.apellidos}` })}
                    >
                      <UserX className="icon-sm" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Historial de invitaciones enviadas — puede estar vacío aunque sí
              haya recicladores autorizados arriba (ver comentario más arriba). */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("dashboards.adminConjunto.recyclersSection.invitationsTitle")}
          </p>
          {cargando ? (
            <LoadingState message={t("dashboards.adminConjunto.recyclersSection.loading")} />
          ) : invitaciones.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("dashboards.adminConjunto.recyclersSection.empty")}
            </p>
          ) : (
            <div className="space-y-2">
              {invitaciones.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 bg-white dark:bg-night-card rounded-lg px-3 py-2"
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

      {aRevocar && (
        <ConfirmModal
          icon={UserX}
          variant="danger"
          ariaLabel={t("dashboards.adminConjunto.recyclersSection.revokeModalAriaLabel")}
          title={t("dashboards.adminConjunto.recyclersSection.revokeConfirmTitle", { nombre: `${aRevocar.nombre} ${aRevocar.apellidos}` })}
          description={t("dashboards.adminConjunto.recyclersSection.revokeConfirmWarning")}
          error={errorRevocar}
          isConfirming={revocando}
          confirmLabel={t("dashboards.adminConjunto.recyclersSection.revokeConfirmButton")}
          confirmingLabel={t("common.saving")}
          onConfirm={confirmarRevocar}
          onClose={() => setARevocar(null)}
        />
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
  onSolicitudEnviada,
}: {
  idConjunto: string;
  tieneSolicitudPendiente: boolean;
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
      await solicitarDesvinculacion(idConjunto, motivo.trim() || undefined);
      setMostrarFormulario(false);
      setMotivo("");
      onSolicitudEnviada();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("desvinculacion.errorDefault"));
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
    <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-night-inset/40">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {t("desvinculacion.sectionTitle")}
      </p>

      {tieneSolicitudPendiente ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2.5 py-1 rounded-full">
          <Clock className="icon-sm" /> {t("desvinculacion.pendingBadge")}
        </span>
      ) : !mostrarFormulario ? (
        <div>
          <button
            type="button"
            onClick={() => setMostrarFormulario(true)}
            className="cursor-pointer text-xs font-semibold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t("desvinculacion.solicitarButton")}
          </button>
          <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">{t("desvinculacion.clarification")}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-night-card p-3 rounded-xl space-y-2">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("desvinculacion.clarification")}</p>
          <label htmlFor={`desvinculacion-motivo-${idConjunto}`} className="text-xs font-bold text-gray-600 dark:text-gray-400">
            {t("desvinculacion.motivoLabel")}
          </label>
          <textarea
            id={`desvinculacion-motivo-${idConjunto}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={DESVINCULACION_MOTIVO_MAX_LENGTH}
            aria-describedby={`desvinculacion-motivo-contador-${idConjunto}`}
            placeholder={t("desvinculacion.motivoPlaceholder")}
            rows={2}
            className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:ring-2 focus:ring-accent-500 outline-none dark:border-night-line dark:bg-night-field dark:text-white"
          />
          <ContadorCaracteres
            id={`desvinculacion-motivo-contador-${idConjunto}`}
            actual={motivo.length}
            max={DESVINCULACION_MOTIVO_MAX_LENGTH}
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSolicitar}
              disabled={enviando}
              className="cursor-pointer text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? t("desvinculacion.sending") : t("desvinculacion.submit")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarFormulario(false);
                setError(null);
              }}
              className="cursor-pointer text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-night-field dark:text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
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
  const { user } = useAuth();
  const { Icon: RolIcon } = ROLE_THEME[RoleId.ADMIN_CONJUNTO];
  const [conjuntos, setConjuntos] = useState<ConjuntoAdministrado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorConjuntos, setErrorConjuntos] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formEdicion, setFormEdicion] = useState({ nit: "", total: "" });
  const [errorTotal, setErrorTotal] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  // ¿Qué? Antes "mensaje" era un simple string, y el aviso siempre se
  //       pintaba de verde (éxito) aunque el texto fuera el de error.
  // ¿Impacto? Ahora guarda también el tipo ("success"/"error"), así el
  //           color que se ve siempre corresponde a lo que pasó de verdad.
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  // ¿Qué? Qué conjunto está desplegado — mismo patrón de acordeón que
  //       AdminPuntosAcopioPage (Record<id, boolean>): sin decisión manual,
  //       solo el primero de la lista viene abierto (ver estaAbierto más abajo).
  // ¿Para qué? Con un Admin que administra varios conjuntos, tenerlos todos
  //           abiertos a la vez empujaba el resto del panel fuera de la
  //           vista inicial (issue #166) — ahora solo se ve el primero.
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  // ¿Qué? Historial de auditorías de TODOS los conjuntos que administra,
  //       pedido una sola vez aquí y filtrado por conjunto más abajo — así
  //       HistorialAuditoriasSemanal nunca mezcla auditorías de un conjunto
  //       con las de otro.
  const [auditorias, setAuditorias] = useState<AuditoriaConjunto[]>([]);

  useEffect(() => {
    listarHistorial()
      .then(setAuditorias)
      .catch(() => setAuditorias([]));
  }, []);

  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [cargandoNotifs, setCargandoNotifs] = useState(true);
  const [errorNotifs, setErrorNotifs] = useState(false);
  const [errorAccionNotif, setErrorAccionNotif] = useState(false);

  const cargarConjuntos = useCallback(() => {
    if (!user) return;
    setCargando(true);
    obtenerMisConjuntos()
      .then((data) => {
        setConjuntos(data);
        setErrorConjuntos(false);
      })
      // ¿Qué? Issue #223 (f2 del diagnóstico) — antes esto fallaba en
      //       silencio: solo un console.error (que un usuario normal
      //       nunca ve) y la pantalla quedaba igual que si el Admin no
      //       administrara ningún conjunto.
      // ¿Impacto? Ahora se distingue "no hay conjuntos" de "falló la
      //           carga" con un aviso real (ver el render más abajo).
      .catch((err) => {
        console.error("Error cargando mis conjuntos", err);
        setErrorConjuntos(true);
      })
      .finally(() => setCargando(false));
  }, [user]);

  const cargarNotificaciones = () => {
    if (!user) return;
    axios
      .get(`${API_BASE_URL}/api/v1/notificaciones/mis-notificaciones`)
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
      await axios.post(`${API_BASE_URL}/api/v1/notificaciones/${id}/leer`, {});
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      notificarNotificacionesActualizadas();
    } catch {
      setErrorAccionNotif(true);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notificaciones/marcar-todas-leidas`, {});
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      notificarNotificacionesActualizadas();
    } catch {
      setErrorAccionNotif(true);
    }
  };

  const limpiarLeidas = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/notificaciones/limpiar-leidas`);
      setNotificaciones((prev) => prev.filter((n) => !n.leida));
    } catch {
      setErrorAccionNotif(true);
    }
  };

  // ¿Qué? Issue #225 — "cargarConjuntos" faltaba en las dependencias; se
  //       silenciaba la advertencia en vez de agregarla.
  useEffect(() => {
    cargarConjuntos();
  }, [cargarConjuntos]);

  usePolling(cargarNotificaciones, { enabled: !!user });

  const iniciarEdicion = (c: ConjuntoAdministrado) => {
    setEditandoId(c.id_conjunto_residencial);
    setFormEdicion({ nit: c.nit || "", total: c.total_apartamentos ? String(c.total_apartamentos) : "" });
    setErrorTotal(null);
    setMensaje(null);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
  };

  const guardarEdicion = async (id: string) => {
    if (!user) return;
    // ¿Qué? Vacío = "sin definir"; si hay texto, debe ser un entero entre 1 y el tope.
    const totalTexto = formEdicion.total.trim();
    const total = totalTexto === "" ? null : Number(totalTexto);
    if (total !== null && (!Number.isInteger(total) || total < 1 || total > TOTAL_APARTAMENTOS_MAX)) {
      setErrorTotal(t("dashboards.adminConjunto.editForm.totalInvalid", { max: TOTAL_APARTAMENTOS_MAX }));
      return;
    }
    setErrorTotal(null);
    setGuardando(true);
    try {
      await editarMiConjunto(id, { nit: formEdicion.nit || null, total_apartamentos: total });
      setMensaje({ tipo: "success", texto: t("dashboards.adminConjunto.editForm.successMessage") });
      setEditandoId(null);
      cargarConjuntos();
    } catch (err) {
      console.error("Error al editar conjunto", err);
      setMensaje({ tipo: "error", texto: t("dashboards.adminConjunto.editForm.errorMessage") });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* TARJETA DE PERFIL — el maletín de fondo es solo un detalle tenue,
          para que este panel se sienta del Admin de Conjunto, sin estorbar
          la lectura del texto encima. */}
      <div className="relative overflow-hidden bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
        <RolIcon className="icon-deco pointer-events-none absolute right-4 top-4 text-amber-900/5 dark:text-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <RolIcon className="icon-xl text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("dashboards.adminConjunto.title")}</h1>
            <p className="text-gray-600 dark:text-gray-300">
              {t("dashboards.common.welcomePrefix")} <span className="font-bold uppercase">{user?.first_name} {user?.last_name}</span>.
            </p>
            <p className="text-xs text-accent-700 dark:text-accent-400 font-semibold mt-1 tracking-wide">
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
          onMarcarLeida={marcarLeida}
        />
      )}

      {cargandoNotifs ? (
        <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line shadow-sm p-5">
          <LoadingState message={t("common.loading")} />
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
        <Alert type={mensaje.tipo} message={mensaje.texto} onClose={() => setMensaje(null)} />
      )}

      <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-night-line pb-2">
          <Building className="icon-lg text-accent-600" />
          <h3 className="font-bold text-gray-800 dark:text-white">{t("dashboards.adminConjunto.myConjuntos.title")}</h3>
        </div>

        {cargando ? (
          <LoadingState message={t("dashboards.adminConjunto.myConjuntos.loading")} />
        ) : errorConjuntos ? (
          <Alert type="error" message={t("common.loadError")} />
        ) : conjuntos.length === 0 ? (
          <EmptyState icon={Building} message={t("dashboards.adminConjunto.myConjuntos.empty")} />
        ) : (
          <div className="space-y-4">
            {conjuntos.map((c, i) => {
              const abierto = abiertos[c.id_conjunto_residencial] ?? i === 0;
              const avisosSinLeer = notificaciones.filter(
                (n) => n.nombre_conjunto === c.nombre_conjunto && !n.leida
              ).length;
              return (
              <div
                key={c.id_conjunto_residencial}
                className="overflow-hidden border border-gray-200 dark:border-night-line rounded-xl"
              >
                <button
                  type="button"
                  onClick={() => setAbiertos((prev) => ({ ...prev, [c.id_conjunto_residencial]: !abierto }))}
                  aria-expanded={abierto}
                  className="flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-night-inset/60"
                >
                  <Building className="icon-md shrink-0 text-accent-600" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-800 dark:text-white">{c.nombre_conjunto}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="icon-sm" />
                      {c.direccion} — {c.nombre_localidad}
                    </p>
                  </div>
                  {c.total_apartamentos ? (
                    <span className="shrink-0 rounded-full bg-accent-100 px-2.5 py-0.5 text-[11px] font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-400">
                      {t("dashboards.adminConjunto.coverage.badge", {
                        pct: Math.min(100, Math.round((c.apartamentos_registrados / c.total_apartamentos) * 100)),
                      })}
                    </span>
                  ) : null}
                  {avisosSinLeer > 0 && (
                    <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {t("dashboards.adminConjunto.avisosSection.unreadBadge", { count: avisosSinLeer })}
                    </span>
                  )}
                  <ChevronDown
                    className={`icon-sm shrink-0 text-gray-400 transition-transform ${abierto ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {abierto && (
                <div className="px-4 pb-4">
                {editandoId === c.id_conjunto_residencial ? (
                  <div className="space-y-3">
                    {/*
                      ¿Qué? Antes este formulario también dejaba editar
                            nombre_conjunto y direccion.
                      ¿Para qué? Issue #180: esos dos datos vienen ya
                                verificados desde el dataset oficial de
                                Bogotá — un Admin de Conjunto no debería
                                poder sobreescribirlos sin control ni
                                rastro. Solo se corrigen re-importando ese
                                dataset (seed.py), nunca a mano desde aquí.
                      ¿Impacto? El NIT sigue editable porque el dataset
                                oficial no lo trae — es el único dato que
                                de verdad falta completar.
                    */}
                    <div>
                      <label htmlFor={`nit-${c.id_conjunto_residencial}`} className="text-xs font-bold text-gray-600 dark:text-gray-400">{t("dashboards.adminConjunto.editForm.nit")}</label>
                      <input
                        id={`nit-${c.id_conjunto_residencial}`}
                        type="text"
                        value={formEdicion.nit}
                        onChange={(e) => setFormEdicion((p) => ({ ...p, nit: e.target.value }))}
                        maxLength={NIT_MAX_LENGTH}
                        className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 bg-white text-gray-900 focus:ring-2 focus:ring-accent-500 outline-none dark:border-night-line dark:bg-night-field dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor={`total-${c.id_conjunto_residencial}`} className="text-xs font-bold text-gray-600 dark:text-gray-400">
                        {t("dashboards.adminConjunto.editForm.totalApartments")}
                      </label>
                      <input
                        id={`total-${c.id_conjunto_residencial}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={TOTAL_APARTAMENTOS_MAX}
                        value={formEdicion.total}
                        onChange={(e) => setFormEdicion((p) => ({ ...p, total: e.target.value }))}
                        aria-invalid={!!errorTotal}
                        aria-describedby={`total-ayuda-${c.id_conjunto_residencial}`}
                        className={`w-40 p-2.5 border rounded-xl mt-1 bg-white text-gray-900 focus:ring-2 focus:ring-accent-500 outline-none dark:bg-night-field dark:text-white ${
                          errorTotal ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-night-line"
                        }`}
                      />
                      <p id={`total-ayuda-${c.id_conjunto_residencial}`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t("dashboards.adminConjunto.editForm.totalHelp")}
                      </p>
                      {errorTotal && (
                        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                          {errorTotal}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => guardarEdicion(c.id_conjunto_residencial)}
                        disabled={guardando}
                        className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-white bg-accent-700 hover:bg-accent-800 px-4 py-2 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Check className="icon-md" /> {t("common.save")}
                      </button>
                      <button
                        type="button"
                        onClick={cancelarEdicion}
                        className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors dark:bg-night-field dark:text-gray-300 dark:hover:bg-night-hover"
                      >
                        <X className="icon-md" /> {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Nombre, dirección y localidad ya se ven en el encabezado del
                        acordeón — aquí solo queda el NIT (lo único editable) y el botón. */}
                    <div className="flex items-center justify-between gap-2">
                      {c.nit ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("dashboards.adminConjunto.nitLabel", { nit: c.nit })}</p>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => iniciarEdicion(c)}
                        className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-accent-700 hover:text-accent-800 bg-accent-50 hover:bg-accent-100 px-3 py-1.5 rounded-xl transition-colors dark:bg-accent-900/20 dark:text-accent-400 dark:hover:bg-accent-900/30"
                      >
                        <Pencil className="icon-sm" /> {t("common.edit")}
                      </button>
                    </div>

                    {/* Cuántos apartamentos del conjunto ya usan VerdeApp — ver SeccionCobertura arriba. */}
                    <SeccionCobertura conjunto={c} onDefinir={() => iniciarEdicion(c)} />

                    {/* Avisos de este conjunto, separados por rol — ver SeccionAvisosConjunto arriba. */}
                    <SeccionAvisosConjunto nombreConjunto={c.nombre_conjunto} notificaciones={notificaciones} />

                    {/*
                      ¿Qué? Sección nueva de Recicladores Autorizados,
                            anidada DENTRO de cada conjunto — solo se
                            muestra cuando NO se está editando ese conjunto.
                      ¿Para qué? Cada conjunto tiene sus propios recicladores
                                autorizados; tiene más sentido vivir aquí
                                que en una sección global aparte.
                    */}
                    {user && (
                      <>
                        <SeccionCodigoAcceso
                          idConjunto={c.id_conjunto_residencial}
                          codigoAcceso={c.codigo_acceso}
                          onRegenerado={cargarConjuntos}
                        />
                        <SeccionRecicladores idConjunto={c.id_conjunto_residencial} />
                        <SeccionAgenda idConjunto={c.id_conjunto_residencial} />
                        <SeccionDesvinculacion
                          idConjunto={c.id_conjunto_residencial}
                          tieneSolicitudPendiente={c.tiene_solicitud_pendiente}
                          onSolicitudEnviada={cargarConjuntos}
                        />
                        {/* Historial de auditorías de ESTE conjunto — log histórico,
                            sin urgencia, va al final del acordeón. */}
                        <HistorialAuditoriasSemanal
                          auditorias={auditorias.filter((a) => a.id_conjunto_residencial === c.id_conjunto_residencial)}
                        />
                      </>
                    )}
                  </>
                )}
                </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}