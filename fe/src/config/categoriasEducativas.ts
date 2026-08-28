import {
  BookOpen,
  HardHat,
  Landmark,
  MapPin,
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
  "Puntos limpios y Ecopuntos": MapPin,
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
  "Marco distrital y consumo responsable": "Consumir menos, botar menos",
  "Economía circular y aprovechamiento": "Por qué es importante reciclar",
};
