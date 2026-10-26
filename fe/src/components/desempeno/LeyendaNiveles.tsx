/**
 * Archivo: components/desempeno/LeyendaNiveles.tsx
 * ¿Qué? Leyenda de la gráfica de desempeño: cada nivel con su muestra de color,
 *       su ícono (carita) y su nombre.
 * ¿Para qué? RNF-005.2: el color no puede ser la única forma de distinguir
 *           Bueno, Regular y Malo; el ícono y el nombre van siempre al lado.
 */
import { useTranslation } from "react-i18next";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";
import { CAMPOS_POR_NIVEL, claveNivel } from "@/lib/desempeno";

export function LeyendaNiveles() {
  const { t } = useTranslation();
  return (
    <ul aria-label={t("desempeno.grafica.leyenda")} className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {CAMPOS_POR_NIVEL.map(({ nivel }) => {
        const config = NIVELES_DESEMPENO[nivel];
        return (
          <li key={nivel} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span aria-hidden="true" className={`inline-block h-3 w-3 rounded-sm ${config.claseMuestra}`} />
            <config.icon className="icon-md" aria-hidden="true" />
            {t(claveNivel(nivel))}
          </li>
        );
      })}
    </ul>
  );
}
