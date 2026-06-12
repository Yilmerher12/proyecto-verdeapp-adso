/**
 * Archivo: LandingPage.tsx
 * Descripción: Página de aterrizaje pública de VerdeApp.
 * Cambios:
 *   - Hero con fondo animado verde y contenido real del proyecto
 *   - Pilares y beneficios con contenido real de VerdeApp
 *   - Orden de botones corregido: "Ya tengo cuenta" izquierda, "Unirse" derecha
 *   - Links del footer abren modales en vez de navegar a rutas separadas
 *   - Sin referencias a "NN Auth System" ni placeholders [Editar...]
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Recycle, Users, MapPin, ArrowRight, Leaf, X, BookOpen, Shield, Cookie, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

type ModalType = "terminos" | "privacidad" | "cookies" | "contacto" | null;

// ─────────────────────────────────────────────────────────────
// DATOS
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// CONTENIDO DE MODALES LEGALES
// ─────────────────────────────────────────────────────────────

const MODAL_CONTENT: Record<
  Exclude<ModalType, null>,
  { titulo: string; icon: React.ReactNode; contenido: React.ReactNode }
> = {
  terminos: {
    titulo: "Términos de Uso",
    icon: <BookOpen className="h-5 w-5 text-green-600" />,
    contenido: (
      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
        <p>
          VerdeApp es una plataforma educativa desarrollada por aprendices del programa ADSO del
          SENA (2026). El uso de este sistema implica la aceptación de las condiciones aquí descritas.
        </p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">1. Objeto del servicio</h3>
        <p>
          VerdeApp facilita la comunicación entre residentes de conjuntos residenciales y
          recicladores de oficio en Bogotá, promoviendo la separación de residuos en la fuente
          y la educación ambiental.
        </p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">2. Registro de usuario</h3>
        <p>
          Para acceder a las funcionalidades del sistema debes registrarte con información veraz.
          Eres responsable de mantener la confidencialidad de tus credenciales de acceso.
        </p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">3. Uso aceptable</h3>
        <p>
          Queda prohibido el uso de la plataforma para fines distintos a los ambientales y
          comunitarios descritos. No está permitido suplantar identidades ni compartir información
          falsa sobre residuos o rutas de recolección.
        </p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">4. Propiedad intelectual</h3>
        <p>
          El código fuente y los contenidos de VerdeApp están licenciados bajo CC BY-NC-SA 4.0.
          Puedes adaptar y compartir el material con fines no comerciales citando a los autores.
        </p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">5. Propósito educativo</h3>
        <p>
          Este sistema es un proyecto formativo del SENA. No ha sido auditado para entornos
          productivos con datos sensibles reales. Se provee "tal cual" sin garantías explícitas.
        </p>
        <p className="text-xs text-gray-400">
          Última actualización: febrero 2026 · Versión 1.0
        </p>
      </div>
    ),
  },
  privacidad: {
    titulo: "Política de Privacidad",
    icon: <Shield className="h-5 w-5 text-green-600" />,
    contenido: (
      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
        <p>
          VerdeApp, desarrollada por el grupo ADSO-SENA 2026, trata los datos personales conforme
          a la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia.
        </p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">1. Datos recolectados</h3>
        <p>
          Recolectamos: nombre completo, correo electrónico, número de apartamento o unidad,
          conjunto residencial y localidad. No recolectamos datos sensibles como información
          financiera, biométrica o de salud.
        </p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">2. Finalidad del tratamiento</h3>
        <p>
          Los datos se usan exclusivamente para: autenticar usuarios, coordinar rutas de
          recolección, enviar notificaciones de reciclaje y generar reportes estadísticos
          anónimos de impacto ambiental.
        </p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">3. Tus derechos</h3>
        <p>
          Como titular tienes derecho a conocer, actualizar, rectificar y suprimir tus datos
          (derechos ARCO). Puedes ejercerlos contactándonos por correo electrónico.
        </p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">4. Seguridad</h3>
        <p>
          Las contraseñas se almacenan con hash bcrypt. Los tokens de sesión usan JWT con
          expiración configurable. La comunicación se realiza sobre HTTPS en producción.
        </p>
        <p className="text-xs text-gray-400">
          Última actualización: febrero 2026 · Versión 1.0
        </p>
      </div>
    ),
  },
  cookies: {
    titulo: "Política de Cookies",
    icon: <Cookie className="h-5 w-5 text-green-600" />,
    contenido: (
      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
        <p>
          VerdeApp usa cookies estrictamente necesarias para el funcionamiento del sistema de
          autenticación. No utilizamos cookies de rastreo ni publicidad.
        </p>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Cookies que usamos</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Nombre</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Propósito</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Duración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <tr>
                <td className="px-3 py-2 font-mono text-green-700 dark:text-green-400">access_token</td>
                <td className="px-3 py-2">Autenticación de sesión activa</td>
                <td className="px-3 py-2">60 minutos</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-green-700 dark:text-green-400">refresh_token</td>
                <td className="px-3 py-2">Renovación automática de sesión</td>
                <td className="px-3 py-2">7 días</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-green-700 dark:text-green-400">theme_preference</td>
                <td className="px-3 py-2">Recordar preferencia de tema claro/oscuro</td>
                <td className="px-3 py-2">1 año</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Gestión de cookies</h3>
        <p>
          Puedes eliminar las cookies desde la configuración de tu navegador en cualquier momento.
          Ten en cuenta que desactivarlas cerrará tu sesión activa.
        </p>
        <p className="text-xs text-gray-400">
          Última actualización: febrero 2026 · Versión 1.0
        </p>
      </div>
    ),
  },
  contacto: {
    titulo: "Contacto",
    icon: <Mail className="h-5 w-5 text-green-600" />,
    contenido: (
      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
        <p>
          VerdeApp es un proyecto formativo del programa ADSO del SENA, cohorte 2026.
          Puedes contactar al equipo de desarrollo para consultas, sugerencias o reportes.
        </p>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Equipo de desarrollo</h3>
          <ul className="space-y-1">
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">Yilmer Hernández</span>
              <span className="text-gray-500"> — Full Stack / Core Backend</span>
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">Juan Barajas</span>
              <span className="text-gray-500"> — Frontend / UI Designer</span>
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">Eisin Yordan Castro</span>
              <span className="text-gray-500"> — Base de Datos / QA</span>
            </li>
            <li>
              <span className="font-medium text-gray-700 dark:text-gray-300">Jose Guerrero</span>
              <span className="text-gray-500"> — Documentación / Análisis</span>
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
          <p className="text-green-800 dark:text-green-300">
            <span className="font-semibold">Programa:</span> Análisis y Desarrollo de Software (ADSO)
            <br />
            <span className="font-semibold">Institución:</span> SENA — Bogotá, Colombia
            <br />
            <span className="font-semibold">Año:</span> 2026
          </p>
        </div>
        <p className="text-xs text-gray-400">
          Este es un proyecto educativo sin soporte comercial.
        </p>
      </div>
    ),
  },
};

// ─────────────────────────────────────────────────────────────
// COMPONENTE MODAL
// ─────────────────────────────────────────────────────────────

function LegalModal({
  tipo,
  onClose,
}: {
  tipo: Exclude<ModalType, null>;
  onClose: () => void;
}) {
  const { titulo, icon, contenido } = MODAL_CONTENT[tipo];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Panel — detener propagación para no cerrar al hacer clic adentro */}
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
          <div className="flex items-center gap-2">
            {icon}
            <h2
              id="modal-title"
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              {titulo}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cuerpo del modal */}
        <div className="px-6 py-5">{contenido}</div>

        {/* Footer del modal */}
        <div className="sticky bottom-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────

export function LandingPage() {
  const [modalAbierto, setModalAbierto] = useState<ModalType>(null);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 selection:bg-green-200 selection:text-green-900">

      {/* MODAL LEGAL */}
      {modalAbierto && (
        <LegalModal tipo={modalAbierto} onClose={() => setModalAbierto(null)} />
      )}

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
        {/* ── HERO ───────────────────────────────────────────── */}
        <section
          className="relative px-6 py-24 sm:py-36 lg:px-8 overflow-hidden"
          aria-labelledby="hero-heading"
        >
          {/* Fondo verde animado */}
          <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            {/* Blob principal */}
            <div
              className="absolute -top-40 left-1/2 -translate-x-1/2 w-225 h-[600px] rounded-full opacity-20 dark:opacity-10"
              style={{
                background: "radial-gradient(ellipse at center, #16a34a 0%, #4ade80 40%, transparent 70%)",
                animation: "pulse 8s ease-in-out infinite",
              }}
            />
            {/* Blob secundario izquierda */}
            <div
              className="absolute top-20 -left-32 w-96 h-96 rounded-full opacity-10 dark:opacity-5"
              style={{
                background: "radial-gradient(circle, #22c55e, transparent 70%)",
                animation: "pulse 6s ease-in-out infinite 2s",
              }}
            />
            {/* Blob secundario derecha */}
            <div
              className="absolute bottom-0 -right-20 w-80 h-80 rounded-full opacity-10 dark:opacity-5"
              style={{
                background: "radial-gradient(circle, #86efac, transparent 70%)",
                animation: "pulse 7s ease-in-out infinite 1s",
              }}
            />
            {/* Patrón de hojas sutil */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 Q45 20 30 35 Q15 20 30 5Z' fill='%2316a34a'/%3E%3C/svg%3E")`,
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-6 flex justify-center">
              <span className="rounded-full bg-green-50 dark:bg-green-900/30 px-4 py-1.5 text-sm font-semibold text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20">
                🌿 ADSO SENA · Proyecto 2026
              </span>
            </div>

            {/* Título */}
            <h1
              id="hero-heading"
              className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-7xl mb-6"
            >
              Verde<span className="text-green-600 dark:text-green-400">App</span>
            </h1>

            {/* Subtítulo */}
            <p className="text-xl leading-relaxed text-gray-600 dark:text-gray-300 mb-4 font-medium">
              Gestión de residuos para conjuntos residenciales en Bogotá
            </p>
            <p className="text-base leading-8 text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              Conecta a los residentes de tu conjunto con recicladores de oficio certificados.
              Coordina rutas, reporta residuos y accede a educación ambiental — todo en un solo lugar.
            </p>

            {/* ✅ BOTONES CORREGIDOS: "Ya tengo cuenta" izquierda, "Unirse" derecha */}
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

            {/* Stats rápidas */}
            <div className="mt-16 grid grid-cols-3 gap-6 max-w-md mx-auto">
              {[
                { valor: "3", label: "Roles de usuario" },
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
                  <article className="h-full rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 dark:border-gray-800 dark:bg-gray-900">
                    <div
                      className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30"
                      aria-hidden="true"
                    >
                      <Icon className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                      {titulo}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      {descripcion}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
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

          {/* ✅ Links del footer ahora abren MODALES en vez de navegar a rutas */}
          <nav
            aria-label="Aviso legal"
            className="w-full border-t border-gray-100 pt-4 dark:border-gray-800"
          >
            <ul className="m-0 flex list-none flex-wrap justify-center gap-x-6 gap-y-2 p-0">
              <li>
                <button
                  onClick={() => setModalAbierto("terminos")}
                  className="rounded text-xs text-gray-500 hover:text-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  Términos de uso
                </button>
              </li>
              <li>
                <button
                  onClick={() => setModalAbierto("privacidad")}
                  className="rounded text-xs text-gray-500 hover:text-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  Privacidad
                </button>
              </li>
              <li>
                <button
                  onClick={() => setModalAbierto("cookies")}
                  className="rounded text-xs text-gray-500 hover:text-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  Cookies
                </button>
              </li>
              <li>
                <button
                  onClick={() => setModalAbierto("contacto")}
                  className="rounded text-xs text-gray-500 hover:text-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  Contacto
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </footer>

      {/* Keyframes para la animación del fondo */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.2; }
          50% { transform: scale(1.08) translateY(-20px); opacity: 0.28; }
        }
      `}</style>
    </div>
  );
}