/**
 * Archivo: components/ui/ThemeToggle.tsx
 * Descripción: Botón para alternar entre tema claro y oscuro.
 * ¿Para qué? Permitir al usuario elegir su preferencia de tema (dark/light).
 * ¿Impacto? Sin este componente, el tema se definiría solo por prefers-color-scheme
 *           del sistema operativo, sin opción de cambio manual.
 */

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * ¿Qué? Hook interno que gestiona el estado del tema (dark/light).
 * ¿Para qué? Leer la preferencia del usuario desde localStorage, o caer en la del SO.
 * ¿Impacto? El tema persiste entre sesiones gracias a localStorage.
 */
function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // ¿Qué? Intenta leer la preferencia guardada en localStorage.
    // ¿Para qué? Respetar la última elección del usuario.
    // ¿Impacto? Si no hay preferencia guardada, usa la del sistema operativo.
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // ¿Qué? Agrega o quita la clase "dark" en el elemento <html>.
    // ¿Para qué? TailwindCSS usa la clase "dark" en html para activar los estilos dark:.
    // ¿Impacto? Sin esta clase, dark:bg-gray-950 y similares no se aplicarían.
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((prev) => !prev) };
}

/**
 * ¿Qué? Botón con ícono de sol/luna para cambiar entre dark y light mode.
 * ¿Para qué? Experiencia de usuario accesible con toggle visual.
 * ¿Impacto? Diseño limpio: solo un ícono con transición suave, sin texto ni degradados.
 */
export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggle}
      className="cursor-pointer rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-night-hover"
      // ¿Qué? Textos desde i18n: antes estaban fijos en español y, con la app
      //       en inglés, el lector de pantalla seguía leyendo "Cambiar a tema claro".
      aria-label={isDark ? t("common.switchToLight") : t("common.switchToDark")}
      aria-pressed={isDark}
      title={isDark ? t("common.lightTheme") : t("common.darkTheme")}
    >
      {isDark ? (
        // ¿Qué? Ícono de sol — indica que se cambiará a light mode.
        <Sun className="icon-lg" aria-hidden="true" />
      ) : (
        // ¿Qué? Ícono de luna — indica que se cambiará a dark mode.
        <Moon className="icon-lg" aria-hidden="true" />
      )}
    </button>
  );
}
