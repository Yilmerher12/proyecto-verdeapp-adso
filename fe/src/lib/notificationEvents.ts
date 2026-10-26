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

// ¿Qué? Segundo evento, solo para cuando algo cambió desde el menú de la campanita (issue #516).
// ¿Para qué? Los paneles de Residente, Reciclador y Admin de Conjunto también muestran la lista
//           de notificaciones. Si escucharan el evento de arriba, cada vez que marcaran algo
//           ellos mismos volverían a pedir su propia lista de inmediato (y pisarían lo que
//           acaban de actualizar). Este solo lo dispara la campanita.
// ¿Impacto? Marcar o limpiar desde la campanita actualiza los paneles al instante, sin esperar
//           al siguiente polling de 20 s.
const CAMBIO_DESDE_CAMPANITA_EVENT = "verdeapp:notificaciones-cambio-desde-campanita";

export function notificarCambioDesdeCampanita() {
  window.dispatchEvent(new Event(CAMBIO_DESDE_CAMPANITA_EVENT));
}

export function onCambioDesdeCampanita(callback: () => void) {
  window.addEventListener(CAMBIO_DESDE_CAMPANITA_EVENT, callback);
  return () => window.removeEventListener(CAMBIO_DESDE_CAMPANITA_EVENT, callback);
}

// ¿Qué? Escucha los dos eventos a la vez.
// ¿Para qué? AppShell necesita recalcular el número rojo sin importar quién marcó algo (un
//           panel o la campanita). La campanita solo dispara el segundo evento, así no se
//           vuelve a pedir su propia lista justo después de actualizarla.
export function onCualquierCambioDeNotificaciones(callback: () => void) {
  const cancelarPanel = onNotificacionesActualizadas(callback);
  const cancelarCampanita = onCambioDesdeCampanita(callback);
  return () => {
    cancelarPanel();
    cancelarCampanita();
  };
}
