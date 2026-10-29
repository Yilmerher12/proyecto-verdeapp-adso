import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePolling } from "@/hooks/usePolling";
import { useAvisoTemporal } from "@/hooks/useAvisoTemporal";
import { TriangleAlert, Bell, BadgeCheck, ChartColumn } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import axios from "axios";
import { API_BASE_URL, motivoDelServidor } from "@/api/axios";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";
import { NotificationFeed } from "@/components/dashboard/NotificationFeed";
import { rutaDeNotificacion, tiempoRelativo, type NotificacionItem } from "@/lib/notificaciones";
import { AuditoriaResultadoBanner } from "@/components/dashboard/AuditoriaResultadoBanner";
import { HistorialAuditorias } from "@/components/dashboard/HistorialAuditorias";
import { PanelDesempeno } from "@/components/desempeno/PanelDesempeno";
import { SEMANAS_POR_DEFECTO } from "@/config/desempeno";
import { notificarNotificacionesActualizadas, onCambioDesdeCampanita } from "@/lib/notificationEvents";
import { listarHistorial } from "@/lib/auditoriaConjuntoApi";
import { rutaDeContenidoRecomendado } from "@/lib/contenidoRecomendado";

interface EstadoShut {
  lleno: boolean;
  created_at: string | null;
}

export function ResidenteDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || t("roles.residente");
  const { Icon: RolIcon } = ROLE_THEME[RoleId.RESIDENTE];

  const [estadoShut, setEstadoShut] = useState<EstadoShut>({ lleno: false, created_at: null });
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feedbackOk, mostrarFeedbackOk] = useAvisoTemporal<boolean>();
  const [errorReporte, setErrorReporte] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState(false);

  // ¿Qué? Issue #406 — allSettled en vez de all, igual que el panel del
  //       Reciclador: cada petición guarda su resultado por separado.
  // ¿Para qué? Con Promise.all, si fallaba una de las dos no se guardaba la
  //           otra (por ejemplo, las notificaciones llegaban bien y no se
  //           mostraban porque el estado del SHUT había fallado).
  // ¿Impacto? Lo que falla conserva su último valor bueno y se muestra el
  //           aviso de errorCarga. Como cargarDatos() también corre cada 20s
  //           (polling), el aviso desaparece solo apenas una siguiente carga
  //           funcione. Antes de esto, esta carga fallaba en silencio.
  const cargarDatos = async () => {
    const [resEstado, resNotifs] = await Promise.allSettled([
      axios.get(`${API_BASE_URL}/api/v1/notificaciones/estado-shut`),
      axios.get(`${API_BASE_URL}/api/v1/notificaciones/mis-notificaciones`),
    ]);
    if (resEstado.status === "fulfilled") setEstadoShut(resEstado.value.data);
    if (resNotifs.status === "fulfilled") setNotificaciones(resNotifs.value.data);
    setErrorCarga(resEstado.status === "rejected" || resNotifs.status === "rejected");
    setCargando(false);
  };

  // ¿Qué? Issue #516 — además del polling de 20 s, se actualiza al instante cuando
  //       se marca o limpia algo desde el menú de la campanita.
  // ¿Para qué? Con la lista también en el panel, sin esto el panel seguiría mostrando
  //           como "nueva" una notificación que ya se leyó desde la campanita.
  usePolling(cargarDatos, { enabled: !!user, onExternalTrigger: onCambioDesdeCampanita });

  const reportarShutLleno = async () => {
    setEnviando(true);
    setErrorReporte(null);
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notificaciones/enviar`, { tipo: "SHUT_LLENO" });
      mostrarFeedbackOk(true);
      cargarDatos();
    } catch (err) {
      // ¿Qué? Antes, si esto fallaba, el residente no se enteraba — creía
      //       que había reportado el SHUT lleno y en realidad no pasó nada.
      // ¿Impacto? Se ve el motivo exacto que manda el backend (SHUT ya
      //           reportado como lleno, límite de peticiones...); si no hay
      //           ninguno, el aviso genérico de intentar de nuevo (issue #414).
      setErrorReporte(motivoDelServidor(err) ?? t("common.actionError"));
    } finally {
      setEnviando(false);
    }
  };

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

  // ¿Qué? Issue #4 (RQF-013) — clic en la notificación de contenido
  //       recomendado lleva directo a la categoría de "Aprender" que
  //       corresponde, sin pasos intermedios ("entre menos clicks tenga
  //       que hacer el usuario, mejor").
  // ¿Para qué? Issue #516 — cómo se calcula la ruta vive en lib/contenidoRecomendado.ts,
  //           porque el menú de la campanita hace lo mismo con esta notificación.
  // ¿Qué? Los comunicados, novedades y respuestas de soporte llevan a su propia página
  //       (rutaDeNotificacion); el contenido recomendado, a su categoría de "Aprender".
  const irAContenidoRecomendado = async (notif: NotificacionItem) => {
    const rutaPropia = rutaDeNotificacion(notif, RoleId.RESIDENTE);
    if (rutaPropia) {
      navigate(rutaPropia);
      return;
    }
    try {
      const ruta = await rutaDeContenidoRecomendado(notif);
      if (ruta) navigate(ruta);
    } catch {
      setErrorAccion(true);
    }
  };

  return (
    <div className="px-0 py-6 sm:p-6 max-w-4xl 2xl:max-w-6xl mx-auto space-y-5">
      {/* Header — la llave de fondo es solo un detalle tenue, para que este
          panel se sienta del Residente (su casa, su unidad), sin estorbar la
          lectura del texto encima. */}
      <div className="relative overflow-hidden bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
        <RolIcon className="icon-deco pointer-events-none absolute right-4 top-4 text-accent-900/5 dark:text-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-100 dark:bg-accent-300/10">
            <RolIcon className="icon-xl text-accent-700 dark:text-accent-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("dashboards.residente.title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t("dashboards.common.welcomePrefix")}{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200 uppercase">
                {fullName}
              </span>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Banner estado SHUT */}
      {!cargando && estadoShut.lleno && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-300/30 dark:bg-amber-400/10">
          <TriangleAlert className="icon-lg mt-0.5 shrink-0 text-amber-700 icon-appear icon-shake" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {t("dashboards.residente.shutBanner.title")}
            </p>
            {estadoShut.created_at && (
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-200">
                {t("dashboards.residente.shutBanner.reportedAt", { time: tiempoRelativo(estadoShut.created_at) })}
              </p>
            )}
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-200">
              {t("dashboards.residente.shutBanner.warning")}
            </p>
          </div>
        </div>
      )}

      {/* Resultado de auditoría del reciclador (RQF-009) — aparte del feed normal */}
      {!cargando && (
        <AuditoriaResultadoBanner
          notificaciones={notificaciones}
          onMarcarLeida={marcarLeida}
        />
      )}

      {/* ¿Qué? Issue #514 — el aviso de error de carga va después de los dos
              avisos de arriba (SHUT lleno y resultado de auditoría), no en medio.
          ¿Para qué? Los tres son "lo que pasó" y así quedan juntos, seguidos de
                    lo que el Residente puede hacer (el botón de abajo). */}
      {!cargando && errorCarga && <Alert type="error" message={t("common.loadError")} />}

      {/* Acción: reportar SHUT lleno — con título real (h2) como los demás bloques */}
      <section
        aria-labelledby="residente-reporte-titulo"
        className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="residente-reporte-titulo" className="text-sm font-bold text-gray-900 dark:text-white">
              {t("dashboards.residente.reportSection.title")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {t("dashboards.residente.reportSection.description")}
            </p>
            {errorReporte && (
              <div className="mt-2">
                <Alert type="error" message={errorReporte} onClose={() => setErrorReporte(null)} />
              </div>
            )}
          </div>
          <button
            onClick={reportarShutLleno}
            // ¿Qué? Antes solo se deshabilitaba mientras se enviaba o justo
            //       después de enviarlo (feedbackOk). El dashboard YA sabe
            //       si el SHUT está lleno (estadoShut.lleno, usado arriba
            //       para el aviso amarillo) pero el botón lo ignoraba —
            //       se podía hacer clic igual y el servidor lo rechazaba
            //       con un error genérico.
            // ¿Impacto? Ahora el botón se deshabilita también si el SHUT ya
            //           está reportado como lleno, y muestra el mismo
            //           estado "ya reportado" — sin esperar a un error del
            //           servidor para algo que la pantalla ya sabía.
            disabled={enviando || feedbackOk || estadoShut.lleno}
            className={`shrink-0 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
              feedbackOk || estadoShut.lleno
                ? "bg-accent-100 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400"
                : "bg-amber-700 text-white hover:bg-amber-600 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200"
            }`}
          >
            {feedbackOk || estadoShut.lleno ? (
              <>
                <BadgeCheck className="icon-md icon-appear icon-hop" />
                {t("dashboards.residente.reportSection.sent")}
              </>
            ) : (
              <>
                <Bell className="icon-md" />
                {t("dashboards.residente.reportSection.submit")}
              </>
            )}
          </button>
        </div>
      </section>

      {/* Actividad reciente (notificaciones recibidas) */}
      {cargando ? (
        <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line shadow-sm p-5">
          <LoadingState message={t("common.loading")} />
        </div>
      ) : (
        <>
          {errorAccion && (
            <Alert type="error" message={t("common.actionError")} onClose={() => setErrorAccion(false)} />
          )}
          <NotificationFeed
            title={t("dashboards.residente.notifications.title")}
            notifications={notificaciones.filter((n) => n.tipo !== "AUDITORIA_PUBLICADA")}
            emptyMessage={t("dashboards.residente.notifications.empty")}
            accentBg="bg-accent-700"
            accentHighlight="bg-accent-50/60 hover:bg-accent-50 dark:bg-accent-300/10 dark:hover:bg-accent-300/15"
            onMarkRead={marcarLeida}
            onMarkAllRead={marcarTodasLeidas}
            onClearRead={limpiarLeidas}
            onItemClick={irAContenidoRecomendado}
          />
        </>
      )}

      {/* ¿Qué? Issue #514 — "Mi conjunto" agrupa lo de consulta: el desempeño y las
              auditorías anteriores (Historial). Su encabezado es una tarjeta, igual
              que los demás bloques del panel.
          ¿Para qué? Antes eran dos títulos sueltos sobre el fondo ("Mi conjunto" y
                    "Desempeño de mi conjunto"): parecían desconectados de las
                    tarjetas y se iban a ver mal si cambia el fondo del panel.
          ¿Impacto? Un solo título (h2) para todo el grupo. El Desempeño sigue siendo
                    el mismo panel que ve el Admin de Conjunto (HU-053, issue #488),
                    sin `idConjunto`: el backend usa el único conjunto del Residente,
                    con período fijo y sin selector. */}
      <section aria-labelledby="residente-mi-conjunto-titulo" className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-night-line dark:bg-night-card">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-300/10">
            <ChartColumn className="icon-md text-accent-700 dark:text-accent-300" aria-hidden="true" />
          </div>
          <div>
            <h2 id="residente-mi-conjunto-titulo" className="text-base font-bold text-gray-900 dark:text-white">
              {t("dashboards.residente.miConjunto.title")}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t("dashboards.residente.miConjunto.subtitle")}</p>
          </div>
        </div>

        <PanelDesempeno semanas={SEMANAS_POR_DEFECTO} />

        <HistorialAuditorias cargar={listarHistorial} />
      </section>
    </div>
  );
}
