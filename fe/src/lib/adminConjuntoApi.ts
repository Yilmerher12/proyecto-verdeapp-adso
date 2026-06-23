/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

// ¿Qué? Cliente HTTP dedicado a los endpoints de /api/v1/admin-conjunto.
// ¿Para qué? Mantener en un solo lugar la URL base y los métodos del
//           flujo de invitación, en vez de repetir axios.get/post sueltos
//           en cada pantalla.
const API_BASE = "http://localhost:8000/api/v1/admin-conjunto";

export interface ConjuntoOption {
    id_conjunto_residencial: number;
    nombre_conjunto: string;
    nombre_localidad?: string;
}

export interface InvitacionInfo {
    correo_electronico: string;
    nombres_conjuntos: string[];
    valido: boolean;
}

/**
 * ¿Qué? El Administrador del Sistema invita a alguien por correo.
 * ¿Para qué? Solo manda correo + ids de conjuntos. Requiere el token de
 *           sesión del Administrador del Sistema (axios ya debe llevar
 *           el header Authorization configurado globalmente, igual que
 *           en el resto de la app).
 */
export async function invitarAdministradorConjunto(
    correo_electronico: string,
    ids_conjuntos: number[],
    token: string
) {
const { data } = await axios.post(
    `${API_BASE}/invitar`,
    { correo_electronico, ids_conjuntos },
    { headers: { Authorization: `Bearer ${token}` } }
);
    return data;
}

/**
 * ¿Qué? Consulta pública: a qué correo y conjuntos corresponde un token
 *       de invitación, antes de mostrar el formulario de aceptación.
 */
export async function consultarInvitacion(token: string): Promise<InvitacionInfo> {
const { data } = await axios.get(`${API_BASE}/invitacion`, {
    params: { token },
});
    return data;
}

/**
 * ¿Qué? La persona invitada acepta: define su contraseña y datos.
 * ¿Para qué? Pública (la persona aún no tiene cuenta) pero protegida
 *           por el token de invitación, no por sesión.
 */
export async function aceptarInvitacion(payload: {
    token: string;
    password: string;
    nombre: string;
    apellidos: string;
    numero_telefonico: string;
}) {
const { data } = await axios.post(`${API_BASE}/aceptar`, payload);
    return data;
}