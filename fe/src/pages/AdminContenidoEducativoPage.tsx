import { useEffect, useState } from "react";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Modal } from "@/components/ui/Modal";
import {
  crearContenido,
  editarContenido,
  eliminarContenido,
  listarContenido,
  type ContenidoEducativo,
  type ContenidoEducativoPayload,
} from "@/lib/contenidoEducativoApi";

const FORM_VACIO: ContenidoEducativoPayload = {
  modulo_categoria: "",
  titulo_tema: "",
  cuerpo_texto: "",
  url_video: "",
  url_guia: "",
};

export function AdminContenidoEducativoPage() {
  const { accessToken } = useAuth();
  const [contenido, setContenido] = useState<ContenidoEducativo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [editando, setEditando] = useState<ContenidoEducativo | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState<ContenidoEducativoPayload>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [aEliminar, setAEliminar] = useState<ContenidoEducativo | null>(null);

  const cargar = () => {
    if (!accessToken) return;
    setCargando(true);
    listarContenido(accessToken)
      .then(setContenido)
      .catch(() => setErrorMsg("No se pudo cargar el catálogo educativo."))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, [accessToken]);

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setCreando(true);
  };

  const abrirEditar = (item: ContenidoEducativo) => {
    setForm({
      modulo_categoria: item.modulo_categoria,
      titulo_tema: item.titulo_tema,
      cuerpo_texto: item.cuerpo_texto,
      url_video: item.url_video ?? "",
      url_guia: item.url_guia ?? "",
    });
    setEditando(item);
  };

  const cerrarFormulario = () => {
    setCreando(false);
    setEditando(null);
    setErrorMsg(null);
  };

  const guardar = async () => {
    if (!accessToken) return;
    if (!form.modulo_categoria.trim() || !form.titulo_tema.trim() || !form.cuerpo_texto.trim()) {
      setErrorMsg("Categoría, título y contenido son obligatorios.");
      return;
    }
    setGuardando(true);
    setErrorMsg(null);
    const payload: ContenidoEducativoPayload = {
      ...form,
      url_video: form.url_video?.trim() || null,
      url_guia: form.url_guia?.trim() || null,
    };
    try {
      if (editando) {
        await editarContenido(editando.id_contenido, payload, accessToken);
      } else {
        await crearContenido(payload, accessToken);
      }
      cerrarFormulario();
      cargar();
    } catch {
      setErrorMsg("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!accessToken || !aEliminar) return;
    try {
      await eliminarContenido(aEliminar.id_contenido, accessToken);
      setAEliminar(null);
      cargar();
    } catch {
      setErrorMsg("No se pudo eliminar. Intenta de nuevo.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contenido educativo</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Crea, edita y elimina los módulos del catálogo.
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo módulo
        </button>
      </div>

      {cargando && <p className="text-sm text-gray-400">Cargando...</p>}

      {!cargando && contenido.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
          <BookOpen className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400">Todavía no hay módulos creados.</p>
        </div>
      )}

      <div className="space-y-3">
        {contenido.map((item) => (
          <div
            key={item.id_contenido}
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-500">
                {item.modulo_categoria}
              </p>
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                {item.titulo_tema}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => abrirEditar(item)}
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label={`Editar ${item.titulo_tema}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setAEliminar(item)}
                className="rounded-lg border border-gray-200 p-2 text-red-500 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-900/20"
                aria-label={`Eliminar ${item.titulo_tema}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(creando || editando) && (
        <Modal onClose={cerrarFormulario} wide aria-label={editando ? "Editar módulo" : "Nuevo módulo"}>
          <div className="p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editando ? "Editar módulo" : "Nuevo módulo"}
            </h2>

            {errorMsg && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errorMsg}
              </p>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Categoría <span className="text-red-500">*</span>
              </label>
              <input
                value={form.modulo_categoria}
                onChange={(e) => setForm({ ...form, modulo_categoria: e.target.value })}
                placeholder="Ej: Separación en la fuente"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                value={form.titulo_tema}
                onChange={(e) => setForm({ ...form, titulo_tema: e.target.value })}
                placeholder="Ej: Código de colores de bolsas"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Contenido <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.cuerpo_texto}
                onChange={(e) => setForm({ ...form, cuerpo_texto: e.target.value })}
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Link de video (YouTube)
              </label>
              <input
                value={form.url_video ?? ""}
                onChange={(e) => setForm({ ...form, url_video: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Link de guía de apoyo (PDF, Drive, etc.)
              </label>
              <input
                value={form.url_guia ?? ""}
                onChange={(e) => setForm({ ...form, url_guia: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={cerrarFormulario}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60 transition-colors"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {aEliminar && (
        <Modal onClose={() => setAEliminar(null)} aria-label="Confirmar eliminación">
          <div className="p-6 sm:p-8 max-w-sm mx-auto text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <Trash2 className="h-6 w-6 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              ¿Eliminar "{aEliminar.titulo_tema}"?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAEliminar(null)}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
