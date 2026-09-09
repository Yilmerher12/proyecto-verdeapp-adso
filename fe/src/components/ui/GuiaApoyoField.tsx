/**
 * Archivo: components/ui/GuiaApoyoField.tsx
 * ¿Qué? Campo para la guía de apoyo del contenido educativo — a diferencia
 *       de ImagenAdjuntaField (solo imagen, un único modo), este deja
 *       elegir entre subir un archivo real (imagen o PDF) o pegar un link
 *       externo, porque la guía de apoyo legítimamente puede ser
 *       cualquiera de las dos cosas.
 * ¿Para qué? Antes este campo solo aceptaba un link escrito a mano.
 */
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { subirAdjunto } from "@/lib/uploadsApi";

interface GuiaApoyoFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

export function GuiaApoyoField({ label, value, onChange }: GuiaApoyoFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ¿Qué? Si ya hay un valor guardado, se infiere el modo desde su forma
  //       (un archivo subido por VerdeApp siempre empieza con /uploads/).
  const [modo, setModo] = useState<"archivo" | "link">(
    value && !value.startsWith("/uploads/") ? "link" : "archivo"
  );

  const manejarArchivo = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError(null);

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      setError(t("guiaApoyo.tipoInvalido"));
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      setError(t("guiaApoyo.demasiadoGrande"));
      return;
    }

    setSubiendo(true);
    try {
      const url = await subirAdjunto(archivo, { permitirDocumentos: true });
      onChange(url);
    } catch {
      setError(t("guiaApoyo.errorSubida"));
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const cambiarModo = (nuevoModo: "archivo" | "link") => {
    setModo(nuevoModo);
    setError(null);
    onChange("");
  };

  return (
    <div>
      <label className="mb-2 flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-400">
        <FileText className="h-4 w-4" />
        {label}
      </label>

      {/* ¿Qué? "Subir archivo" / "Pegar link" son mutuamente excluyentes —
          mismo patrón role="radiogroup" + role="radio" + aria-checked que
          ya usa el selector de nivel en AuditoriaConjuntoForm.tsx, en vez
          de comunicar cuál está elegido solo con una clase CSS. */}
      <div className="mb-2 flex gap-1.5" role="radiogroup" aria-label={t("guiaApoyo.modeGroupAria")}>
        <button
          type="button"
          role="radio"
          aria-checked={modo === "archivo"}
          onClick={() => cambiarModo("archivo")}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            modo === "archivo"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-[#1f4029] dark:text-gray-400 dark:hover:bg-[#2a4d34]"
          }`}
        >
          {t("guiaApoyo.tabUpload")}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={modo === "link"}
          onClick={() => cambiarModo("link")}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            modo === "link"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-[#1f4029] dark:text-gray-400 dark:hover:bg-[#2a4d34]"
          }`}
        >
          {t("guiaApoyo.tabLink")}
        </button>
      </div>

      {modo === "link" ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
        />
      ) : value ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-[#2a4d34] dark:bg-[#1f4029]">
          <FileText className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
          <span className="min-w-0 flex-1 truncate text-xs text-gray-600 dark:text-gray-300">
            {value.split("/").pop()}
          </span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <X className="h-3.5 w-3.5" />
            {t("guiaApoyo.quitar")}
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-gray-400 dark:hover:bg-[#2a4d34]">
          {subiendo ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("guiaApoyo.subiendo")}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {t("guiaApoyo.seleccionar")}
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
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
