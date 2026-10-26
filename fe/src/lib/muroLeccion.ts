/**
 * Archivo: lib/muroLeccion.ts
 * ¿Qué? Parte el texto de un módulo educativo (Markdown que escribe el
 *       Administrador del Sistema) en una introducción y una lista de tarjetas
 *       cortas, cada una con su título y, si la tiene, su imagen.
 * ¿Para qué? "Aprende a reciclar" muestra cada lección como un muro de tarjetas
 *           de texto corto + imagen, en vez de un bloque de texto seguido. El
 *           backend sigue guardando un solo texto: la partición es solo de pantalla.
 * ¿Impacto? Reglas (las mismas se le explican al Administrador en el formulario):
 *           1. Cada párrafo (separado por una línea en blanco) es una tarjeta.
 *           2. El primer párrafo, si no empieza con un título, es la introducción
 *              ("De qué trata").
 *           3. Título de la tarjeta: un "## Título" solo en su línea, un texto en
 *              negrita al inicio ("**Bolsa blanca:** ...") o una etiqueta corta
 *              antes de los dos puntos ("Bolsa blanca: ...").
 *           4. Una imagen sola en su línea ("![descripción](enlace)") se pega a la
 *              tarjeta que viene justo después.
 *           5. Si el último párrafo no tiene título, se muestra como cierre.
 */

export interface TarjetaMuro {
  titulo: string | null;
  texto: string;
  imagen: string | null;
}

export interface MuroParseado {
  introduccion: string | null;
  tarjetas: TarjetaMuro[];
  cierre: string | null;
}

const SOLO_IMAGEN = /^!\[[^\]]*\]\(\s*([^)\s]+)[^)]*\)$/;
const SOLO_TITULO = /^#{1,3}\s+(.+)$/;
const TITULO_EN_NEGRITA = /^\*\*(.+?)\*\*\s*:?\s*([\s\S]*)$/;
// ¿Qué? Una etiqueta corta antes de los dos puntos: "Bolsa blanca: material limpio".
// ¿Impacto? Sin puntos ni signos de pregunta o exclamación, y de hasta 40 caracteres:
//           una oración larga con dos puntos en medio no se confunde con un título.
const ETIQUETA_CORTA = /^([^.:?!\n]{3,40}):\s+(\S[\s\S]*)$/;

function limpiarTitulo(texto: string): string {
  return texto.replace(/[:\s]+$/, "").trim();
}

export function partirEnTarjetas(cuerpo: string): MuroParseado {
  const bloques = cuerpo
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const tarjetas: TarjetaMuro[] = [];
  let introduccion: string | null = null;
  let imagenPendiente: string | null = null;
  let tituloPendiente: string | null = null;
  let hayTexto = false;

  for (const bloque of bloques) {
    const imagen = bloque.match(SOLO_IMAGEN);
    if (imagen) {
      imagenPendiente = imagen[1];
      continue;
    }
    const soloTitulo = bloque.match(SOLO_TITULO);
    if (soloTitulo && !bloque.includes("\n")) {
      tituloPendiente = limpiarTitulo(soloTitulo[1]);
      continue;
    }

    let titulo: string | null = tituloPendiente;
    let texto = bloque;
    tituloPendiente = null;
    if (titulo === null) {
      const negrita = bloque.match(TITULO_EN_NEGRITA);
      const etiqueta = bloque.match(ETIQUETA_CORTA);
      if (negrita && negrita[2].trim()) {
        titulo = limpiarTitulo(negrita[1]);
        texto = negrita[2].trim();
      } else if (etiqueta) {
        titulo = limpiarTitulo(etiqueta[1]);
        texto = etiqueta[2].trim();
      }
    }

    // ¿Qué? El primer párrafo sin título es la introducción, y no una tarjeta.
    if (!hayTexto && titulo === null) {
      introduccion = texto;
      hayTexto = true;
      imagenPendiente = null;
      continue;
    }
    hayTexto = true;
    tarjetas.push({ titulo, texto, imagen: imagenPendiente });
    imagenPendiente = null;
  }

  // ¿Qué? El último párrafo sin título y sin imagen es el cierre de la lección.
  let cierre: string | null = null;
  const ultima = tarjetas[tarjetas.length - 1];
  if (ultima && ultima.titulo === null && ultima.imagen === null && tarjetas.length > 1) {
    cierre = ultima.texto;
    tarjetas.pop();
  }

  return { introduccion, tarjetas, cierre };
}
