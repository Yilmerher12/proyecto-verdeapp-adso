/**
 * Archivo: pages/PrototipoFichaPuntoAcopioPage.tsx
 * ¿Qué? Prototipo navegable de la ficha del punto de acopio, con tres modelos
 *       (A tarjetas, B lista que se abre, C lista y panel) y las 9 ECA actuales.
 * ¿Para qué? Ver cómo se vería y cómo funcionaría cada modelo ANTES de tocar la
 *           base de datos o el backend (ver docs/gestion-proyecto/prototipo-ficha-punto-acopio.md).
 * ¿Impacto? Solo existe en desarrollo (la ruta se registra con import.meta.env.DEV
 *           en App.tsx). No llama al backend: los datos van fijos aquí. Los textos
 *           están en español sin i18n a propósito, porque es un prototipo que
 *           no llega a los usuarios; la ficha real sí llevará es/en.
 */
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleQuestionMark,
  Info,
  MapPin,
  Navigation,
  Phone,
  UserRound,
  Warehouse,
} from "lucide-react";

type Modelo = "A" | "B" | "C";

interface PuntoPrototipo {
  id: string;
  nombre: string;
  localidad: string;
  direccion: string;
  latitud: number;
  longitud: number;
  // ¿Qué? true solo si el punto coincide con una ECA ACTIVA del inventario de la UAESP.
  // ¿Para qué? Nunca afirmar que una ECA sigue operando si no se confirmó (ver
  //           investigacion-tipos-puntos-acopio.md, hallazgo 2).
  activaEnInventario: boolean;
  areaM2?: number;
}

// ¿Qué? Las 9 ECA del directorio (fuente-datos-puntos-acopio-eca.md, marzo de 2020) con su
//       estado frente al inventario de la UAESP (cruce del 2026-10-21).
const PUNTOS: PuntoPrototipo[] = [
  { id: "kennedy", nombre: "ECA Kennedy", localidad: "Kennedy", direccion: "Carrera 84 # 11A-34", latitud: 4.702475, longitud: -74.100802, activaEnInventario: false },
  { id: "usaquen-1", nombre: "ECA Usaquén I", localidad: "Usaquén", direccion: "Carrera 21 # 164-82", latitud: 4.746127, longitud: -74.04433, activaEnInventario: false },
  { id: "usaquen-2", nombre: "ECA Usaquén II", localidad: "Usaquén", direccion: "Carrera 18 # 164-32", latitud: 4.74557, longitud: -74.041019, activaEnInventario: false },
  { id: "engativa", nombre: "ECA Engativá", localidad: "Engativá", direccion: "Calle 80C # 92-44", latitud: 4.706658, longitud: -74.105517, activaEnInventario: true, areaM2: 1320 },
  { id: "engativa-2", nombre: "ECA Engativá 2 (Las Ferias)", localidad: "Engativá", direccion: "Carrera 69K # 79-49", latitud: 4.688751, longitud: -74.083777, activaEnInventario: false },
  { id: "fontibon", nombre: "ECA Fontibón (Montevideo)", localidad: "Fontibón", direccion: "Calle 17A # 69F-26", latitud: 4.648038, longitud: -74.124241, activaEnInventario: false },
  { id: "martires", nombre: "ECA Mártires", localidad: "Los Mártires", direccion: "Calle 8 # 26-80", latitud: 4.606673, longitud: -74.093227, activaEnInventario: false },
  { id: "puente-aranda-1", nombre: "ECA Puente Aranda 1", localidad: "Puente Aranda", direccion: "Carrera 36 # 19-53", latitud: 4.623344, longitud: -74.092813, activaEnInventario: false },
  { id: "puente-aranda-2", nombre: "ECA Puente Aranda 2", localidad: "Puente Aranda", direccion: "Carrera 65B # 17-80", latitud: 4.638516, longitud: -74.113242, activaEnInventario: true, areaM2: 1000 },
];

const MODELOS: { id: Modelo; nombre: string; ayuda: string }[] = [
  { id: "A", nombre: "A · Tarjetas", ayuda: "Todo a la vista, con foto arriba" },
  { id: "B", nombre: "B · Lista que se abre", ayuda: "Compacta; la ficha se abre al tocar" },
  { id: "C", nombre: "C · Lista y panel", ayuda: "Lista a un lado, ficha al otro" },
];

// ¿Qué? Enlace a Google Maps con las coordenadas; no necesita clave ni librería.
// ¿Impacto? Las coordenadas son de 2020: la ficha avisa que la ubicación es aproximada.
function urlMapa(p: PuntoPrototipo): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.latitud},${p.longitud}`;
}

function EstadoEtiqueta({ activa }: { activa: boolean }) {
  return activa ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-accent-800 dark:bg-accent-300/15 dark:text-accent-300">
      <CircleCheck className="icon-sm" />
      Activa en inventario
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-gray-700 dark:bg-night-inset dark:text-gray-300">
      <CircleQuestionMark className="icon-sm" />
      Por confirmar
    </span>
  );
}

// ¿Qué? El "dibujo por defecto" que se muestra mientras un punto no tenga foto propia.
function FotoPorDefecto({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center bg-accent-100 text-accent-700 dark:bg-accent-300/10 dark:text-accent-400 ${className}`}
    >
      <Warehouse className="icon-xl" />
    </div>
  );
}

function BotonComoLlegar({ p }: { p: PuntoPrototipo }) {
  return (
    <a
      href={urlMapa(p)}
      target="_blank"
      rel="noopener noreferrer"
      className="touch-target-h flex items-center justify-center gap-1.5 rounded-lg bg-accent-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-600 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
    >
      <Navigation className="icon-sm" />
      Cómo llegar
    </a>
  );
}

// ¿Qué? Datos de contacto y aviso de ubicación, iguales en los tres modelos.
function DatosFicha({ p }: { p: PuntoPrototipo }) {
  return (
    <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
      <p className="flex items-start gap-1.5">
        <MapPin className="icon-sm mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" />
        <span>
          {p.direccion} · {p.localidad}
        </span>
      </p>
      <p className="flex items-start gap-1.5">
        <Phone className="icon-sm mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" />
        <span>Sin teléfono publicado. Consulta a la UAESP: 601 3580400</span>
      </p>
      <p className="flex items-start gap-1.5">
        <UserRound className="icon-sm mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" />
        <span>Encargado: sin dato</span>
      </p>
      {p.areaM2 && (
        <p className="flex items-start gap-1.5">
          <Warehouse className="icon-sm mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" />
          <span>Área registrada: {p.areaM2.toLocaleString("es-CO")} m²</span>
        </p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">Ubicación aproximada (dato de 2020).</p>
    </div>
  );
}

function ModeloA() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {PUNTOS.map((p) => (
        <article
          key={p.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-night-line dark:bg-night-card"
        >
          <FotoPorDefecto className="h-28" />
          <div className="flex flex-1 flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 break-words font-semibold text-gray-900 dark:text-white">{p.nombre}</h3>
              <EstadoEtiqueta activa={p.activaEnInventario} />
            </div>
            <DatosFicha p={p} />
            <div className="mt-auto pt-1">
              <BotonComoLlegar p={p} />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ModeloB() {
  const [abierto, setAbierto] = useState<string | null>(PUNTOS[0].id);
  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:divide-night-line dark:border-night-line dark:bg-night-card">
      {PUNTOS.map((p) => {
        const estaAbierto = abierto === p.id;
        return (
          <li key={p.id}>
            <button
              type="button"
              aria-expanded={estaAbierto}
              onClick={() => setAbierto(estaAbierto ? null : p.id)}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-night-hover"
            >
              <FotoPorDefecto className="h-11 w-11 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-gray-900 dark:text-white">{p.nombre}</span>
                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                  {p.localidad} · {p.direccion}
                </span>
              </span>
              <EstadoEtiqueta activa={p.activaEnInventario} />
              {estaAbierto ? <ChevronUp className="icon-md shrink-0 text-gray-500" /> : <ChevronDown className="icon-md shrink-0 text-gray-500" />}
            </button>
            {estaAbierto && (
              <div className="flex flex-col gap-4 bg-gray-50 px-4 py-4 sm:flex-row dark:bg-night-inset/60">
                <FotoPorDefecto className="h-28 rounded-xl sm:w-40 sm:shrink-0" />
                <div className="min-w-0 flex-1 space-y-3">
                  <DatosFicha p={p} />
                  <BotonComoLlegar p={p} />
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ModeloC() {
  const [seleccionado, setSeleccionado] = useState<string>(PUNTOS[0].id);
  const p = PUNTOS.find((x) => x.id === seleccionado) ?? PUNTOS[0];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:col-span-2 dark:divide-night-line dark:border-night-line dark:bg-night-card">
        {PUNTOS.map((punto) => {
          const activo = punto.id === seleccionado;
          return (
            <li key={punto.id}>
              <button
                type="button"
                aria-current={activo}
                onClick={() => setSeleccionado(punto.id)}
                className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activo
                    ? "bg-accent-50 dark:bg-accent-300/10"
                    : "hover:bg-gray-50 dark:hover:bg-night-hover"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-900 dark:text-white">{punto.nombre}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{punto.localidad}</span>
                </span>
                <EstadoEtiqueta activa={punto.activaEnInventario} />
              </button>
            </li>
          );
        })}
      </ul>

      <article
        aria-label={`Ficha de ${p.nombre}`}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:col-span-3 lg:self-start dark:border-night-line dark:bg-night-card"
      >
        <FotoPorDefecto className="h-36" />
        <div className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 break-words text-lg font-bold text-gray-900 dark:text-white">{p.nombre}</h3>
            <EstadoEtiqueta activa={p.activaEnInventario} />
          </div>
          <DatosFicha p={p} />
          <BotonComoLlegar p={p} />
        </div>
      </article>
    </div>
  );
}

export function PrototipoFichaPuntoAcopioPage() {
  const [modelo, setModelo] = useState<Modelo>("C");
  const actual = MODELOS.find((m) => m.id === modelo) ?? MODELOS[2];

  return (
    <div className="mx-auto max-w-5xl 2xl:max-w-6xl space-y-6 pt-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-night-line dark:bg-night-card">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prototipo: ficha del punto de acopio</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tres formas de mostrar las 9 ECA actuales. Elige un modelo y pruébalo en celular, en modo oscuro y en pantalla grande.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-900 dark:border-accent-300/40 dark:bg-accent-300/10 dark:text-accent-200">
        <Info className="icon-lg mt-0.5 shrink-0 text-accent-600 dark:text-accent-400" />
        <p>
          Esto es un prototipo con datos fijos: no guarda nada ni usa el backend. Los puntos con la etiqueta "Por confirmar" no
          se pueden afirmar como activos hasta que responda la UAESP, y las fotos de abajo son un dibujo por defecto.
        </p>
      </div>

      <div role="tablist" aria-label="Modelo de la ficha" className="flex flex-wrap gap-2">
        {MODELOS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={modelo === m.id}
            onClick={() => setModelo(m.id)}
            className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              modelo === m.id
                ? "border-accent-700 bg-accent-700 text-white dark:border-accent-300 dark:bg-accent-300 dark:text-accent-950"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-night-line dark:bg-night-panel dark:text-gray-300 dark:hover:bg-night-hover"
            }`}
          >
            {m.nombre}
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{actual.ayuda}</p>

      {modelo === "A" && <ModeloA />}
      {modelo === "B" && <ModeloB />}
      {modelo === "C" && <ModeloC />}
    </div>
  );
}
