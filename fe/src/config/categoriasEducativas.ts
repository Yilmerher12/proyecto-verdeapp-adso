import {
  BookOpen,
  HardHat,
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
  "Tipos de residuos y su preparación": "Cómo entregar el material",
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
};

// ¿Qué? Issue #4 (RQF-013) — de las 6 categorías del catálogo, esta 1 no
//       corresponde a algo que el reciclador pueda calificar mirando el
//       cuarto de basuras en una sola visita ("por qué es importante
//       reciclar" es un tema de conciencia a largo plazo, no un estado
//       físico observable ese día).
// ¿Para qué? AuditoriaConjuntoForm.tsx la excluye del desplegable de
//           "tema" al calificar — sigue existiendo en el catálogo
//           educativo para que el Residente la lea por su cuenta, pero ya
//           no se usa como criterio de auditoría. Mismo criterio ya usado
//           para "Excelente" en nivelesDesempeno.ts: seguir existiendo
//           para lo suyo, sin ofrecerse donde ya no aplica.
// ¿Impacto? "Marco distrital y consumo responsable" (ahora "Cantidad de
//           basura generada") salió de este set el 2026-09-14 — sí es
//           observable comparando la cantidad de residuos entre visitas.
export const CATEGORIAS_NO_AUDITABLES = new Set<string>([
  "Economía circular y aprovechamiento",
]);
