import axios from "axios";

const API_BASE = "http://localhost:8000/api/v1/conjunto-panel";

export interface ConjuntoAdministrado {
  id_conjunto_residencial: number;
  nombre_conjunto: string;
  nit: string | null;
  direccion: string;
  nombre_localidad: string;
}

export async function obtenerMisConjuntos(token: string): Promise<ConjuntoAdministrado[]> {
  const { data } = await axios.get(`${API_BASE}/mis-conjuntos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function editarMiConjunto(
  idConjunto: number,
  datos: { nombre_conjunto: string; nit: string | null; direccion: string },
  token: string
) {
  const { data } = await axios.patch(
    `${API_BASE}/mis-conjuntos/${idConjunto}`,
    datos,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}