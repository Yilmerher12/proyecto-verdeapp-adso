// ¿Qué? Reglas de validación de formulario compartidas entre pantallas
//       (registro y editar perfil). Antes cada una tenía su propia copia.
// ¿Para qué? Que "registrarse" y "editar perfil" exijan exactamente lo
//           mismo para nombre/apellidos/teléfono — una sola fuente de
//           verdad, igual que en el backend (be/app/schemas/user.py).
export const NOMBRE_MIN_LENGTH = 2;

// RQF-008: teléfono colombiano, solo dígitos, entre 7 y 10 caracteres.
export const TELEFONO_REGEX = /^\d{7,10}$/;
