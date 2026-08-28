import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? Cliente HTTP para la auditoría del Reciclador al conjunto (RQF-009).
// ¿Para qué? Centralizar el envío (multipart, por la foto de evidencia) y
//           la consulta del historial en un solo lugar.
const API_BASE = `${API_BASE_URL}/api/v1/auditorias-conjunto`;

export type NivelDesempeno = "EXCELENTE" | "BUENA" | "REGULAR" | "DEFICIENTE";

export interface AuditoriaConjunto {
  id_auditoria: string;
  id_conjunto_residencial: string;
  nombre_conjunto: string;
  nivel_desempeno: NivelDesempeno;
  tema_educativo: string;
  descripcion: string | null;
  ruta_evidencia: string;
  created_at: string;
  nombre_reciclador: string;
}

export interface NuevaAuditoria {
  id_conjunto_residencial: string;
  nivel_desempeno: NivelDesempeno;
  tema_educativo: string;
  descripcion?: string;
  evidencia: File;
}

// ¿Qué? Envía la auditoría como multipart/form-data (no JSON) porque incluye
//       un archivo — es el primer endpoint de VerdeApp que sube una imagen.
export async function crearAuditoria(datos: NuevaAuditoria, token: string): Promise<AuditoriaConjunto> {
  const formData = new FormData();
  formData.append("id_conjunto_residencial", String(datos.id_conjunto_residencial));
  formData.append("nivel_desempeno", datos.nivel_desempeno);
  formData.append("tema_educativo", datos.tema_educativo);
  if (datos.descripcion) formData.append("descripcion", datos.descripcion);
  formData.append("evidencia", datos.evidencia);

  const { data } = await axios.post(API_BASE, formData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function listarMisAuditorias(token: string): Promise<AuditoriaConjunto[]> {
  const { data } = await axios.get(`${API_BASE}/mias`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

// ¿Qué? Detalle completo de una auditoría — lo que abre el botón "Ver" de
//       la notificación AUDITORIA_PUBLICADA (Residente o Admin de Conjunto).
export async function obtenerAuditoria(idAuditoria: string, token: string): Promise<AuditoriaConjunto> {
  const { data } = await axios.get(`${API_BASE}/${idAuditoria}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

// ¿Qué? Todas las auditorías de el/los conjunto(s) del usuario en sesión —
//       a diferencia de la notificación (que se pierde al marcarla leída),
//       esto queda siempre consultable. El backend resuelve solo a qué
//       conjunto(s) pertenece: un Residente o Admin de Conjunto, sin pasar
//       ningún id.
export async function listarHistorial(token: string): Promise<AuditoriaConjunto[]> {
  const { data } = await axios.get(`${API_BASE}/historial`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}
