/**
 * Archivo: lib/sesionActiva.ts
 * ¿Qué? La marca "verdeapp:sesion-activa": un código aleatorio que el
 *       frontend anota al iniciar sesión y borra al cerrarla. No es un
 *       token ni un secreto — los tokens viven en cookies httpOnly que
 *       JavaScript no puede leer (RNF-001.9); la marca solo dice "vale la
 *       pena preguntarle al backend quién es este usuario".
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

// ¿Qué? Solo importa que la marca exista, no cuánto vale.
// ¿Para qué? Antes valía siempre "1" y aquí se comparaba contra "1"; ahora
//           vale un código distinto en cada login (ver marcarSesionActiva).
// ¿Impacto? Una marca "1" que ya estuviera guardada de antes sigue contando
//           como sesión: nadie queda deslogueado por este cambio.
export function haySesionActiva(): boolean {
  return localStorage.getItem(CLAVE_SESION_ACTIVA) !== null;
}

// ¿Qué? Guarda un código nuevo en cada login, en vez de un "1" fijo.
// ¿Para qué? El evento "storage" del navegador solo se dispara si el valor
//           CAMBIA. Con un "1" fijo, si otra pestaña iniciaba sesión con
//           otra cuenta, la marca pasaba de "1" a "1", no había aviso, y
//           esta pestaña seguía mostrando al usuario anterior mientras las
//           cookies (compartidas) ya eran de la cuenta nueva (issue #404).
// ¿Impacto? El valor no es un secreto: solo tiene que ser distinto cada vez.
export function marcarSesionActiva(): void {
  localStorage.setItem(CLAVE_SESION_ACTIVA, crypto.randomUUID());
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

// ¿Qué? Avisa cuando OTRA pestaña inició sesión (la marca cambió a un valor
//       nuevo). Es la pareja de alCerrarSesionEnOtraPestana.
// ¿Para qué? Si esa pestaña entró con otra cuenta, las cookies compartidas ya
//           son de esa cuenta; esta pestaña debe preguntarle al backend quién
//           es ahora, en vez de seguir mostrando al usuario anterior.
// ¿Impacto? Devuelve la función para dejar de escuchar. Un borrado de la marca
//           (newValue === null) no cuenta: de eso se encarga la otra función.
export function alIniciarSesionEnOtraPestana(callback: () => void): () => void {
  const escuchar = (evento: StorageEvent) => {
    if (evento.key === CLAVE_SESION_ACTIVA && evento.newValue !== null) callback();
  };
  window.addEventListener("storage", escuchar);
  return () => window.removeEventListener("storage", escuchar);
}
