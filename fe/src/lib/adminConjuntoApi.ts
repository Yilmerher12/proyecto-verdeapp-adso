import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

// ¿Qué? Cliente HTTP dedicado a los endpoints de /api/v1/admin-conjunto.
// ¿Para qué? Mantener en un solo lugar la URL base y los métodos del
//           flujo de invitación, en vez de repetir axios.get/post sueltos
//           en cada pantalla.
const API_BASE = `${API_BASE_URL}/api/v1/admin-conjunto`;

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

export interface SolicitudDesvinculacion {
    id: number;
    id_conjunto_residencial: number;
    nombre_conjunto: string;
    id_administrador: number;
    nombre_administrador: string;
    apellidos_administrador: string;
    motivo: string | null;
    estado: string;
    created_at: string;
}

export interface ConjuntoSinAdministrador {
    id_conjunto_residencial: number;
    nombre_conjunto: string;
    nombre_localidad: string;
}

export interface AdministradorConjuntoResumen {
    id_administrador: number;
    nombre: string;
    apellidos: string;
    correo_electronico: string;
    conjuntos_actuales: string[];
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

// ¿Qué? RQF-016 (HU-023, CA-023.1): solicitudes de desvinculación pendientes de resolver.
export async function listarSolicitudesDesvinculacion(token: string): Promise<SolicitudDesvinculacion[]> {
    const { data } = await axios.get(`${API_BASE}/solicitudes-desvinculacion`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
}

/**
 * ¿Qué? RQF-016 (HU-023, CA-023.2/CA-023.3): aprueba o rechaza una solicitud.
 * ¿Para qué? motivoRechazo es obligatorio cuando aprobar=false (el backend lo valida igual).
 */
export async function resolverSolicitudDesvinculacion(
    idSolicitud: number,
    aprobar: boolean,
    motivoRechazo: string | undefined,
    token: string
) {
    const { data } = await axios.post(
        `${API_BASE}/solicitudes-desvinculacion/${idSolicitud}/resolver`,
        { aprobar, motivo_rechazo: motivoRechazo || null },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
}

// ¿Qué? RQF-016 (HU-024, CA-024.2): conjuntos verificados sin ningún administrador activo hoy.
// ¿Para qué? `search` + `limit` acotan el resultado — con miles de conjuntos
//           reales registrados, este endpoint ya no devuelve todo de una vez.
export async function listarConjuntosSinAdministrador(
    token: string,
    search: string = "",
    limit: number = 20
): Promise<ConjuntoSinAdministrador[]> {
    const { data } = await axios.get(`${API_BASE_URL}/api/v1/geography/conjuntos/sin-administrador`, {
        params: { search: search || undefined, limit },
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
}

// ¿Qué? RQF-016 (HU-024, CA-024.1): busca Admin de Conjunto ya existentes en la plataforma.
export async function buscarAdministradoresConjunto(
    query: string,
    token: string
): Promise<AdministradorConjuntoResumen[]> {
    const { data } = await axios.get(`${API_BASE}/listar`, {
        params: query ? { query } : {},
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
}

// ¿Qué? RQF-016 (HU-024, CA-024.3): vincula un conjunto sin administrador a un Admin Conjunto existente.
export async function asignarConjuntoAdicional(
    idAdministrador: number,
    idConjuntoResidencial: number,
    token: string
) {
    const { data } = await axios.post(
        `${API_BASE}/asignar-conjunto-adicional`,
        { id_administrador: idAdministrador, id_conjunto_residencial: idConjuntoResidencial },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
}