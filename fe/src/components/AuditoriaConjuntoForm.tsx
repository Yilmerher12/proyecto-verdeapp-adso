/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Archivo: components/AuditoriaConjuntoForm.tsx
 * ¿Qué? Formulario para que el Reciclador audite el desempeño de
 *       separación de residuos de un conjunto (RQF-009).
 * ¿Para qué? Nivel de desempeño (4 opciones con ícono/color), tema
 *           relacionado del catálogo educativo, descripción opcional, y
 *           foto de evidencia obligatoria — la calificación nunca se
 *           apoya solo en la palabra del reciclador.
 * ¿Impacto? Es el primer formulario de la app que sube un archivo — usa
 *           FormData/multipart en vez de JSON (ver auditoriaConjuntoApi.ts).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { crearAuditoria, type AuditoriaConjunto, type NivelDesempeno } from "@/lib/auditoriaConjuntoApi";
import { listarContenido } from "@/lib/contenidoEducativoApi";
import { NIVELES_DESEMPENO, ORDEN_NIVELES } from "@/config/nivelesDesempeno";

interface ConjuntoOption {
  id_conjunto_residencial: string;
  nombre_conjunto: string;
}

interface AuditoriaConjuntoFormProps {
  conjuntos: ConjuntoOption[];
  conjuntoPreseleccionado?: string;
  token: string;
  onClose: () => void;
  onSuccess: (auditoria: AuditoriaConjunto) => void;
}

export function AuditoriaConjuntoForm({
  conjuntos,
  conjuntoPreseleccionado,
  token,
  onClose,
  onSuccess,
}: AuditoriaConjuntoFormProps) {
  const { t } = useTranslation();

  const [idConjunto, setIdConjunto] = useState<string | "">(
    conjuntoPreseleccionado ?? (conjuntos.length === 1 ? conjuntos[0].id_conjunto_residencial : "")
  );
  const [nivel, setNivel] = useState<NivelDesempeno | null>(null);
  const [temas, setTemas] = useState<string[]>([]);
  const [tema, setTema] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [evidencia, setEvidencia] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ¿Qué? Mismas categorías que ya usa CatalogoEducativoPage — se derivan
  //       del catálogo real en vez de mantener una lista aparte que se
  //       puede desactualizar.
  useEffect(() => {
    listarContenido(token)
      .then((contenido) => setTemas(Array.from(new Set(contenido.map((c) => c.modulo_categoria)))))
      .catch(() => setTemas([]));
  }, [token]);

  const enviar = async () => {
    setError(null);
    if (!idConjunto) {
      setError(t("dashboards.reciclador.auditoria.validation.conjunto"));
      return;
    }
    if (!nivel) {
      setError(t("dashboards.reciclador.auditoria.validation.nivel"));
      return;
    }
    if (!tema) {
      setError(t("dashboards.reciclador.auditoria.validation.tema"));
      return;
    }
    if (!evidencia) {
      setError(t("dashboards.reciclador.auditoria.validation.evidencia"));
      return;
    }

    setEnviando(true);
    try {
      const auditoria = await crearAuditoria(
        {
          id_conjunto_residencial: idConjunto,
          nivel_desempeno: nivel,
          tema_educativo: tema,
          descripcion: descripcion.trim() || undefined,
          evidencia,
        },
        token
      );
      onSuccess(auditoria);
    } catch (err: any) {
      setError(err?.response?.data?.detail || t("dashboards.reciclador.auditoria.errorDefault"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal onClose={onClose} wide aria-label={t("dashboards.reciclador.auditoria.modalTitle")}>
      <div className="p-6">
        <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-white">
          {t("dashboards.reciclador.auditoria.modalTitle")}
        </h3>
        <p className="mb-5 text-xs text-gray-500 dark:text-gray-400">
          {t("dashboards.reciclador.auditoria.modalSubtitle")}
        </p>

        {conjuntos.length > 1 && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-400">
              {t("dashboards.reciclador.auditoria.conjuntoLabel")}
            </label>
            <select
              value={idConjunto}
              onChange={(e) => setIdConjunto(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-gray-100"
            >
              <option value="">{t("auth.register.fields.selectPlaceholder")}</option>
              {conjuntos.map((c) => (
                <option key={c.id_conjunto_residencial} value={c.id_conjunto_residencial}>
                  {c.nombre_conjunto}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="mb-2 block text-xs font-bold text-gray-600 dark:text-gray-400">
            {t("dashboards.reciclador.auditoria.nivelLabel")}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {ORDEN_NIVELES.map((n) => {
              const { icon: Icon, claseSeleccionado } = NIVELES_DESEMPENO[n];
              const seleccionado = nivel === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNivel(n)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors ${
                    seleccionado
                      ? claseSeleccionado
                      : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-[#2a4d34] dark:text-gray-400"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  {t(`dashboards.reciclador.auditoria.niveles.${n.toLowerCase()}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-400">
            {t("dashboards.reciclador.auditoria.temaLabel")}
          </label>
          <select
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-gray-100"
          >
            <option value="">{t("dashboards.reciclador.auditoria.temaPlaceholder")}</option>
            {temas.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-400">
            {t("dashboards.reciclador.auditoria.descripcionLabel")}
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder={t("dashboards.reciclador.auditoria.descripcionPlaceholder")}
            className="w-full resize-none rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-gray-100"
          />
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-400">
            {t("dashboards.reciclador.auditoria.evidenciaLabel")}
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-green-400 dark:border-[#2a4d34] dark:text-gray-300">
            <Camera className="h-4 w-4 shrink-0" />
            {evidencia ? evidencia.name : t("dashboards.reciclador.auditoria.evidenciaHint")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setEvidencia(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error && (
          <p className="mb-4 text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
          >
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            {enviando ? t("dashboards.reciclador.auditoria.sending") : t("dashboards.reciclador.auditoria.submit")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
