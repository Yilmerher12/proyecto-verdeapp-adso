import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? Cliente HTTP de las acciones del Admin del Sistema sobre un usuario
//       puntual (ver su perfil, activar/desactivar su cuenta).
// ¿Para qué? Los listados de la tabla siguen pidiéndose desde AdminDashboard
//           (cada pestaña usa su propio endpoint); esto es solo lo que se
//           hace sobre UNA persona, identificada por su correo.
const API_BASE = `${API_BASE_URL}/api/v1/admin/usuarios`;

export interface PerfilUsuarioAdmin {
  correo_electronico: string;
  role_id: number;
  rol: string;
  habilitado: boolean;
  correo_verificado: boolean;
  idioma: string;
  foto_perfil_url: string | null;
  bloqueado_hasta: string | null;
  fecha_desactivacion: string | null;
  motivo_desactivacion: string | null;
  nombre: string | null;
  apellidos: string | null;
  telefono: string | null;
  // ¿Qué? Cambia según el rol: residente trae conjunto/localidad/torre/apto,
  //       reciclador trae asociacion/localidad/conjuntos/contacto y
  //       administrador de conjunto trae solo conjuntos.
  detalle: {
    conjunto?: string;
    localidad?: string | null;
    torre?: string;
    apto?: string;
    asociacion?: string | null;
    mostrar_contacto_directorio?: boolean;
    conjuntos?: string[];
  };
}

export const MOTIVO_MAX_LENGTH = 200;

export async function obtenerPerfilUsuario(correo: string): Promise<PerfilUsuarioAdmin> {
  const res = await axios.get<PerfilUsuarioAdmin>(`${API_BASE}/${encodeURIComponent(correo)}`);
  return res.data;
}

export async function cambiarHabilitado(correo: string, habilitado: boolean, motivo?: string): Promise<void> {
  await axios.patch(`${API_BASE}/${encodeURIComponent(correo)}/habilitado`, {
    habilitado,
    ...(motivo ? { motivo } : {}),
  });
}
