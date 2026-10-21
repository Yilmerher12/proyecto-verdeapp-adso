import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

const API_BASE = `${API_BASE_URL}/api/v1/conjunto-panel`;

export interface ConjuntoAdministrado {
  id_conjunto_residencial: string;
  nombre_conjunto: string;
  nit: string | null;
  direccion: string;
  nombre_localidad: string;
  tiene_solicitud_pendiente: boolean;
  // ¿Qué? Issue #168 — código que se reparte fuera de la app para que un
  //       Residente demuestre que vive en este conjunto al registrarse.
  codigo_acceso: string;
  // ¿Qué? Cantidad de apartamentos que define el Admin de Conjunto (null = sin
  //       definir) y cuántos ya tienen al menos un residente con cuenta activa.
  total_apartamentos: number | null;
  apartamentos_registrados: number;
  residentes_registrados: number;
}

export async function obtenerMisConjuntos(): Promise<ConjuntoAdministrado[]> {
  const { data } = await axios.get(`${API_BASE}/mis-conjuntos`);
  return data;
}

// ¿Qué? Solo el NIT y la cantidad de apartamentos son editables por el Admin de Conjunto (issue #180).
// ¿Para qué? Nombre y dirección vienen ya verificados desde el dataset
//           oficial de Bogotá — solo se corrigen re-importando ese dataset
//           (seed.py), nunca a mano desde el panel del Admin de Conjunto.
export async function editarMiConjunto(
  idConjunto: string,
  datos: { nit: string | null; total_apartamentos: number | null }
) {
  const { data } = await axios.patch(`${API_BASE}/mis-conjuntos/${idConjunto}`, datos);
  return data;
}

// ¿Qué? Issue #168 — genera un código de acceso NUEVO para un conjunto,
//       reemplazando el anterior (por ejemplo, si se filtró a alguien
//       que no vive ahí).
export async function regenerarCodigoAcceso(idConjunto: string): Promise<string> {
  const { data } = await axios.post<{ codigo_acceso: string }>(
    `${API_BASE}/mis-conjuntos/${idConjunto}/regenerar-codigo-acceso`,
    {}
  );
  return data.codigo_acceso;
}

// ¿Qué? RQF-016 (HU-022): pide dejar de administrar un conjunto que hoy administro.
// ¿Para qué? El motivo es opcional — queda pendiente hasta que el Admin Sistema la resuelva.
export async function solicitarDesvinculacion(idConjunto: string, motivo: string | undefined) {
  const { data } = await axios.post(`${API_BASE}/mis-conjuntos/${idConjunto}/solicitar-desvinculacion`, {
    motivo: motivo || null,
  });
  return data;
}

export interface ItemAgenda {
  id: string;
  texto: string;
  url_evidencia: string | null;
  estado: "PENDIENTE" | "ARCHIVADA";
  created_at: string;
  archivado_en: string | null;
}

export interface PaginaDeAgenda {
  items: ItemAgenda[];
  total: number;
}

// ¿Qué? Agenda interna del Admin de Conjunto, por conjunto — temas para
//       llevar al comité (texto + foto opcional). Nunca llega al Admin Sistema.
//       Devuelve solo los temas por tratar; los archivados se piden aparte.
export async function listarAgenda(idConjunto: string): Promise<ItemAgenda[]> {
  const { data } = await axios.get(`${API_BASE}/mis-conjuntos/${idConjunto}/agenda`);
  return data;
}

// ¿Qué? Issue #435 — el historial (temas archivados) se pide de a páginas (limit/offset).
export async function listarAgendaArchivada(idConjunto: string, limit: number, offset: number): Promise<PaginaDeAgenda> {
  const { data } = await axios.get(`${API_BASE}/mis-conjuntos/${idConjunto}/agenda/archivadas`, { params: { limit, offset } });
  return data;
}

export async function crearItemAgenda(idConjunto: string, payload: { texto: string; url_evidencia?: string | null }): Promise<ItemAgenda> {
  const { data } = await axios.post(`${API_BASE}/mis-conjuntos/${idConjunto}/agenda`, payload);
  return data;
}

export async function cambiarEstadoItemAgenda(idConjunto: string, idItem: string, estado: ItemAgenda["estado"]): Promise<ItemAgenda> {
  const { data } = await axios.patch(`${API_BASE}/mis-conjuntos/${idConjunto}/agenda/${idItem}`, { estado });
  return data;
}

export interface FiltroDescargaAgenda {
  estado: "TODOS" | ItemAgenda["estado"];
  // ¿Qué? Fechas "AAAA-MM-DD" (hora de Bogotá, la que ve el usuario); vacías = sin límite.
  desde: string;
  hasta: string;
}

// ¿Qué? Issue #479 (HU-049) — historial de la agenda en CSV.
// ¿Para qué? Un enlace normal no manda el token de la sesión, así que el archivo se pide
//           por axios como bloque de bytes (responseType "blob") y luego se baja con
//           descargarArchivo.
// ¿Impacto? Con responseType "blob" el cuerpo del error (400 por pasar de 500 temas) también
//           llega como Blob: se lee aquí para que el mensaje del backend llegue a la pantalla.
export async function descargarHistorialAgendaCsv(idConjunto: string, filtro: FiltroDescargaAgenda): Promise<Blob> {
  try {
    const { data } = await axios.get(`${API_BASE}/mis-conjuntos/${idConjunto}/agenda/historial/csv`, {
      params: { estado: filtro.estado, desde: filtro.desde || undefined, hasta: filtro.hasta || undefined },
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

// ¿Qué? Mismo nombre que arma el backend: historial-agenda-<conjunto>-<desde>_<hasta>.csv.
// ¿Para qué? Con credenciales el navegador no deja leer la cabecera Content-Disposition,
//           así que la pantalla arma el nombre sola. Sin datos personales y solo ASCII.
export function nombreArchivoHistorialAgenda(nombreConjunto: string, desde: string, hasta: string): string {
  const slug = nombreConjunto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `historial-agenda-${slug}-${desde || "inicio"}_${hasta || "hoy"}.csv`;
}

export async function eliminarItemAgenda(idConjunto: string, idItem: string) {
  const { data } = await axios.delete(`${API_BASE}/mis-conjuntos/${idConjunto}/agenda/${idItem}`);
  return data;
}
