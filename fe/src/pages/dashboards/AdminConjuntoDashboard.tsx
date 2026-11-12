import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { usePolling } from "@/hooks/usePolling";
import { Building, Plus } from "lucide-react";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import { obtenerMisConjuntos, type ConjuntoAdministrado } from "@/lib/conjuntoPanelApi";
import { obtenerNoLeidasPorConjunto } from "@/lib/avisosConjuntoApi";
import type { NotificacionItem } from "@/lib/notificaciones";
import { AuditoriaResultadoBanner } from "@/components/dashboard/AuditoriaResultadoBanner";
import { DesvinculacionAprobadaBanner } from "@/components/dashboard/DesvinculacionAprobadaBanner";
import { TarjetaConjunto } from "@/components/adminConjunto/TarjetaConjunto";
import { notificarNotificacionesActualizadas, onCambioDesdeCampanita } from "@/lib/notificationEvents";
import { Alert } from "@/components/ui/Alert";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Modal } from "@/components/ui/Modal";
import { SolicitudAdminConjuntoInfo } from "@/components/SolicitudAdminConjuntoInfo";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

/**
 * ¿Qué? Dashboard del rol Administrador de Conjunto (id_rol = 4).
 * ¿Para qué? Mostrar SOLO los conjuntos que esta persona administra (cada uno con su tarjeta: datos, pestañas de
 *           resumen, avisos y recicladores) y permitirle pedir que le asignen otro.
 * ¿Impacto? Issue #595: la tarjeta de cada conjunto vive en components/adminConjunto/ (este archivo tenía más de 1200
 *           líneas). Aquí quedan lo que es de TODO el panel: la lista de conjuntos, los banners de arriba (resultado de
 *           auditoría y desvinculación aprobada, que leen la lista general de notificaciones), los contadores de avisos
 *           sin leer de cada conjunto y el aviso de "guardado".
 */
export function AdminConjuntoDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { Icon: RolIcon } = ROLE_THEME[RoleId.ADMIN_CONJUNTO];
  const [conjuntos, setConjuntos] = useState<ConjuntoAdministrado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorConjuntos, setErrorConjuntos] = useState(false);
  // ¿Qué? Antes "mensaje" era un simple string, y el aviso siempre se pintaba de verde (éxito) aunque el texto fuera el
  //       de error. Ahora guarda también el tipo ("success"/"error"), así el color que se ve corresponde a lo que pasó.
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  // ¿Qué? Qué conjunto está desplegado — acordeón independiente (cada uno se abre y se cierra por su cuenta), igual
  //       que AdminPuntosAcopioPage (Record<id, boolean>): sin decisión manual, solo el primero viene abierto.
  // ¿Para qué? Con un Admin que administra varios conjuntos, tenerlos todos abiertos a la vez empujaba el resto del panel
  //           fuera de la vista inicial (issue #166). El servidor los entrega ordenados por nombre (issue #595), así que
  //           "el primero" es siempre el mismo.
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [solicitandoConjunto, setSolicitandoConjunto] = useState(false);

  // ¿Qué? La lista general de notificaciones: ya NO reparte avisos entre conjuntos (eso lo hace cada pestaña "Avisos"
  //       pidiéndole sus avisos al servidor); aquí solo alimenta los banners de arriba.
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  // ¿Qué? Avisos sin leer de cada conjunto, { id: cantidad }, para las pastillas de las cabeceras y de las pestañas.
  const [sinLeerPorConjunto, setSinLeerPorConjunto] = useState<Record<string, number>>({});
  const [cargandoNotifs, setCargandoNotifs] = useState(true);
  const [errorNotifs, setErrorNotifs] = useState(false);
  const [errorAccionNotif, setErrorAccionNotif] = useState(false);

  // ¿Qué? Solo la primera carga muestra "Cargando...": al volver a pedir (después de editar o regenerar el código) la
  //       lista sigue a la vista, así cada tarjeta conserva su pestaña abierta y lo que tenía cargado.
  const cargarConjuntos = useCallback(() => {
    if (!user) return;
    obtenerMisConjuntos()
      .then((data) => {
        setConjuntos(data);
        setErrorConjuntos(false);
      })
      // ¿Qué? Issue #223 (f2 del diagnóstico) — antes esto fallaba en silencio: la pantalla quedaba igual que si el
      //       Admin no administrara ningún conjunto. Ahora se distingue "no hay conjuntos" de "falló la carga".
      .catch((err) => {
        console.error("Error cargando mis conjuntos", err);
        setErrorConjuntos(true);
      })
      .finally(() => setCargando(false));
  }, [user]);

  const cargarNotificaciones = () => {
    if (!user) return;
    Promise.all([axios.get(`${API_BASE_URL}/api/v1/notificaciones/mis-notificaciones`), obtenerNoLeidasPorConjunto()])
      .then(([general, sinLeer]) => {
        setNotificaciones(general.data);
        setSinLeerPorConjunto(sinLeer);
        setErrorNotifs(false);
      })
      // ¿Qué? Como esto también corre cada 20s (polling), el aviso desaparece solo apenas una siguiente carga funcione.
      .catch(() => setErrorNotifs(true))
      .finally(() => setCargandoNotifs(false));
  };

  // ¿Qué? Marca como leído un aviso de los banners de arriba (los avisos de cada conjunto los marca su pestaña).
  const marcarLeida = async (id: string) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notificaciones/${id}/leer`, {});
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      notificarNotificacionesActualizadas();
    } catch {
      setErrorAccionNotif(true);
    }
  };

  // ¿Qué? Issue #225 — "cargarConjuntos" faltaba en las dependencias; se silenciaba la advertencia en vez de agregarla.
  useEffect(() => {
    cargarConjuntos();
  }, [cargarConjuntos]);

  // ¿Qué? Issue #516 — se actualiza también al instante cuando se marca o limpia algo desde el menú de la campanita.
  usePolling(cargarNotificaciones, { enabled: !!user, onExternalTrigger: onCambioDesdeCampanita });

  // ¿Qué? Avisos de "desvinculación aprobada" sin leer de conjuntos que el Admin ya no administra (por eso no tienen
  //       tarjeta donde mostrarse).
  // ¿Para qué? Issue #436 — ver DesvinculacionAprobadaBanner.
  // ¿Impacto? Mientras los conjuntos cargan (o fallan) no se calcula: sin la lista, todos los avisos parecerían de un
  //           conjunto ajeno y el banner parpadearía con avisos que sí tienen tarjeta.
  const desvinculacionesAprobadas =
    cargando || errorConjuntos
      ? []
      : notificaciones.filter(
          (n) =>
            n.tipo === "DESVINCULACION_APROBADA" &&
            !n.leida &&
            !conjuntos.some((c) => c.id_conjunto_residencial === n.id_conjunto_residencial),
        );

  return (
    <div className={`${ANCHO_PAGINA.normal} space-y-6 pt-6 animate-fade-in`}>
      {/* TARJETA DE PERFIL — el maletín de fondo es solo un detalle tenue, para que este panel se sienta del Admin de
          Conjunto, sin estorbar la lectura del texto encima. */}
      <div className="relative overflow-hidden bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
        <RolIcon className="icon-deco pointer-events-none absolute right-4 top-4 text-accent-900/5 dark:text-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-100 dark:bg-accent-300/10">
            <RolIcon className="icon-xl text-accent-700 dark:text-accent-300" />
          </div>
          {/* ¿Qué? min-w-0 + break-words, y título más chico en celular.
              ¿Para qué? Sin min-w-0 la columna de texto no se encogía por debajo de su contenido y el título y el correo
                        se salían de la tarjeta (overflow-hidden) a 375 px (issue #454).
              ¿Impacto? Desde `sm` el título vuelve a text-2xl. */}
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold text-gray-900 dark:text-white">{t("dashboards.adminConjunto.title")}</h1>
            <p className="break-words text-gray-600 dark:text-gray-300">
              {t("dashboards.common.welcomePrefix")} <span className="font-bold uppercase">{user?.first_name} {user?.last_name}</span>.
            </p>
            <p className="mt-1 break-all text-xs font-semibold tracking-wide text-accent-700 dark:text-accent-400">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Avisos que requieren reacción (resultado de auditoría y desvinculación aprobada) — van primero, justo después
          del encabezado (issue #166). Los avisos de cada conjunto viven dentro de su pestaña "Avisos" (issues #436 y #595). */}
      {!cargandoNotifs && (
        <>
          <AuditoriaResultadoBanner notificaciones={notificaciones} onMarcarLeida={marcarLeida} />
          <DesvinculacionAprobadaBanner notificaciones={desvinculacionesAprobadas} onMarcarLeida={marcarLeida} />
          {errorNotifs && <Alert type="error" message={t("common.loadError")} />}
          {errorAccionNotif && (
            <Alert type="error" message={t("common.actionError")} onClose={() => setErrorAccionNotif(false)} />
          )}
        </>
      )}

      {mensaje && <Alert type={mensaje.tipo} message={mensaje.texto} onClose={() => setMensaje(null)} />}

      <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
        {/* ¿Qué? "Solicitar otro conjunto" es un botón pequeño arriba a la derecha de la lista, como "+ Nuevo comunicado"
                  y "+ Agregar tema" en sus páginas (issue #595).
            ¿Para qué? Antes era una fila grande con borde punteado, fuera de la tarjeta y al final de la página: con un
                      conjunto abierto había que bajar para llegar, y pesaba más que acciones de todos los días. */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-gray-100 pb-3 dark:border-night-line">
          <div className="flex items-center gap-2">
            <Building className="icon-lg text-accent-600" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t("dashboards.adminConjunto.myConjuntos.title")}</h2>
          </div>
          <Button variant="secondary" type="button" onClick={() => setSolicitandoConjunto(true)}>
            <Plus className="icon-sm" aria-hidden="true" />
            {t("dashboards.adminConjunto.otroConjunto.tileTitle")}
          </Button>
        </div>

        {cargando ? (
          <Esqueleto mensaje={t("dashboards.adminConjunto.myConjuntos.loading")} variante="bloque" alto="h-[30rem]" />
        ) : errorConjuntos ? (
          <Alert type="error" message={t("common.loadError")} />
        ) : conjuntos.length === 0 ? (
          <EmptyState icon={Building} message={t("dashboards.adminConjunto.myConjuntos.empty")} />
        ) : (
          <div className="space-y-4">
            {conjuntos.map((c, i) => {
              const id = c.id_conjunto_residencial;
              const abierto = abiertos[id] ?? i === 0;
              return (
                <TarjetaConjunto
                  key={id}
                  conjunto={c}
                  abierto={abierto}
                  onAlternar={() => setAbiertos((prev) => ({ ...prev, [id]: !abierto }))}
                  avisosSinLeer={sinLeerPorConjunto[id] ?? 0}
                  onCambioAvisos={cargarNotificaciones}
                  onActualizado={cargarConjuntos}
                  onEditado={() => {
                    setMensaje({ tipo: "success", texto: t("dashboards.adminConjunto.editForm.successMessage") });
                    cargarConjuntos();
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {solicitandoConjunto && (
        <Modal
          onClose={() => setSolicitandoConjunto(false)}
          wide
          aria-label={t("dashboards.adminConjunto.otroConjunto.modalTitle")}
        >
          <div className="p-6 sm:p-8">
            <SolicitudAdminConjuntoInfo variante="otroConjunto" />
          </div>
        </Modal>
      )}
    </div>
  );
}
