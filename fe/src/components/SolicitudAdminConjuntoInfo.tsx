/**
 * Archivo: SolicitudAdminConjuntoInfo.tsx
 * Descripción: Instrucciones que ve un Administrador de Conjunto en el registro
 *              para pedir su cuenta, en lugar del formulario.
 * ¿Para qué? Su cuenta solo se crea por invitación del Administrador del
 *           Sistema (HU-018, issue #216) — sin esto no tenía cómo saber a
 *           quién pedirla.
 * ¿Impacto? La app no recibe ni guarda ningún documento: la persona los manda
 *           por correo a la cuenta del equipo (issue #457, investigación #439).
 *           El correo se muestra como enlace que abre su bandeja con el asunto
 *           y el mensaje ya escritos, y con un botón para copiarlo.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, FileText, IdCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ROLE_THEME } from "@/config/roleTheme";
import { SOLICITUD_ADMIN_EMAIL } from "@/config/solicitudAdminConjunto";
import { RoleId } from "@/types/auth";

// ¿Qué? Los dos documentos que se piden y su ícono (el texto está en
//       auth.register.adminRequest.<clave>).
const DOCUMENTOS: { clave: "doc1" | "doc2"; Icon: LucideIcon }[] = [
  { clave: "doc1", Icon: FileText },
  { clave: "doc2", Icon: IdCard },
];

/**
 * ¿Qué? `registro` es la pantalla del registro (quien aún no tiene cuenta);
 *       `otroConjunto` es la que ve un Admin de Conjunto en su panel.
 * ¿Para qué? Cambian el encabezado, los 2 pasos y el asunto del correo. Los
 *           documentos y el aviso de privacidad se leen siempre de las mismas
 *           claves, para que corregirlos los cambie en los dos lugares a la vez.
 */
export function SolicitudAdminConjuntoInfo({ variante = "registro" }: { variante?: "registro" | "otroConjunto" }) {
  const { t } = useTranslation();
  const [copiado, setCopiado] = useState(false);
  const AdminIcon = ROLE_THEME[RoleId.ADMIN_CONJUNTO].Icon;
  const esOtroConjunto = variante === "otroConjunto";
  const claves = esOtroConjunto ? "dashboards.adminConjunto.otroConjunto" : "auth.register.adminRequest";

  // ¿Qué? Enlace que abre la bandeja de correo con el asunto y el cuerpo escritos.
  const enlaceCorreo = `mailto:${SOLICITUD_ADMIN_EMAIL}?subject=${encodeURIComponent(
    t(`${claves}.mailSubject`),
  )}&body=${encodeURIComponent(t(`${claves}.mailBody`))}`;

  // ¿Qué? Mismo patrón de copiar al portapapeles de DirectorioPage.tsx.
  // ¿Para qué? Quien usa el correo en el navegador no siempre recibe nada al
  //           presionar el enlace: con esto puede pegar la dirección donde quiera.
  const copiarCorreo = async () => {
    try {
      await navigator.clipboard.writeText(SOLICITUD_ADMIN_EMAIL);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // ¿Qué? Si el navegador niega el permiso del portapapeles, no hay nada
      //       más que hacer: el correo sigue a la vista y se puede seleccionar.
    }
  };

  return (
    <div
      className={
        esOtroConjunto
          ? "space-y-5"
          : "space-y-5 p-5 bg-accent-50/30 dark:bg-accent-300/10 border border-accent-100 dark:border-accent-300/40 rounded-2xl"
      }
    >
      <div className="flex items-center gap-2">
        <AdminIcon className="icon-lg shrink-0 text-accent-600" />
        <h3 className="font-bold text-gray-800 dark:text-gray-200">{t(`${claves}.heading`)}</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{t(`${claves}.intro`)}</p>

      <ol className="space-y-5">
        <li className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-700 text-white text-xs font-bold dark:bg-accent-300 dark:text-accent-950">
            1
          </span>
          <div className="min-w-0 space-y-2">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{t(`${claves}.step1.title`)}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t(`${claves}.step1.send`)}</p>

            <div className="flex flex-wrap items-center gap-2">
              <a href={enlaceCorreo} className="link-text rounded break-all text-sm font-semibold">
                {SOLICITUD_ADMIN_EMAIL}
              </a>
              <button
                type="button"
                onClick={copiarCorreo}
                className="touch-area focus-ring relative shrink-0 cursor-pointer rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-night-hover dark:hover:text-gray-300"
                aria-label={t("auth.register.adminRequest.copyEmail")}
                title={t("auth.register.adminRequest.copyEmail")}
              >
                {copiado ? (
                  <Check className="icon-sm text-accent-600 dark:text-accent-400" />
                ) : (
                  <Copy className="icon-sm" />
                )}
              </button>
              {/* ¿Qué? Aviso para lectores de pantalla: el ícono cambia pero no dice nada. */}
              <span role="status" className="sr-only">
                {copiado ? t("auth.register.adminRequest.emailCopied") : ""}
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">{t(`${claves}.step1.fields`)}</p>
            <ul className="space-y-1.5">
              {DOCUMENTOS.map(({ clave, Icon }) => (
                <li key={clave} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Icon className="icon-sm mt-0.5 shrink-0 text-accent-600 dark:text-accent-400" aria-hidden="true" />
                  <span>{t(`auth.register.adminRequest.${clave}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-700 text-white text-xs font-bold dark:bg-accent-300 dark:text-accent-950">
            2
          </span>
          <div className="min-w-0 space-y-1">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{t(`${claves}.step2.title`)}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t(`${claves}.step2.body`)}</p>
          </div>
        </li>
      </ol>

      <p className="pt-3 border-t border-gray-200 text-xs text-gray-500 dark:border-night-line dark:text-gray-400">
        {t("auth.register.adminRequest.privacyNotice")}
      </p>
    </div>
  );
}
