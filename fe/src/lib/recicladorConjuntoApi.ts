/**
 * Archivo: lib/recicladorConjuntoApi.ts
 * Descripción: Llamadas API del flujo de invitación Reciclador-Conjunto.
 * ¿Para qué? Centralizar las peticiones HTTP de este flujo en un solo lugar.
 * ¿Impacto? RNF-001.9: ya no recibe el token de sesión como parámetro — la
 *           cookie httpOnly viaja sola gracias a axios.defaults.withCredentials
 *           (ver api/axios.ts).
 */

import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

const API_BASE = `${API_BASE_URL}/api/v1/reciclador-conjunto`;

export interface InvitacionEnviada {
  id: string;
  nombre_reciclador: string;
  apellidos_reciclador: string;
  correo_reciclador: string;
  nombre_conjunto: string;
  estado: string;
  created_at: string;
}

// ¿Qué? Un reciclador YA autorizado en el conjunto — distinto de
//       InvitacionEnviada, que es el historial de invitaciones y puede
//       estar vacío aunque sí haya recicladores autorizados (ej. vinculados
//       directo en la base de datos, sin pasar por el flujo de invitar).
export interface RecicladorAutorizado {
  id_reciclador: string;
  nombre: string;
  apellidos: string;
  correo_electronico: string;
  numero_telefonico: string | null;
  asociacion: string | null;
}

/**
 * ¿Qué? El Admin de Conjunto invita a un Reciclador (ya registrado) por correo.
 */
export async function invitarReciclador(
  correoReciclador: string,
  idConjuntoResidencial: string
): Promise<void> {
  await axios.post(`${API_BASE}/invitar`, {
    correo_reciclador: correoReciclador,
    id_conjunto_residencial: idConjuntoResidencial,
  });
}

/**
 * ¿Qué? Lista las invitaciones (de cualquier estado) que el Admin de
 *       Conjunto ha enviado para un conjunto específico.
 */
export async function obtenerInvitacionesDeConjunto(
  idConjuntoResidencial: string
): Promise<InvitacionEnviada[]> {
  const response = await axios.get(`${API_BASE}/mi-conjunto/${idConjuntoResidencial}/invitaciones`);
  return response.data;
}

/**
 * ¿Qué? Lista los recicladores YA autorizados en un conjunto (dato real,
 *       tabla recicladores_conjuntos) — no el historial de invitaciones.
 */
export async function obtenerRecicladoresAutorizados(
  idConjuntoResidencial: string
): Promise<RecicladorAutorizado[]> {
  const response = await axios.get(`${API_BASE}/mi-conjunto/${idConjuntoResidencial}/autorizados`);
  return response.data;
}

/**
 * ¿Qué? El Admin de Conjunto revoca directo el acceso de un Reciclador ya
 *       autorizado — espejo de cómo ya invita (por correo, sin que el
 *       reciclador tenga que pedir nada). No borra el historial: el
 *       backend lo marca como revocado (fecha_revocacion), no lo elimina.
 */
export async function revocarReciclador(
  idConjuntoResidencial: string,
  idReciclador: string
): Promise<void> {
  await axios.delete(`${API_BASE}/mi-conjunto/${idConjuntoResidencial}/autorizados/${idReciclador}`);
}