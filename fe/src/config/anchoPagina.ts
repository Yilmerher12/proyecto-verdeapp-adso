/**
 * Archivo: config/anchoPagina.ts
 * ¿Qué? Los tres anchos que puede tener una página de VerdeApp, en vez de uno distinto por página.
 *       - normal: ocupa todo el área disponible (paneles, listas, catálogos, perfil, administración).
 *       - lectura: ancho cómodo para leer (48 rem), para listas cortas de avisos.
 *       - formulario: ancho de un formulario corto (32 rem).
 * ¿Para qué? Antes cada página escribía su propio `max-w-*` (3xl, 4xl, 5xl, 6xl...) y los cuatro
 *           paneles sumaban además su propio relleno lateral: unas páginas llegaban al borde y a otras
 *           les sobraba espacio. Con tres anchos fijos todas se ven igual de ordenadas.
 *           Los argumentos completos están en docs/gestion-proyecto/decision-ancho-de-paginas.md.
 * ¿Impacto? "normal" NO lleva tope propio: lo da el área principal del AppShell (`max-w-7xl`, 80 rem), que
 *           es el único lugar donde se define. Todo está en rem, así que en un televisor 4K (donde la
 *           letra crece, ver `html` en index.css) las páginas escalan solas. El relleno lateral lo pone
 *           solo el AppShell: una página no debe agregar `px-*` ni `sm:p-*` propios en su contenedor.
 */
export const ANCHO_PAGINA = {
  normal: "mx-auto w-full",
  lectura: "mx-auto w-full max-w-3xl",
  formulario: "mx-auto w-full max-w-lg",
} as const;
