import { useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList, Headset, Unlink } from "lucide-react";
import { SoporteTecnico } from "@/components/SoporteTecnico";
import { SolicitudesDesvinculacion } from "@/components/SolicitudesDesvinculacion";

interface BandejaAdminSistemaProps {
  /** ¿Para qué? El resumen de "Solicitudes pendientes" arriba del todo en
   *  AdminDashboard necesita la suma de las dos pestañas ANTES de que el usuario
   *  abra la bandeja — se avisa cada vez que cambia alguna. */
  onCountChange?: (count: number) => void;
  mostrarEncabezado?: boolean;
  dentroDeModal?: boolean;
}

type Pestana = "soporte" | "desvinculaciones";

/**
 * ¿Qué? Bandeja del Administrador del Sistema con dos pestañas: "Soporte técnico"
 *       (consultas de los usuarios) y "Desvinculaciones" (solicitudes de los Admins
 *       de Conjunto, RQF-016).
 * ¿Para qué? Issue #512: reemplaza a la lista unificada "Solicitudes pendientes".
 *           Son dos cosas de distinta naturaleza y cada una tiene su propio lugar.
 * ¿Impacto? Las dos pestañas se quedan montadas (la inactiva con `hidden`) para que
 *          cada una reporte su conteo aunque no se esté viendo; las props
 *          (onCountChange/mostrarEncabezado/dentroDeModal) son las de siempre.
 */
export function BandejaAdminSistema({
  onCountChange,
  mostrarEncabezado = true,
  dentroDeModal = false,
}: BandejaAdminSistemaProps = {}) {
  const { t } = useTranslation();
  const idBase = useId();
  const [pestana, setPestana] = useState<Pestana>("soporte");
  // ¿Qué? null = esa pestaña todavía no terminó de cargar su número.
  // ¿Para qué? Si se avisara 0 al montar, el resumen de AdminDashboard parpadearía a
  //           "No hay solicitudes pendientes" cada vez que se abre el modal.
  const [conteo, setConteo] = useState<{ soporte: number | null; desvinculaciones: number | null }>({
    soporte: null,
    desvinculaciones: null,
  });

  useEffect(() => {
    if (conteo.soporte === null || conteo.desvinculaciones === null) return;
    onCountChange?.(conteo.soporte + conteo.desvinculaciones);
  }, [conteo, onCountChange]);

  const alCambiarSoporte = useCallback((soporte: number) => setConteo((c) => ({ ...c, soporte })), []);
  const alCambiarDesvinculaciones = useCallback(
    (desvinculaciones: number) => setConteo((c) => ({ ...c, desvinculaciones })),
    [],
  );

  const pestanas: { id: Pestana; label: string; Icono: typeof Headset; cantidad: number }[] = [
    { id: "soporte", label: t("bandejaAdmin.pestanas.soporte"), Icono: Headset, cantidad: conteo.soporte ?? 0 },
    { id: "desvinculaciones", label: t("bandejaAdmin.pestanas.desvinculaciones"), Icono: Unlink, cantidad: conteo.desvinculaciones ?? 0 },
  ];

  return (
    <div
      className={
        dentroDeModal
          ? ""
          : "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-night-line dark:bg-night-card"
      }
    >
      {mostrarEncabezado && (
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="icon-md text-accent-600" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("bandejaAdmin.sectionTitle")}</h3>
        </div>
      )}

      <div role="tablist" className="mb-4 flex gap-1 border-b border-gray-200 dark:border-night-line">
        {pestanas.map(({ id, label, Icono, cantidad }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`${idBase}-tab-${id}`}
            aria-selected={pestana === id}
            aria-controls={`${idBase}-panel-${id}`}
            onClick={() => setPestana(id)}
            className={`flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              pestana === id
                ? "border-accent-700 text-accent-700 dark:border-accent-300 dark:text-accent-300"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Icono className="icon-sm" />
            {label}
            {cantidad > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.6875rem] font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                {cantidad}
              </span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${idBase}-panel-soporte`} aria-labelledby={`${idBase}-tab-soporte`} hidden={pestana !== "soporte"}>
        <SoporteTecnico onCountChange={alCambiarSoporte} />
      </div>
      <div
        role="tabpanel"
        id={`${idBase}-panel-desvinculaciones`}
        aria-labelledby={`${idBase}-tab-desvinculaciones`}
        hidden={pestana !== "desvinculaciones"}
      >
        <SolicitudesDesvinculacion onCountChange={alCambiarDesvinculaciones} />
      </div>
    </div>
  );
}
