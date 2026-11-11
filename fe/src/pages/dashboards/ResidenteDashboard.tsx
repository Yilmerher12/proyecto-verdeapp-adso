import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePolling } from "@/hooks/usePolling";
import { useAvisoTemporal } from "@/hooks/useAvisoTemporal";
import { TriangleAlert, Bell, BadgeCheck, ChartColumn } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { LoadingState } from "@/components/ui/LoadingState";
import axios from "axios";
import { API_BASE_URL, motivoDelServidor } from "@/api/axios";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";
import { NotificationFeed } from "@/components/dashboard/NotificationFeed";
import { rutaDeNotificacion, tiempoRelativo, type NotificacionItem } from "@/lib/notificaciones";
import { AuditoriaResultadoBanner } from "@/components/dashboard/AuditoriaResultadoBanner";
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
  const [confirmandoReporte, setConfirmandoReporte] = useState(false);
  // ¿Qué? Nombre del conjunto del Residente, solo para escribirlo en la ventana de confirmación.
  // ¿Para qué? "Se notificará al reciclador y al administrador de {conjunto}": nombrarlo le da certeza
  //           de a quién le llega el aviso. Si no se puede leer, la frase dice "tu conjunto".
  const [nombreConjunto, setNombreConjunto] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/users/me`);
        setNombreConjunto(res?.data?.nombre_conjunto ?? null);
      } catch {
        // Sin nombre: la ventana usa "tu conjunto".
      }
    })();
  }, [user]);

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
      setConfirmandoReporte(false);
      cargarDatos();
    } catch (err) {
      // ¿Qué? Antes, si esto fallaba, el residente no se enteraba — creía
      //       que había reportado el SHUT lleno y en realidad no pasó nada.
      // ¿Impacto? Se ve el motivo exacto que manda el backend (SHUT ya
      //           reportado como lleno, límite de peticiones...); si no hay
      //           ninguno, el aviso genérico de intentar de nuevo (issue #414).
      //           Ahora el motivo sale dentro de la ventana de confirmación, que sigue abierta.
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

  // ¿Qué? Un solo dato dice si el SHUT ya está reportado: lo que dice el servidor, o el reporte que se
  //       acaba de enviar (mientras llega la respuesta de la recarga).
  const yaReportado = estadoShut.lleno || !!feedbackOk;

  return (
    <div className={`${ANCHO_PAGINA.normal} space-y-6 pt-6`}>
      {/* ¿Qué? Encabezado compacto en tarjeta, igual que el del Reciclador.
          ¿Para qué? Antes era una tarjeta alta con una llave de fondo: ocupaba lo que vale una acción entera
                    y los dos paneles se veían distintos. */}
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-night-line dark:bg-night-card">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-300/10">
          <RolIcon className="icon-lg text-accent-700 dark:text-accent-300" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("dashboards.residente.title")}</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t("dashboards.common.welcomePrefix")}{" "}
            <span className="font-semibold uppercase text-gray-800 dark:text-gray-200">{fullName}</span>.
          </p>
        </div>
      </div>

      {/* ¿Qué? Issue #514 — el aviso de error de carga va arriba de lo que el Residente puede hacer. */}
      {!cargando && errorCarga && <Alert type="error" message={t("common.loadError")} />}

      {/* ¿Qué? Una sola tarjeta del SHUT con dos estados: sin reportar (invita a reportar) y ya reportado
                (ámbar: avisa que está lleno, cuándo se reportó y qué hacer, con el botón apagado).
          ¿Para qué? Antes eran dos bloques seguidos (un aviso ámbar y, debajo, la tarjeta con el botón) que
                    decían casi lo mismo y empujaban todo lo demás hacia abajo.
          ¿Impacto? Reportar pide confirmación (ConfirmModal). El botón también se apaga si el SHUT ya figura
                    como lleno, porque el servidor lo rechazaría. */}
      <section
        aria-labelledby="residente-reporte-titulo"
        className={`rounded-2xl border p-6 shadow-sm ${
          !cargando && yaReportado
            ? "border-amber-200 bg-amber-50 dark:border-amber-300/30 dark:bg-amber-400/10"
            : "border-gray-100 bg-white dark:border-night-line dark:bg-night-card"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {!cargando && yaReportado && (
              <TriangleAlert className="icon-lg mt-0.5 shrink-0 text-amber-700 icon-appear icon-shake dark:text-amber-200" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <h2
                id="residente-reporte-titulo"
                className={`text-lg font-bold ${
                  !cargando && yaReportado ? "text-amber-900 dark:text-amber-200" : "text-gray-900 dark:text-white"
                }`}
              >
                {!cargando && yaReportado
                  ? t("dashboards.residente.shutBanner.title")
                  : t("dashboards.residente.reportSection.title")}
              </h2>
              {!cargando && yaReportado ? (
                <>
                  {estadoShut.created_at && (
                    <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-200">
                      {t("dashboards.residente.shutBanner.reportedAt", { time: tiempoRelativo(estadoShut.created_at) })}
                    </p>
                  )}
                  <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-200">
                    {t("dashboards.residente.shutBanner.warning")}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {t("dashboards.residente.reportSection.description")}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmandoReporte(true)}
            disabled={enviando || yaReportado}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
              yaReportado
                ? "bg-amber-100 text-amber-800 dark:bg-amber-300/15 dark:text-amber-200"
                : "bg-amber-700 text-white hover:bg-amber-600 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200"
            }`}
          >
            {yaReportado ? (
              <>
                <BadgeCheck className="icon-md icon-appear icon-hop" />
                {feedbackOk ? t("dashboards.residente.reportSection.sent") : t("dashboards.residente.reportSection.alreadyReported")}
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

      {confirmandoReporte && (
        <ConfirmModal
          icon={TriangleAlert}
          variant="warning"
          ariaLabel={t("dashboards.residente.confirmReport.title")}
          title={t("dashboards.residente.confirmReport.title")}
          description={
            nombreConjunto
              ? t("dashboards.residente.confirmReport.description", { conjunto: nombreConjunto })
              : t("dashboards.residente.confirmReport.descriptionSinNombre")
          }
          confirmLabel={t("dashboards.residente.confirmReport.submit")}
          confirmingLabel={t("dashboards.residente.confirmReport.sending")}
          isConfirming={enviando}
          error={errorReporte}
          onDismissError={() => setErrorReporte(null)}
          onConfirm={reportarShutLleno}
          onClose={() => {
            setConfirmandoReporte(false);
            setErrorReporte(null);
          }}
        >
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">{t("dashboards.residente.confirmReport.anonymous")}</p>
        </ConfirmModal>
      )}

      {/* Resultado de auditoría del reciclador (RQF-009) — aparte del feed normal */}
      {!cargando && (
        <AuditoriaResultadoBanner
          notificaciones={notificaciones}
          onMarcarLeida={marcarLeida}
        />
      )}

      {/* Notificaciones recibidas.
          ¿Qué? Cada fila ya no escribe el conjunto (el Residente solo tiene uno): `mostrarConjunto={false}`. */}
      {cargando ? (
        <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line shadow-sm p-6">
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
            mostrarConjunto={false}
          />
        </>
      )}

      {/* ¿Qué? "Mi conjunto": UNA sola tarjeta con el resumen, la gráfica y tres pestañas (semana elegida,
                todas las auditorías y por tema).
          ¿Para qué? Antes eran un encabezado suelto, cuatro tarjetas, la gráfica, la lista de la semana, el
                    ranking y el historial: siete bloques seguidos. El historial ahora es la pestaña
                    "Todas las auditorías".
          ¿Impacto? El Desempeño sigue siendo el mismo panel que ve el Admin de Conjunto (HU-053, issue #488),
                    sin `idConjunto`: el backend usa el único conjunto del Residente, con período fijo y
                    sin selector. */}
      <section aria-labelledby="residente-mi-conjunto-titulo">
        <PanelDesempeno
          semanas={SEMANAS_POR_DEFECTO}
          cargarHistorial={listarHistorial}
          cabecera={
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-300/10">
                <ChartColumn className="icon-md text-accent-700 dark:text-accent-300" aria-hidden="true" />
              </div>
              <div>
                <h2 id="residente-mi-conjunto-titulo" className="text-lg font-bold text-gray-900 dark:text-white">
                  {t("dashboards.residente.miConjunto.title")}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t("dashboards.residente.miConjunto.subtitle")}</p>
              </div>
            </div>
          }
        />
      </section>
    </div>
  );
}
