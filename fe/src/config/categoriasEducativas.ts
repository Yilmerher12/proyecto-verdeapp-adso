import {
  BatteryCharging,
  BookOpen,
  HardHat,
  TriangleAlert,
  Landmark,
  Warehouse,
  Package,
  Recycle,
  Repeat,
  type LucideIcon,
} from "lucide-react";

// ¿Qué? Ícono representativo por categoría del catálogo educativo.
// ¿Para qué? Como modulo_categoria es texto libre en la base de datos (el
//           Admin puede escribir cualquier nombre), este mapa cubre las
//           categorías propuestas para el borrador — cualquier categoría
//           que no esté aquí usa BookOpen como ícono genérico, sin romper
//           la página.
// ¿Impacto? Es solo presentación — agregar/quitar categorías nuevas no
//           requiere ningún cambio en el backend, solo agregar su ícono
//           aquí si se quiere uno específico.
export const ICONOS_CATEGORIAS: Record<string, LucideIcon> = {
  "Separación en la fuente y código de colores": Recycle,
  "Tipos de residuos y su preparación": Package,
  "Puntos limpios y Ecopuntos": Warehouse,
  "Economía circular y aprovechamiento": Repeat,
  "Residuos de construcción y demolición": HardHat,
  "Marco distrital y consumo responsable": Landmark,
  "Residuos peligrosos del hogar": TriangleAlert,
  "Aparatos, llantas y baterías": BatteryCharging,
};

export const ICONO_CATEGORIA_DEFAULT: LucideIcon = BookOpen;

// ¿Qué? Nombre más simple de cada categoría, SOLO para cuando el Reciclador
//       elige el tema al calificar una auditoría (RQF-009).
// ¿Para qué? Decisión del 2026-08-27: los nombres técnicos del catálogo
//           ("Marco distrital y consumo responsable") no eran claros para
//           todos los recicladores. En vez de renombrar la categoría en la
//           base de datos (rompería el vínculo con el catálogo educativo,
//           RQF-013), este mapa solo cambia lo que se MUESTRA en el
//           desplegable — el valor que de verdad se guarda sigue siendo el
//           nombre real de la categoría, igual que ve el Residente en el
//           catálogo educativo.
// ¿Impacto? Cualquier categoría que no esté aquí muestra su nombre real
//           sin romper nada — mismo criterio que ICONOS_CATEGORIAS arriba.
export const NOMBRE_SIMPLE_CATEGORIA: Record<string, string> = {
  "Separación en la fuente y código de colores": "Separación por colores de bolsa",
  // ¿Qué? Antes decía "Cómo entregar el material".
  // ¿Para qué? Ese nombre se podía leer como "dónde entregar" o "qué bolsa usar", pero la lección
  //           habla de cómo dejar limpio y seco cada material (decisión de la tarjeta #597).
  // ¿Impacto? Solo cambia lo que ve el Reciclador en el desplegable, no el vínculo con las auditorías.
  "Tipos de residuos y su preparación": "Cómo preparar el material",
  "Puntos limpios y Ecopuntos": "Objetos grandes (muebles, colchones)",
  "Residuos de construcción y demolición": "Escombros de obra o remodelación",
  // ¿Qué? Antes se llamaba "Consumir menos, botar menos" (decisión del
  //       2026-08-27). ¿Para qué? Ese nombre no dejaba claro qué debía
  //       mirar el reciclador — "cantidad de basura generada" sí es algo
  //       observable comparando una visita con otra (más bolsas que la
  //       semana pasada, el SHUT se llena más rápido de lo normal). Ajuste
  //       del 2026-09-14, a pedido del usuario.
  "Marco distrital y consumo responsable": "Cantidad de basura generada",
  "Economía circular y aprovechamiento": "Por qué es importante reciclar",
  // ¿Qué? El Reciclador sí puede ver pilas, jeringas o medicamentos mezclados en las bolsas.
  // ¿Para qué? Protege su trabajo y evita que contaminen el material aprovechable.
  // ¿Impacto? Aparece en el desplegable apenas exista un módulo de esta categoría (tarjeta #519).
  "Residuos peligrosos del hogar": "Peligrosos mezclados con las bolsas",
};

// ¿Qué? Issue #4 (RQF-013) — de las 6 categorías del catálogo, esta 1 no
//       corresponde a algo que el reciclador pueda calificar mirando el
//       cuarto de basuras en una sola visita ("por qué es importante
//       reciclar" es un tema de conciencia a largo plazo, no un estado
//       físico observable ese día).
// ¿Para qué? AuditoriaConjuntoForm.tsx la excluye del desplegable de
//           "tema" al calificar — sigue existiendo en el catálogo
//           educativo para que el Residente la lea por su cuenta, pero ya
//           no se usa como criterio de auditoría: seguir existiendo para
//           lo suyo, sin ofrecerse donde ya no aplica.
// ¿Impacto? "Marco distrital y consumo responsable" (ahora "Cantidad de
//           basura generada") salió de este set el 2026-09-14 — sí es
//           observable comparando la cantidad de residuos entre visitas.
// ¿Qué? "Aparatos, llantas y baterías" también es solo de lectura (tarjeta #597).
// ¿Para qué? Se entregan en comercios y gestores autorizados, no en el cuarto de basuras:
//           el Reciclador no tiene qué observar sobre ellos en una visita.
export const CATEGORIAS_NO_AUDITABLES = new Set<string>([
  "Economía circular y aprovechamiento",
  "Aparatos, llantas y baterías",
]);

// ¿Qué? El orden en que "Aprende a reciclar" muestra las categorías: primero lo que se entrega al reciclador
//       por el SHUT (grupo A de docs/gestion-proyecto/estructura-contenido-educativo.md) y después lo que
//       no va en bolsas (grupo B).
// ¿Para qué? El servidor ordena el catálogo por nombre de categoría y por orden de lectura dentro de cada
//           una; el orden de las categorías entre sí es de presentación y por eso vive aquí.
// ¿Impacto? Una categoría que no esté en esta lista (la creó el Administrador del Sistema) se muestra
//           después de las de la lista, por orden alfabético.
export const ORDEN_CATEGORIAS: string[] = [
  "Separación en la fuente y código de colores",
  "Tipos de residuos y su preparación",
  "Economía circular y aprovechamiento",
  "Marco distrital y consumo responsable",
  "Puntos limpios y Ecopuntos",
  "Residuos de construcción y demolición",
  "Residuos peligrosos del hogar",
  "Aparatos, llantas y baterías",
];

// ¿Qué? La clave de la frase que explica de qué trata cada categoría (issue #705), en los dos idiomas.
// ¿Para qué? Los nombres como "Marco distrital y consumo responsable" son técnicos; la frase le dice a
//           cualquiera qué va a encontrar adentro.
// ¿Impacto? Una categoría nueva no tiene frase y su tarjeta se ve igual, sin esa línea.
export const FRASE_CATEGORIA: Record<string, string> = {
  "Separación en la fuente y código de colores": "categoriaEducativa.phrases.separacion",
  "Tipos de residuos y su preparación": "categoriaEducativa.phrases.preparacion",
  "Economía circular y aprovechamiento": "categoriaEducativa.phrases.economiaCircular",
  "Marco distrital y consumo responsable": "categoriaEducativa.phrases.consumo",
  "Puntos limpios y Ecopuntos": "categoriaEducativa.phrases.ecopuntos",
  "Residuos de construcción y demolición": "categoriaEducativa.phrases.escombros",
  "Residuos peligrosos del hogar": "categoriaEducativa.phrases.peligrosos",
  "Aparatos, llantas y baterías": "categoriaEducativa.phrases.aparatos",
};
