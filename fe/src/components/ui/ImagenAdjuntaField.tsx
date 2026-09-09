/**
 * Archivo: components/ui/ImagenAdjuntaField.tsx
 * ¿Qué? Selector de imagen con vista previa, usado por comunicados y
 *       novedades para su adjunto.
 * ¿Para qué? Antes este campo era un link externo escrito a mano — igual
 *           que nos pasó con el link roto de la guía de RCD, un link
 *           externo se puede romper sin que nadie se entere. Ahora se
 *           sube el archivo real (ver lib/uploadsApi.ts), validado y
 *           guardado por VerdeApp mismo.
 * ¿Impacto? Un solo componente para los dos formularios — evita repetir
 *           la misma lógica de subida/vista previa/error dos veces.
 *           `permitirDocumentos` (issue #194) deja que Comunicados
 *           también acepte PDF/Word/Excel, sin cambiar nada para
 *           Novedades (que no lo pasa y sigue solo con imagen).
 */
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, ImagePlus, Loader2, X } from "lucide-react";
import { API_BASE_URL } from "@/api/axios";
import { subirAdjunto } from "@/lib/uploadsApi";

interface ImagenAdjuntaFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** ¿Qué? Además de imagen, acepta PDF/Word/Excel. Default: false (solo imagen). */
  permitirDocumentos?: boolean;
}

// ¿Qué? Misma lista y mismo tope que ya valida el backend
//       (be/app/utils/imagenes.py) — se revisa aquí también para dar el
//       error al instante, sin esperar el viaje de ida y vuelta al
//       servidor con un archivo que de todas formas va a rechazar.
const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
const TIPOS_DOCUMENTO = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const ACCEPT_IMAGEN = "image/jpeg,image/png,image/webp";
const ACCEPT_DOCUMENTOS = `${ACCEPT_IMAGEN},application/pdf,.docx,.xlsx`;
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

// ¿Qué? Un PDF/Word/Excel no se puede mostrar como miniatura de imagen.
function esImagen(value: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(value) || (value.startsWith("http") && !/\.(pdf|docx?|xlsx?)$/i.test(value));
}

export function ImagenAdjuntaField({
  label,
  value,
  onChange,
  permitirDocumentos = false,
}: ImagenAdjuntaFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tiposPermitidos = permitirDocumentos ? [...TIPOS_IMAGEN, ...TIPOS_DOCUMENTO] : TIPOS_IMAGEN;

  const manejarArchivo = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError(null);

    if (!tiposPermitidos.includes(archivo.type)) {
      setError(permitirDocumentos ? t("imagenAdjunta.tipoInvalidoDocumentos") : t("imagenAdjunta.tipoInvalido"));
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      setError(t("imagenAdjunta.demasiadoGrande"));
      return;
    }

    setSubiendo(true);
    try {
      const url = await subirAdjunto(archivo, { permitirDocumentos });
      onChange(url);
    } catch {
      setError(t("imagenAdjunta.errorSubida"));
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const quitar = () => {
    onChange("");
    setError(null);
  };

  // ¿Qué? url_adjunto puede venir de un enlace externo viejo (datos ya
  //       guardados antes de este cambio) — en ese caso empieza con
  //       http(s), y se usa tal cual. Si viene de esta subida, es una
  //       ruta relativa (/uploads/adjuntos/...) que hay que completar con
  //       la URL del backend para poder mostrarla.
  const urlCompleta = value.startsWith("http") ? value : `${API_BASE_URL}${value}`;

  return (
    <div>
      <label className="mb-2 flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-400">
        <ImagePlus className="h-4 w-4" />
        {label}
      </label>

      {value ? (
        <div className="flex items-center gap-3">
          {esImagen(value) ? (
            <img
              src={urlCompleta}
              alt={t("imagenAdjunta.vistaPrevia")}
              className="h-16 w-16 rounded-xl border border-gray-200 object-cover dark:border-[#2a4d34]"
            />
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-[#2a4d34] dark:bg-[#1f4029]">
              <FileText className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span className="truncate text-xs text-gray-600 dark:text-gray-300">{value.split("/").pop()}</span>
            </div>
          )}
          <button
            type="button"
            onClick={quitar}
            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <X className="h-3.5 w-3.5" />
            {t("imagenAdjunta.quitar")}
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-gray-400 dark:hover:bg-[#2a4d34]">
          {subiendo ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("imagenAdjunta.subiendo")}
            </>
          ) : (
            <>
              <ImagePlus className="h-4 w-4" />
              {permitirDocumentos ? t("imagenAdjunta.seleccionarDocumento") : t("imagenAdjunta.seleccionar")}
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={permitirDocumentos ? ACCEPT_DOCUMENTOS : ACCEPT_IMAGEN}
            className="hidden"
            disabled={subiendo}
            onChange={(e) => manejarArchivo(e.target.files?.[0])}
          />
        </label>
      )}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
