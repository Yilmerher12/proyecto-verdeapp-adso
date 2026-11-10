import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Unlink } from "lucide-react";
import { solicitarDesvinculacion } from "@/lib/conjuntoPanelApi";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ContadorCaracteres } from "@/components/ui/ContadorCaracteres";
import { DESVINCULACION_MOTIVO_MAX_LENGTH } from "@/lib/validacion";

/**
 * ¿Qué? Botón para pedir dejar de administrar UN conjunto específico (RQF-016, HU-022); el motivo se escribe en
 *       una ventana. Si ya hay una solicitud pendiente se muestra un aviso en vez del botón.
 * ¿Para qué? Es la acción que casi nunca se usa: vive al final de la pestaña Resumen, apartada y con su
 *           explicación al lado (issue #595). Antes el formulario se desplegaba en el mismo lugar y empujaba el
 *           resto de la tarjeta. El aviso de "pendiente" evita chocar con el error de "ya tienes una solicitud
 *           pendiente".
 * ¿Impacto? Dice DE QUÉ es la solicitud (de la administración de este conjunto, no de los recicladores): un usuario
 *           real la probó pensando que desvinculaba a un reciclador. Los recicladores autorizados no se ven afectados.
 */
export function DesvinculacionConjunto({
  idConjunto,
  tieneSolicitudPendiente,
  onSolicitudEnviada,
}: {
  idConjunto: string;
  tieneSolicitudPendiente: boolean;
  onSolicitudEnviada: () => void;
}) {
  const { t } = useTranslation();
  const [abierta, setAbierta] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrar = () => {
    setAbierta(false);
    setError(null);
  };

  const solicitar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await solicitarDesvinculacion(idConjunto, motivo.trim() || undefined);
      setAbierta(false);
      setMotivo("");
      onSolicitudEnviada();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("desvinculacion.errorDefault"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    // ¿Qué? Sin recuadro de fondo, solo una línea de separación (issue #513): es la acción que casi nunca se usa y
    //       no debe pesar lo mismo que el resto de la pestaña.
    <div className="mt-6 border-t border-gray-100 pt-4 dark:border-night-line">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {t("desvinculacion.sectionTitle")}
      </p>

      {tieneSolicitudPendiente ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
          <Clock className="icon-sm" /> {t("desvinculacion.pendingBadge")}
        </span>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setAbierta(true)}
            className="focus-ring touch-target-h cursor-pointer rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 hover:text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/15"
          >
            {t("desvinculacion.solicitarButton")}
          </button>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{t("desvinculacion.clarification")}</p>
        </div>
      )}

      {abierta && (
        <ConfirmModal
          icon={Unlink}
          variant="danger"
          ariaLabel={t("desvinculacion.solicitarButton")}
          title={t("desvinculacion.solicitarButton")}
          description={t("desvinculacion.clarification")}
          error={error}
          onDismissError={() => setError(null)}
          isConfirming={enviando}
          confirmLabel={t("desvinculacion.submit")}
          confirmingLabel={t("desvinculacion.sending")}
          onConfirm={solicitar}
          onClose={cerrar}
        >
          <div className="space-y-2 text-left">
            <label htmlFor={`desvinculacion-motivo-${idConjunto}`} className="text-xs font-bold text-gray-600 dark:text-gray-400">
              {t("desvinculacion.motivoLabel")}
            </label>
            <textarea
              id={`desvinculacion-motivo-${idConjunto}`}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={DESVINCULACION_MOTIVO_MAX_LENGTH}
              aria-describedby={`desvinculacion-motivo-contador-${idConjunto}`}
              placeholder={t("desvinculacion.motivoPlaceholder")}
              rows={3}
              className="w-full rounded-xl border border-edge bg-white p-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-accent-500 dark:border-night-edge dark:bg-night-field dark:text-white"
            />
            <ContadorCaracteres
              id={`desvinculacion-motivo-contador-${idConjunto}`}
              actual={motivo.length}
              max={DESVINCULACION_MOTIVO_MAX_LENGTH}
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
