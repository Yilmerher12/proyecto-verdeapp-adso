// ¿Qué? Eventos de navegador (no Context de React) para avisar cuando el
//       servidor deja de responder o vuelve a responder.
// ¿Para qué? api/axios.ts es el único lugar por donde pasan TODAS las
//           peticiones al backend — es el punto perfecto para detectar
//           "el servidor no respondió en absoluto" (RNF-002.4), sin tener
//           que revisar el error en cada una de las decenas de pantallas
//           que hacen peticiones.
// ¿Impacto? ServerErrorBanner.tsx escucha estos eventos y muestra/oculta un
//           aviso global, visible sin importar en qué pantalla esté el
//           usuario cuando el servidor se caiga.
const SERVER_UNREACHABLE_EVENT = "verdeapp:server-unreachable";
const SERVER_REACHABLE_EVENT = "verdeapp:server-reachable";

export function notificarServidorInalcanzable() {
  window.dispatchEvent(new Event(SERVER_UNREACHABLE_EVENT));
}

export function notificarServidorRecuperado() {
  window.dispatchEvent(new Event(SERVER_REACHABLE_EVENT));
}

export function onServerUnreachable(callback: () => void) {
  window.addEventListener(SERVER_UNREACHABLE_EVENT, callback);
  return () => window.removeEventListener(SERVER_UNREACHABLE_EVENT, callback);
}

export function onServerReachable(callback: () => void) {
  window.addEventListener(SERVER_REACHABLE_EVENT, callback);
  return () => window.removeEventListener(SERVER_REACHABLE_EVENT, callback);
}
