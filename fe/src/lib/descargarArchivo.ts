// ¿Qué? Baja a disco un archivo que la pantalla ya tiene en memoria (un Blob).
// ¿Para qué? Los archivos que genera el backend (ej. el CSV de la agenda) necesitan la
//           sesión, así que se piden por axios y no con un enlace; esto reemplaza el
//           clic en un enlace "descargar".
// ¿Impacto? Crea un enlace temporal, lo pulsa y lo borra; la URL del archivo se libera
//           en cuanto termina para no dejar el archivo ocupando memoria.
export function descargarArchivo(archivo: Blob, nombre: string): void {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
