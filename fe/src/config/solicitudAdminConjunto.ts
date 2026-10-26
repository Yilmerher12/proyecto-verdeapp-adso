// ¿Qué? Correo al que escribe quien pide una cuenta de Administrador de Conjunto
//       (o que le asignen otro conjunto) y los asuntos que se precargan.
// ¿Para qué? Un solo lugar para la dirección: si el equipo cambia de cuenta, se
//           cambia aquí y la pantalla del registro y la de "Solicitar otro
//           conjunto" quedan al día.
// ¿Impacto? Es una excepción a la regla de no mostrar correos en la app: esta
//           pantalla pide documentos adjuntos y el formulario de contacto no
//           puede llevarlos. La cuenta es solo para este trámite (decisión del
//           equipo, issue #457). Los correos le llegan al Admin del Sistema.
export const SOLICITUD_ADMIN_EMAIL = "administradorverdeapp@gmail.com";
