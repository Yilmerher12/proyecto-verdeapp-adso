/**
 * Archivo: SolicitudAdminConjuntoInfo.tsx
 * Descripción: Instrucciones que ve un Administrador de Conjunto en el registro
 *              para pedir su cuenta, en lugar del formulario.
 * ¿Para qué? Su cuenta solo se crea por invitación del Administrador del
 *           Sistema (HU-018, issue #216) — sin esto no tenía cómo saber a
 *           quién pedirla.
 * ¿Impacto? La app no recibe ni guarda ningún documento: el primer contacto
 *           va por el formulario de /contacto (solo texto) y los documentos se
 *           piden después por correo, fuera de la app.
 */

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";

// ¿Qué? Valor de ?motivo= que ContactoModalPage reconoce para llenar el asunto
//       y la plantilla del mensaje.
// ¿Para qué? En la URL solo viaja el motivo, nunca un dato personal.
export const MOTIVO_SOLICITUD_ADMIN = "admin-conjunto";

// ¿Qué? Valor de ?motivo= para quien YA tiene cuenta y pide que le asignen otro
//       conjunto desde su panel (issue #491).
// ¿Para qué? El mensaje de contacto de "pedir mi cuenta" no encaja con este caso.
export const MOTIVO_SOLICITUD_OTRO_CONJUNTO = "otro-conjunto";

const PASOS = ["step1", "step2", "step3"] as const;
const DOCUMENTOS = ["doc1", "doc2", "doc3", "doc4", "doc5"] as const;

/**
 * ¿Qué? `registro` es la pantalla del registro (quien aún no tiene cuenta);
 *       `otroConjunto` es la que ve un Admin de Conjunto en su panel.
 * ¿Para qué? Cambian solo el encabezado, los 3 pasos y el botón. Los documentos
 *           y el aviso de privacidad se leen siempre de las mismas claves, para
 *           que corregirlos (issue #457) los cambie en los dos lugares a la vez.
 */
export function SolicitudAdminConjuntoInfo({ variante = "registro" }: { variante?: "registro" | "otroConjunto" }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const AdminIcon = ROLE_THEME[RoleId.ADMIN_CONJUNTO].Icon;
  const esOtroConjunto = variante === "otroConjunto";
  const claves = esOtroConjunto ? "dashboards.adminConjunto.otroConjunto" : "auth.register.adminRequest";
  const motivo = esOtroConjunto ? MOTIVO_SOLICITUD_OTRO_CONJUNTO : MOTIVO_SOLICITUD_ADMIN;

  return (
    <div
      className={
        esOtroConjunto
          ? "space-y-5"
          : "space-y-5 p-5 bg-accent-50/30 dark:bg-accent-900/10 border border-accent-100 dark:border-accent-900/40 rounded-2xl"
      }
    >
      <div className="flex items-center gap-2">
        <AdminIcon className="icon-lg shrink-0 text-accent-600" />
        <h3 className="font-bold text-gray-800 dark:text-gray-200">{t(`${claves}.heading`)}</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{t(`${claves}.intro`)}</p>

      <ol className="space-y-3">
        {PASOS.map((paso, i) => (
          <li key={paso} className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-700 text-white text-xs font-bold">
              {i + 1}
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t(`${claves}.${paso}`)}</p>
          </li>
        ))}
      </ol>

      <div className="pt-3 border-t border-gray-200 dark:border-night-line">
        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{t("auth.register.adminRequest.docsHeading")}</h4>
        <ul className="mt-2 ml-4 list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
          {DOCUMENTOS.map((doc) => (
            <li key={doc}>{t(`auth.register.adminRequest.${doc}`)}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">{t("auth.register.adminRequest.privacyNotice")}</p>

      <Button fullWidth onClick={() => navigate(`/contacto?motivo=${motivo}`)}>
        <span className="flex items-center gap-2">
          {t(`${claves}.cta`)}
          <Send className="icon-md" />
        </span>
      </Button>
    </div>
  );
}
