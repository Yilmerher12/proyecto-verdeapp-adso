/**
 * Archivo: components/PerfilUsuarioDetalle.tsx
 * Descripción: Información de solo lectura de cualquier usuario, que se muestra
 *              dentro de la fila desplegada de la tabla del Admin del Sistema.
 * ¿Para qué? Reemplaza al panel lateral (PerfilUsuarioPanel): el Admin elige
 *           "Ver información" en el kebab de la fila y los datos aparecen ahí
 *           mismo, sin tapar la tabla.
 * ¿Impacto? No edita nada. Pide el perfil completo al backend al montarse, porque
 *           la tabla solo trae unas pocas columnas (no el idioma, el bloqueo ni
 *           el correo verificado). Activar/desactivar vive en el kebab de la fila.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { obtenerPerfilUsuario, type PerfilUsuarioAdmin } from "@/lib/adminUsuariosApi";
import { RoleId } from "@/types/auth";

interface PerfilUsuarioDetalleProps {
  correo: string;
  /** ¿Qué? Cambia cada vez que el estado de una cuenta se actualiza — fuerza a
   *  volver a pedir el perfil para mostrar el estado nuevo. */
  version: number;
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <>
      <dt className="text-gray-500 dark:text-gray-400">{etiqueta}</dt>
      <dd className="break-words font-medium text-gray-900 dark:text-white">{valor}</dd>
    </>
  );
}

export function PerfilUsuarioDetalle({ correo, version }: PerfilUsuarioDetalleProps) {
  const { t, i18n } = useTranslation();
  const [perfil, setPerfil] = useState<PerfilUsuarioAdmin | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    obtenerPerfilUsuario(correo)
      .then((data) => {
        if (!vigente) return;
        setPerfil(data);
        setError(false);
      })
      .catch(() => {
        if (vigente) setError(true);
      });
    return () => {
      vigente = false;
    };
  }, [correo, version]);

  const p = "dashboards.admin.profilePanel";
  const nombreCompleto = perfil ? `${perfil.nombre ?? ""} ${perfil.apellidos ?? ""}`.trim() || perfil.correo_electronico : correo;
  const formatoFecha = (iso: string) => new Date(iso).toLocaleDateString(i18n.language);
  const formatoHora = (iso: string) => new Date(iso).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" });

  const d = perfil?.detalle;
  const listaConjuntos = (nombres?: string[]) => (nombres && nombres.length > 0 ? nombres.join(", ") : "—");

  const tituloSeccion = "mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";
  const listaDatos = "grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm";

  return (
    <div role="region" aria-label={t(`${p}.ariaLabel`, { nombre: nombreCompleto })} className="p-5">
      {error && <Alert type="error" message={t("common.loadError")} />}
      {!error && !perfil && <LoadingState message={t("common.loading")} />}

      {perfil && (
        <div className="space-y-5">
          {!perfil.habilitado && (
            <section className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-400/30 dark:bg-red-400/10">
              <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">{t(`${p}.sections.deactivated`)}</h3>
              <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm text-red-900 dark:text-red-200">
                <Fila etiqueta={t(`${p}.fields.since`)} valor={perfil.fecha_desactivacion ? formatoFecha(perfil.fecha_desactivacion) : "—"} />
                <Fila
                  etiqueta={t(`${p}.fields.reason`)}
                  valor={perfil.motivo_desactivacion ? `“${perfil.motivo_desactivacion}”` : t("dashboards.admin.usersSection.noReason")}
                />
              </dl>
            </section>
          )}

          <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
            <section>
              <h3 className={tituloSeccion}>{t(`${p}.sections.personal`)}</h3>
              <dl className={listaDatos}>
                <Fila etiqueta={t(`${p}.fields.fullName`)} valor={nombreCompleto} />
                <Fila etiqueta={t("common.phone")} valor={perfil.telefono && perfil.telefono !== "N/A" ? perfil.telefono : "—"} />
                {perfil.role_id === RoleId.RESIDENTE && (
                  <>
                    <Fila etiqueta={t(`${p}.fields.conjunto`)} valor={d?.conjunto ?? "—"} />
                    <Fila etiqueta={t(`${p}.fields.unit`)} valor={`${d?.torre ?? "—"} · ${d?.apto ?? "—"}`} />
                  </>
                )}
                {perfil.role_id === RoleId.RECICLADOR && (
                  <>
                    <Fila etiqueta={t(`${p}.fields.association`)} valor={d?.asociacion || "—"} />
                    <Fila etiqueta={t(`${p}.fields.conjuntos`)} valor={listaConjuntos(d?.conjuntos)} />
                    <Fila etiqueta={t(`${p}.fields.directory`)} valor={d?.mostrar_contacto_directorio ? t(`${p}.visible`) : t(`${p}.hidden`)} />
                  </>
                )}
                {perfil.role_id === RoleId.ADMIN_CONJUNTO && <Fila etiqueta={t(`${p}.fields.conjuntos`)} valor={listaConjuntos(d?.conjuntos)} />}
              </dl>
            </section>

            <section>
              <h3 className={tituloSeccion}>{t(`${p}.sections.account`)}</h3>
              <dl className={listaDatos}>
                <Fila etiqueta={t("common.email")} valor={perfil.correo_electronico} />
                <Fila etiqueta={t(`${p}.fields.emailVerified`)} valor={perfil.correo_verificado ? t(`${p}.yes`) : t(`${p}.no`)} />
                <Fila etiqueta={t(`${p}.fields.language`)} valor={perfil.idioma === "en" ? "English" : "Español"} />
                <Fila
                  etiqueta={t(`${p}.fields.lockout`)}
                  valor={perfil.bloqueado_hasta ? t(`${p}.lockedUntil`, { hora: formatoHora(perfil.bloqueado_hasta) }) : t(`${p}.noLockout`)}
                />
              </dl>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
