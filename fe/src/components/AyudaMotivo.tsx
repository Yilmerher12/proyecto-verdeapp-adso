/**
 * Archivo: components/AyudaMotivo.tsx
 * ¿Qué? Panel de ayuda escrita que aparece al elegir un motivo en "Soporte
 *       técnico → Escribir novedad" (investigación #521, opción C).
 * ¿Para qué? Que quien tiene una duda vea primero los pasos para resolverla
 *           solo. Los motivos que no se resuelven solos avisan que los revisa
 *           una persona. "Otros" no muestra nada: ahí el usuario ya escribe.
 * ¿Impacto? El formulario sigue disponible debajo — la ayuda nunca bloquea
 *           ni retrasa el contacto con una persona. Cada motivo con pasos
 *           necesita su lista en novedadesEnviadas.ayuda.<clave> (es y en) y
 *           debe tener su cantidad de pasos en PASOS_POR_MOTIVO; solo se agregan aquí los textos
 *           verificados contra el código, no los supuestos.
 */
import { useTranslation } from "react-i18next";
import { Info, Lightbulb } from "lucide-react";

// ¿Qué? Los motivos cuya respuesta se verificó contra el código y cuántos pasos
//       lleva cada uno (paso1, paso2... en las traducciones; ver
//       docs/gestion-proyecto/investigacion-chat-soporte.md, sección 8.1).
const PASOS_POR_MOTIVO: Record<string, number> = {
  login: 3,
  notificaciones: 3,
  cuenta: 2,
  falla: 3,
  recicladorAuditoria: 3,
};

interface AyudaMotivoProps {
  motivo: string;
  onResuelto: () => void;
  onNoResuelto: () => void;
}

export function AyudaMotivo({ motivo, onResuelto, onNoResuelto }: AyudaMotivoProps) {
  const { t } = useTranslation();
  if (!motivo || motivo === "otros") return null;

  const cantidad = PASOS_POR_MOTIVO[motivo] ?? 0;
  const conPasos = cantidad > 0;
  const pasos = Array.from({ length: cantidad }, (_, i) =>
    t(`novedadesEnviadas.ayuda.${motivo}.paso${i + 1}`),
  );
  const Icono = conPasos ? Lightbulb : Info;

  return (
    <section
      role="status"
      className="space-y-3 rounded-xl border border-accent-700 bg-accent-50 p-4 dark:border-accent-500 dark:bg-accent-900/20"
    >
      <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
        <Icono className="icon-md shrink-0" />
        {t(conPasos ? "novedadesEnviadas.ayuda.titulo" : "novedadesEnviadas.ayuda.personaTitulo")}
      </h3>

      {conPasos ? (
        <>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-800 dark:text-gray-200">
            {pasos.map((paso) => (
              <li key={paso}>{paso}</li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("novedadesEnviadas.ayuda.pregunta")}
            </span>
            <button
              type="button"
              onClick={onResuelto}
              className="focus-ring cursor-pointer rounded-lg border border-edge bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-night-edge dark:bg-night-field dark:text-gray-100 dark:hover:bg-night-hover"
            >
              {t("novedadesEnviadas.ayuda.si")}
            </button>
            <button
              type="button"
              onClick={onNoResuelto}
              className="focus-ring cursor-pointer rounded-lg border border-edge bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-night-edge dark:bg-night-field dark:text-gray-100 dark:hover:bg-night-hover"
            >
              {t("novedadesEnviadas.ayuda.no")}
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-800 dark:text-gray-200">
          {t("novedadesEnviadas.ayuda.persona")}
        </p>
      )}
    </section>
  );
}
