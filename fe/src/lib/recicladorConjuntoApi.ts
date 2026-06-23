/**
 * Archivo: lib/recicladorConjuntoApi.ts
 * Descripción: Llamadas API del flujo de invitación Reciclador-Conjunto.
 * ¿Para qué? Centralizar las peticiones HTTP de este flujo, siguiendo el
 *           mismo patrón que conjuntoPanelApi.ts (función + token explícito).
 */

import axios from "axios";

const API_BASE = "http://localhost:8000/api/v1/reciclador-conjunto";

export interface InvitacionEnviada {
  id: string;
  nombre_reciclador: string;
  apellidos_reciclador: string;
  correo_reciclador: string;
  nombre_conjunto: string;
  estado: string;
  created_at: string;
}

/**
 * ¿Qué? El Admin de Conjunto invita a un Reciclador (ya registrado) por correo.
 */
export async function invitarReciclador(
  correoReciclador: string,
  idConjuntoResidencial: number,
  accessToken: string
): Promise<void> {
  await axios.post(
    `${API_BASE}/invitar`,
    { correo_reciclador: correoReciclador, id_conjunto_residencial: idConjuntoResidencial },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

/**
 * ¿Qué? Lista las invitaciones (de cualquier estado) que el Admin de
 *       Conjunto ha enviado para un conjunto específico.
 */
export async function obtenerInvitacionesDeConjunto(
  idConjuntoResidencial: number,
  accessToken: string
): Promise<InvitacionEnviada[]> {
  const response = await axios.get(
    `${API_BASE}/mi-conjunto/${idConjuntoResidencial}/invitaciones`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}