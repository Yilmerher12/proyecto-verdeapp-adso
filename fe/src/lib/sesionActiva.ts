/**
 * Archivo: lib/sesionActiva.ts
 * ¿Qué? La marca "verdeapp:sesion-activa": un "1" que el frontend anota al
 *       iniciar sesión y borra al cerrarla. No es un token ni un secreto —
 *       los tokens viven en cookies httpOnly que JavaScript no puede leer
 *       (RNF-001.9); la marca solo dice "vale la pena preguntarle al
 *       backend quién es este usuario".
 * ¿Para qué? Un solo lugar para leerla, escribirla y borrarla. Antes
 *           AuthContext.tsx, AppShell.tsx y axios.ts repetían el nombre y
 *           el almacenamiento cada uno por su lado.
 * ¿Impacto? Vive en localStorage, no en sessionStorage: sessionStorage es
 *           de cada pestaña, así que una pestaña nueva no veía la marca y
 *           mandaba al login aunque las cookies (compartidas por todas las
 *           pestañas) siguieran sirviendo. localStorage además sobrevive a
 *           cerrar el navegador, igual que las cookies de 7 días — la
 *           sesión termina cuando el backend lo dice, no al cerrar la ventana.
 */
const CLAVE_SESION_ACTIVA = "verdeapp:sesion-activa";

export function haySesionActiva(): boolean {
  return localStorage.getItem(CLAVE_SESION_ACTIVA) === "1";
}

export function marcarSesionActiva(): void {
  localStorage.setItem(CLAVE_SESION_ACTIVA, "1");
}

export function borrarSesionActiva(): void {
  localStorage.removeItem(CLAVE_SESION_ACTIVA);
}

// ¿Qué? Avisa cuando OTRA pestaña borró la marca (cerró sesión, o su sesión
//       venció). El evento "storage" del navegador solo llega a las demás
//       pestañas, nunca a la que hizo el cambio.
// ¿Para qué? Como todas las pestañas comparten las cookies, si una cierra
//           sesión las demás ya no tienen sesión real; sin este aviso
//           seguirían mostrando datos hasta su siguiente petición.
// ¿Impacto? Devuelve la función para dejar de escuchar (para el cleanup de
//           un useEffect). key === null es un localStorage.clear().
export function alCerrarSesionEnOtraPestana(callback: () => void): () => void {
  const escuchar = (evento: StorageEvent) => {
    const seBorroLaMarca = evento.key === CLAVE_SESION_ACTIVA && evento.newValue === null;
    if (seBorroLaMarca || evento.key === null) callback();
  };
  window.addEventListener("storage", escuchar);
  return () => window.removeEventListener("storage", escuchar);
}
