// ¿Qué? Evento de navegador (no Context de React) para avisar que el conteo
//       de notificaciones no leídas puede haber cambiado.
// ¿Para qué? AppShell.tsx (la campanita del header) y cada dashboard por rol
//           (Residente, Reciclador, Admin Conjunto) mantienen su propia lista
//           de notificaciones, cada una con su propio polling de 20s — no
//           comparten estado. Sin esto, marcar una notificación como leída
//           en el dashboard no se reflejaba en la campanita hasta el
//           siguiente ciclo de polling (hasta 20s después).
// ¿Impacto? Cada dashboard dispara este evento justo después de marcar
//           leídas sus notificaciones; AppShell lo escucha y refresca el
//           contador de inmediato, sin esperar al polling.
const NOTIFICACIONES_ACTUALIZADAS_EVENT = "verdeapp:notificaciones-actualizadas";

export function notificarNotificacionesActualizadas() {
  window.dispatchEvent(new Event(NOTIFICACIONES_ACTUALIZADAS_EVENT));
}

export function onNotificacionesActualizadas(callback: () => void) {
  window.addEventListener(NOTIFICACIONES_ACTUALIZADAS_EVENT, callback);
  return () => window.removeEventListener(NOTIFICACIONES_ACTUALIZADAS_EVENT, callback);
}
