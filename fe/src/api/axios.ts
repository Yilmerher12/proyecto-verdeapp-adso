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
// ¿Qué? RNF-001.9: el token de sesión ya no vive en sessionStorage — vive
//       en una cookie httpOnly que el propio navegador adjunta solo en
//       cada petición. "withCredentials: true" es lo que le dice a axios
//       "sí, incluye las cookies de este origen en cada request" (por
//       defecto NO lo hace, a diferencia de un <form> HTML normal).
// ¿Para qué? Reemplaza al interceptor manual que antes leía el token de
//           sessionStorage y lo pegaba en el header Authorization — ya no
//           hace falta: el navegador hace ese trabajo solo, y el
//           JavaScript de la app nunca llega a ver el valor del token.
// ¿Impacto? Sin esto, ninguna petición llevaría la cookie de sesión y
//           todo endpoint protegido respondería 401 aunque el usuario ya
//           hubiera iniciado sesión.
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 segundos máximo por petición
  withCredentials: true,
});

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

// ¿Qué? Issue #319: rutas donde un 401 NO significa "venció el access
//       token", así que no tiene sentido intentar renovar la sesión.
// ¿Para qué? En /auth/login un 401 es "contraseña incorrecta"; en
//           /auth/refresh y /auth/logout, renovar desde ahí mismo sería un
//           ciclo sin fin.
const RUTAS_SIN_RENOVACION = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

function esRutaSinRenovacion(url: string | undefined): boolean {
  return !!url && RUTAS_SIN_RENOVACION.some((ruta) => url.includes(ruta));
}

// ¿Qué? Cliente aparte, SIN interceptores, solo para llamar a /auth/refresh.
// ¿Para qué? Si la renovación usara "api" o "axios", su propio 401 pasaría
//           por manejarErrorDeRespuesta y mandaría al login antes de que se
//           pudiera hacer el reintento de abajo.
const clienteRenovacion = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 10000 });

// ¿Qué? La renovación que está en curso, compartida por todas las
//       peticiones que fallen con 401 al mismo tiempo.
// ¿Para qué? Desde el issue #308 cada refresh token sirve UNA sola vez. Al
//           abrir un dashboard salen 3-4 peticiones juntas: si cada una
//           llamara a /auth/refresh, la primera gastaría el token y las
//           demás fallarían y sacarían al usuario. Con esto solo la primera
//           renueva y las demás esperan ese mismo resultado.
let renovacionEnCurso: Promise<void> | null = null;

function renovarSesion(): Promise<void> {
  if (!renovacionEnCurso) {
    renovacionEnCurso = clienteRenovacion
      .post("/api/v1/auth/refresh")
      .then(() => undefined)
      // ¿Qué? Si falla no se decide aquí: igual se reintenta la petición
      //       original (ver manejarErrorDeRespuesta) y ESE resultado decide.
      .catch(() => undefined)
      .finally(() => {
        renovacionEnCurso = null;
      });
  }
  return renovacionEnCurso;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function manejarErrorDeRespuesta(error: any) {
  const haySesionGuardada = sessionStorage.getItem("verdeapp:sesion-activa") === "1";
  const configOriginal = error.config;

  // ¿Qué? Issue #319: el access token dura 15 minutos y el refresh token
  //       7 días, pero antes nadie llamaba a /auth/refresh — al vencer el
  //       access token, la app mandaba al login aunque el refresh token
  //       siguiera sirviendo. Ahora: renovar y repetir la petición UNA vez.
  // ¿Para qué? Que la sesión dure lo que debe (hasta 7 días sin usar la
  //           app; cada renovación entrega un refresh token nuevo con 7
  //           días más) sin que el usuario note nada.
  // ¿Impacto? La petición se repite aunque la renovación haya fallado: con
  //           dos pestañas abiertas (cookies compartidas), la otra pestaña
  //           puede haber renovado un instante antes y gastado el refresh
  //           token — sus cookies nuevas también le sirven a esta. Si el
  //           reintento vuelve a dar 401, ya tiene "_reintentado" y cae al
  //           bloque de abajo, que manda al login como antes.
  if (
    error.response?.status === 401 &&
    haySesionGuardada &&
    configOriginal &&
    !configOriginal._reintentado &&
    !esRutaSinRenovacion(configOriginal.url)
  ) {
    configOriginal._reintentado = true;
    await renovarSesion();
    return axios.request(configOriginal);
  }

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
    // ¿Qué? RNF-001.9: el token vive en una cookie httpOnly — JavaScript no
    //       puede leerla para saber si "hay sesión guardada". En su lugar,
    //       se revisa una banderita sin ningún valor secreto que
    //       AuthContext.tsx pone en sessionStorage justo después de un
    //       login/getMe exitoso, y borra al cerrar sesión.
    // ¿Qué? Issue #319: aquí solo llega un 401 que YA pasó por la
    //       renovación de arriba y siguió fallando — la sesión de verdad
    //       terminó (refresh token vencido, revocado o de antes de un
    //       cambio de contraseña).
    if (error.response.status === 401 && haySesionGuardada && !sesionExpiradaEnProceso) {
      sesionExpiradaEnProceso = true;
      sessionStorage.removeItem("verdeapp:sesion-activa");
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

// ¿Qué? Mismo motivo que el interceptor de arriba: "withCredentials" se
//       configuró en la instancia "api" (vía axios.create()), pero eso no
//       se hereda automáticamente al módulo base "axios" — las pantallas
//       que hacen `import axios from "axios"` directo necesitan esta
//       misma bandera activada aparte, o sus peticiones no llevarían la
//       cookie de sesión.
axios.defaults.withCredentials = true;

export default api;
