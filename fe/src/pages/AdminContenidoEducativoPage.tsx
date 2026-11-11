import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Calendar,
  FileText,
  ImagePlus,
  List as ListIcon,
  Bold,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Modal } from "@/components/ui/Modal";
import { MenuAcciones } from "@/components/ui/MenuAcciones";
import { AuditoriaResultadoModal } from "@/components/dashboard/AuditoriaResultadoModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Alert } from "@/components/ui/Alert";
import { InputField } from "@/components/ui/InputField";
import { GuiaApoyoField } from "@/components/ui/GuiaApoyoField";
import { ImagenAdjuntaField } from "@/components/ui/ImagenAdjuntaField";
import { CategoriaField, type ModoCategoria } from "@/components/educativo/CategoriaField";
import { ResumenMuro } from "@/components/educativo/ResumenMuro";
import { VistaPreviaModulo } from "@/components/educativo/VistaPreviaModulo";
import { Pestanas } from "@/components/ui/Pestanas";
import { categoriaDuplicada } from "@/lib/categoriaEducativa";
import { subirAdjunto } from "@/lib/uploadsApi";
import { motivoDelServidor } from "@/api/axios";
import { ICONOS_CATEGORIAS, ICONO_CATEGORIA_DEFAULT, CATEGORIAS_NO_AUDITABLES } from "@/config/categoriasEducativas";
import { formatearFechaCreacion, lunesBogota, rangoSemanaUTC } from "@/lib/dateFormat";
import {
  crearContenido,
  editarContenido,
  eliminarContenido,
  listarContenido,
  listarEnvios,
  type ContenidoEducativo,
  type ContenidoEducativoPayload,
  type EnvioContenido,
} from "@/lib/contenidoEducativoApi";
import {
  CONTENIDO_CUERPO_MAX_LENGTH,
  CONTENIDO_TITULO_MAX_LENGTH,
  ENLACE_MAX_LENGTH,
  REGEX_VIDEO_YOUTUBE,
} from "@/lib/validacion";
import {
  listarAuditoriasAdmin,
  obtenerResumenSemanaAdmin,
  type AuditoriaAdmin,
  type ResumenSemanaAdmin,
} from "@/lib/auditoriaConjuntoApi";
import { CalificacionesPorConjunto } from "@/components/educativo/CalificacionesPorConjunto";
import { ContenidoRecomendadoCalificacion } from "@/components/educativo/ContenidoRecomendadoCalificacion";
import { EnviarAConjuntosModal } from "@/components/educativo/EnviarAConjuntosModal";
import { ModuloEducativoModal } from "@/components/educativo/ModuloEducativoModal";
import { combinarConEnvios, destinatariosAutoDe } from "@/lib/destinatariosModulo";
import { Button } from "@/components/ui/Button";


const FORM_VACIO: ContenidoEducativoPayload = {
  modulo_categoria: "",
  titulo_tema: "",
  cuerpo_texto: "",
  url_video: "",
  url_guia: "",
  url_imagen: "",
};

// ¿Qué? Cuántas auditorías "de todos los tiempos" se piden para cruzar
//       "a qué conjuntos se recomendó cada módulo" en la tabla y en el
//       resumen — no toda la historia, las más recientes alcanzan para el
//       tamaño real de este catálogo (6-20 módulos).
const LIMITE_AUDITORIAS_RECIENTES = 100;

export function AdminContenidoEducativoPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const p = "adminContenidoEducativo";

  const [tab, setTab] = useState<"cal" | "mod">("cal");

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
  // ¿Qué? true cuando ya terminó de pedirlas (con o sin éxito): la tabla de Calificaciones espera esto para decidir
  //       si abre en la última semana con datos (issue #618).
  const [recientesCargadas, setRecientesCargadas] = useState(false);
  useEffect(() => {
    if (!user) return;
    listarAuditoriasAdmin({ limit: LIMITE_AUDITORIAS_RECIENTES })
      .then((res) => setAuditoriasRecientes(res.items))
      .catch(() => {})
      .finally(() => setRecientesCargadas(true));
  }, [user]);

  // ---------- Semana en curso (tarjeta de resumen — siempre la de HOY, sin importar qué periodo se esté viendo) ----------
  // ¿Qué? La semana de hoy en hora de Bogotá, igual que la corta el backend.
  // ¿Para qué? Issue #618: los conteos y los temas con recomendación los calcula el servidor (antes se traían
  //           todas las calificaciones de la semana al navegador solo para contarlas).
  const semanaActual = useMemo(() => lunesBogota(), []);
  const [resumenSemana, setResumenSemana] = useState<ResumenSemanaAdmin | null>(null);
  useEffect(() => {
    if (!user) return;
    obtenerResumenSemanaAdmin(semanaActual)
      .then(setResumenSemana)
      .catch(() => {});
  }, [user, semanaActual]);

  // ---------- Pestaña "Calificaciones por conjunto" ----------
  // ¿Qué? La tabla, el periodo y los filtros viven en CalificacionesPorConjunto; aquí solo se guarda cuál
  //       calificación está abierta en su modal de detalle.
  const [calAbierta, setCalAbierta] = useState<AuditoriaAdmin | null>(null);

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
    const conRecomendacion = new Set(resumenSemana?.temas_con_recomendacion ?? []);
    return categoriasAuditables.filter((c) => !conRecomendacion.has(c)).length;
  }, [categoriasAuditables, resumenSemana]);

  // ---------- Módulo abierto (modal de ver) y su envío a conjuntos ----------
  // ¿Qué? Los envíos manuales de cada módulo que ya se pidieron, por id. La lista los usa para el chip
  //       "Recomendado a N conjuntos" y el modal de ver para su pestaña; se actualizan al abrir un módulo y al enviar.
  // ¿Para qué? Issue #619: que enviar a conjuntos cambie el chip de la lista sin recargar la página.
  const [moduloAbierto, setModuloAbierto] = useState<string | null>(null);
  const [enviosPorModulo, setEnviosPorModulo] = useState<Record<string, EnvioContenido[]>>({});
  const [cargandoEnvios, setCargandoEnvios] = useState(false);
  const [aEnviar, setAEnviar] = useState<ContenidoEducativo | null>(null);

  const moduloAbiertoObj = moduloAbierto ? contenido.find((m) => m.id_contenido === moduloAbierto) : undefined;

  const cargarEnvios = (idContenido: string) => {
    setCargandoEnvios(true);
    listarEnvios(idContenido)
      .then((envios) => setEnviosPorModulo((previos) => ({ ...previos, [idContenido]: envios })))
      .catch(() => {})
      .finally(() => setCargandoEnvios(false));
  };

  useEffect(() => {
    if (moduloAbierto) cargarEnvios(moduloAbierto);
  }, [moduloAbierto]);

  const destinatariosDe = (modulo: ContenidoEducativo) =>
    combinarConEnvios(destinatariosAutoDe(modulo, auditoriasRecientes), enviosPorModulo[modulo.id_contenido] ?? []);

  // ---------- Formulario crear/editar (con vista previa en vivo) ----------
  const [editando, setEditando] = useState<ContenidoEducativo | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState<ContenidoEducativoPayload>(FORM_VACIO);
  // ¿Qué? Issue #620: la categoría se elige en uno de dos modos, "Existente" o "Nueva" (ver CategoriaField).
  const [modoCategoria, setModoCategoria] = useState<ModoCategoria>("existente");
  const [categoriaExistente, setCategoriaExistente] = useState("");
  const [nuevaCategoriaTexto, setNuevaCategoriaTexto] = useState("");
  // ¿Qué? En celular el formulario y la vista previa no caben juntos: se alterna entre los dos.
  const [vistaMovil, setVistaMovil] = useState<"editar" | "vista">("editar");
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imagenTextoRef = useRef<HTMLInputElement>(null);
  const [subiendoImagenTexto, setSubiendoImagenTexto] = useState(false);
  const [errorImagenTexto, setErrorImagenTexto] = useState<string | null>(null);

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    // Sin ninguna categoría creada todavía, solo se puede crear una nueva.
    setModoCategoria(categorias.length > 0 ? "existente" : "nueva");
    setCategoriaExistente("");
    setNuevaCategoriaTexto("");
    setVistaMovil("editar");
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
      url_imagen: item.url_imagen ?? "",
    });
    setModoCategoria("existente");
    setCategoriaExistente(item.modulo_categoria);
    setNuevaCategoriaTexto("");
    setVistaMovil("editar");
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

  const categoriaEfectiva = modoCategoria === "nueva" ? nuevaCategoriaTexto.trim() : categoriaExistente;
  // ¿Qué? Una categoría "Nueva" que ya existe (sin distinguir mayúsculas ni tildes) no se puede guardar: se duplicaría.
  const categoriaRepetida = modoCategoria === "nueva" ? categoriaDuplicada(nuevaCategoriaTexto, categorias) : null;

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

  // ¿Qué? Issue #314: mismas reglas que be/app/utils/enlaces.py — el video
  //       solo de YouTube, la guía solo https:// o un archivo subido.
  // ¿Para qué? Sin esto, el backend respondía 422 y el admin veía un aviso
  //           genérico en vez del error pegado al campo que falló.
  const errorDeEnlace = (campo: "url_video" | "url_guia"): string => {
    const valor = (form[campo] ?? "").trim();
    if (!valor) return "";
    if (campo === "url_video") return REGEX_VIDEO_YOUTUBE.test(valor) ? "" : t(`${p}.validation.videoNotYoutube`);
    return /^https:\/\/[^/\s]+/.test(valor) || valor.startsWith("/uploads/") ? "" : t(`${p}.validation.guideNotHttps`);
  };

  const validarCampo = (campo: "categoria" | "titulo_tema" | "cuerpo_texto" | "url_video" | "url_guia") => {
    let mensaje = "";
    if (campo === "url_video" || campo === "url_guia") mensaje = errorDeEnlace(campo);
    if (campo === "categoria" && !categoriaEfectiva) mensaje = t(`${p}.validation.categoryRequired`);
    if (campo === "categoria" && categoriaRepetida) mensaje = t(`${p}.validation.categoryDuplicate`);
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

  const formularioIncompleto = !categoriaEfectiva || Boolean(categoriaRepetida) || !form.titulo_tema.trim() || !form.cuerpo_texto.trim();

  const guardar = async () => {
    if (!user) return;
    const errores: Record<string, string> = {};
    if (!categoriaEfectiva) errores.categoria = t(`${p}.validation.categoryRequired`);
    else if (categoriaRepetida) errores.categoria = t(`${p}.validation.categoryDuplicate`);
    if (!form.titulo_tema.trim()) errores.titulo_tema = t(`${p}.validation.titleRequired`);
    else if (form.titulo_tema.trim().length < 5) errores.titulo_tema = t(`${p}.validation.titleTooShort`);
    if (!form.cuerpo_texto.trim()) errores.cuerpo_texto = t(`${p}.validation.bodyRequired`);
    else if (form.cuerpo_texto.trim().length < 20) errores.cuerpo_texto = t(`${p}.validation.bodyTooShort`);
    for (const campo of ["url_video", "url_guia"] as const) {
      const mensaje = errorDeEnlace(campo);
      if (mensaje) errores[campo] = mensaje;
    }
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
      url_imagen: form.url_imagen?.trim() || null,
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
  // ¿Qué? true mientras corre la acción de la confirmación (issue #458).
  // ¿Para qué? Antes no pasaba nada visible mientras tardaba y se podía confirmar dos veces.
  const [eliminando, setEliminando] = useState(false);
  const confirmarEliminar = async () => {
    if (!user || !aEliminar) return;
    setEliminando(true);
    try {
      await eliminarContenido(aEliminar.id_contenido);
      setAEliminar(null);
      if (moduloAbierto === aEliminar.id_contenido) setModuloAbierto(null);
      cargarContenido();
    } catch {
      setErrorMsg(t(`${p}.deleteError`));
    } finally {
      setEliminando(false);
    }
  };

  // ¿Qué? Envuelve la línea (o la selección) actual del textarea en la
  //       sintaxis Markdown elegida — mismo patrón para las 3 opciones,
  //       aplicado sobre selectionStart/End del elemento real.
  const aplicarFormato = (tipo: "b" | "ul") => {
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
      const prefijo = "- ";
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

  // ¿Qué? Issue #620: "+ Tarjeta" agrega, donde está el cursor, un párrafo nuevo que empieza con "Título de la tarjeta: " y deja
  //       seleccionado ese título para escribir encima.
  // ¿Para qué? Cada párrafo es una tarjeta del muro y su título es lo que va antes de los dos puntos (lib/muroLeccion.ts); así nadie
  //           tiene que conocer la regla para armar una tarjeta.
  // ¿Impacto? Separa con una línea en blanco del texto de antes y de después, que es lo que parte las tarjetas.
  const agregarTarjeta = () => {
    const ta = textareaRef.current;
    const v = form.cuerpo_texto;
    const posicion = ta ? ta.selectionStart : v.length;
    const antes = v.slice(0, posicion).replace(/\s+$/, "");
    const despues = v.slice(posicion).replace(/^\s+/, "");
    const titulo = t(`${p}.fields.cardTitlePlaceholder`);
    const separador = antes ? "\n\n" : "";
    const inicioTitulo = antes.length + separador.length;
    actualizarCampo("cuerpo_texto", `${antes}${separador}${titulo}: ${despues ? `\n\n${despues}` : ""}`);
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(inicioTitulo, inicioTitulo + titulo.length);
    });
  };

  // ¿Qué? Sube una imagen y la escribe en el texto como ![descripción](enlace), en su propia línea.
  // ¿Para qué? Cada imagen del muro va pegada a la tarjeta que viene justo después (ver
  //           lib/muroLeccion.ts); el Administrador no tiene que escribir el enlace a mano.
  // ¿Impacto? Se inserta donde está el cursor. Es la misma subida de imágenes de la guía de apoyo.
  const insertarImagenEnTexto = async (archivo: File | undefined) => {
    if (!archivo) return;
    setErrorImagenTexto(null);
    setSubiendoImagenTexto(true);
    try {
      const url = await subirAdjunto(archivo);
      const ta = textareaRef.current;
      const posicion = ta ? ta.selectionStart : form.cuerpo_texto.length;
      const antes = form.cuerpo_texto.slice(0, posicion).replace(/\s+$/, "");
      const despues = form.cuerpo_texto.slice(posicion).replace(/^\s+/, "");
      const imagen = `![${t(`${p}.fields.imageAltDefault`)}](${url})`;
      actualizarCampo("cuerpo_texto", `${antes}${antes ? "\n\n" : ""}${imagen}\n\n${despues}`);
    } catch (err) {
      setErrorImagenTexto(motivoDelServidor(err) ?? t(`${p}.fields.insertImageError`));
    } finally {
      setSubiendoImagenTexto(false);
      if (imagenTextoRef.current) imagenTextoRef.current.value = "";
    }
  };

  const idVideoReconocido = REGEX_VIDEO_YOUTUBE.test(form.url_video || "");

  return (
    <div className={`${ANCHO_PAGINA.normal} space-y-5 pt-6`}>
      <div className="flex items-center gap-4 bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-100 dark:bg-accent-300/10">
          <BookOpen className="icon-xl text-accent-700 dark:text-accent-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t(`${p}.title`)}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t(`${p}.subtitle`)}</p>
        </div>
      </div>

      {/* Franja de resumen — igual patrón que el Panel Principal: antes de
          la tabla, no encima de ella. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-night-line dark:bg-night-card">
          <div className="flex items-center gap-2">
            <BookOpen className="icon-md text-accent-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t(`${p}.catalogSection.title`)}</h3>
          </div>
          <div className="grid flex-1 grid-cols-3 items-center gap-2">
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{contenido.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t(`${p}.catalogSection.modules`)}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{categorias.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t(`${p}.catalogSection.categories`)}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{sinRecomendar}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t(`${p}.catalogSection.notRecommended`)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {sinRecomendar > 0 ? t(`${p}.catalogSection.notRecommendedHint`, { count: sinRecomendar }) : t(`${p}.catalogSection.allCovered`)}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-night-line dark:bg-night-card">
          <div className="flex items-center gap-2">
            <Calendar className="icon-md text-accent-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t(`${p}.currentWeek.title`, { rango: rangoSemanaUTC(semanaActual) })}</h3>
          </div>
          <div className="grid flex-1 grid-cols-3 items-center gap-2">
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{resumenSemana?.bueno ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t(`${p}.currentWeek.good`)}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{resumenSemana?.regular ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t(`${p}.currentWeek.regular`)}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{resumenSemana?.malo ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t(`${p}.currentWeek.bad`)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line shadow-sm overflow-hidden">
        {/* ¿Qué? Issue #619: la barra de pestañas ya no se recoge (se quitó "Recoger / Ver calificaciones / Ver módulos"):
            ocultar la tabla no aportaba nada y el panel queda siempre abierto. */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <div className="flex flex-wrap rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-night-line dark:bg-night-inset/60">
            <button
              type="button"
              onClick={() => setTab("cal")}
              className={`touch-target-h flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === "cal" ? "bg-accent-700 text-white shadow-sm dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <FileText className="icon-sm" />
              {t(`${p}.tabs.ratings`)}
            </button>
            <button
              type="button"
              onClick={() => setTab("mod")}
              className={`touch-target-h flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === "mod" ? "bg-accent-700 text-white shadow-sm dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <BookOpen className="icon-sm" />
              {t(`${p}.tabs.modules`)}
            </button>
          </div>

        </div>

        {tab === "cal" ? (
          <CalificacionesPorConjunto
            semanaActual={semanaActual}
            ultimaFecha={auditoriasRecientes[0]?.created_at ?? null}
            recientesCargadas={recientesCargadas}
            onAbrir={setCalAbierta}
          />
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-5 py-4 dark:border-night-line">
              <div className="relative">
                <Search className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input
                  value={buscarMod}
                  onChange={(e) => setBuscarMod(e.target.value)}
                  placeholder={t(`${p}.modules.searchPlaceholder`)}
                  aria-label={t(`${p}.modules.searchPlaceholder`)}
                  className="touch-target-h w-full rounded-lg border border-edge bg-white py-1.5 pl-8 pr-3 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-night-edge dark:bg-night-panel dark:text-gray-200 sm:w-56"
                />
              </div>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                aria-label={t(`${p}.modules.categoryFilterLabel`)}
                className="cursor-pointer rounded-lg border border-edge bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-night-edge dark:bg-night-panel dark:text-gray-200"
              >
                <option value="">{t(`${p}.modules.allCategories`)}</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-night-inset dark:text-gray-300">
                {t(`${p}.modules.total`, { count: contenido.length })}
              </span>
              {/* ¿Qué? Issue #620: el ÚNICO camino para crear un módulo. Se quitaron la tarjeta "Nuevo contenido" y el botón
                        "+ Nueva categoría": una categoría no existe sola, es el texto que trae cada módulo. */}
              <Button variant="primary" size="sm" type="button" onClick={abrirCrear}>
                <Plus className="icon-sm" aria-hidden="true" />
                {t(`${p}.newModule`)}
              </Button>
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
                  const nRecomendados = destinatariosDe(item).length;
                  return (
                    // ¿Qué? Issue #619: pulsar la fila sirve para VER (abre el modal); las acciones (enviar, editar,
                    //       eliminar) están en el menú de tres puntos. El botón de la izquierda hace la fila alcanzable con
                    //       el teclado: su clic sube a la fila, que es la que abre el modal.
                    <div
                      key={item.id_contenido}
                      onClick={() => setModuloAbierto(item.id_contenido)}
                      className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-night-line dark:bg-night-card dark:hover:bg-night-inset/40"
                    >
                      <button type="button" className="focus-ring flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg text-left">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-300/10 dark:text-accent-500">
                          <Icono className="icon-lg" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-500">{item.modulo_categoria}</span>
                          <span className="block truncate text-sm font-bold text-gray-900 dark:text-white">{item.titulo_tema}</span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">{formatearFechaCreacion(item.fecha_publicacion)}</span>
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {nRecomendados > 0 && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-blue-800 dark:bg-blue-400/15 dark:text-blue-200">
                            {t(`${p}.modules.recommendedTo`, { count: nRecomendados })}
                          </span>
                        )}
                        <MenuAcciones
                          ariaLabel={t(`${p}.modules.actionsFor`, { titulo: item.titulo_tema })}
                          grupos={[
                            [
                              { id: "enviar", label: t(`${p}.send.menuItem`), icon: Send, onSelect: () => setAEnviar(item) },
                              { id: "editar", label: t("common.edit"), icon: Pencil, onSelect: () => abrirEditar(item) },
                            ],
                            [{ id: "eliminar", label: t(`${p}.deleteConfirm.action`), icon: Trash2, peligrosa: true, onSelect: () => setAEliminar(item) }],
                          ]}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* ---------- Detalle de una calificación (issue #619: el mismo modal que ven los demás roles) ---------- */}
      {calAbierta && (
        <AuditoriaResultadoModal
          auditoria={calAbierta}
          onClose={() => setCalAbierta(null)}
          pie={
            <ContenidoRecomendadoCalificacion
              auditoria={calAbierta}
              modulos={contenido}
              onAbrirModulo={(id) => {
                setCalAbierta(null);
                setTab("mod");
                setModuloAbierto(id);
              }}
            />
          }
        />
      )}

      {/* ---------- Ver un módulo (vista previa + recomendado a) ---------- */}
      {moduloAbiertoObj && (
        <ModuloEducativoModal
          modulo={moduloAbiertoObj}
          destinatarios={destinatariosDe(moduloAbiertoObj)}
          cargandoEnvios={cargandoEnvios}
          onClose={() => setModuloAbierto(null)}
        />
      )}

      {aEnviar && (
        <EnviarAConjuntosModal
          modulo={aEnviar}
          onEnviado={() => cargarEnvios(aEnviar.id_contenido)}
          onClose={() => setAEnviar(null)}
        />
      )}

      {/* ---------- Formulario crear/editar, con vista previa en vivo ---------- */}
      {(creando || editando) && (
        <Modal onClose={cerrarFormulario} extraWide closeOnBackdrop={false} aria-label={editando ? t(`${p}.modal.editTitle`) : t(`${p}.newModule`)}>
          {/* ¿Qué? Solo en celular: alterna entre el formulario y la vista previa (en pantallas anchas van lado a lado). */}
          <div className="px-6 pb-1 pt-5 md:hidden">
            <Pestanas
              ariaLabel={t(`${p}.editor.mobileTabsLabel`)}
              activa={vistaMovil}
              onCambiar={setVistaMovil}
              compacta
              pestanas={[
                { id: "editar", etiqueta: t(`${p}.editor.edit`) },
                { id: "vista", etiqueta: t(`${p}.editor.preview`) },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className={`space-y-4 p-6 sm:p-8 ${vistaMovil === "vista" ? "hidden md:block" : ""}`}>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editando ? t(`${p}.modal.editTitle`) : t(`${p}.newModule`)}</h2>

              {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}

              <CategoriaField
                modo={modoCategoria}
                onCambiarModo={setModoCategoria}
                categorias={categorias}
                existente={categoriaExistente}
                onExistente={setCategoriaExistente}
                nueva={nuevaCategoriaTexto}
                onNueva={setNuevaCategoriaTexto}
                error={fieldErrors.categoria}
                onBlur={() => validarCampo("categoria")}
              />

              <InputField
                label={t(`${p}.fields.titleField`)}
                name="titulo_tema"
                value={form.titulo_tema}
                onChange={(e) => actualizarCampo("titulo_tema", e.target.value)}
                onBlur={() => validarCampo("titulo_tema")}
                maxLength={CONTENIDO_TITULO_MAX_LENGTH}
                placeholder={t(`${p}.fields.titlePlaceholder`)}
                error={fieldErrors.titulo_tema}
              />

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="contenido-cuerpo" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t(`${p}.fields.content`)} <span className="text-red-500">*</span>
                  </label>
                  <span id="contenido-cuerpo-contador" className="text-xs text-gray-500 dark:text-gray-400">
                    {t(`${p}.fields.charCount`, { count: form.cuerpo_texto.length, max: CONTENIDO_CUERPO_MAX_LENGTH })}
                  </span>
                </div>
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={agregarTarjeta}
                    title={t(`${p}.fields.addCardHint`)}
                    className="flex cursor-pointer items-center gap-1 rounded-lg border border-accent-300 bg-accent-50 px-2 py-1 text-xs font-semibold text-accent-800 hover:bg-accent-100 dark:border-accent-300/40 dark:bg-accent-300/10 dark:text-accent-300 dark:hover:bg-accent-300/15"
                  >
                    <Plus className="icon-sm" aria-hidden="true" />
                    {t(`${p}.fields.addCard`)}
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarFormato("b")}
                    title={t(`${p}.fields.boldHint`)}
                    className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-night-line dark:text-gray-300 dark:hover:bg-night-hover"
                  >
                    <Bold className="icon-sm" />
                    {t(`${p}.fields.formatBold`)}
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarFormato("ul")}
                    title={t(`${p}.fields.listHint`)}
                    className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-night-line dark:text-gray-300 dark:hover:bg-night-hover"
                  >
                    <ListIcon className="icon-sm" />
                    {t(`${p}.fields.formatList`)}
                  </button>
                  <label
                    title={t(`${p}.fields.insertImageHint`)}
                    className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-night-line dark:text-gray-300 dark:hover:bg-night-hover"
                  >
                    <ImagePlus className="icon-sm" />
                    {subiendoImagenTexto ? t(`${p}.fields.insertingImage`) : t(`${p}.fields.insertImage`)}
                    <input
                      ref={imagenTextoRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={subiendoImagenTexto}
                      onChange={(e) => insertarImagenEnTexto(e.target.files?.[0])}
                    />
                  </label>
                </div>
                <textarea
                  id="contenido-cuerpo"
                  ref={textareaRef}
                  value={form.cuerpo_texto}
                  onChange={(e) => actualizarCampo("cuerpo_texto", e.target.value)}
                  onBlur={() => validarCampo("cuerpo_texto")}
                  maxLength={CONTENIDO_CUERPO_MAX_LENGTH}
                  rows={7}
                  aria-invalid={!!fieldErrors.cuerpo_texto}
                  aria-describedby={
                    fieldErrors.cuerpo_texto ? "contenido-cuerpo-error contenido-cuerpo-contador" : "contenido-cuerpo-contador"
                  }
                  className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:bg-night-field dark:text-white ${
                    fieldErrors.cuerpo_texto ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400" : "border-edge focus:border-accent-500 focus:ring-accent-500/20 dark:border-night-edge"
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t(`${p}.fields.contentHint`)}</p>
                <div className="mt-2">
                  <ResumenMuro texto={form.cuerpo_texto} />
                </div>
                {errorImagenTexto && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-300" role="alert">
                    {errorImagenTexto}
                  </p>
                )}
                {fieldErrors.cuerpo_texto && (
                  <p id="contenido-cuerpo-error" className="mt-1 text-sm text-red-600 dark:text-red-300" role="alert">
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
                  onBlur={() => validarCampo("url_video")}
                  maxLength={ENLACE_MAX_LENGTH}
                  placeholder="https://www.youtube.com/watch?v=..."
                  aria-invalid={!!fieldErrors.url_video}
                  aria-describedby={fieldErrors.url_video ? "contenido-url-video-error" : undefined}
                  className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:bg-night-field dark:text-white ${
                    fieldErrors.url_video
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400"
                      : "border-edge focus:border-accent-500 focus:ring-accent-500 dark:border-night-edge"
                  }`}
                />
                {fieldErrors.url_video ? (
                  <p id="contenido-url-video-error" className="mt-1 text-sm text-red-600 dark:text-red-300" role="alert">
                    {fieldErrors.url_video}
                  </p>
                ) : form.url_video?.trim() && (
                  <p className={`mt-1 text-xs font-semibold ${idVideoReconocido ? "text-accent-600 dark:text-accent-400" : "text-amber-600 dark:text-amber-200"}`}>
                    {idVideoReconocido ? t(`${p}.fields.videoRecognized`) : t(`${p}.fields.videoNotRecognized`)}
                  </p>
                )}
              </div>

              <GuiaApoyoField
                label={t(`${p}.fields.guideLink`)}
                value={form.url_guia ?? ""}
                onChange={(url) => actualizarCampo("url_guia", url)}
                errorEnlace={fieldErrors.url_guia}
                onBlurEnlace={() => validarCampo("url_guia")}
              />

              <div>
                <ImagenAdjuntaField
                  label={t(`${p}.fields.coverImage`)}
                  value={form.url_imagen ?? ""}
                  onChange={(url) => actualizarCampo("url_imagen", url)}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t(`${p}.fields.coverImageHint`)}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" fullWidth onClick={cerrarFormulario}>
                  {t("common.cancel")}
                </Button>
                <Button variant="primary" fullWidth onClick={guardar} disabled={guardando || formularioIncompleto}>
                  {guardando ? t("common.saving") : formularioIncompleto ? t("common.formIncomplete") : t("common.save")}
                </Button>
              </div>
            </div>

            {/* ¿Qué? Vista previa fija mientras se recorre el formulario (sticky) — el mismo MuroLeccion que ve el Residente. */}
            <aside
              className={`border-t border-gray-100 bg-white p-6 dark:border-night-line dark:bg-night-panel sm:p-8 md:sticky md:top-0 md:self-start md:border-l md:border-t-0 ${
                vistaMovil === "editar" ? "hidden md:block" : ""
              }`}
            >
              <VistaPreviaModulo
                modulo={{
                  modulo_categoria: categoriaEfectiva,
                  titulo_tema: form.titulo_tema,
                  cuerpo_texto: form.cuerpo_texto,
                  url_video: idVideoReconocido ? form.url_video?.trim() || null : null,
                  url_guia: form.url_guia?.trim() || null,
                  url_imagen: form.url_imagen?.trim() || null,
                }}
              />
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
          isConfirming={eliminando}
          onClose={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
