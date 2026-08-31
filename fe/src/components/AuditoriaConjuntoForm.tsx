/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Archivo: components/AuditoriaConjuntoForm.tsx
 * ¿Qué? Formulario para que el Reciclador audite el desempeño de
 *       separación de residuos de un conjunto (RQF-009).
 * ¿Para qué? Nivel de desempeño (Bueno/Regular/Malo, con ícono/color), tema
 *           relacionado del catálogo educativo, descripción opcional, y
 *           entre 1 y 3 fotos de evidencia — la calificación nunca se
 *           apoya solo en la palabra del reciclador.
 * ¿Impacto? Es el primer formulario de la app que sube archivos — usa
 *           FormData/multipart en vez de JSON (ver auditoriaConjuntoApi.ts).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Loader2, Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { crearAuditoria, type AuditoriaConjunto, type NivelDesempeno } from "@/lib/auditoriaConjuntoApi";
import { listarContenido } from "@/lib/contenidoEducativoApi";
import { NIVELES_DESEMPENO, ORDEN_NIVELES_SELECCIONABLES } from "@/config/nivelesDesempeno";
import { NOMBRE_SIMPLE_CATEGORIA } from "@/config/categoriasEducativas";

const MAXIMO_FOTOS = 3;

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
  const [evidencias, setEvidencias] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ¿Qué? URLs de vista previa (blob:) para las fotos ya elegidas.
  // ¿Para qué? Antes el formulario solo mostraba el nombre del archivo —
  //           el reciclador no tenía forma de confirmar que la foto
  //           elegida era la correcta antes de enviarla.
  // ¿Impacto? Cada URL se libera (revokeObjectURL) al reemplazar la lista
  //           o al cerrar el formulario, para no dejar memoria reservada.
  useEffect(() => {
    const urls = evidencias.map((archivo) => URL.createObjectURL(archivo));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [evidencias]);

  const agregarFotos = (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return;
    setEvidencias((prev) => [...prev, ...Array.from(archivos)].slice(0, MAXIMO_FOTOS));
  };

  const quitarFoto = (indice: number) => {
    setEvidencias((prev) => prev.filter((_, i) => i !== indice));
  };

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
    if (evidencias.length === 0) {
      setError(t("dashboards.reciclador.auditoria.validation.evidencia"));
      return;
    }

    setEnviando(true);
    setProgreso(0);
    try {
      const auditoria = await crearAuditoria(
        {
          id_conjunto_residencial: idConjunto,
          nivel_desempeno: nivel,
          tema_educativo: tema,
          descripcion: descripcion.trim() || undefined,
          evidencias,
        },
        token,
        setProgreso
      );
      onSuccess(auditoria);
    } catch (err: any) {
      // ¿Qué? Antes de esto, un timeout (subida colgada) llegaba aquí sin
      //       "err?.response" (axios no recibe respuesta del servidor si
      //       nunca llegó a responder) — caía siempre en el mensaje
      //       genérico, sin decirle al reciclador que fue justo un
      //       problema de conexión/tiempo, no del contenido del formulario.
      const esTimeout = err?.code === "ECONNABORTED";
      setError(
        esTimeout
          ? t("dashboards.reciclador.auditoria.errorTimeout")
          : err?.response?.data?.detail || t("dashboards.reciclador.auditoria.errorDefault")
      );
    } finally {
      setEnviando(false);
      setProgreso(0);
    }
  };

  return (
    <Modal onClose={onClose} wide closeOnBackdrop={false} aria-label={t("dashboards.reciclador.auditoria.modalTitle")}>
      <div className="p-6">
        <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-white">
          {t("dashboards.reciclador.auditoria.modalTitle")}
        </h3>
        <p className="mb-5 text-xs text-gray-500 dark:text-gray-400">
          {t("dashboards.reciclador.auditoria.modalSubtitle")}
        </p>

        {/* ¿Qué? Si ya se sabe a cuál conjunto es (vino de un aviso
               puntual, ver conjuntoPreseleccionado), no se vuelve a
               preguntar — antes se preguntaba igual apenas había más de
               un conjunto asignado, aunque ya se supiera la respuesta. */}
        {!conjuntoPreseleccionado && conjuntos.length > 1 && (
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
          {/* ¿Qué? Los 3 botones muestran su color desde el inicio (como un
                 semáforo), no solo al elegirlos — antes todos se veían
                 grises hasta tocar uno, y en modo oscuro eso se leía como
                 un error de color en vez de un estado "sin elegir". El
                 elegido se distingue con un anillo, no con ser el único
                 con color. */}
          {/* ¿Qué? role="radiogroup" + role="radio"/aria-checked en cada botón:
                 son 3 opciones mutuamente excluyentes (como los botones de
                 radio de un formulario), pero antes el "elegido" solo se
                 distinguía por una clase CSS — invisible para quien usa un
                 lector de pantalla. */}
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("dashboards.reciclador.auditoria.nivelLabel")}>
            {ORDEN_NIVELES_SELECCIONABLES.map((n) => {
              const { icon: Icon, claseBadge, claseSeleccionado } = NIVELES_DESEMPENO[n];
              const seleccionado = nivel === n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={seleccionado}
                  onClick={() => setNivel(n)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-semibold transition-all ${
                    seleccionado ? claseSeleccionado : `border-transparent opacity-70 hover:opacity-100 ${claseBadge}`
                  }`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
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
                {NOMBRE_SIMPLE_CATEGORIA[cat] ?? cat}
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

          {previews.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {previews.map((url, i) => (
                <div key={url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 dark:border-[#2a4d34]">
                  <img src={url} alt={evidencias[i].name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => quitarFoto(i)}
                    aria-label={t("dashboards.reciclador.auditoria.evidenciaQuitar")}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {evidencias.length < MAXIMO_FOTOS ? (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-green-400 dark:border-[#2a4d34] dark:text-gray-300">
              {evidencias.length === 0 ? <Camera className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0" />}
              {evidencias.length === 0
                ? t("dashboards.reciclador.auditoria.evidenciaHint")
                : t("dashboards.reciclador.auditoria.evidenciaAgregarOtra")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  agregarFotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("dashboards.reciclador.auditoria.evidenciaMaximoAlcanzado")}
            </p>
          )}
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
            {enviando
              ? // ¿Qué? Antes solo decía "Enviando..." sin ningún número.
                // ¿Para qué? Una subida que de verdad avanza (pero lento, por
                //           una mala conexión) se veía IGUAL que una que ya
                //           se había colgado — nada distinguía "está
                //           funcionando" de "no va a terminar nunca".
                // ¿Impacto? Con el porcentaje real (onUploadProgress de
                //           axios), el reciclador ve que sí está avanzando.
                t("dashboards.reciclador.auditoria.sendingProgress", { porcentaje: progreso })
              : t("dashboards.reciclador.auditoria.submit")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
