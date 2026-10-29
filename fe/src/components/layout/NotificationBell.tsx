/**
 * Archivo: components/layout/NotificationBell.tsx
 * Descripción: La campanita del encabezado y el menú desplegable con las notificaciones
 *              de quien tiene la sesión iniciada.
 * ¿Para qué? Issue #516 — antes la campanita llevaba al panel principal, donde las
 *           notificaciones estaban entre muchos otros bloques (y en el Admin de Conjunto,
 *           ni siquiera estaban todas). Ahora, al tocarla, se ven ahí mismo.
 * ¿Impacto? Es igual para los 4 roles. El número rojo lo sigue calculando AppShell (llega
 *           por `noLeidas`); este componente solo trae la lista cuando el menú está abierto
 *           y avisa con notificationEvents cada vez que cambia algo, para que el número y
 *           las listas de los paneles se actualicen sin esperar al siguiente polling.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import api from "@/api/axios";
import { usePolling } from "@/hooks/usePolling";
import { NotificationFeed } from "@/components/dashboard/NotificationFeed";
import { LoadingState } from "@/components/ui/LoadingState";
import { Alert } from "@/components/ui/Alert";
import { notificarCambioDesdeCampanita, onNotificacionesActualizadas } from "@/lib/notificationEvents";
import { rutaDeContenidoRecomendado, TIPOS_CONTENIDO_RECOMENDADO } from "@/lib/contenidoRecomendado";
import { rutaDeNotificacion, type NotificacionItem } from "@/lib/notificaciones";
import type { RoleId } from "@/types/auth";

// ¿Qué? El resultado de la auditoría se lee desde su banner en el panel principal (el banner
//       sigue visible mientras la notificación esté sin leer).
// ¿Para qué? Si tocarla en el menú la marcara como leída, el banner desaparecería sin que la
//           persona haya visto el resultado.
const TIPO_AUDITORIA = "AUDITORIA_PUBLICADA";

interface NotificationBellProps {
  noLeidas: number;
  /** Panel principal del rol: adonde lleva tocar el aviso de una auditoría. */
  dashboardHref: string;
  /** Rol de quien tiene la sesión: decide a qué página lleva el aviso de un comunicado o una novedad. */
  rolId?: RoleId;
}

export function NotificationBell({ noLeidas, dashboardHref, rolId }: NotificationBellProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const idPanel = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [cargado, setCargado] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [errorAccion, setErrorAccion] = useState(false);

  // ¿Qué? El menú se cierra al cambiar de página (patrón de React para "reaccionar a un
  //       cambio" durante el render, igual que el menú lateral de AppShell).
  const [rutaVista, setRutaVista] = useState(pathname);
  if (rutaVista !== pathname) {
    setRutaVista(pathname);
    if (abierto) setAbierto(false);
  }

  const cargar = () => {
    api
      .get<NotificacionItem[]>("/api/v1/notificaciones/mis-notificaciones")
      .then((r) => {
        setNotificaciones(r.data);
        setErrorCarga(false);
      })
      // ¿Qué? Con el polling de 20 s el aviso desaparece solo apenas una carga funcione.
      .catch(() => setErrorCarga(true))
      .finally(() => setCargado(true));
  };

  // ¿Qué? Solo trae y refresca la lista mientras el menú está abierto (cerrado, el único dato
  //       que importa es el número, y ese ya lo trae AppShell).
  usePolling(cargar, { enabled: abierto, onExternalTrigger: onNotificacionesActualizadas });

  // ¿Qué? Escape cierra el menú y devuelve el foco a la campanita; un clic fuera también lo cierra.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    const alHacerClic = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("keydown", alTeclear);
    document.addEventListener("mousedown", alHacerClic);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.removeEventListener("mousedown", alHacerClic);
    };
  }, [abierto]);

  // ¿Qué? Tras cada acción se dispara un solo evento: AppShell lo escucha para el número rojo
  //       y los paneles para su lista, pero esta lista no (ya está actualizada).
  const marcarLeida = async (id: string) => {
    if (notificaciones.find((n) => n.id === id)?.tipo === TIPO_AUDITORIA) return;
    try {
      await api.post(`/api/v1/notificaciones/${id}/leer`, {});
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      notificarCambioDesdeCampanita();
    } catch {
      setErrorAccion(true);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await api.post("/api/v1/notificaciones/marcar-todas-leidas", {});
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      notificarCambioDesdeCampanita();
    } catch {
      setErrorAccion(true);
    }
  };

  const limpiarLeidas = async () => {
    try {
      await api.delete("/api/v1/notificaciones/limpiar-leidas");
      setNotificaciones((prev) => prev.filter((n) => !n.leida));
      // ¿Qué? Las leídas no cuentan en el número, pero sí están en las listas de los paneles.
      notificarCambioDesdeCampanita();
    } catch {
      setErrorAccion(true);
    }
  };

  // ¿Qué? Hacen algo al tocarlos: el contenido recomendado (lleva a "Aprender", issue #4, RQF-013),
  //       el resultado de auditoría (a su banner en el panel) y los que tienen su propia página:
  //       comunicados, novedades y soporte (ver rutaDeNotificacion). El resto solo se marca leída.
  const esAccionable = (n: NotificacionItem) =>
    n.tipo === TIPO_AUDITORIA || TIPOS_CONTENIDO_RECOMENDADO.includes(n.tipo) || rutaDeNotificacion(n, rolId) !== null;

  const alTocarNotificacion = async (n: NotificacionItem) => {
    if (n.tipo === TIPO_AUDITORIA) {
      navigate(dashboardHref);
      setAbierto(false);
      return;
    }
    const rutaPropia = rutaDeNotificacion(n, rolId);
    if (rutaPropia) {
      navigate(rutaPropia);
      // ¿Impacto? Si ya está en esa página la ruta no cambia y el menú no se cerraría solo.
      setAbierto(false);
      return;
    }
    try {
      const ruta = await rutaDeContenidoRecomendado(n);
      if (ruta) navigate(ruta);
    } catch {
      setErrorAccion(true);
    }
  };

  const etiqueta = noLeidas > 0 ? t("appShell.notificacionesConNoLeidas", { count: noLeidas }) : t("appShell.notificaciones");

  return (
    <div ref={contenedor} className="relative">
      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={abierto ? idPanel : undefined}
        aria-label={etiqueta}
        title={etiqueta}
        className={`touch-target relative flex cursor-pointer items-center justify-center rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-night-hover dark:hover:text-gray-200 ${
          abierto ? "bg-gray-100 dark:bg-night-hover" : ""
        }`}
      >
        <Bell className="icon-lg" aria-hidden="true" />
        {noLeidas > 0 && (
          <span aria-hidden="true" className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-700 text-[0.5625rem] font-bold text-white">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        // ¿Qué? En celular ocupa el ancho de la pantalla (con 16 px de margen): pegado a la
        //       campanita, que queda lejos del borde derecho, se saldría de la pantalla.
        <div
          id={idPanel}
          role="region"
          aria-label={t("appShell.notificaciones")}
          className="fixed inset-x-4 top-[4.5rem] z-50 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-night-line dark:bg-night-card sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[min(36rem,calc(100vh-6rem))]"
        >
          {!cargado ? (
            <div className="p-5">
              <LoadingState message={t("common.loading")} />
            </div>
          ) : (
            <>
              {(errorCarga || errorAccion) && (
                <div className="px-5 pt-4">
                  <Alert
                    type="error"
                    message={t(errorAccion ? "common.actionError" : "common.loadError")}
                    onClose={errorAccion ? () => setErrorAccion(false) : undefined}
                  />
                </div>
              )}
              <NotificationFeed
                flat
                title={t("appShell.notificaciones")}
                notifications={notificaciones}
                emptyMessage={t("appShell.notificacionesVacias")}
                accentBg="bg-accent-700"
                accentHighlight="bg-accent-50/60 hover:bg-accent-50 dark:bg-accent-300/10 dark:hover:bg-accent-300/15"
                onMarkRead={marcarLeida}
                onMarkAllRead={marcarTodasLeidas}
                onClearRead={limpiarLeidas}
                onItemClick={alTocarNotificacion}
                esAccionable={esAccionable}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
