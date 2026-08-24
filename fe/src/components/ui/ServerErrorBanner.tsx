import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";
import { onServerUnreachable, onServerReachable } from "@/lib/serverStatusEvents";

/**
 * Archivo: components/ui/ServerErrorBanner.tsx
 * ¿Para qué? RNF-002.4 — avisar al usuario cuando el servidor no responde,
 *           en vez de que la app se quede congelada o en blanco sin
 *           ninguna explicación. Se monta una sola vez en App.tsx, fuera
 *           de las rutas, así que se ve sin importar en qué pantalla esté
 *           el usuario cuando el servidor se caiga.
 * ¿Impacto? No reemplaza los mensajes de error puntuales de cada
 *           formulario — es un aviso adicional, de "algo más grande está
 *           pasando", que cubre justo el caso en que ninguna petición del
 *           backend está funcionando.
 */
export function ServerErrorBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubUnreachable = onServerUnreachable(() => setVisible(true));
    const unsubReachable = onServerReachable(() => setVisible(false));
    return () => {
      unsubUnreachable();
      unsubReachable();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-red-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      {t("serverError.message")}
    </div>
  );
}
