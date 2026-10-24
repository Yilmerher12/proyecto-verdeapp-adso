/**
 * Archivo: components/educativo/IlustracionCategoria.tsx
 * ¿Qué? Una ilustración fija para cada categoría del catálogo educativo
 *       (bolsas de colores, materiales, Ecopunto, escombros, ciclo, balanza) y una
 *       genérica para cualquier categoría nueva.
 * ¿Para qué? Que "Aprende a reciclar" tenga imagen desde el primer día, sin
 *           depender de que el Administrador suba una. Son dibujos del propio
 *           equipo (formas vectoriales), así que no hay derechos de autor de
 *           terceros.
 * ¿Impacto? Es la imagen de cada categoría hasta que un módulo pueda traer la suya.
 *           Los colores son parte del dibujo y por eso van fijos (no son colores de
 *           la interfaz), pero se ven bien en claro y oscuro.
 */

interface Forma {
  d: string;
  fill: string;
  stroke?: string;
  sw?: number;
}

// ¿Qué? Rectángulo con esquinas redondeadas y círculo, escritos como trazado SVG.
const rect = (x: number, y: number, w: number, h: number, k: number) =>
  `M${x + k} ${y}h${w - 2 * k}a${k} ${k} 0 0 1 ${k} ${k}v${h - 2 * k}a${k} ${k} 0 0 1-${k} ${k}h-${w - 2 * k}a${k} ${k} 0 0 1-${k}-${k}v-${h - 2 * k}a${k} ${k} 0 0 1 ${k}-${k}z`;
const circulo = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0-${2 * r} 0z`;

const fondo = (d: string, fill: string): Forma => ({ d, fill });
const SUELO = fondo("M0 128h320v22H0z", "#9fcfb4");
const bolsa = (x: number, fill: string, borde: string): Forma[] => [
  { d: rect(x, 52, 70, 76, 22), fill, stroke: borde, sw: 2 },
  { d: rect(x + 24, 36, 22, 20, 6), fill, stroke: borde, sw: 2 },
];

const ESCENAS: Record<string, Forma[]> = {
  preparacion: [
    SUELO,
    fondo(rect(50, 66, 96, 62, 6), "#d9b382"),
    fondo(rect(92, 66, 12, 62, 0), "#c29a66"),
    fondo(rect(180, 56, 36, 72, 14), "#8fd3f4"),
    fondo(rect(190, 38, 16, 22, 4), "#8fd3f4"),
    fondo(rect(189, 32, 18, 10, 3), "#126749"),
    fondo(rect(236, 76, 42, 52, 8), "#b9c4cc"),
    fondo(rect(236, 76, 42, 9, 4), "#98a5ae"),
  ],
  colores: [
    SUELO,
    ...bolsa(45, "#ffffff", "#b7cbbf"),
    ...bolsa(125, "#26332c", "#26332c"),
    ...bolsa(205, "#3aa66c", "#2c8c58"),
  ],
  ecopuntos: [
    SUELO,
    fondo(rect(36, 86, 60, 42, 6), "#86d6a6"),
    fondo(rect(224, 96, 60, 32, 6), "#5fbf86"),
    fondo("M160 24c-26 0-46 20-46 44 0 32 46 64 46 64s46-32 46-64c0-24-20-44-46-44z", "#126749"),
    fondo(circulo(160, 66, 16), "#ffffff"),
  ],
  escombros: [
    SUELO,
    fondo(rect(60, 100, 60, 28, 3), "#d98c5f"),
    fondo(rect(124, 100, 60, 28, 3), "#c97a4d"),
    fondo(rect(188, 100, 60, 28, 3), "#d98c5f"),
    fondo(rect(92, 70, 60, 28, 3), "#c97a4d"),
    fondo(rect(156, 70, 60, 28, 3), "#d98c5f"),
    fondo(rect(124, 40, 60, 28, 3), "#c97a4d"),
  ],
  circular: [
    SUELO,
    { d: circulo(160, 74, 44), fill: "none", stroke: "#126749", sw: 14 },
    fondo(circulo(160, 30, 11), "#86d6a6"),
    fondo(circulo(198, 96, 11), "#86d6a6"),
    fondo(circulo(122, 96, 11), "#86d6a6"),
  ],
  consumo: [
    SUELO,
    fondo(rect(156, 30, 8, 98, 3), "#126749"),
    fondo(rect(120, 122, 80, 10, 4), "#126749"),
    fondo(rect(70, 36, 180, 8, 4), "#126749"),
    fondo("M70 44l-26 44h52z", "#86d6a6"),
    fondo("M250 44l-26 44h52z", "#86d6a6"),
    fondo("M262 122c0-24 16-34 36-36 0 24-12 38-36 36z", "#3aa66c"),
  ],
  generica: [
    SUELO,
    fondo(circulo(240, 44, 24), "#fde68a"),
    fondo("M120 124c0-48 28-76 76-82 0 48-26 78-76 82z", "#3aa66c"),
    { d: "M120 124c14-22 34-40 62-58", fill: "none", stroke: "#2c8c58", sw: 4 },
  ],
};

// ¿Qué? Qué escena le toca a cada categoría conocida (el nombre es el mismo que
//       guarda el Administrador, igual que en categoriasEducativas.ts).
const ESCENA_POR_CATEGORIA: Record<string, string> = {
  "Tipos de residuos y su preparación": "preparacion",
  "Separación en la fuente y código de colores": "colores",
  "Puntos limpios y Ecopuntos": "ecopuntos",
  "Residuos de construcción y demolición": "escombros",
  "Economía circular y aprovechamiento": "circular",
  "Marco distrital y consumo responsable": "consumo",
};

export function IlustracionCategoria({ categoria, className }: { categoria: string; className?: string }) {
  const formas = ESCENAS[ESCENA_POR_CATEGORIA[categoria] ?? "generica"];
  return (
    <svg
      viewBox="0 0 320 150"
      preserveAspectRatio="xMidYMid slice"
      className={className ?? "block h-full w-full"}
      aria-hidden="true"
    >
      {formas.map((f, i) => (
        <path key={i} d={f.d} fill={f.fill} stroke={f.stroke ?? "none"} strokeWidth={f.sw ?? 0} />
      ))}
    </svg>
  );
}
