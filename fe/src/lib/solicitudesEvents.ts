// ¿Qué? Evento de navegador (no Context de React) para avisar que el número de solicitudes
//       pendientes del Administrador del Sistema puede haber cambiado.
// ¿Para qué? La página de Solicitudes (donde se atienden), el menú lateral (contador) y el panel
//           principal (franja de aviso) leen el mismo número, pero cada uno lo pide por su cuenta con
//           su propio polling. Sin este aviso, atender una solicitud no bajaba el contador del menú
//           hasta el siguiente ciclo (hasta 20 s después).
// ¿Impacto? Misma idea que lib/notificationEvents.ts: quien atiende una solicitud llama a
//           notificarSolicitudesActualizadas() y los demás vuelven a pedir el número al instante.
const SOLICITUDES_ACTUALIZADAS_EVENT = "verdeapp:solicitudes-actualizadas";

export function notificarSolicitudesActualizadas() {
  window.dispatchEvent(new Event(SOLICITUDES_ACTUALIZADAS_EVENT));
}

export function onSolicitudesActualizadas(callback: () => void) {
  window.addEventListener(SOLICITUDES_ACTUALIZADAS_EVENT, callback);
  return () => window.removeEventListener(SOLICITUDES_ACTUALIZADAS_EVENT, callback);
}
