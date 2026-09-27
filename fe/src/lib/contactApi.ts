import axios from "axios";
import { API_BASE_URL } from "@/api/axios";

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// ¿Qué? Issue #351 — POST /api/v1/contact, público (sin sesión).
// ¿Impacto? Si el correo no sale, el backend responde 503 y esto lanza:
//          la pantalla nunca muestra "enviado" sin que se haya enviado.
export async function enviarMensajeContacto(datos: ContactMessage): Promise<void> {
  await axios.post(`${API_BASE_URL}/api/v1/contact`, datos);
}
