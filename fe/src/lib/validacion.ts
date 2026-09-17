// ¿Qué? Reglas de validación de formulario compartidas entre pantallas
//       (registro y editar perfil). Antes cada una tenía su propia copia.
// ¿Para qué? Que "registrarse" y "editar perfil" exijan exactamente lo
//           mismo para nombre/apellidos/teléfono — una sola fuente de
//           verdad, igual que en el backend (be/app/schemas/user.py).
export const NOMBRE_MIN_LENGTH = 2;

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
