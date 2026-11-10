import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Building, ChevronDown, MapPin, Pencil } from "lucide-react";
import type { ConjuntoAdministrado } from "@/lib/conjuntoPanelApi";
import { Pestanas } from "@/components/ui/Pestanas";
import { AvisosConjunto } from "@/components/adminConjunto/AvisosConjunto";
import { EditarConjuntoModal } from "@/components/adminConjunto/EditarConjuntoModal";
import { RecicladoresConjunto } from "@/components/adminConjunto/RecicladoresConjunto";
import { ResumenConjunto } from "@/components/adminConjunto/ResumenConjunto";

type PestanaConjunto = "resumen" | "avisos" | "recicladores";

/**
 * ¿Qué? Número dentro de una pestaña ("Avisos 5"). Ámbar = pendiente; verde = solo informa.
 * ¿Para qué? Issue #595: con una sola pestaña a la vista, el contador dice que hay algo sin mirar en las otras.
 */
function Contador({ cantidad, tono }: { cantidad: number; tono: "ambar" | "verde" }) {
  if (cantidad <= 0) return null;
  const clases =
    tono === "ambar"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200"
      : "bg-accent-100 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400";
  // ¿Qué? El espacio de adelante es para el nombre accesible ("Avisos 5", no "Avisos5"); dentro de la fila de
  //       pestañas (flex) no se ve, solo lo separa el `gap`.
  return (
    <>
      {" "}
      <span className={`rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold ${clases}`}>{cantidad}</span>
    </>
  );
}

/**
 * ¿Qué? La tarjeta de UN conjunto que administra la persona: una cabecera que abre y cierra el conjunto (nombre,
 *       dirección, porcentaje registrado y avisos sin leer) y, abierto, sus datos con "Editar datos del conjunto" y tres
 *       pestañas: Resumen, Avisos y Recicladores.
 * ¿Para qué? Issue #595: cada conjunto muestra UN bloque a la vez en vez de cinco apilados; editar datos, invitar a un
 *           reciclador y pedir la desvinculación se hacen en ventanas cortas, con el panel quieto detrás.
 * ¿Impacto? La cabecera se acomoda según el ancho de la propia tarjeta (contenedor): en un espacio angosto el nombre y
 *           la dirección ocupan todo el ancho y las pastillas bajan a su propia línea (a 375 px el nombre quedaba con
 *           34 px y chocaba con ellas); desde 36 rem van en la misma fila. Las pestañas Avisos y Recicladores siguen
 *           montadas (ocultas) mientras no se ven, para que su número y su lista no se pierdan al cambiar de pestaña;
 *           los avisos solo se piden mientras su pestaña está activa.
 */
export function TarjetaConjunto({
  conjunto,
  abierto,
  onAlternar,
  avisosSinLeer,
  onCambioAvisos,
  onActualizado,
  onEditado,
}: {
  conjunto: ConjuntoAdministrado;
  abierto: boolean;
  onAlternar: () => void;
  avisosSinLeer: number;
  /** Los avisos de este conjunto cambiaron (se leyó o limpió alguno): el panel vuelve a pedir los contadores. */
  onCambioAvisos: () => void;
  /** Algo del conjunto cambió (código regenerado, solicitud enviada): el panel vuelve a pedir sus conjuntos. */
  onActualizado: () => void;
  /** Se guardaron los datos del conjunto. */
  onEditado: () => void;
}) {
  const { t } = useTranslation();
  const id = conjunto.id_conjunto_residencial;
  const [pestana, setPestana] = useState<PestanaConjunto>("resumen");
  const [editando, setEditando] = useState(false);
  const [recicladores, setRecicladores] = useState(0);

  const tieneTotal = Boolean(conjunto.total_apartamentos);
  const porcentaje = conjunto.total_apartamentos
    ? Math.min(100, Math.round((conjunto.apartamentos_registrados / conjunto.total_apartamentos) * 100))
    : 0;
  const tienePastillas = tieneTotal || avisosSinLeer > 0;

  return (
    <div className="@container overflow-hidden rounded-xl border border-gray-200 dark:border-night-line">
      {/* ¿Qué? La cabecera es solo para abrir y cerrar el conjunto, a todo el ancho (issue #513). Rejilla: ícono,
                nombre y flecha en la primera fila; las pastillas, debajo del nombre en un espacio angosto y a la derecha
                desde 36 rem. */}
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierto}
        aria-controls={`conjunto-cuerpo-${id}`}
        className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 p-4 text-left transition-colors hover:bg-gray-50 @xl:grid-cols-[auto_minmax(0,1fr)_auto_auto] @xl:items-center dark:hover:bg-night-inset/60"
      >
        <Building className="icon-md mt-0.5 shrink-0 text-accent-600 @xl:mt-0" aria-hidden="true" />
        <div className="min-w-0">
          <h3 id={`conjunto-nombre-${id}`} className="break-words font-bold text-gray-800 dark:text-white">
            {conjunto.nombre_conjunto}
          </h3>
          <p className="mt-0.5 flex items-start gap-1 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="icon-sm mt-0.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              {conjunto.direccion} — {conjunto.nombre_localidad}
            </span>
          </p>
        </div>
        {tienePastillas && (
          <div className="col-span-2 col-start-2 row-start-2 flex flex-wrap items-center gap-2 @xl:col-span-1 @xl:col-start-3 @xl:row-start-1">
            {tieneTotal && (
              <span className="shrink-0 rounded-full bg-accent-100 px-2.5 py-0.5 text-[0.6875rem] font-bold text-accent-700 dark:bg-accent-300/10 dark:text-accent-400">
                {t("dashboards.adminConjunto.coverage.badge", { pct: porcentaje })}
              </span>
            )}
            {/* ¿Qué? Ámbar, no rojo: 5 avisos sin leer no son un error. El rojo queda para peligro (issue #595). */}
            {avisosSinLeer > 0 && (
              <span
                role="img"
                aria-label={t("dashboards.adminConjunto.avisosSection.unreadBadge", { count: avisosSinLeer })}
                className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[0.6875rem] font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-200"
              >
                <Bell className="icon-sm" aria-hidden="true" />
                <span aria-hidden="true">{avisosSinLeer}</span>
              </span>
            )}
          </div>
        )}
        <ChevronDown
          className={`icon-sm col-start-3 row-start-1 mt-1 shrink-0 text-gray-500 transition-transform @xl:col-start-4 @xl:mt-0 dark:text-gray-400 ${abierto ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {abierto && (
        <div id={`conjunto-cuerpo-${id}`} className="space-y-4 px-4 pb-4">
          {/* ¿Qué? Los dos datos que se editan (NIT y cantidad de apartamentos) y el único botón para editarlos, juntos y
                    justo debajo del nombre del conjunto (issue #513). Nombre, dirección y localidad ya se ven en la cabecera. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("dashboards.adminConjunto.datos.nit", {
                valor: conjunto.nit || t("dashboards.adminConjunto.datos.sinDefinir"),
              })}
              <span aria-hidden="true"> · </span>
              {t("dashboards.adminConjunto.datos.apartamentos", {
                valor: conjunto.total_apartamentos || t("dashboards.adminConjunto.datos.sinDefinir"),
              })}
            </p>
            <button
              type="button"
              onClick={() => setEditando(true)}
              aria-describedby={`conjunto-nombre-${id}`}
              className="focus-ring touch-target-h flex cursor-pointer items-center gap-1.5 rounded-xl border border-accent-300 bg-accent-50 px-3 py-1.5 text-sm font-semibold text-accent-700 transition-colors hover:bg-accent-100 hover:text-accent-800 dark:border-accent-300/40 dark:bg-accent-300/10 dark:text-accent-400 dark:hover:bg-accent-300/15"
            >
              <Pencil className="icon-sm" aria-hidden="true" />
              {t("dashboards.adminConjunto.editButton")}
            </button>
          </div>

          <Pestanas
            variante="subrayadas"
            ariaLabel={t("dashboards.adminConjunto.tabs.label")}
            idBase={`conjunto-tab-${id}`}
            idPanel={`conjunto-panel-${id}`}
            activa={pestana}
            onCambiar={setPestana}
            pestanas={[
              { id: "resumen", etiqueta: t("dashboards.adminConjunto.tabs.resumen") },
              {
                id: "avisos",
                etiqueta: (
                  <>
                    {t("dashboards.adminConjunto.tabs.avisos")}
                    <Contador cantidad={avisosSinLeer} tono="ambar" />
                  </>
                ),
              },
              {
                id: "recicladores",
                etiqueta: (
                  <>
                    {t("dashboards.adminConjunto.tabs.recicladores")}
                    <Contador cantidad={recicladores} tono="verde" />
                  </>
                ),
              },
            ]}
          />

          <div id={`conjunto-panel-${id}`} role="tabpanel" aria-labelledby={`conjunto-tab-${id}-${pestana}`}>
            <div hidden={pestana !== "resumen"}>
              <ResumenConjunto conjunto={conjunto} onActualizado={onActualizado} />
            </div>
            <div hidden={pestana !== "avisos"}>
              <AvisosConjunto idConjunto={id} activa={pestana === "avisos"} onCambio={onCambioAvisos} />
            </div>
            <div hidden={pestana !== "recicladores"}>
              <RecicladoresConjunto idConjunto={id} onCantidad={setRecicladores} />
            </div>
          </div>
        </div>
      )}

      {editando && (
        <EditarConjuntoModal
          conjunto={conjunto}
          onClose={() => setEditando(false)}
          onGuardado={() => {
            setEditando(false);
            onEditado();
          }}
        />
      )}
    </div>
  );
}
