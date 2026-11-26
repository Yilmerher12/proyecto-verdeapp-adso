/**
 * Archivo: lib/progresoEducativo.ts
 * ¿Qué? Las reglas de "Aprende a reciclar" en un solo lugar: cómo se agrupan y ordenan las categorías,
 *       cuál es la primera lección sin ver, cuánto lleva el Residente y a dónde lleva cada enlace
 *       (issue #705, docs/gestion-proyecto/rediseno-aprende-a-reciclar.md).
 * ¿Para qué? El catálogo, la lista de una categoría, la lección, "Tu semana" y las notificaciones
 *           necesitan las mismas respuestas; así ninguno las calcula por su cuenta.
 * ¿Impacto? Son funciones puras: no llaman al servidor. El orden de las lecciones de una categoría es el
 *           campo `orden` que guarda el servidor; el de las categorías, ORDEN_CATEGORIAS.
 */
import { ORDEN_CATEGORIAS } from "@/config/categoriasEducativas";
import type { ContenidoEducativo } from "@/lib/contenidoEducativoApi";

export type EstadoCategoria = "sinEmpezar" | "enCurso" | "completa";

export interface CategoriaEducativa {
  nombre: string;
  modulos: ContenidoEducativo[];
}

export interface ProgresoCategoria {
  vistos: number;
  total: number;
  estado: EstadoCategoria;
}

export const RUTA_CATALOGO = "/catalogo-educativo";

export function rutaCategoria(nombre: string): string {
  return `${RUTA_CATALOGO}/${encodeURIComponent(nombre)}`;
}

export function rutaLeccion(id: string): string {
  return `${RUTA_CATALOGO}/leccion/${id}`;
}

// ¿Qué? Los módulos de una categoría en su orden de lectura.
export function modulosDe(contenido: ContenidoEducativo[], categoria: string): ContenidoEducativo[] {
  return contenido.filter((c) => c.modulo_categoria === categoria).sort((a, b) => a.orden - b.orden);
}

// ¿Qué? Las categorías con sus módulos, en el orden de ORDEN_CATEGORIAS; las que no estén ahí van al final.
export function agruparPorCategoria(contenido: ContenidoEducativo[]): CategoriaEducativa[] {
  const nombres = Array.from(new Set(contenido.map((c) => c.modulo_categoria)));
  const posicion = (nombre: string) => {
    const i = ORDEN_CATEGORIAS.indexOf(nombre);
    return i === -1 ? ORDEN_CATEGORIAS.length : i;
  };
  nombres.sort((a, b) => posicion(a) - posicion(b) || a.localeCompare(b, "es"));
  return nombres.map((nombre) => ({ nombre, modulos: modulosDe(contenido, nombre) }));
}

// ¿Qué? La primera lección que el Residente todavía no ha abierto, en el orden de lectura.
export function primeraSinVer(modulos: ContenidoEducativo[], vistos: Set<string>): ContenidoEducativo | undefined {
  return modulos.find((m) => !vistos.has(m.id_contenido));
}

export function progresoDe(modulos: ContenidoEducativo[], vistos: Set<string>): ProgresoCategoria {
  const total = modulos.length;
  const vistosCategoria = modulos.filter((m) => vistos.has(m.id_contenido)).length;
  const estado: EstadoCategoria =
    vistosCategoria === 0 ? "sinEmpezar" : vistosCategoria === total ? "completa" : "enCurso";
  return { vistos: vistosCategoria, total, estado };
}

// ¿Qué? Anterior y siguiente de una lección dentro de su categoría.
export function vecinosDe(modulos: ContenidoEducativo[], id: string) {
  const i = modulos.findIndex((m) => m.id_contenido === id);
  return {
    anterior: i > 0 ? modulos[i - 1] : undefined,
    siguiente: i !== -1 && i < modulos.length - 1 ? modulos[i + 1] : undefined,
  };
}

// ¿Qué? A dónde lleva un enlace que solo sabe la categoría (el bloque "Tu semana", el aviso de una auditoría
//       y el botón "Empezar / Continuar"): a la primera lección sin ver; si ya vio todas, a la lista.
export function destinoDeCategoria(contenido: ContenidoEducativo[], categoria: string, vistos: Set<string>): string {
  const siguiente = primeraSinVer(modulosDe(contenido, categoria), vistos);
  return siguiente ? rutaLeccion(siguiente.id_contenido) : rutaCategoria(categoria);
}
