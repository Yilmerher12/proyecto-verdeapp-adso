/**
 * Archivo: LandingPage.tsx
 * Descripción: Página de aterrizaje pública de VerdeApp.
 * ¿Para qué? Presentar el proyecto, sus características y guiar al usuario hacia el registro
 * o el inicio de sesión con una experiencia visual clara y profesional.
 * ¿Impacto? Es la primera impresión del sistema — define la percepción de calidad y confianza.
 */

import { Link } from "react-router-dom";
import { Recycle, Users, MapPin, ArrowRight, Leaf } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// ─────────────────────────────────────────────────────────────
// DATA (CONTENIDO EDITABLE POR EL EQUIPO)
// ─────────────────────────────────────────────────────────────

/**
 * ¿Qué? Tecnologías usadas en el proyecto para mostrar en la sección de stack.
 * ¿Para qué? Transparencia técnica y reconocimiento de las herramientas involucradas.
 * ¿Impacto? Establece credibilidad técnica ante el instructor y el usuario.
 */
const techStack = [
  "Python",
  "FastAPI",
  "PostgreSQL",
  "SQLAlchemy",
  "Alembic",
  "React",
  "TypeScript",
  "TailwindCSS",
  "Docker",
] as const;

// ─────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────

/**
 * ¿Qué? Componente de página para la ruta raíz "/".
 * ¿Para qué? Servir como punto de entrada público que presenta el sistema y dirige al usuario
 * a registrarse o iniciar sesión, sin necesidad de autenticación previa.
 * ¿Impacto? Primera impresión del sistema — define confianza, claridad y propuesta de valor.
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 selection:bg-green-200 selection:text-green-900">
      
      {/* ══════════════════════════════════════════════════════
          HEADER — navegación sticky con logo y acciones
          ══════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 dark:border-gray-800 dark:bg-gray-950/80 backdrop-blur-md">
        <nav
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
          aria-label="Navegación principal"
        >
          {/* Logo y Nombre del Proyecto */}
          <Link
            to="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-lg"
            aria-label="VerdeApp — ir al inicio"
          >
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg" aria-hidden="true">
              <Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">VerdeApp</span>
          </Link>

          {/* Acciones Rápidas */}
          <ul className="m-0 flex list-none items-center gap-4 p-0">
            <li>
              <ThemeToggle />
            </li>
            <li className="hidden sm:block">
              <Link
                to="/login"
                className="text-sm font-medium text-gray-600 hover:text-green-600 dark:text-gray-300 dark:hover:text-green-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-md px-2 py-1"
              >
                Iniciar sesión
              </Link>
            </li>
            <li>
              <Link
                to="/register"
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                Registrarse
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        {/* ══════════════════════════════════════════════════════
            HERO — propuesta de valor principal
            ══════════════════════════════════════════════════════ */}
        <section
          className="relative px-6 py-24 sm:py-32 lg:px-8 overflow-hidden"
          aria-labelledby="hero-heading"
        >
          {/* Fondo difuminado moderno (Estilo Figma) */}
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-green-200 to-green-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
          </div>

          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            <div className="mb-8 flex justify-center">
              <span className="rounded-full bg-green-50 dark:bg-green-900/30 px-4 py-1.5 text-sm font-semibold text-green-600 dark:text-green-400 ring-1 ring-inset ring-green-600/20">
                ADSO SENA - [Editar Trimestre]
              </span>
            </div>
            
            <h1
              id="hero-heading"
              className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl mb-6"
            >
              [Editar Slogan Principal de VerdeApp]
            </h1>
            
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 mb-10">
              [Editar introducción: Explica brevemente qué problema resuelve la aplicación en Bogotá, cómo conecta a los residentes con los recicladores y el impacto ambiental].
            </p>

            {/* ¿Por qué flex-col en móvil y flex-row en desktop? Mejora la accesibilidad y el área táctil en pantallas pequeñas. */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3.5 rounded-xl shadow-md transition-all hover:shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                Unirse a VerdeApp <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center w-full sm:w-auto text-sm font-semibold text-gray-900 dark:text-white px-8 py-3.5 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FEATURES — tarjetas de características del sistema
            ══════════════════════════════════════════════════════ */}
        <section
          className="border-t border-gray-100 px-6 py-16 sm:py-24 dark:border-gray-900"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-7xl">
            <header className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-base font-semibold leading-7 text-green-600 dark:text-green-400">
                Nuestros Pilares
              </h2>
              <p
                id="features-heading"
                className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl"
              >
                [Editar Título de Pilares]
              </p>
            </header>

            {/* Grid con 3 tarjetas estructuradas para beneficios del proyecto */}
            <ul className="m-0 grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-3">
              {/* Tarjeta 1 */}
              <li>
                <article className="h-full rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30" aria-hidden="true">
                    <Recycle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                    [Editar Beneficio 1]
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    [Editar descripción. Ejemplo: Facilita la separación de residuos en la fuente para los residentes.]
                  </p>
                </article>
              </li>

              {/* Tarjeta 2 */}
              <li>
                <article className="h-full rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30" aria-hidden="true">
                    <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                    [Editar Beneficio 2]
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    [Editar descripción. Ejemplo: Dignifica la labor del reciclador mediante comunicación directa.]
                  </p>
                </article>
              </li>

              {/* Tarjeta 3 */}
              <li>
                <article className="h-full rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30" aria-hidden="true">
                    <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                    [Editar Beneficio 3]
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    [Editar descripción. Ejemplo: Directorio geolocalizado de puntos de acopio autorizados en Bogotá.]
                  </p>
                </article>
              </li>
            </ul>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            TECH STACK — badges de tecnologías (Demuestra conocimiento técnico)
            ══════════════════════════════════════════════════════ */}
        <section
          className="border-t border-gray-100 px-6 py-20 dark:border-gray-800"
          aria-labelledby="stack-heading"
        >
          <div className="mx-auto max-w-4xl text-center">
            <h2 id="stack-heading" className="mb-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
              Tecnologías Implementadas
            </h2>
            <p className="mb-10 text-gray-600 dark:text-gray-400">
              Arquitectura moderna, escalable y segura.
            </p>

            <ul className="m-0 flex list-none flex-wrap justify-center gap-3 p-0" aria-label="Lista de tecnologías">
              {techStack.map((tech) => (
                <li key={tech}>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                    {tech}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {/* ══════════════════════════════════════════════════════
          FOOTER — información legal y créditos
          ══════════════════════════════════════════════════════ */}
      <footer className="border-t border-gray-100 bg-white px-6 py-8 dark:border-gray-900 dark:bg-gray-950 mt-auto">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5">
          <div className="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2" aria-label="VerdeApp Logo">
              <Leaf className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">VerdeApp</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              © {new Date().getFullYear()} Proyecto Formativo ADSO - SENA. <br className="sm:hidden" />
              Yilmer Hernández, Juan Barajas, Eisin Yordan.
            </p>
          </div>

          <nav aria-label="Aviso legal" className="w-full border-t border-gray-100 pt-4 dark:border-gray-800">
            <ul className="m-0 flex list-none flex-wrap justify-center gap-x-6 gap-y-2 p-0">
              <li><Link to="/terminos-de-uso" className="rounded text-xs text-gray-500 hover:text-green-600 transition-colors">Términos de uso</Link></li>
              <li><Link to="/privacidad" className="rounded text-xs text-gray-500 hover:text-green-600 transition-colors">Privacidad</Link></li>
              <li><Link to="/cookies" className="rounded text-xs text-gray-500 hover:text-green-600 transition-colors">Cookies</Link></li>
              <li><Link to="/contacto" className="rounded text-xs text-gray-500 hover:text-green-600 transition-colors">Contacto</Link></li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}