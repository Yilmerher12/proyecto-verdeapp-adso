// ¿Qué? Reglas de validación de formulario compartidas entre pantallas
//       (registro, editar perfil y aceptar invitación). Antes cada una
//       tenía su propia copia.
// ¿Para qué? Que las tres pantallas exijan exactamente lo mismo — una sola
//           fuente de verdad, igual que en el backend (be/app/schemas/user.py).
// ¿Impacto? Si cambia una regla aquí, debe cambiar también en el backend: el
//           backend es el que de verdad protege (alguien puede llamar a la API
//           sin pasar por el formulario).
export const NOMBRE_MIN_LENGTH = 2;

// ¿Qué? Máximos = tamaño de la columna en la base de datos.
// ¿Para qué? Se usan como maxLength en el input (el formulario ni deja
//           escribir de más) y el backend responde 422 si llega algo más largo.
export const NOMBRE_MAX_LENGTH = 100;
export const APELLIDOS_MAX_LENGTH = 150;
export const UNIDAD_MAX_LENGTH = 10;
export const CORREO_MAX_LENGTH = 255;
export const ASOCIACION_MAX_LENGTH = 100;
export const TELEFONO_MAX_LENGTH = 10;

// ¿Qué? Issue #351 — límites del formulario de contacto.
// ¿Impacto? Deben coincidir con be/app/schemas/contact.py.
export const CONTACTO_ASUNTO_MIN_LENGTH = 3;
export const CONTACTO_ASUNTO_MAX_LENGTH = 150;
export const CONTACTO_MENSAJE_MIN_LENGTH = 10;
export const CONTACTO_MENSAJE_MAX_LENGTH = 2000;

// ¿Qué? Issue #352 — límites de los formularios de administración. Los de
//       columnas String son el tamaño real en la base de datos; los de
//       columnas Text (comunicado, novedad, cuerpo, descripción, motivos)
//       son un máximo de la app.
// ¿Impacto? Deben coincidir con los *_MAX_LENGTH de be/app/schemas/ y de
//          be/app/utils/enlaces.py.
export const ENLACE_MAX_LENGTH = 500;
export const COMUNICADO_TEXTO_MAX_LENGTH = 2000;
export const NOVEDAD_TEXTO_MAX_LENGTH = 2000;
export const CONTENIDO_MODULO_MAX_LENGTH = 255;
export const CONTENIDO_TITULO_MAX_LENGTH = 255;
export const CONTENIDO_CUERPO_MAX_LENGTH = 10000;
export const PUNTO_ACOPIO_NOMBRE_MAX_LENGTH = 200;
export const PUNTO_ACOPIO_DIRECCION_MAX_LENGTH = 255;
export const PUNTO_ACOPIO_ENCARGADO_MAX_LENGTH = 100;
export const PUNTO_ACOPIO_TELEFONO_MAX_LENGTH = 15;
export const AUDITORIA_DESCRIPCION_MAX_LENGTH = 255;
export const DESVINCULACION_MOTIVO_MAX_LENGTH = 1000;
export const NIT_MAX_LENGTH = 50;
// ¿Qué? Tope razonable de apartamentos de un conjunto (evita un typo como 1200000).
// ¿Impacto? Debe coincidir con TOTAL_APARTAMENTOS_MAX de be/app/schemas/conjunto_panel.py.
export const TOTAL_APARTAMENTOS_MAX = 20000;

// ¿Qué? Enlace de video: mismos formatos que reconoce YoutubeEmbed, pero
//       exigiendo https:// como el backend (be/app/utils/enlaces.py, issues
//       #314 y #357). Lo usan contenido educativo y novedades.
export const REGEX_VIDEO_YOUTUBE = /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]{11}/;

// ¿Qué? Mismo chequeo de formato de correo que ya usan registro y login.
export const CORREO_REGEX = /\S+@\S+\.\S+/;

// ¿Qué? Nombres y apellidos: letras de cualquier idioma (con tildes y ñ),
//       separadas por espacio, apóstrofe, punto o guion ("María José",
//       "O'Connor", "Ma. Fernanda"). Empieza con letra.
// ¿Para qué? Antes solo había un mínimo de 2 caracteres, así que
//           "Juan123" o "@@" pasaban como nombre.
export const NOMBRE_REGEX = /^\p{L}[\p{L} '.-]*$/u;

// RQF-008: teléfono colombiano, solo dígitos, entre 7 y 10 caracteres.
export const TELEFONO_REGEX = /^\d{7,10}$/;

// ¿Qué? Issue #255 — formato de Torre/Bloque y Apartamento: letras y
//       números, con un solo espacio o guion como separador entre partes
//       ("12-B"), nunca repetido ni suelto al principio o final.
// ¿Para qué? Mismo regex que ya valida el backend (be/app/schemas/user.py)
//           — descarta solo lo que claramente no es un dato real (puros
//           símbolos, guiones repetidos), sin imponer un formato más
//           estricto que rechazaría convenciones reales de nomenclatura.
export const UNIDAD_REGEX = /^[A-Za-z0-9]+(?:[ -][A-Za-z0-9]+)*$/;

// ¿Qué? Código de acceso del conjunto: exactamente 6 caracteres del mismo
//       alfabeto con el que lo genera el backend (be/app/utils/codigo_acceso.py),
//       que no incluye los que se confunden al leerlos: 0/O y 1/I/L.
export const CODIGO_ACCESO_LONGITUD = 6;
export const CODIGO_ACCESO_REGEX = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/**
 * ¿Qué? Error de un nombre o apellido, o undefined si es válido.
 * ¿Para qué? Registro, perfil e invitación validan nombre y apellidos igual;
 *           devuelve el MOTIVO y cada pantalla lo traduce con su propio texto.
 */
export function motivoNombreInvalido(
  valor: string,
  maximo: number,
): "requerido" | "corto" | "largo" | "formato" | undefined {
  const texto = valor.trim();
  if (!texto) return "requerido";
  if (texto.length < NOMBRE_MIN_LENGTH) return "corto";
  if (texto.length > maximo) return "largo";
  if (!NOMBRE_REGEX.test(texto)) return "formato";
  return undefined;
}
