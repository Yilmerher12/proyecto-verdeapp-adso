/**
 * Archivo: LandingPage.tsx
 * Descripción: Página de aterrizaje pública de VerdeApp.
 * ¿Para qué? Cambios respecto a la versión anterior:
 *   - El Hero vuelve a texto centrado (sin la ilustración de edificio,
 *     que no se leía bien).
 *   - Se mantienen: sección "Cómo funciona", Pilares con franja de color,
 *     sección de Impacto con fondo verde sólido.
 *
 * PENDIENTE (futuro): agregar un carrusel/slider de imágenes reales
 * (conjuntos residenciales, recicladores trabajando, separación de
 * residuos) en el Hero o en una sección dedicada. Falta decidir la
 * fuente de esas fotos (fotos propias del equipo vs. banco con licencia
 * clara) antes de implementarlo, para no tener problemas de derechos.
 */

import { Link } from "react-router-dom";
import { Recycle, Users, MapPin, ArrowRight, Leaf, UserPlus, Truck, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

const techStack = [
  "Python", "FastAPI", "PostgreSQL", "SQLAlchemy",
  "Alembic", "React", "TypeScript", "TailwindCSS", "Docker",
] as const;

const pilares = [
  {
    icon: Recycle,
    titulo: "Separación en la fuente",
    descripcion:
      "Guía a los residentes de tu conjunto en la correcta clasificación de residuos: orgánicos, reciclables y ordinarios, directamente desde la app.",
  },
  {
    icon: Users,
    titulo: "Conexión con recicladores",
    descripcion:
      "Formaliza y dignifica la labor de los recicladores de oficio. Coordina rutas, solicitudes y notificaciones en tiempo real entre el conjunto y el reciclador asignado.",
  },
  {
    icon: MapPin,
    titulo: "Puntos de acopio en Bogotá",
    descripcion:
      "Directorio geolocalizado de puntos de acopio autorizados y estaciones de clasificación cercanas a tu conjunto residencial.",
  },
] as const;

const pasos = [
  {
    icon: UserPlus,
    numero: "1",
    titulo: "Tu conjunto se afilia",
    descripcion: "El administrador registra el conjunto residencial en VerdeApp con su dirección y datos.",
  },
  {
    icon: Recycle,
    numero: "2",
    titulo: "Los residentes reportan",
    descripcion: "Cada residente separa sus residuos y notifica desde la app cuándo están listos para recoger.",
  },
  {
    icon: Truck,
    numero: "3",
    titulo: "El reciclador recoge",
    descripcion: "El reciclador asignado recibe la alerta, visita el conjunto y confirma la recolección.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 selection:bg-green-200 selection:text-green-900">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 dark:border-gray-800 dark:bg-gray-950/80 backdrop-blur-md">
        <nav
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
          aria-label="Navegación principal"
        >
          <Link
            to="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-lg"
            aria-label="VerdeApp — ir al inicio"
          >
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg" aria-hidden="true">
              <Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              VerdeApp
            </span>
          </Link>

          <ul className="m-0 flex list-none items-center gap-3 p-0">
            <li>
              <LanguageSwitcher />
            </li>
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
        {/* ── HERO — texto centrado, sin ilustración ── */}
        <section
          className="relative px-6 py-24 sm:py-36 lg:px-8 overflow-hidden"
          aria-labelledby="hero-heading"
        >
          <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <div
              className="absolute -top-40 left-1/2 -translate-x-1/2 w-225 h-150 rounded-full opacity-20 dark:opacity-10"
              style={{
                background: "radial-gradient(ellipse at center, #16a34a 0%, #4ade80 40%, transparent 70%)",
                animation: "pulse 8s ease-in-out infinite",
              }}
            />
            <div
              className="absolute top-20 -left-32 w-96 h-96 rounded-full opacity-10 dark:opacity-5"
              style={{
                background: "radial-gradient(circle, #22c55e, transparent 70%)",
                animation: "pulse 6s ease-in-out infinite 2s",
              }}
            />
            <div
              className="absolute bottom-0 -right-20 w-80 h-80 rounded-full opacity-10 dark:opacity-5"
              style={{
                background: "radial-gradient(circle, #86efac, transparent 70%)",
                animation: "pulse 7s ease-in-out infinite 1s",
              }}
            />
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 Q45 20 30 35 Q15 20 30 5Z' fill='%2316a34a'/%3E%3C/svg%3E")`,
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 flex justify-center">
              <span className="rounded-full bg-green-50 dark:bg-green-900/30 px-4 py-1.5 text-sm font-semibold text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20">
                🌿 ADSO SENA · Proyecto 2026
              </span>
            </div>

            <h1
              id="hero-heading"
              className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-7xl mb-6"
            >
              Verde<span className="text-green-600 dark:text-green-400">App</span>
            </h1>

            <p className="text-xl leading-relaxed text-gray-600 dark:text-gray-300 mb-4 font-medium">
              Gestión de residuos para conjuntos residenciales en Bogotá
            </p>
            <p className="text-base leading-8 text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              Conecta a los residentes de tu conjunto con recicladores de oficio certificados.
              Coordina rutas, reporta residuos y accede a educación ambiental — todo en un solo lugar.
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="flex items-center justify-center w-full sm:w-auto text-sm font-semibold text-gray-900 dark:text-white px-8 py-3.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Ya tengo cuenta
              </Link>
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3.5 rounded-xl shadow-md transition-all hover:shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                Unirse a VerdeApp <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-6 max-w-md mx-auto">
              {[
                { valor: "4", label: "Roles de usuario" },
                { valor: "100%", label: "Código documentado" },
                { valor: "Bogotá", label: "Foco territorial" },
              ].map(({ valor, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{valor}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CÓMO FUNCIONA ──────────────────────────────────── */}
        <section
          className="border-t border-gray-100 dark:border-gray-900 px-6 py-16 sm:py-24 bg-gray-50/50 dark:bg-gray-900/20"
          aria-labelledby="como-funciona-heading"
        >
          <div className="mx-auto max-w-5xl">
            <header className="mx-auto max-w-2xl text-center mb-16">
              <p className="text-base font-semibold text-green-600 dark:text-green-400 mb-2">
                Cómo funciona
              </p>
              <h2
                id="como-funciona-heading"
                className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl"
              >
                Tres pasos, un ciclo completo
              </h2>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 relative">
              {pasos.map(({ icon: Icon, numero, titulo, descripcion }) => (
                <div key={numero} className="flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div className="h-20 w-20 rounded-full bg-green-600 flex items-center justify-center shadow-lg shadow-green-600/20">
                      <Icon className="h-9 w-9 text-white" aria-hidden="true" />
                    </div>
                    <span className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-white dark:bg-gray-900 border-2 border-green-600 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-400">
                      {numero}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{titulo}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PILARES ────────────────────────────────────────── */}
        <section
          className="border-t border-gray-100 dark:border-gray-900 px-6 py-16 sm:py-24"
          aria-labelledby="pilares-heading"
        >
          <div className="mx-auto max-w-7xl">
            <header className="mx-auto max-w-2xl text-center mb-16">
              <p className="text-base font-semibold text-green-600 dark:text-green-400 mb-2">
                Nuestros Pilares
              </p>
              <h2
                id="pilares-heading"
                className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl"
              >
                Una plataforma, tres ejes de impacto
              </h2>
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                VerdeApp aborda el problema del reciclaje desde la educación, la coordinación y la
                geolocalización.
              </p>
            </header>

            <ul className="m-0 grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-3">
              {pilares.map(({ icon: Icon, titulo, descripcion }) => (
                <li key={titulo}>
                  <article className="h-full rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-1 dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                    <div className="h-2 bg-linear-to-r from-green-400 to-green-600" aria-hidden="true" />
                    <div className="p-8">
                      <div
                        className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30"
                        aria-hidden="true"
                      >
                        <Icon className="h-7 w-7 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                        {titulo}
                      </h3>
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                        {descripcion}
                      </p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── IMPACTO — fondo verde sólido ──────────────────── */}
        <section className="bg-green-700 dark:bg-green-900 px-6 py-16 sm:py-20" aria-labelledby="impacto-heading">
          <div className="mx-auto max-w-5xl text-center">
            <h2 id="impacto-heading" className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Reciclar bien, juntos
            </h2>
            <p className="text-green-100 max-w-2xl mx-auto mb-10">
              Cada conjunto que se afilia a VerdeApp formaliza el trabajo de sus recicladores
              y mejora la separación de residuos en su comunidad.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                { texto: "Conjuntos verificados antes de operar" },
                { texto: "Recicladores conectados directamente" },
                { texto: "Educación ambiental incluida" },
              ].map(({ texto }) => (
                <div
                  key={texto}
                  className="flex items-start gap-3 bg-white/10 rounded-2xl p-5 text-left"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-200 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-white font-medium">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STACK TECNOLÓGICO ──────────────────────────────── */}
        <section
          className="border-t border-gray-100 dark:border-gray-800 px-6 py-20"
          aria-labelledby="stack-heading"
        >
          <div className="mx-auto max-w-4xl text-center">
            <h2
              id="stack-heading"
              className="mb-3 text-3xl font-bold text-gray-900 dark:text-gray-100"
            >
              Tecnologías Implementadas
            </h2>
            <p className="mb-10 text-gray-500 dark:text-gray-400">
              Arquitectura moderna, escalable y segura.
            </p>

            <ul
              className="m-0 flex list-none flex-wrap justify-center gap-3 p-0"
              aria-label="Lista de tecnologías"
            >
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

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white px-6 py-8 dark:border-gray-900 dark:bg-gray-950">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5">
          <div className="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2" aria-label="VerdeApp Logo">
              <Leaf className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                VerdeApp
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              © {new Date().getFullYear()} Proyecto Formativo ADSO - SENA.{" "}
              <br className="sm:hidden" />
              Yilmer Hernández, Juan Barajas, Eisin Yordan.
            </p>
          </div>

          <nav
            aria-label="Aviso legal"
            className="w-full border-t border-gray-100 pt-4 dark:border-gray-800"
          >
            <ul className="m-0 flex list-none flex-wrap justify-center gap-x-6 gap-y-2 p-0">
              <li>
                <Link
                  to="/terminos-de-uso"
                  className="rounded text-xs text-gray-500 hover:text-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  Términos de uso
                </Link>
              </li>
              <li>
                <Link
                  to="/privacidad"
                  className="rounded text-xs text-gray-500 hover:text-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  Privacidad
                </Link>
              </li>
              <li>
                <Link
                  to="/politica-cookies"
                  className="rounded text-xs text-gray-500 hover:text-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  Cookies
                </Link>
              </li>
              <li>
                <Link
                  to="/contacto"
                  className="rounded text-xs text-gray-500 hover:text-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  Contacto
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.2; }
          50% { transform: scale(1.08) translateY(-20px); opacity: 0.28; }
        }
      `}</style>
    </div>
  );
}