import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, KeyRound, RefreshCw, TriangleAlert } from "lucide-react";
import { regenerarCodigoAcceso } from "@/lib/conjuntoPanelApi";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";

/**
 * ¿Qué? Código de acceso de UN conjunto específico (issue #168) — lo que
 *       el Admin de Conjunto reparte fuera de la app (cartelera, grupo
 *       del conjunto) para que un Residente demuestre que vive ahí al
 *       registrarse.
 * ¿Para qué? Componente aparte: cada conjunto administrado tiene su
 *           propio código, y regenerarlo es una acción con su propia
 *           llamada al backend, no solo un campo de texto que se guarda.
 * ¿Impacto? Issue #595: salió de AdminConjuntoDashboard.tsx tal cual, sin cambios.
 */
export function CodigoAccesoConjunto({
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
    // ¿Qué? Borde de acento: es lo que más se reparte (issue #491). Issue #513: tarjeta
    //       angosta con todo repartido de arriba abajo (título, código con el botón de
    //       copiar dentro de su caja, explicación corta y "Regenerar" al fondo, a todo
    //       el ancho), en vez de una franja de todo el ancho con un vacío en medio.
    <div className="flex w-full flex-col gap-3 rounded-xl border border-accent-200 bg-accent-50/60 p-4 dark:border-accent-300/40 dark:bg-accent-300/10">
      <div className="flex items-center gap-2">
        <KeyRound className="icon-md text-accent-600" />
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
          {t("dashboards.adminConjunto.codigoAcceso.title")}
        </h4>
      </div>
      {/* ¿Qué? El código y su texto van en el medio (my-auto), igual que las cifras de la cobertura. */}
      <div className="my-auto flex flex-col gap-2 py-2">
        <div className="relative rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-center font-mono text-xl font-bold tracking-widest text-gray-900 dark:border-night-line dark:bg-night-panel dark:text-white">
          {codigoAcceso}
          <button
            type="button"
            onClick={copiarCodigo}
            className="touch-target focus-ring absolute right-1 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-night-field"
            aria-label={t(
              copiado ? "dashboards.adminConjunto.codigoAcceso.copiedAria" : "dashboards.adminConjunto.codigoAcceso.copyAria"
            )}
            title={t(
              copiado ? "dashboards.adminConjunto.codigoAcceso.copiedAria" : "dashboards.adminConjunto.codigoAcceso.copyAria"
            )}
          >
            {copiado ? <Check className="icon-md text-accent-600" /> : <Copy className="icon-md" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("dashboards.adminConjunto.codigoAcceso.description")}
        </p>
      </div>
      <Button variant="secondary" size="sm" fullWidth type="button" onClick={() => setConfirmando(true)}>
        <RefreshCw className="icon-sm" aria-hidden="true" />
        {t("dashboards.adminConjunto.codigoAcceso.regenerateButton")}
      </Button>

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
