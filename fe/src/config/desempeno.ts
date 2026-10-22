/**
 * Archivo: config/desempeno.ts
 * ¿Qué? Los números que fijan cómo se ve el desempeño semanal de un conjunto
 *       (issue #487): períodos que se pueden elegir, el de por defecto y el
 *       mínimo de auditorías para mostrar la gráfica.
 * ¿Para qué? Un solo lugar para ajustarlos; los usan la página del Admin de
 *           Conjunto y (issue #488) la sección del Residente.
 * ¿Impacto? PERIODOS_SEMANAS debe coincidir con SEMANAS_PERMITIDAS de
 *           be/app/services/auditoria_conjunto_service.py: el backend responde
 *           422 a cualquier otro valor.
 */
export const PERIODOS_SEMANAS = [4, 8, 12] as const;
export const SEMANAS_POR_DEFECTO = 8;

// ¿Qué? Con menos auditorías que esto en el período no se dibuja la gráfica.
// ¿Para qué? Con 1 o 2 barras no hay tendencia que leer: se avisa en vez de
//           mostrar una gráfica que parece decir algo y no dice nada.
export const MINIMO_AUDITORIAS_GRAFICA = 4;
