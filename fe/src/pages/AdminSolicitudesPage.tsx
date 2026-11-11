import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Inbox } from "lucide-react";
import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useAuth } from "@/hooks/useAuth";
import { useSolicitudesPendientes } from "@/hooks/useSolicitudesPendientes";

import { Pestanas } from "@/components/ui/Pestanas";
import { SoporteTecnico } from "@/components/SoporteTecnico";
import { SolicitudesDesvinculacion } from "@/components/SolicitudesDesvinculacion";
import { PanelPestana } from "@/components/ui/PanelPestana";

type Pestana = "soporte" | "desvinculaciones";

/**
 * ¿Qué? Página de Solicitudes del Administrador del Sistema (issue #596): las consultas de soporte técnico
 *       y las solicitudes de desvinculación de un Admin de Conjunto, en dos pestañas.
 * ¿Para qué? Antes vivían en un modal más alto que la pantalla, dentro del panel principal. Una lista que
 *           se recorre y se responde una por una se atiende mejor en su propia página, y el panel principal
 *           queda corto. Se llega desde la entrada "Solicitudes" del menú (con su contador) o desde la
 *           franja de aviso del panel.
 * ¿Impacto? El número de cada pestaña sale de useSolicitudesPendientes, el mismo que lee el menú. Solo se
 *           monta la pestaña activa.
 */
export function AdminSolicitudesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pendientes = useSolicitudesPendientes(Boolean(user));
  const [pestana, setPestana] = useState<Pestana>("soporte");

  const etiqueta = (clave: string, cantidad: number | null) => (
    <>
      {t(clave)}
      {cantidad !== null && cantidad > 0 && (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
          {cantidad}
        </span>
      )}
    </>
  );

  return (
    <div className={`${ANCHO_PAGINA.normal} space-y-6 pt-6`}>
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-night-line dark:bg-night-card">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-300/10 dark:text-accent-500">
          <Inbox className="icon-lg" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("solicitudesAdmin.title")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("solicitudesAdmin.subtitle")}</p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm min-[25rem]:p-5 dark:border-night-line dark:bg-night-card">
        {/* ¿Qué? Pestañas principales con subrayado, a todo el ancho; los filtros de estado de Soporte
                  técnico siguen siendo píldoras.
            ¿Para qué? Con las dos en forma de píldora, en pantallas angostas se confundían las dos filas
                      (la sección y el estado). El subrayado las separa a simple vista. */}
        <Pestanas
          variante="subrayadas"
          ariaLabel={t("solicitudesAdmin.tabsLabel")}
          idBase="solicitudes-tab"
          idPanel="solicitudes-panel"
          activa={pestana}
          onCambiar={setPestana}
          pestanas={[
            { id: "soporte", etiqueta: etiqueta("solicitudesAdmin.tabs.soporte", pendientes.soporte) },
            { id: "desvinculaciones", etiqueta: etiqueta("solicitudesAdmin.tabs.desvinculaciones", pendientes.desvinculaciones) },
          ]}
        />
        <PanelPestana id="solicitudes-panel" labelledBy={`solicitudes-tab-${pestana}`} claveActiva={pestana}>
          {pestana === "soporte" ? <SoporteTecnico /> : <SolicitudesDesvinculacion />}
        </PanelPestana>
      </div>
    </div>
  );
}
