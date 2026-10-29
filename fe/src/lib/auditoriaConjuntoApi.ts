import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? Cliente HTTP para la auditoría del Reciclador al conjunto (RQF-009).
// ¿Para qué? Centralizar el envío (multipart, por la foto de evidencia) y
//           la consulta del historial en un solo lugar.
const API_BASE = `${API_BASE_URL}/api/v1/auditorias-conjunto`;

export type NivelDesempeno = "BUENA" | "REGULAR" | "DEFICIENTE";

export interface AuditoriaConjunto {
  id_auditoria: string;
  id_conjunto_residencial: string;
  nombre_conjunto: string;
  nivel_desempeno: NivelDesempeno;
  tema_educativo: string;
  descripcion: string | null;
  ruta_evidencia: string;
  ruta_evidencia_2: string | null;
  ruta_evidencia_3: string | null;
  created_at: string;
  nombre_reciclador: string;
}

export interface NuevaAuditoria {
  id_conjunto_residencial: string;
  nivel_desempeno: NivelDesempeno;
  tema_educativo: string;
  descripcion?: string;
  evidencias: File[];
}

// ¿Qué? Envía la auditoría como multipart/form-data (no JSON) porque incluye
//       archivos — es el primer endpoint de VerdeApp que sube imágenes.
//
// ¿Qué? Antes esta petición no tenía ningún límite de tiempo de espera
//       (timeout) ni forma de saber si de verdad estaba avanzando.
// ¿Para qué? Sin timeout, si la subida se colgaba (mala conexión, hasta 3
//           fotos de 5MB cada una), se quedaba esperando para siempre, sin
//           avisar nada — el reciclador no sabía si seguía intentando o ya
//           había fallado. onUploadProgress reporta el porcentaje real
//           transferido, para mostrarlo en vez de solo un ícono girando.
// ¿Impacto? 30 segundos es generoso para ~15MB en una conexión mala, pero
//           ya no es infinito — si de verdad se cuelga, ahora sí falla con
//           un error claro en vez de quedarse esperando sin fin.
export async function crearAuditoria(
  datos: NuevaAuditoria,
  onProgress?: (porcentaje: number) => void,
): Promise<AuditoriaConjunto> {
  const formData = new FormData();
  formData.append("id_conjunto_residencial", String(datos.id_conjunto_residencial));
  formData.append("nivel_desempeno", datos.nivel_desempeno);
  formData.append("tema_educativo", datos.tema_educativo);
  if (datos.descripcion) formData.append("descripcion", datos.descripcion);
  for (const archivo of datos.evidencias) formData.append("evidencias", archivo);

  const { data } = await axios.post(API_BASE, formData, {
    timeout: 30000,
    onUploadProgress: (evento) => {
      if (!onProgress || !evento.total) return;
      onProgress(Math.round((evento.loaded / evento.total) * 100));
    },
  });
  return data;
}

// ¿Qué? Una página de auditorías con el total que hay (limit/offset en el servidor).
// ¿Para qué? Las listas que pueden crecer ya no traen todo ni se cortan en un tope fijo.
export interface PaginaAuditorias {
  items: AuditoriaConjunto[];
  total: number;
}

// ¿Qué? Las auditorías que el Reciclador ya envió, de a páginas, más recientes primero.
// ¿Para qué? Con `idConjunto` solo las de ese conjunto (su panel muestra un conjunto a la vez);
//           sin él, todas.
export async function listarMisAuditorias(
  limit: number,
  offset: number,
  idConjunto?: string,
): Promise<PaginaAuditorias> {
  const { data } = await axios.get(`${API_BASE}/mias`, { params: { limit, offset, id_conjunto: idConjunto } });
  return data;
}

export interface UltimaAuditoria {
  id_conjunto_residencial: string;
  ultima_auditoria: string;
}

// ¿Qué? Por cada conjunto que el Reciclador ya auditó, la fecha de su última auditoría.
// ¿Para qué? El aviso "este conjunto necesita auditoría" (a los 7 días): con la lista paginada
//           ya no basta con mirar la primera página, que puede no incluir ese conjunto.
export async function listarUltimasAuditorias(): Promise<UltimaAuditoria[]> {
  const { data } = await axios.get(`${API_BASE}/mias/ultimas`);
  return data;
}

// ¿Qué? Detalle completo de una auditoría — lo que abre el botón "Ver" de
//       la notificación AUDITORIA_PUBLICADA (Residente o Admin de Conjunto).
export async function obtenerAuditoria(idAuditoria: string): Promise<AuditoriaConjunto> {
  const { data } = await axios.get(`${API_BASE}/${idAuditoria}`);
  return data;
}

// ¿Qué? Las auditorías de el/los conjunto(s) del usuario en sesión, de a páginas —
//       a diferencia de la notificación (que se pierde al marcarla leída),
//       esto queda siempre consultable. El backend resuelve solo a qué
//       conjunto(s) pertenece: un Residente o Admin de Conjunto, sin pasar
//       ningún id.
export async function listarHistorial(limit: number, offset: number): Promise<PaginaAuditorias> {
  const { data } = await axios.get(`${API_BASE}/historial`, { params: { limit, offset } });
  return data;
}

// ¿Qué? Conteos de auditorías de UN conjunto por semana y por tema (issue #486).
// ¿Para qué? La gráfica de desempeño solo dibuja estos números: el backend ya
//           los cuenta (sin depender de una página de /historial) y con la semana de
//           lunes a domingo en hora de Bogotá.
// ¿Impacto? `lunes` es una fecha de calendario (YYYY-MM-DD), no un instante:
//           no se convierte de zona horaria.
export interface SemanaDesempeno {
  lunes: string;
  bueno: number;
  regular: number;
  malo: number;
}

export interface TemaDesempeno {
  tema: string;
  bueno: number;
  regular: number;
  malo: number;
}

export interface DesempenoConjunto {
  id_conjunto_residencial: string;
  total: number;
  semanas: SemanaDesempeno[];
  temas: TemaDesempeno[];
}

// ¿Qué? Sin `idConjunto` el backend usa el único conjunto del usuario (el caso
//       del Residente); un Admin de Conjunto con varios debe mandarlo (si no, 422).
export async function obtenerDesempeno(
  idConjunto?: string,
  semanas?: number,
): Promise<DesempenoConjunto> {
  const { data } = await axios.get(`${API_BASE}/desempeno`, {
    params: { id_conjunto: idConjunto, semanas },
  });
  return data;
}

// ¿Qué? El desempeño semanal del conjunto como PDF (issue #558), con el mismo conjunto y
//       período que ve la pantalla. Solo el Admin de Conjunto (el backend responde 403 al resto).
// ¿Impacto? Sin auditorías en el período el backend responde 422 con un mensaje: como la
//           respuesta es un Blob, se lee ese mensaje del cuerpo para mostrárselo al usuario.
export async function descargarDesempenoPdf(idConjunto: string, semanas: number): Promise<Blob> {
  try {
    const { data } = await axios.get(`${API_BASE}/desempeno/pdf`, {
      params: { id_conjunto: idConjunto, semanas },
      responseType: "blob",
    });
    return data;
  } catch (error) {
    const cuerpo = (error as { response?: { data?: unknown } }).response?.data;
    if (cuerpo instanceof Blob) {
      try {
        const detail = JSON.parse(await cuerpo.text()).detail;
        if (typeof detail === "string") (error as Error).message = detail;
      } catch {
        // El cuerpo no era JSON: se deja el mensaje que ya traía el error.
      }
    }
    throw error;
  }
}

export function nombreArchivoDesempeno(nombreConjunto: string, semanas: number): string {
  const slug =
    nombreConjunto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "conjunto";
  return `desempeno-${slug}-${semanas}semanas-${new Date().toISOString().slice(0, 10)}.pdf`;
}

// ¿Qué? Las auditorías de una semana (el `lunes` de una SemanaDesempeno), más recientes primero.
export async function listarAuditoriasDeSemana(
  lunes: string,
  idConjunto?: string,
): Promise<AuditoriaConjunto[]> {
  const { data } = await axios.get(`${API_BASE}/desempeno/semana`, {
    params: { lunes, id_conjunto: idConjunto },
  });
  return data;
}

export interface AuditoriaAdmin extends AuditoriaConjunto {
  avisados: number;
  id_localidad: number;
  nombre_localidad: string;
}

export interface AuditoriasAdminResultado {
  items: AuditoriaAdmin[];
  total: number;
}

// ¿Qué? El Admin del Sistema ve las auditorías del reciclador sin importar
//       a qué conjunto pertenecen (RQF-009) — con `lunes` (YYYY-MM-DD),
//       filtra esa semana completa; sin él, trae las más recientes de
//       cualquier semana (para cruzar "a qué conjuntos se recomendó cada
//       módulo" sin acotar a una sola semana).
export async function listarAuditoriasAdmin(opciones?: {
  lunes?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditoriasAdminResultado> {
  const { data } = await axios.get(`${API_BASE}/admin`, { params: opciones });
  return data;
}

// ¿Qué? Trae TODAS las auditorías de una semana, pidiendo página tras página.
// ¿Para qué? El backend entrega máximo 100 por defecto (200 como tope) y devuelve
//           `total`; antes la página guardaba solo la primera página y una semana
//           con más auditorías se veía incompleta, sin ningún aviso. Con los filtros
//           por conjunto y fecha, una auditoría que faltaba parecía no existir.
// ¿Impacto? Se detiene si una página llega vacía, aunque `total` diga que faltan:
//           nunca queda en un ciclo infinito si los datos cambian mientras se piden.
const AUDITORIAS_POR_PAGINA = 200;
export async function listarAuditoriasAdminDeSemana(lunes: string): Promise<AuditoriaAdmin[]> {
  const todas: AuditoriaAdmin[] = [];
  for (;;) {
    const { items, total } = await listarAuditoriasAdmin({
      lunes,
      limit: AUDITORIAS_POR_PAGINA,
      offset: todas.length,
    });
    todas.push(...items);
    if (items.length === 0 || todas.length >= total) return todas;
  }
}
