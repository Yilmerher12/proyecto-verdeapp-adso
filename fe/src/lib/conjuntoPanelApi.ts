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
}

export async function obtenerMisConjuntos(): Promise<ConjuntoAdministrado[]> {
  const { data } = await axios.get(`${API_BASE}/mis-conjuntos`);
  return data;
}

// ¿Qué? Solo el NIT es editable por el Admin de Conjunto (issue #180).
// ¿Para qué? Nombre y dirección vienen ya verificados desde el dataset
//           oficial de Bogotá — solo se corrigen re-importando ese dataset
//           (seed.py), nunca a mano desde el panel del Admin de Conjunto.
export async function editarMiConjunto(idConjunto: string, datos: { nit: string | null }) {
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