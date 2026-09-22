import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Heading2,
  List as ListIcon,
  Bold,
  ChevronDown,
  Maximize2,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Modal } from "@/components/ui/Modal";
import { PanelLateral } from "@/components/ui/PanelLateral";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Alert } from "@/components/ui/Alert";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { GuiaApoyoField } from "@/components/ui/GuiaApoyoField";
import { YoutubeEmbed } from "@/components/ui/YoutubeEmbed";
import { ConjuntoCombobox, type ConjuntoOption } from "@/components/ui/ConjuntoCombobox";
import { ConjuntoComboboxMultiple } from "@/components/ui/ConjuntoComboboxMultiple";
import { API_BASE_URL } from "@/api/axios";
import axios from "axios";
import { COMPONENTES_MARKDOWN } from "@/config/contenidoEducativoMarkdown";
import { ICONOS_CATEGORIAS, ICONO_CATEGORIA_DEFAULT, CATEGORIAS_NO_AUDITABLES } from "@/config/categoriasEducativas";
import { NIVELES_DESEMPENO } from "@/config/nivelesDesempeno";
import { domingoDeLunesUTC, formatearFechaCreacion, lunesUTC, rangoSemanaUTC } from "@/lib/dateFormat";
import {
  crearContenido,
  editarContenido,
  eliminarContenido,
  enviarContenido,
  listarContenido,
  listarEnvios,
  type ContenidoEducativo,
  type ContenidoEducativoPayload,
  type EnvioContenido,
} from "@/lib/contenidoEducativoApi";
import { listarAuditoriasAdmin, type AuditoriaAdmin, type NivelDesempeno } from "@/lib/auditoriaConjuntoApi";

const FORM_VACIO: ContenidoEducativoPayload = {
  modulo_categoria: "",
  titulo_tema: "",
  cuerpo_texto: "",
  url_video: "",
  url_guia: "",
};

const NUEVA_CATEGORIA = "__nueva__";

// ¿Qué? Cuántas auditorías "de todos los tiempos" se piden para cruzar
//       "a qué conjuntos se recomendó cada módulo" en la tabla y en el
//       resumen — no toda la historia, las más recientes alcanzan para el
//       tamaño real de este catálogo (6-20 módulos).
const LIMITE_AUDITORIAS_RECIENTES = 100;

function fetchConjuntos(query: string): Promise<ConjuntoOption[]> {
  return axios
    .get(`${API_BASE_URL}/api/v1/geography/conjuntos/todos`, { params: { search: query || undefined, limit: 20 } })
    .then((res) => res.data)
    .catch(() => []);
}

// ¿Qué? Destinatario ya resuelto de un módulo — une las auditorías Regular
//       o Malo (automáticas) con los envíos manuales, sin repetir un mismo
//       conjunto dos veces.
// ¿Para qué? Si un conjunto tiene ambas, se queda la calificación (trae más
//           contexto: el semáforo y quién la hizo) — el envío manual solo
//           se muestra para los conjuntos que no tienen ya una calificación
//           de ese tema.
interface Destinatario {
  id_conjunto_residencial: string;
  nombre_conjunto: string;
  tipo: "auto" | "manual";
  nivel?: NivelDesempeno;
  fecha: string;
}

function destinatariosAutoDe(modulo: ContenidoEducativo, auditorias: AuditoriaAdmin[]): Destinatario[] {
  const vistos = new Set<string>();
  const out: Destinatario[] = [];
  const ordenadas = [...auditorias]
    .filter((a) => a.tema_educativo === modulo.modulo_categoria && a.nivel_desempeno !== "BUENA" && a.nivel_desempeno !== "EXCELENTE")
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  for (const a of ordenadas) {
    if (vistos.has(a.id_conjunto_residencial)) continue;
    vistos.add(a.id_conjunto_residencial);
    out.push({
      id_conjunto_residencial: a.id_conjunto_residencial,
      nombre_conjunto: a.nombre_conjunto,
      tipo: "auto",
      nivel: a.nivel_desempeno,
      fecha: a.created_at,
    });
  }
  return out;
}

function combinarConEnvios(auto: Destinatario[], envios: EnvioContenido[]): Destinatario[] {
  const vistos = new Set(auto.map((d) => d.id_conjunto_residencial));
  const manuales: Destinatario[] = envios
    .filter((e) => !vistos.has(e.id_conjunto_residencial))
    .map((e) => ({
      id_conjunto_residencial: e.id_conjunto_residencial,
      nombre_conjunto: e.nombre_conjunto,
      tipo: "manual" as const,
      fecha: e.created_at,
    }));
  return [...auto, ...manuales];
}

// ¿Qué? La guía de apoyo puede ser una imagen subida, un PDF subido, o un
//       link externo escrito a mano (GuiaApoyoField admite las 3 formas) —
//       solo las imágenes se pueden mostrar integradas con una <img>; un PDF
//       (o un link cuyo tipo no se puede saber sin descargarlo) se queda
//       como el botón "Ver guía de apoyo" de siempre.
// ¿Para qué? Antes, ver la foto de la guía exigía un clic extra a ciegas
//           (el botón no daba ninguna pista de que había una imagen detrás).
const EXTENSIONES_IMAGEN_GUIA = [".jpg", ".jpeg", ".png", ".webp"];
function esImagenGuia(url: string): boolean {
  const limpia = url.split("?")[0].split("#")[0].toLowerCase();
  return EXTENSIONES_IMAGEN_GUIA.some((ext) => limpia.endsWith(ext));
}

export function AdminContenidoEducativoPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const p = "adminContenidoEducativo";

  const [tab, setTab] = useState<"cal" | "mod">("cal");
  // ¿Qué? El contenido de la pestaña activa (semana/chips/tabla, o
  //       buscador/lista de módulos) se puede recoger para que no ocupe
  //       espacio cuando no se está usando — solo las dos pestañas quedan
  //       siempre visibles. Empieza expandido: recogerlo es una decisión
  //       explícita del Admin, no algo que tenga que abrir cada vez que
  //       entra al panel.
  const [panelExpandido, setPanelExpandido] = useState(true);

  // ---------- Catálogo (módulos) ----------
  const [contenido, setContenido] = useState<ContenidoEducativo[]>([]);
  const [cargandoContenido, setCargandoContenido] = useState(true);
  const [errorContenido, setErrorContenido] = useState(false);
  const [buscarMod, setBuscarMod] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");

  const cargarContenido = () => {
    if (!user) return;
    setCargandoContenido(true);
    setErrorContenido(false);
    listarContenido()
      .then(setContenido)
      .catch(() => setErrorContenido(true))
      .finally(() => setCargandoContenido(false));
  };
  useEffect(cargarContenido, [user]);

  // ---------- Auditorías recientes (cruce "recomendado a", todos los módulos) ----------
  const [auditoriasRecientes, setAuditoriasRecientes] = useState<AuditoriaAdmin[]>([]);
  useEffect(() => {
    if (!user) return;
    listarAuditoriasAdmin({ limit: LIMITE_AUDITORIAS_RECIENTES })
      .then((res) => setAuditoriasRecientes(res.items))
      .catch(() => {});
  }, [user]);

  // ---------- Semana en curso (tarjeta de resumen — siempre la de HOY, sin importar qué semana se esté navegando) ----------
  const semanaActual = useMemo(() => lunesUTC(), []);
  const [calSemanaActual, setCalSemanaActual] = useState<AuditoriaAdmin[]>([]);
  useEffect(() => {
    if (!user) return;
    listarAuditoriasAdmin({ lunes: semanaActual })
      .then((res) => setCalSemanaActual(res.items))
      .catch(() => {});
  }, [user, semanaActual]);

  // ---------- Pestaña "Calificaciones por conjunto" ----------
  const [semana, setSemana] = useState(semanaActual);
  const [calSemana, setCalSemana] = useState<AuditoriaAdmin[]>([]);
  const [cargandoCal, setCargandoCal] = useState(true);
  const [errorCal, setErrorCal] = useState(false);
  const [nivelFiltro, setNivelFiltro] = useState<"" | NivelDesempeno>("");
  const [buscarCal, setBuscarCal] = useState("");
  const [calAbierta, setCalAbierta] = useState<string | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setCargandoCal(true);
    setErrorCal(false);
    listarAuditoriasAdmin({ lunes: semana })
      .then((res) => setCalSemana(res.items))
      .catch(() => setErrorCal(true))
      .finally(() => setCargandoCal(false));
    // Semana nueva: los filtros de la semana anterior ya no aplican.
    setNivelFiltro("");
    setCalAbierta(null);
  }, [user, semana]);

  const cambiarSemana = (dias: number) => {
    const [y, m, d] = semana.split("-").map(Number);
    const nueva = new Date(Date.UTC(y, m - 1, d + dias));
    setSemana(lunesUTC(nueva));
  };

  const conteoNiveles = useMemo(() => {
    const c = { BUENA: 0, REGULAR: 0, DEFICIENTE: 0 } as Record<string, number>;
    for (const a of calSemana) c[a.nivel_desempeno] = (c[a.nivel_desempeno] ?? 0) + 1;
    return c;
  }, [calSemana]);

  const calFiltradas = useMemo(() => {
    const q = buscarCal.trim().toLowerCase();
    return [...calSemana]
      .filter((a) => !nivelFiltro || a.nivel_desempeno === nivelFiltro)
      .filter((a) => !q || `${a.nombre_conjunto} ${a.tema_educativo} ${a.descripcion ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const orden: Record<string, number> = { DEFICIENTE: 0, REGULAR: 1, BUENA: 2, EXCELENTE: 2 };
        return (orden[a.nivel_desempeno] ?? 3) - (orden[b.nivel_desempeno] ?? 3) || (a.created_at < b.created_at ? 1 : -1);
      });
  }, [calSemana, nivelFiltro, buscarCal]);

  const auditoriaAbierta = calAbierta ? calSemana.find((a) => a.id_auditoria === calAbierta) : undefined;

  // ---------- Tarjeta "Sin recomendar" ----------
  const categorias = useMemo(() => {
    const vistas = new Set<string>();
    const out: string[] = [];
    for (const m of contenido) {
      if (!vistas.has(m.modulo_categoria)) {
        vistas.add(m.modulo_categoria);
        out.push(m.modulo_categoria);
      }
    }
    return out;
  }, [contenido]);
  const categoriasAuditables = useMemo(() => categorias.filter((c) => !CATEGORIAS_NO_AUDITABLES.has(c)), [categorias]);
  const sinRecomendar = useMemo(() => {
    const conRecomendacion = new Set(
      calSemanaActual.filter((a) => a.nivel_desempeno !== "BUENA" && a.nivel_desempeno !== "EXCELENTE").map((a) => a.tema_educativo)
    );
    return categoriasAuditables.filter((c) => !conRecomendacion.has(c)).length;
  }, [categoriasAuditables, calSemanaActual]);

  // ---------- Panel de un módulo (vista previa + recomendado a + enviar) ----------
  const [moduloAbierto, setModuloAbierto] = useState<string | null>(null);
  const [enviosDelModulo, setEnviosDelModulo] = useState<EnvioContenido[]>([]);
  const [cargandoEnvios, setCargandoEnvios] = useState(false);
  const [conjuntoUnico, setConjuntoUnico] = useState<ConjuntoOption | null>(null);
  const [conjuntosVarios, setConjuntosVarios] = useState<ConjuntoOption[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const moduloAbiertoObj = moduloAbierto ? contenido.find((m) => m.id_contenido === moduloAbierto) : undefined;

  useEffect(() => {
    if (!moduloAbierto) {
      setEnviosDelModulo([]);
      setConjuntoUnico(null);
      setConjuntosVarios([]);
      setErrorEnvio(null);
      return;
    }
    setCargandoEnvios(true);
    listarEnvios(moduloAbierto)
      .then(setEnviosDelModulo)
      .catch(() => setEnviosDelModulo([]))
      .finally(() => setCargandoEnvios(false));
  }, [moduloAbierto]);

  const destinatariosDelModuloAbierto = useMemo(() => {
    if (!moduloAbiertoObj) return [];
    return combinarConEnvios(destinatariosAutoDe(moduloAbiertoObj, auditoriasRecientes), enviosDelModulo);
  }, [moduloAbiertoObj, auditoriasRecientes, enviosDelModulo]);

  const refrescarTrasEnvio = () => {
    if (!moduloAbierto) return;
    setCargandoEnvios(true);
    listarEnvios(moduloAbierto)
      .then(setEnviosDelModulo)
      .finally(() => setCargandoEnvios(false));
  };

  const enviarAUno = async () => {
    if (!moduloAbierto || !conjuntoUnico) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await enviarContenido(moduloAbierto, [conjuntoUnico.id_conjunto_residencial]);
      setConjuntoUnico(null);
      refrescarTrasEnvio();
    } catch {
      setErrorEnvio(t(`${p}.send.error`));
    } finally {
      setEnviando(false);
    }
  };

  const enviarAVarios = async () => {
    if (!moduloAbierto || conjuntosVarios.length === 0) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await enviarContenido(
        moduloAbierto,
        conjuntosVarios.map((c) => c.id_conjunto_residencial)
      );
      setConjuntosVarios([]);
      refrescarTrasEnvio();
    } catch {
      setErrorEnvio(t(`${p}.send.error`));
    } finally {
      setEnviando(false);
    }
  };

  // ---------- Formulario crear/editar (con vista previa en vivo) ----------
  const [editando, setEditando] = useState<ContenidoEducativo | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState<ContenidoEducativoPayload>(FORM_VACIO);
  const [categoriaSeleccion, setCategoriaSeleccion] = useState("");
  const [nuevaCategoriaTexto, setNuevaCategoriaTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const abrirCrear = (categoriaPrevia?: string) => {
    setForm(FORM_VACIO);
    setCategoriaSeleccion(categoriaPrevia ?? "");
    setNuevaCategoriaTexto("");
    setFieldErrors({});
    setErrorMsg(null);
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
    setCategoriaSeleccion(item.modulo_categoria);
    setNuevaCategoriaTexto("");
    setFieldErrors({});
    setErrorMsg(null);
    setModuloAbierto(null);
    setEditando(item);
  };

  const cerrarFormulario = () => {
    setCreando(false);
    setEditando(null);
    setErrorMsg(null);
    setFieldErrors({});
  };

  const categoriaEfectiva = categoriaSeleccion === NUEVA_CATEGORIA ? nuevaCategoriaTexto.trim() : categoriaSeleccion;

  const actualizarCampo = <K extends keyof ContenidoEducativoPayload>(campo: K, valor: ContenidoEducativoPayload[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (fieldErrors[campo]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[campo];
        return copy;
      });
    }
  };

  const validarCampo = (campo: "categoria" | "titulo_tema" | "cuerpo_texto") => {
    let mensaje = "";
    if (campo === "categoria" && !categoriaEfectiva) mensaje = t(`${p}.validation.categoryRequired`);
    if (campo === "titulo_tema") {
      if (!form.titulo_tema.trim()) mensaje = t(`${p}.validation.titleRequired`);
      else if (form.titulo_tema.trim().length < 5) mensaje = t(`${p}.validation.titleTooShort`);
    }
    if (campo === "cuerpo_texto") {
      if (!form.cuerpo_texto.trim()) mensaje = t(`${p}.validation.bodyRequired`);
      else if (form.cuerpo_texto.trim().length < 20) mensaje = t(`${p}.validation.bodyTooShort`);
    }
    setFieldErrors((prev) => (mensaje ? { ...prev, [campo]: mensaje } : prev));
  };

  const formularioIncompleto = !categoriaEfectiva || !form.titulo_tema.trim() || !form.cuerpo_texto.trim();

  const guardar = async () => {
    if (!user) return;
    const errores: Record<string, string> = {};
    if (!categoriaEfectiva) errores.categoria = t(`${p}.validation.categoryRequired`);
    if (!form.titulo_tema.trim()) errores.titulo_tema = t(`${p}.validation.titleRequired`);
    else if (form.titulo_tema.trim().length < 5) errores.titulo_tema = t(`${p}.validation.titleTooShort`);
    if (!form.cuerpo_texto.trim()) errores.cuerpo_texto = t(`${p}.validation.bodyRequired`);
    else if (form.cuerpo_texto.trim().length < 20) errores.cuerpo_texto = t(`${p}.validation.bodyTooShort`);
    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      return;
    }
    setGuardando(true);
    setErrorMsg(null);
    const payload: ContenidoEducativoPayload = {
      modulo_categoria: categoriaEfectiva,
      titulo_tema: form.titulo_tema,
      cuerpo_texto: form.cuerpo_texto,
      url_video: form.url_video?.trim() || null,
      url_guia: form.url_guia?.trim() || null,
    };
    try {
      if (editando) {
        await editarContenido(editando.id_contenido, payload);
      } else {
        await crearContenido(payload);
      }
      cerrarFormulario();
      cargarContenido();
    } catch {
      setErrorMsg(t("common.saveError"));
    } finally {
      setGuardando(false);
    }
  };

  const [aEliminar, setAEliminar] = useState<ContenidoEducativo | null>(null);
  const confirmarEliminar = async () => {
    if (!user || !aEliminar) return;
    try {
      await eliminarContenido(aEliminar.id_contenido);
      setAEliminar(null);
      if (moduloAbierto === aEliminar.id_contenido) setModuloAbierto(null);
      cargarContenido();
    } catch {
      setErrorMsg(t(`${p}.deleteError`));
    }
  };

  // ¿Qué? Envuelve la línea (o la selección) actual del textarea en la
  //       sintaxis Markdown elegida — mismo patrón para las 3 opciones,
  //       aplicado sobre selectionStart/End del elemento real.
  const aplicarFormato = (tipo: "h" | "b" | "ul") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: a, selectionEnd: b, value: v } = ta;
    let nuevoValor: string;
    let cursorFinal: number;
    if (tipo === "b") {
      const texto = v.slice(a, b) || t(`${p}.fields.boldPlaceholder`);
      nuevoValor = v.slice(0, a) + `**${texto}**` + v.slice(b);
      cursorFinal = a + 2 + texto.length;
    } else {
      const inicioLinea = v.lastIndexOf("\n", a - 1) + 1;
      let finBloque = v.indexOf("\n", b);
      if (finBloque === -1) finBloque = v.length;
      const prefijo = tipo === "h" ? "## " : "- ";
      const bloque = v
        .slice(inicioLinea, finBloque)
        .split("\n")
        .map((l) => prefijo + l)
        .join("\n");
      nuevoValor = v.slice(0, inicioLinea) + bloque + v.slice(finBloque);
      cursorFinal = inicioLinea + bloque.length;
    }
    actualizarCampo("cuerpo_texto", nuevoValor);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorFinal, cursorFinal);
    });
  };

  const idVideoReconocido = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/.test(form.url_video || "");

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex items-center gap-4 bg-[#f7f9f3] dark:bg-[#1c341b] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-100 dark:bg-accent-900/30">
          <BookOpen className="h-7 w-7 text-accent-700 dark:text-accent-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t(`${p}.title`)}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t(`${p}.subtitle`)}</p>
        </div>
      </div>

      {/* Franja de resumen — igual patrón que el Panel Principal: antes de
          la tabla, no encima de ella. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-100 bg-[#f7f9f3] p-5 shadow-sm dark:border-[#2a4d34] dark:bg-[#1c341b]">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t(`${p}.newSection.title`)}</h3>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <button
              type="button"
              onClick={() => abrirCrear()}
              className="cursor-pointer rounded-xl bg-accent-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-600"
            >
              {t(`${p}.newModule`)}
            </button>
            <button
              type="button"
              onClick={() => abrirCrear(NUEVA_CATEGORIA)}
              className="cursor-pointer rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34]"
            >
              {t(`${p}.newSection.newCategory`)}
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-gray-100 bg-[#f7f9f3] p-5 shadow-sm dark:border-[#2a4d34] dark:bg-[#1c341b]">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t(`${p}.catalogSection.title`)}</h3>
          </div>
          <div className="grid flex-1 grid-cols-3 items-center gap-2">
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{contenido.length}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{t(`${p}.catalogSection.modules`)}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{categorias.length}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{t(`${p}.catalogSection.categories`)}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{sinRecomendar}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{t(`${p}.catalogSection.notRecommended`)}</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {sinRecomendar > 0 ? t(`${p}.catalogSection.notRecommendedHint`, { count: sinRecomendar }) : t(`${p}.catalogSection.allCovered`)}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-gray-100 bg-[#f7f9f3] p-5 shadow-sm dark:border-[#2a4d34] dark:bg-[#1c341b]">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t(`${p}.currentWeek.title`, { rango: rangoSemanaUTC(semanaActual) })}</h3>
          </div>
          <div className="grid flex-1 grid-cols-3 items-center gap-2">
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{calSemanaActual.filter((a) => a.nivel_desempeno === "BUENA" || a.nivel_desempeno === "EXCELENTE").length}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{t(`${p}.currentWeek.good`)}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{calSemanaActual.filter((a) => a.nivel_desempeno === "REGULAR").length}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{t(`${p}.currentWeek.regular`)}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{calSemanaActual.filter((a) => a.nivel_desempeno === "DEFICIENTE").length}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{t(`${p}.currentWeek.bad`)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#f7f9f3] dark:bg-[#1c341b] rounded-2xl border border-gray-100 dark:border-[#2a4d34] shadow-sm overflow-hidden">
        {/* ¿Qué? Toda la barra recoge/expande al hacer clic (no solo el
            texto "Recoger"/"Ver..." de la derecha) — las pestañas cortan la
            propagación para que elegir una NO dispare también el toggle,
            ya que un <button> no puede ir anidado dentro de otro <button>
            (por eso esta barra es un <div>, no un <button>, a diferencia
            del encabezado de "Usuarios registrados" en AdminDashboard.tsx,
            que sí es un solo <button> porque no tiene pestañas adentro). */}
        <div
          onClick={() => setPanelExpandido((v) => !v)}
          className="flex flex-wrap cursor-pointer items-center justify-between gap-2 px-5 py-4"
        >
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-[#2a4d34] dark:bg-[#0d2116]/60">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTab("cal");
              }}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === "cal" ? "bg-accent-700 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              {t(`${p}.tabs.ratings`)}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTab("mod");
              }}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === "mod" ? "bg-accent-700 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              {t(`${p}.tabs.modules`)}
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPanelExpandido((v) => !v);
            }}
            aria-expanded={panelExpandido}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-[#0d2116]/60 dark:hover:text-gray-200"
          >
            {panelExpandido ? t(`${p}.collapse`) : tab === "cal" ? t(`${p}.expandRatings`) : t(`${p}.expandModules`)}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${panelExpandido ? "rotate-180" : ""}`} />
          </button>
        </div>

        {panelExpandido && (tab === "cal" ? (
          <div>
            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-5 py-4 dark:border-[#2a4d34]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => cambiarSemana(-7)}
                  aria-label={t(`${p}.week.prev`)}
                  className="cursor-pointer rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-400 dark:hover:bg-[#2a4d34]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="min-w-[130px] text-center">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{rangoSemanaUTC(semana)}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{t(`${p}.week.mondayToSunday`)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => cambiarSemana(7)}
                  disabled={semana >= semanaActual}
                  aria-label={t(`${p}.week.next`)}
                  className="cursor-pointer rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-[#2a4d34] dark:text-gray-400 dark:hover:bg-[#2a4d34]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  semana === semanaActual
                    ? "bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400"
                    : "bg-gray-100 text-gray-500 dark:bg-[#0d2116] dark:text-gray-400"
                }`}
              >
                {semana === semanaActual ? t(`${p}.week.inProgress`) : t(`${p}.week.closed`, { fecha: domingoDeLunesUTC(semana).getUTCDate() })}
              </span>
              <div className="relative ml-auto">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  value={buscarCal}
                  onChange={(e) => setBuscarCal(e.target.value)}
                  placeholder={t(`${p}.week.searchPlaceholder`)}
                  aria-label={t(`${p}.week.searchPlaceholder`)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-[#2a4d34] dark:bg-[#132a1c] dark:text-gray-200 sm:w-56"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 pb-4 dark:border-[#2a4d34]">
              {(["" , "DEFICIENTE", "REGULAR", "BUENA"] as const).map((nivel) => (
                <button
                  key={nivel || "todas"}
                  type="button"
                  onClick={() => setNivelFiltro(nivel)}
                  aria-pressed={nivelFiltro === nivel}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    nivelFiltro === nivel
                      ? "border-accent-600 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400"
                      : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-[#2a4d34] dark:bg-[#132a1c] dark:text-gray-400"
                  }`}
                >
                  {nivel === "" ? t(`${p}.week.all`, { count: calSemana.length }) : `${t(`dashboards.reciclador.auditoria.niveles.${nivel.toLowerCase()}`)} ${conteoNiveles[nivel] ?? 0}`}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-[#2a4d34] dark:bg-[#0d2116]/60">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.week.headers.conjunto`)}</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.week.headers.tema`)}</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.week.headers.nivel`)}</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.week.headers.observaciones`)}</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.week.headers.fecha`)}</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.week.headers.avisados`)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {cargandoCal ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-6">
                        <LoadingState message={t("common.loading")} />
                      </td>
                    </tr>
                  ) : errorCal ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-6">
                        <Alert type="error" message={t("common.loadError")} />
                      </td>
                    </tr>
                  ) : calFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t(`${p}.week.empty`)}
                      </td>
                    </tr>
                  ) : (
                    calFiltradas.map((a) => {
                      const nivel = NIVELES_DESEMPENO[a.nivel_desempeno];
                      return (
                        <tr
                          key={a.id_auditoria}
                          onClick={() => setCalAbierta(a.id_auditoria)}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0d2116]/40 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <button type="button" className="cursor-pointer text-left font-semibold text-gray-900 underline decoration-gray-200 underline-offset-4 hover:text-accent-700 hover:decoration-accent-600 dark:text-white dark:decoration-[#2a4d34]">
                              {a.nombre_conjunto}
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{a.nombre_reciclador}</p>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{a.tema_educativo}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${nivel.claseBadge}`}>
                              <nivel.icon className="h-3.5 w-3.5" />
                              {t(`dashboards.reciclador.auditoria.niveles.${a.nivel_desempeno.toLowerCase()}`)}
                            </span>
                          </td>
                          <td className="max-w-[220px] px-5 py-3 text-xs text-gray-600 dark:text-gray-300">
                            {a.descripcion ? <span className="line-clamp-2">{a.descripcion}</span> : <span className="italic text-gray-400 dark:text-gray-500">{t(`${p}.week.noObservations`)}</span>}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-500 dark:text-gray-400">{formatearFechaCreacion(a.created_at)}</td>
                          <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">
                            {a.avisados > 0 ? t(`${p}.week.notified`, { count: a.avisados }) : <span className="text-gray-400 dark:text-gray-500">{t(`${p}.week.noRecommendation`)}</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-5 py-4 dark:border-[#2a4d34]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  value={buscarMod}
                  onChange={(e) => setBuscarMod(e.target.value)}
                  placeholder={t(`${p}.modules.searchPlaceholder`)}
                  aria-label={t(`${p}.modules.searchPlaceholder`)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-[#2a4d34] dark:bg-[#132a1c] dark:text-gray-200 sm:w-56"
                />
              </div>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                aria-label={t(`${p}.modules.categoryFilterLabel`)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-[#2a4d34] dark:bg-[#132a1c] dark:text-gray-200"
              >
                <option value="">{t(`${p}.modules.allCategories`)}</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-[#0d2116] dark:text-gray-300">
                {t(`${p}.modules.total`, { count: contenido.length })}
              </span>
            </div>

            {cargandoContenido && (
              <div className="px-5 py-6">
                <LoadingState message={t("common.loading")} />
              </div>
            )}
            {!cargandoContenido && errorContenido && (
              <div className="px-5 py-6">
                <Alert type="error" message={t("catalogoEducativo.loadError")} />
              </div>
            )}
            {!cargandoContenido && !errorContenido && contenido.length === 0 && (
              <div className="px-5 py-6">
                <EmptyState icon={BookOpen} message={t(`${p}.emptyState`)} />
              </div>
            )}

            <div className="space-y-3 p-5 pt-3">
              {contenido
                .filter((m) => !categoriaFiltro || m.modulo_categoria === categoriaFiltro)
                .filter((m) => {
                  const q = buscarMod.trim().toLowerCase();
                  return !q || `${m.titulo_tema} ${m.modulo_categoria}`.toLowerCase().includes(q);
                })
                .map((item) => {
                  const Icono = ICONOS_CATEGORIAS[item.modulo_categoria] ?? ICONO_CATEGORIA_DEFAULT;
                  const nRecomendados = destinatariosAutoDe(item, auditoriasRecientes).length;
                  return (
                    <div
                      key={item.id_contenido}
                      onClick={() => setModuloAbierto(item.id_contenido)}
                      className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-[#f7f9f3] p-4 transition-colors hover:bg-gray-50 dark:border-[#2a4d34] dark:bg-[#1c341b] dark:hover:bg-[#0d2116]/40"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-500">
                          <Icono className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-500">{item.modulo_categoria}</p>
                          <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{item.titulo_tema}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatearFechaCreacion(item.fecha_publicacion)}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {nRecomendados > 0 && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                            {t(`${p}.modules.recommendedTo`, { count: nRecomendados })}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirEditar(item);
                          }}
                          className="cursor-pointer rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34]"
                          aria-label={t(`${p}.editAria`, { titulo: item.titulo_tema })}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAEliminar(item);
                          }}
                          className="cursor-pointer rounded-lg border border-gray-200 p-2 text-red-500 transition-colors hover:bg-red-50 dark:border-[#2a4d34] dark:hover:bg-red-900/20"
                          aria-label={t(`${p}.deleteAria`, { titulo: item.titulo_tema })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* ---------- Panel: detalle de una calificación ---------- */}
      {auditoriaAbierta && (
        <PanelLateral onClose={() => setCalAbierta(null)} aria-label={t(`${p}.ratingPanel.ariaLabel`, { conjunto: auditoriaAbierta.nombre_conjunto })}>
          <div className="border-b border-gray-100 p-5 pr-14 dark:border-[#2a4d34]">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{auditoriaAbierta.nombre_conjunto}</h2>
            {(() => {
              const nivel = NIVELES_DESEMPENO[auditoriaAbierta.nivel_desempeno];
              return (
                <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${nivel.claseBadge}`}>
                  <nivel.icon className="h-3.5 w-3.5" />
                  {t(`dashboards.reciclador.auditoria.niveles.${auditoriaAbierta.nivel_desempeno.toLowerCase()}`)}
                </div>
              );
            })()}
          </div>

          <section className="border-b border-gray-100 p-5 dark:border-[#2a4d34]">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.ratingPanel.details`)}</h3>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-gray-500 dark:text-gray-400">{t(`${p}.ratingPanel.theme`)}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{auditoriaAbierta.tema_educativo}</dd>
              <dt className="text-gray-500 dark:text-gray-400">{t(`${p}.ratingPanel.date`)}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{formatearFechaCreacion(auditoriaAbierta.created_at)}</dd>
              <dt className="text-gray-500 dark:text-gray-400">{t(`${p}.ratingPanel.recycler`)}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{auditoriaAbierta.nombre_reciclador}</dd>
            </dl>
          </section>

          <section className="border-b border-gray-100 p-5 dark:border-[#2a4d34]">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.ratingPanel.observations`)}</h3>
            {auditoriaAbierta.descripcion ? (
              <p className="border-l-2 border-gray-200 pl-3 text-sm text-gray-800 dark:border-[#2a4d34] dark:text-gray-200">{auditoriaAbierta.descripcion}</p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t(`${p}.week.noObservations`)}</p>
            )}
          </section>

          <section className="border-b border-gray-100 p-5 dark:border-[#2a4d34]">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.ratingPanel.evidence`)}</h3>
            <div className="grid grid-cols-3 gap-2">
              {[auditoriaAbierta.ruta_evidencia, auditoriaAbierta.ruta_evidencia_2, auditoriaAbierta.ruta_evidencia_3]
                .filter((r): r is string => Boolean(r))
                .map((ruta) => (
                  <button
                    key={ruta}
                    type="button"
                    onClick={() => setFotoAmpliada(ruta)}
                    className="aspect-square cursor-pointer overflow-hidden rounded-xl border border-gray-100 transition-opacity hover:opacity-80 dark:border-[#2a4d34]"
                    aria-label={t(`${p}.ratingPanel.enlarge`)}
                  >
                    <img src={`${API_BASE_URL}${ruta}`} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
            </div>
          </section>

          <section className="p-5">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.ratingPanel.recommendedContent`)}</h3>
            {auditoriaAbierta.avisados > 0 ? (
              <>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">{t(`${p}.week.notified`, { count: auditoriaAbierta.avisados })}</p>
                {contenido
                  .filter((m) => m.modulo_categoria === auditoriaAbierta.tema_educativo)
                  .map((m) => (
                    <button
                      key={m.id_contenido}
                      type="button"
                      onClick={() => {
                        setCalAbierta(null);
                        setTab("mod");
                        setModuloAbierto(m.id_contenido);
                      }}
                      className="mb-1.5 flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50 dark:border-[#2a4d34] dark:bg-[#132a1c] dark:text-gray-200 dark:hover:bg-[#0d2116]"
                    >
                      {m.titulo_tema}
                      <Eye className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    </button>
                  ))}
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t(`${p}.ratingPanel.noRecommendationHint`)}</p>
            )}
          </section>
        </PanelLateral>
      )}

      {fotoAmpliada && (
        <Modal onClose={() => setFotoAmpliada(null)} layer="stacked" wide aria-label={t(`${p}.ratingPanel.enlarge`)}>
          {/* ¿Qué? A diferencia de una foto de evidencia (siempre una ruta
              relativa /uploads/...), la imagen de la guía puede venir de un
              link externo pegado a mano — ya trae http(s) y no hay que
              completarla con la URL del backend. */}
          <img
            src={fotoAmpliada.startsWith("http") ? fotoAmpliada : `${API_BASE_URL}${fotoAmpliada}`}
            alt=""
            className="max-h-[80vh] w-full rounded-2xl object-contain"
          />
        </Modal>
      )}

      {/* ---------- Panel: un módulo (vista previa + recomendado a + enviar) ---------- */}
      {moduloAbiertoObj && (
        <PanelLateral onClose={() => setModuloAbierto(null)} aria-label={t(`${p}.modulePanel.ariaLabel`, { titulo: moduloAbiertoObj.titulo_tema })}>
          <div className="border-b border-gray-100 p-5 pr-14 dark:border-[#2a4d34]">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-500">{moduloAbiertoObj.modulo_categoria}</span>
            <h2 className="mt-1 text-base font-bold text-gray-900 dark:text-white">{moduloAbiertoObj.titulo_tema}</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatearFechaCreacion(moduloAbiertoObj.fecha_publicacion)}</p>
          </div>

          <section className="border-b border-gray-100 p-5 dark:border-[#2a4d34]">
            <ReactMarkdown components={COMPONENTES_MARKDOWN}>{moduloAbiertoObj.cuerpo_texto}</ReactMarkdown>
            {moduloAbiertoObj.url_video && <YoutubeEmbed url={moduloAbiertoObj.url_video} titulo={moduloAbiertoObj.titulo_tema} />}
            {moduloAbiertoObj.url_guia && (
              esImagenGuia(moduloAbiertoObj.url_guia) ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setFotoAmpliada(moduloAbiertoObj.url_guia!)}
                    className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-gray-100 dark:border-[#2a4d34]"
                    aria-label={t(`${p}.ratingPanel.enlarge`)}
                  >
                    <img
                      src={moduloAbiertoObj.url_guia.startsWith("http") ? moduloAbiertoObj.url_guia : `${API_BASE_URL}${moduloAbiertoObj.url_guia}`}
                      alt=""
                      className="max-h-64 w-full object-cover"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Maximize2 className="h-3.5 w-3.5" />
                    </span>
                  </button>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{t(`${p}.modulePanel.guideImageHint`)}</p>
                </div>
              ) : (
                <a
                  href={moduloAbiertoObj.url_guia.startsWith("http") ? moduloAbiertoObj.url_guia : `${API_BASE_URL}${moduloAbiertoObj.url_guia}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-fit items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-200 dark:hover:bg-[#2a4d34]"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  {t("categoriaEducativa.viewGuide")}
                </a>
              )
            )}
          </section>

          <section className="border-b border-gray-100 p-5 dark:border-[#2a4d34]">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t(`${p}.modulePanel.recommendedTo`, { count: destinatariosDelModuloAbierto.length })}
            </h3>
            {cargandoEnvios ? (
              <LoadingState message={t("common.loading")} />
            ) : destinatariosDelModuloAbierto.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t(`${p}.modulePanel.noneYet`)}</p>
            ) : (
              <div className="space-y-2">
                {destinatariosDelModuloAbierto.map((d) => (
                  <div key={d.id_conjunto_residencial} className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2 text-sm first:border-t-0 first:pt-0 dark:border-[#2a4d34]">
                    <span className="flex-1 font-semibold text-gray-900 dark:text-white">{d.nombre_conjunto}</span>
                    {d.tipo === "auto" && d.nivel ? (
                      (() => {
                        const nivel = NIVELES_DESEMPENO[d.nivel];
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${nivel.claseBadge}`}>
                            <nivel.icon className="h-3 w-3" />
                            {t(`dashboards.reciclador.auditoria.niveles.${d.nivel.toLowerCase()}`)}
                          </span>
                        );
                      })()
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                        <Send className="h-3 w-3" />
                        {t(`${p}.modulePanel.sentManually`)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatearFechaCreacion(d.fecha)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="border-b border-gray-100 p-5 dark:border-[#2a4d34]">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.send.title`)}</h3>
            {errorEnvio && (
              <div className="mb-3">
                <Alert type="error" message={errorEnvio} onClose={() => setErrorEnvio(null)} />
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">{t(`${p}.send.oneLabel`)}</label>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1 [&_input]:!mt-0">
                    <ConjuntoCombobox value={conjuntoUnico} onChange={setConjuntoUnico} fetchOptions={fetchConjuntos} placeholder={t(`${p}.send.searchPlaceholder`)} ariaLabel={t(`${p}.send.oneLabel`)} />
                  </div>
                  <Button type="button" size="sm" onClick={enviarAUno} isLoading={enviando} disabled={!conjuntoUnico}>
                    <Send className="mr-1 h-3.5 w-3.5" />
                    {t(`${p}.send.button`)}
                  </Button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">{t(`${p}.send.severalLabel`)}</label>
                <ConjuntoComboboxMultiple value={conjuntosVarios} onChange={setConjuntosVarios} fetchOptions={fetchConjuntos} placeholder={t(`${p}.send.searchPlaceholder`)} ariaLabel={t(`${p}.send.severalLabel`)} />
                <Button type="button" size="sm" fullWidth onClick={enviarAVarios} isLoading={enviando} disabled={conjuntosVarios.length === 0}>
                  <Send className="mr-1 h-3.5 w-3.5" />
                  {conjuntosVarios.length > 0 ? t(`${p}.send.buttonMany`, { count: conjuntosVarios.length }) : t(`${p}.send.button`)}
                </Button>
              </div>
            </div>
          </section>

          <div className="sticky bottom-0 mt-auto flex flex-wrap gap-2 border-t border-gray-100 bg-[#f7f9f3] p-5 dark:border-[#2a4d34] dark:bg-[#1c341b]">
            <Button type="button" size="sm" onClick={() => abrirEditar(moduloAbiertoObj)}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
            <Button type="button" size="sm" variant="danger" onClick={() => setAEliminar(moduloAbiertoObj)}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {t(`${p}.deleteConfirm.confirm`)}
            </Button>
          </div>
        </PanelLateral>
      )}

      {/* ---------- Formulario crear/editar, con vista previa en vivo ---------- */}
      {(creando || editando) && (
        <Modal onClose={cerrarFormulario} extraWide closeOnBackdrop={false} aria-label={editando ? t(`${p}.modal.editTitle`) : t(`${p}.newModule`)}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="space-y-4 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editando ? t(`${p}.modal.editTitle`) : t(`${p}.newModule`)}</h2>

              {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}

              <div>
                <label htmlFor="contenido-categoria" className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t(`${p}.fields.category`)} <span className="text-red-500">*</span>
                </label>
                <select
                  id="contenido-categoria"
                  value={categoriaSeleccion}
                  onChange={(e) => setCategoriaSeleccion(e.target.value)}
                  onBlur={() => validarCampo("categoria")}
                  className={`w-full cursor-pointer rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:bg-[#1f4029] dark:text-white ${
                    fieldErrors.categoria ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400" : "border-gray-200 focus:border-accent-500 focus:ring-accent-500/20 dark:border-[#2a4d34]"
                  }`}
                >
                  <option value="">{t(`${p}.fields.categoryPlaceholderSelect`)}</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value={NUEVA_CATEGORIA}>{t(`${p}.fields.newCategoryOption`)}</option>
                </select>
                {categoriaSeleccion === NUEVA_CATEGORIA && (
                  <div className="mt-2">
                    <input
                      value={nuevaCategoriaTexto}
                      onChange={(e) => setNuevaCategoriaTexto(e.target.value)}
                      onBlur={() => validarCampo("categoria")}
                      placeholder={t(`${p}.fields.categoryPlaceholder`)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/20 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                    />
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t(`${p}.fields.newCategoryWarning`)}</p>
                  </div>
                )}
                {fieldErrors.categoria && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.categoria}</p>}
              </div>

              <InputField
                label={t(`${p}.fields.titleField`)}
                name="titulo_tema"
                value={form.titulo_tema}
                onChange={(e) => actualizarCampo("titulo_tema", e.target.value)}
                onBlur={() => validarCampo("titulo_tema")}
                placeholder={t(`${p}.fields.titlePlaceholder`)}
                error={fieldErrors.titulo_tema}
              />

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="contenido-cuerpo" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t(`${p}.fields.content`)} <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">{t(`${p}.fields.charCount`, { count: form.cuerpo_texto.length })}</span>
                </div>
                <div className="mb-1.5 flex gap-1.5">
                  <button type="button" onClick={() => aplicarFormato("h")} className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34]">
                    <Heading2 className="h-3.5 w-3.5" />
                    {t(`${p}.fields.formatHeading`)}
                  </button>
                  <button type="button" onClick={() => aplicarFormato("b")} className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34]">
                    <Bold className="h-3.5 w-3.5" />
                    {t(`${p}.fields.formatBold`)}
                  </button>
                  <button type="button" onClick={() => aplicarFormato("ul")} className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34]">
                    <ListIcon className="h-3.5 w-3.5" />
                    {t(`${p}.fields.formatList`)}
                  </button>
                </div>
                <textarea
                  id="contenido-cuerpo"
                  ref={textareaRef}
                  value={form.cuerpo_texto}
                  onChange={(e) => actualizarCampo("cuerpo_texto", e.target.value)}
                  onBlur={() => validarCampo("cuerpo_texto")}
                  rows={7}
                  aria-invalid={!!fieldErrors.cuerpo_texto}
                  aria-describedby={fieldErrors.cuerpo_texto ? "contenido-cuerpo-error" : undefined}
                  className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:bg-[#1f4029] dark:text-white ${
                    fieldErrors.cuerpo_texto ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400" : "border-gray-200 focus:border-accent-500 focus:ring-accent-500/20 dark:border-[#2a4d34]"
                  }`}
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t(`${p}.fields.contentMarkdownHint`)}</p>
                {fieldErrors.cuerpo_texto && (
                  <p id="contenido-cuerpo-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                    {fieldErrors.cuerpo_texto}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="contenido-url-video" className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t(`${p}.fields.videoLink`)}
                </label>
                <input
                  id="contenido-url-video"
                  value={form.url_video ?? ""}
                  onChange={(e) => actualizarCampo("url_video", e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-white"
                />
                {form.url_video?.trim() && (
                  <p className={`mt-1 text-xs font-semibold ${idVideoReconocido ? "text-accent-600 dark:text-accent-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {idVideoReconocido ? t(`${p}.fields.videoRecognized`) : t(`${p}.fields.videoNotRecognized`)}
                  </p>
                )}
              </div>

              <GuiaApoyoField label={t(`${p}.fields.guideLink`)} value={form.url_guia ?? ""} onChange={(url) => actualizarCampo("url_guia", url)} />

              <div className="flex gap-2 pt-2">
                <button
                  onClick={cerrarFormulario}
                  className="flex-1 cursor-pointer rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34] transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={guardar}
                  disabled={guardando || formularioIncompleto}
                  className="flex-1 cursor-pointer rounded-xl bg-accent-700 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                >
                  {guardando ? t("common.saving") : formularioIncompleto ? t("common.formIncomplete") : t("common.save")}
                </button>
              </div>
            </div>

            {/* ¿Qué? Vista previa en vivo — exactamente los mismos componentes
                que usa CategoriaEducativaPage.tsx (lo que ve el Residente),
                para que esto no sea "una aproximación" sino el resultado real. */}
            <aside className="border-t border-gray-100 bg-[#f7f9f3] p-6 dark:border-[#2a4d34] dark:bg-[#132a1c] sm:p-8 md:border-l md:border-t-0">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t(`${p}.preview.label`)}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500 dark:bg-[#0d2116] dark:text-gray-400">{t(`${p}.preview.live`)}</span>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2a4d34] dark:bg-[#1c341b]">
                {(() => {
                  const Icono = categoriaEfectiva ? ICONOS_CATEGORIAS[categoriaEfectiva] ?? ICONO_CATEGORIA_DEFAULT : BookOpen;
                  return (
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-500">
                        <Icono className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-500">
                        {categoriaEfectiva || t(`${p}.preview.categoryPlaceholder`)}
                      </span>
                    </div>
                  );
                })()}
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{form.titulo_tema || t(`${p}.preview.titlePlaceholder`)}</h3>
                {form.cuerpo_texto.trim() ? (
                  <ReactMarkdown components={COMPONENTES_MARKDOWN}>{form.cuerpo_texto}</ReactMarkdown>
                ) : (
                  <p className="mt-2 text-sm italic text-gray-400 dark:text-gray-500">{t(`${p}.preview.bodyPlaceholder`)}</p>
                )}
                {form.url_video?.trim() && idVideoReconocido && <YoutubeEmbed url={form.url_video} titulo={form.titulo_tema || t(`${p}.preview.titlePlaceholder`)} />}
                {form.url_guia?.trim() && (
                  <p className="mt-3 flex w-fit items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 dark:border-[#2a4d34] dark:text-gray-200">
                    <FileText className="h-4 w-4 shrink-0" />
                    {t("categoriaEducativa.viewGuide")}
                  </p>
                )}
              </div>
            </aside>
          </div>
        </Modal>
      )}

      {aEliminar && (
        <ConfirmModal
          icon={Trash2}
          variant="danger"
          layer={moduloAbierto ? "stacked" : "base"}
          ariaLabel={t(`${p}.modal.deleteAriaLabel`)}
          title={t(`${p}.deleteConfirm.title`, { titulo: aEliminar.titulo_tema })}
          description={t(`${p}.deleteConfirm.warning`)}
          confirmLabel={t(`${p}.deleteConfirm.confirm`)}
          onConfirm={confirmarEliminar}
          onClose={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
