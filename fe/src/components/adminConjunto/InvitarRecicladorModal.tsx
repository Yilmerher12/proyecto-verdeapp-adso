import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Send } from "lucide-react";
import { invitarReciclador } from "@/lib/recicladorConjuntoApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CORREO_MAX_LENGTH, CORREO_REGEX } from "@/lib/validacion";

/**
 * ¿Qué? Ventana de un solo campo para invitar a un reciclador (por su correo) a UN conjunto.
 * ¿Para qué? Issue #595: antes el formulario se desplegaba dentro de la sección y vivía aparte del botón "Ver detalle":
 *           si abrías las dos cosas y ocultabas el detalle, el formulario se quedaba abierto. Un campo y una decisión
 *           van en una ventana corta; la lista de recicladores queda siempre visible detrás.
 * ¿Impacto? Al enviar bien se cierra y la lista de invitaciones se actualiza (onInvitado). Si falla, el error sale
 *           dentro de la ventana y el correo escrito se conserva. El formato del correo se revisa al salir del campo
 *           (issue #352), anclado a él, no con un aviso general.
 */
export function InvitarRecicladorModal({
  idConjunto,
  onClose,
  onInvitado,
}: {
  idConjunto: string;
  onClose: () => void;
  onInvitado: () => void;
}) {
  const { t } = useTranslation();
  const [correo, setCorreo] = useState("");
  const [errorCorreo, setErrorCorreo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const validarCorreo = () => {
    const limpio = correo.trim();
    const mensaje = limpio && !CORREO_REGEX.test(limpio) ? t("auth.register.validation.emailInvalid") : null;
    setErrorCorreo(mensaje);
    return !mensaje;
  };

  const invitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!correo.trim() || !validarCorreo()) return;
    setEnviando(true);
    try {
      await invitarReciclador(correo.trim(), idConjunto);
      onInvitado();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || t("dashboards.adminConjunto.recyclersSection.errorDefault"));
    } finally {
      setEnviando(false);
    }
  };

  const idError = `recicladores-correo-error-${idConjunto}`;

  return (
    <Modal onClose={onClose} closeOnBackdrop={false} aria-label={t("dashboards.adminConjunto.recyclersSection.inviteModalTitle")}>
      <form onSubmit={invitar} noValidate className="space-y-4 p-6 sm:p-8">
        <div>
          <h2 className="pr-8 text-lg font-bold text-gray-900 dark:text-white">
            {t("dashboards.adminConjunto.recyclersSection.inviteModalTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("dashboards.adminConjunto.recyclersSection.inviteModalHint")}
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div>
          <div className="relative">
            <Mail className="icon-md absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <input
              type="email"
              placeholder={t("dashboards.adminConjunto.recyclersSection.emailPlaceholder")}
              aria-label={t("dashboards.adminConjunto.recyclersSection.emailPlaceholder")}
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                setErrorCorreo(null);
              }}
              onBlur={validarCorreo}
              maxLength={CORREO_MAX_LENGTH}
              aria-invalid={!!errorCorreo}
              aria-describedby={errorCorreo ? idError : undefined}
              className={`w-full rounded-xl border bg-white p-2.5 pl-9 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-accent-500 dark:bg-night-field dark:text-white ${
                errorCorreo ? "border-red-500 dark:border-red-400" : "border-edge dark:border-night-edge"
              }`}
            />
          </div>
          {errorCorreo && (
            <p id={idError} role="alert" className="mt-1 text-xs text-red-600 dark:text-red-300">
              {errorCorreo}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" isLoading={enviando} disabled={!correo.trim()}>
            <Send className="icon-sm mr-1" />
            {enviando ? t("dashboards.adminConjunto.recyclersSection.sending") : t("dashboards.adminConjunto.recyclersSection.inviteButton")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
