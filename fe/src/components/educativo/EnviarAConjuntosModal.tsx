import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { Send } from "lucide-react";
import { API_BASE_URL } from "@/api/axios";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { ConjuntoOption } from "@/components/ui/ConjuntoCombobox";
import { ConjuntoComboboxMultiple } from "@/components/ui/ConjuntoComboboxMultiple";
import { Modal } from "@/components/ui/Modal";
import { enviarContenido, type ContenidoEducativo } from "@/lib/contenidoEducativoApi";

interface Localidad {
  id_localidad: number;
  nombre_localidad: string;
}

// ¿Qué? Busca conjuntos por nombre, máximo 20 resultados; con una localidad elegida, solo los de esa localidad (mismo
//       patrón que el filtro de Calificaciones y el panel de usuarios).
function buscarConjuntos(query: string, idLocalidad: string): Promise<ConjuntoOption[]> {
  return axios
    .get(`${API_BASE_URL}/api/v1/geography/conjuntos/todos`, {
      params: { search: query || undefined, limit: 20, ...(idLocalidad ? { id_localidad: Number(idLocalidad) } : {}) },
    })
    .then((res) => res.data)
    .catch(() => []);
}

interface EnviarAConjuntosModalProps {
  modulo: ContenidoEducativo;
  /** Se llama cuando el envío salió bien, para que la lista y el modal de ver se actualicen. */
  onEnviado: () => void;
  onClose: () => void;
}

/**
 * ¿Qué? Ventana para enviar un módulo a mano a uno o varios conjuntos (RQF-013, Flujo C), con un solo control de varios
 *       conjuntos y un botón que dice cuántos se enviarán.
 * ¿Para qué? Issue #619: antes eran dos controles seguidos ("A un conjunto específico" y "A varios conjuntos") dentro de
 *           un panel lateral; uno solo cubre los dos casos (elegir un conjunto es elegir "varios" con uno). La Localidad es un
 *           filtro OPCIONAL arriba del buscador: acota la búsqueda, pero no la exige (se puede enviar a conjuntos de
 *           localidades distintas) y los conjuntos ya elegidos se conservan al cambiarla.
 * ¿Impacto? Al enviar cierra la ventana y avisa a la página (onEnviado) para que vuelva a pedir los envíos del módulo.
 *           Si falla, se queda abierta con el error y lo elegido, para reintentar sin volver a buscar.
 */
export function EnviarAConjuntosModal({ modulo, onEnviado, onClose }: EnviarAConjuntosModalProps) {
  const { t } = useTranslation();
  const p = "adminContenidoEducativo";
  const [elegidos, setElegidos] = useState<ConjuntoOption[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [localidadId, setLocalidadId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/v1/geography/localidades`)
      .then((res) => setLocalidades(res.data))
      .catch(() => {});
  }, []);

  const enviar = async () => {
    if (elegidos.length === 0) return;
    setEnviando(true);
    setError(null);
    try {
      await enviarContenido(
        modulo.id_contenido,
        elegidos.map((c) => c.id_conjunto_residencial),
      );
      onEnviado();
      onClose();
    } catch {
      setError(t(`${p}.send.error`));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal onClose={onClose} wide layer="stacked" aria-label={t(`${p}.send.title`)}>
      <div className="space-y-4 p-6 pr-14">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t(`${p}.send.title`)}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t(`${p}.send.subtitle`, { titulo: modulo.titulo_tema })}</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div>
          <label htmlFor="enviar-localidad" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            {t(`${p}.send.localidadLabel`)}
          </label>
          <select
            id="enviar-localidad"
            value={localidadId}
            onChange={(e) => setLocalidadId(e.target.value)}
            className="focus-ring w-full cursor-pointer rounded-lg border border-edge bg-white p-2.5 text-sm text-gray-900 dark:border-night-edge dark:bg-night-field dark:text-gray-100"
          >
            <option value="">{t(`${p}.send.allLocalidades`)}</option>
            {localidades.map((l) => (
              <option key={l.id_localidad} value={l.id_localidad}>
                {l.nombre_localidad}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">{t(`${p}.send.severalLabel`)}</span>
          {/* ¿Qué? key={localidadId}: al cambiar la localidad el buscador se reinicia (vuelve a pedir con el filtro nuevo);
                    los conjuntos ya elegidos viven en este componente, así que no se pierden. */}
          <ConjuntoComboboxMultiple
            key={localidadId}
            value={elegidos}
            onChange={setElegidos}
            fetchOptions={(query) => buscarConjuntos(query, localidadId)}
            placeholder={t(`${p}.send.searchPlaceholder`)}
            ariaLabel={t(`${p}.send.severalLabel`)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" size="sm" onClick={enviar} isLoading={enviando} disabled={elegidos.length === 0}>
            <Send className="icon-sm mr-1" />
            {elegidos.length > 0 ? t(`${p}.send.buttonMany`, { count: elegidos.length }) : t(`${p}.send.button`)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
