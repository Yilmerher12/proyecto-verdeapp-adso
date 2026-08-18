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
