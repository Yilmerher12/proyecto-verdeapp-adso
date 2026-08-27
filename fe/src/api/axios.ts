/**
 * Archivo: api/axios.ts
 * Descripción: Instancia de Axios configurada con la URL base de la API y interceptores.
 * ¿Para qué? Centralizar la configuración HTTP — todos los módulos de API usan esta instancia.
 * ¿Impacto? Sin este archivo, cada petición tendría que configurar la URL, headers y manejo
 *           de errores por separado, causando duplicación y posibles inconsistencias.
 */

import axios from "axios";
import { notificarServidorInalcanzable, notificarServidorRecuperado } from "@/lib/serverStatusEvents";

// La URL de la API sale de esta única variable de entorno de Vite. Antes había
// varias pantallas (dashboards, formularios, DirectorioPage) que se escribían
// "http://localhost:8000" directo en el código — funcionaba mientras probábamos
// en nuestra propia máquina, pero el día que subamos esto a un servidor real,
// esas pantallas específicas se hubieran quedado intentando hablarle a
// "localhost" en vez del servidor de verdad. La exportamos para que cualquier
// archivo del proyecto la pueda importar en vez de escribir la URL a mano.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * ¿Qué? Instancia de Axios preconfigurada con URL base, headers y timeout.
 * ¿Para qué? Reutilizar esta instancia en todos los módulos de API (auth, users, etc.).
 * ¿Impacto? Garantiza consistencia: todas las peticiones usan JSON, timeout de 10s,
 *           y la misma URL base.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 segundos máximo por petición
});

/**
 * ¿Qué? Interceptor de request que agrega el token JWT automáticamente.
 * ¿Para qué? Cada petición a endpoints protegidos necesita el header Authorization.
 *           En vez de agregarlo manualmente en cada llamada, el interceptor lo hace.
 * ¿Impacto? Sin este interceptor, el frontend tendría que pasar el token en cada fetch,
 *           aumentando el riesgo de olvidarlo y recibir 401.
 */
api.interceptors.request.use(
  (config) => {
    // ¿Qué? Lee el access token almacenado en memoria (sessionStorage).
    // ¿Para qué? Adjuntarlo como Bearer token en el header Authorization.
    // ¿Impacto? sessionStorage se borra al cerrar el navegador — más seguro que localStorage.
    const token = sessionStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * ¿Qué? Interceptor de response que maneja errores HTTP de forma centralizada.
 * ¿Para qué? Extraer mensajes de error del backend y formatearlos para el frontend.
 * ¿Impacto? Sin esto, cada componente tendría que parsear el error de Axios por separado.
 */
function manejarRespuestaExitosa(response: import("axios").AxiosResponse) {
  // ¿Qué? Cualquier respuesta exitosa confirma que el servidor SÍ está
  //       respondiendo de nuevo.
  // ¿Para qué? Si el banner de "servidor no disponible" (RNF-002.4) estaba
  //           visible, esto le avisa que ya se puede ocultar — sin esto, el
  //           aviso se quedaría pegado en pantalla para siempre después de
  //           que el servidor se recupera.
  notificarServidorRecuperado();
  return response;
}

// ¿Qué? Evita disparar el redireccionamiento de sesión vencida más de una vez
//       si varias peticiones fallan casi al mismo tiempo con 401.
// ¿Para qué? Sin este candado, 3-4 peticiones en paralelo (algo común al
//           cargar un dashboard) dispararían 3-4 redirecciones seguidas.
// ¿Impacto? Solo la primera detecta la sesión vencida y redirige; las demás
//           se ignoran porque para entonces la redirección ya está en curso.
let sesionExpiradaEnProceso = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function manejarErrorDeRespuesta(error: any) {
  if (error.response) {
    // ¿Qué? Error HTTP del servidor (4xx, 5xx).
    // ¿Para qué? Extraer el mensaje de error del body de la respuesta.
    const data = error.response.data;

    // ¿Qué? Un 401 mientras había un token guardado significa que la sesión
    //       venció DURANTE el uso activo de la app (no es un login con
    //       contraseña incorrecta — ese caso no tiene token guardado todavía).
    // ¿Para qué? Antes, cuando el token expiraba (a los 15-60 minutos), la
    //           app simplemente dejaba de actualizar datos en silencio: cada
    //           petición fallaba con 401 y quedaba atrapada en los `catch`
    //           de cada pantalla, sin ningún aviso — parecía que la app se
    //           había "congelado", no que la sesión había muerto.
    // ¿Impacto? Ahora se limpia la sesión y se manda a login con un aviso
    //           claro, en vez de dejar que las peticiones sigan fallando
    //           sin explicación.
    const haySesionGuardada = !!sessionStorage.getItem("access_token");
    if (error.response.status === 401 && haySesionGuardada && !sesionExpiradaEnProceso) {
      sesionExpiradaEnProceso = true;
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      sessionStorage.setItem("verdeapp:session-expired", "1");
      window.location.href = "/login";
    }

    // ¿Qué? Manejo especial para errores de validación Pydantic (422).
    // ¿Para qué? Los errores 422 tienen estructura { detail: [{loc, msg, type}] }.
    if (error.response.status === 422 && Array.isArray(data.detail)) {
      const messages = data.detail.map(
        (err: { msg: string }) => err.msg,
      );
      error.message = messages.join(". ");
    } else if (typeof data.detail === "string") {
      error.message = data.detail;
    }
    // ¿Qué? Sí hubo respuesta (aunque sea un error 4xx/5xx) — el servidor
    //       está vivo y contestando, así que también cuenta como "se
    //       recuperó" si el banner estaba visible por una caída anterior.
    notificarServidorRecuperado();
  } else if (error.request) {
    // ¿Qué? La petición se envió pero NUNCA llegó ninguna respuesta — ni
    //       siquiera un error. Esto es "servidor no disponible" de verdad
    //       (apagado, caído, sin red), no un error de negocio.
    // ¿Para qué? Informar al usuario que el servidor no respondió
    //           (RNF-002.4) — tanto en el mensaje del error puntual como
    //           con el aviso global para el banner de toda la app.
    error.message = "No se pudo conectar con el servidor";
    notificarServidorInalcanzable();
  }
  return Promise.reject(error);
}

api.interceptors.response.use(manejarRespuestaExitosa, manejarErrorDeRespuesta);

// ¿Qué? Este MISMO interceptor también se registra en el módulo "axios" base
//       (no solo en la instancia "api" de arriba).
// ¿Para qué? Varias pantallas (los 4 dashboards, ProfilePage, DirectorioPage,
//           RegisterPage, y varios de fe/src/lib/*Api.ts) hacen sus peticiones
//           con `import axios from "axios"` directo, no con esta instancia
//           "api" — una instancia creada con axios.create() NO comparte
//           interceptores con el módulo base, así que sin esto el aviso de
//           "servidor no disponible" nunca se dispararía para esas pantallas.
// ¿Impacto? Idealmente esas pantallas migrarían a usar "api" (quedaría más
//           limpio), pero mientras tanto esto garantiza que RNF-002.4 se
//           cumpla para TODA la app, no solo para lo que ya usa "api".
axios.interceptors.response.use(manejarRespuestaExitosa, manejarErrorDeRespuesta);

export default api;
