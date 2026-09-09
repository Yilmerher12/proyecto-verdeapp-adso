// ¿Qué? Evento de navegador (no Context de React) para avisar que la foto de
//       perfil del usuario en sesión puede haber cambiado.
// ¿Para qué? Mismo problema que ya resuelve notificationEvents.ts para el
//           contador de notificaciones: ProfilePage y AppShell (el círculo
//           de la barra lateral) mantienen cada uno su propia copia de los
//           datos del usuario — sin esto, subir una foto nueva en
//           ProfilePage no se reflejaba en la barra lateral hasta recargar
//           la página o volver a iniciar sesión.
// ¿Impacto? ProfilePage dispara este evento justo después de subir una foto
//           con éxito; AppShell lo escucha y vuelve a pedir /users/me de
//           inmediato.
const FOTO_PERFIL_ACTUALIZADA_EVENT = "verdeapp:foto-perfil-actualizada";

export function notificarFotoPerfilActualizada() {
  window.dispatchEvent(new Event(FOTO_PERFIL_ACTUALIZADA_EVENT));
}

export function onFotoPerfilActualizada(callback: () => void) {
  window.addEventListener(FOTO_PERFIL_ACTUALIZADA_EVENT, callback);
  return () => window.removeEventListener(FOTO_PERFIL_ACTUALIZADA_EVENT, callback);
}
