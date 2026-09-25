/**
 * Archivo: components/PerfilUsuarioPanel.tsx
 * Descripción: Perfil de solo lectura de cualquier usuario, dentro de un
 *              panel lateral (ver PanelLateral).
 * ¿Para qué? El Admin del Sistema abre esto con un clic en cualquier fila de
 *           su tabla de usuarios, sin importar el rol de esa persona.
 * ¿Impacto? No edita nada (el botón "Editar" está deshabilitado a propósito:
 *           editar datos de otra persona necesita un registro de quién
 *           cambió qué, y eso queda para otra tarjeta). Lo único que se
 *           puede hacer desde aquí es activar o desactivar la cuenta.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserCheck, UserX } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { PanelLateral } from "@/components/ui/PanelLateral";
import { obtenerPerfilUsuario, type PerfilUsuarioAdmin } from "@/lib/adminUsuariosApi";
import { RoleId } from "@/types/auth";

interface PerfilUsuarioPanelProps {
  correo: string;
  /** ¿Qué? Cambia cada vez que el estado de una cuenta se actualiza desde el
   *  panel — fuerza a volver a pedir el perfil para mostrar el estado nuevo. */
  version: number;
  esPropiaCuenta: boolean;
  cerrarConEscape: boolean;
  onClose: () => void;
  onCambiarEstado: (correo: string, nuevoEstado: boolean) => void;
}

const CLAVE_ROL: Record<number, string> = {
  [RoleId.ADMIN_SISTEMA]: "roles.adminSistema",
  [RoleId.RESIDENTE]: "roles.residente",
  [RoleId.RECICLADOR]: "roles.reciclador",
  [RoleId.ADMIN_CONJUNTO]: "roles.adminConjunto",
};

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <>
      <dt className="text-gray-500 dark:text-gray-400">{etiqueta}</dt>
      <dd className="break-words font-medium text-gray-900 dark:text-white">{valor}</dd>
    </>
  );
}

export function PerfilUsuarioPanel({
  correo,
  version,
  esPropiaCuenta,
  cerrarConEscape,
  onClose,
  onCambiarEstado,
}: PerfilUsuarioPanelProps) {
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
  const iniciales = nombreCompleto
    .split(" ")
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0))
    .join("")
    .toUpperCase();
  const formatoFecha = (iso: string) => new Date(iso).toLocaleDateString(i18n.language);
  const formatoHora = (iso: string) => new Date(iso).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" });

  const d = perfil?.detalle;
  const listaConjuntos = (nombres?: string[]) => (nombres && nombres.length > 0 ? nombres.join(", ") : "—");

  return (
    <PanelLateral onClose={onClose} aria-label={t(`${p}.ariaLabel`, { nombre: nombreCompleto })} cerrarConEscape={cerrarConEscape}>
      <div className="flex items-center gap-4 border-b border-gray-100 p-5 pr-14 dark:border-[#23392b]">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-100 text-lg font-bold text-accent-800 dark:bg-accent-900/30 dark:text-accent-300"
          aria-hidden="true"
        >
          {iniciales}
        </div>
        <div className="min-w-0">
          <h2 className="break-words text-base font-bold text-gray-900 dark:text-white">{nombreCompleto}</h2>
          {perfil && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                {t(CLAVE_ROL[perfil.role_id] ?? "roles.residente")}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  perfil.habilitado
                    ? "bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400"
                    : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                }`}
              >
                {perfil.habilitado ? t("dashboards.admin.usersSection.status.active") : t("dashboards.admin.usersSection.status.inactive")}
              </span>
              <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500 dark:border-[#23392b] dark:text-gray-400">
                {t(`${p}.readOnly`)}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-5">
          <Alert type="error" message={t("common.loadError")} />
        </div>
      )}
      {!error && !perfil && (
        <div className="p-5">
          <LoadingState message={t("common.loading")} />
        </div>
      )}

      {perfil && (
        <>
          {!perfil.habilitado && (
            <section className="border-b border-red-100 bg-red-50 p-5 dark:border-red-900/30 dark:bg-red-900/20">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">{t(`${p}.sections.deactivated`)}</h3>
              <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm text-red-900 dark:text-red-200">
                <Fila etiqueta={t(`${p}.fields.since`)} valor={perfil.fecha_desactivacion ? formatoFecha(perfil.fecha_desactivacion) : "—"} />
                <Fila
                  etiqueta={t(`${p}.fields.reason`)}
                  valor={perfil.motivo_desactivacion ? `“${perfil.motivo_desactivacion}”` : t("dashboards.admin.usersSection.noReason")}
                />
              </dl>
            </section>
          )}

          <section className="border-b border-gray-100 p-5 dark:border-[#23392b]">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.sections.personal`)}</h3>
            <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
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

          <section className="border-b border-gray-100 p-5 dark:border-[#23392b]">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.sections.account`)}</h3>
            <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <Fila etiqueta={t("common.email")} valor={perfil.correo_electronico} />
              <Fila etiqueta={t(`${p}.fields.emailVerified`)} valor={perfil.correo_verificado ? t(`${p}.yes`) : t(`${p}.no`)} />
              <Fila etiqueta={t(`${p}.fields.language`)} valor={perfil.idioma === "en" ? "English" : "Español"} />
              <Fila
                etiqueta={t(`${p}.fields.lockout`)}
                valor={perfil.bloqueado_hasta ? t(`${p}.lockedUntil`, { hora: formatoHora(perfil.bloqueado_hasta) }) : t(`${p}.noLockout`)}
              />
            </dl>
          </section>

          <div className="sticky bottom-0 mt-auto flex flex-wrap gap-2 border-t border-gray-100 bg-[#ffffff] p-5 dark:border-[#23392b] dark:bg-[#0f2018]">
            {!esPropiaCuenta && (
              <Button
                type="button"
                size="sm"
                variant={perfil.habilitado ? "danger" : "secondary"}
                onClick={() => onCambiarEstado(perfil.correo_electronico, !perfil.habilitado)}
              >
                {perfil.habilitado ? <UserX className="mr-1 h-3.5 w-3.5 icon-draw" /> : <UserCheck className="mr-1 h-3.5 w-3.5 icon-draw" />}
                {perfil.habilitado ? t(`${p}.disableAccount`) : t(`${p}.enableAccount`)}
              </Button>
            )}
            <Button type="button" size="sm" variant="secondary" disabled>
              {t(`${p}.editSoon`)}
            </Button>
          </div>
        </>
      )}
    </PanelLateral>
  );
}
