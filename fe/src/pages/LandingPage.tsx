import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Users, Recycle } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const pasos = [
  {
    imgSrc: "/icono_conjunto_que_se_afilia.png",
    numero: "01",
    titulo: "El conjunto se afilia",
    descripcion:
      "El administrador registra el conjunto en VerdeApp e invita a los residentes y al reciclador asignado.",
  },
  {
    imgSrc: "/icono-los-residentes-participan.png",
    numero: "02",
    titulo: "Los residentes participan",
    descripcion:
      "Aprenden a reciclar con el contenido educativo e indican cuándo el SHUT está en su capacidad máxima.",
  },
  {
    imgSrc: "/icono-reciclador-que-actua.png",
    numero: "03",
    titulo: "El reciclador actúa",
    descripcion:
      "Notifica su llegada al SHUT. Al finalizar, el sistema registra la gestión y genera una auditoría de rendimiento.",
  },
] as const;

const pilares = [
  {
    icon: MapPin,
    titulo: "Separación en la fuente",
    descripcion:
      "Guía a los residentes en la correcta clasificación de residuos reciclables, directamente desde la app.",
  },
  {
    icon: Users,
    titulo: "Conexión con recicladores",
    descripcion:
      "Formaliza la labor de los recicladores de oficio. Permite solicitudes y notificaciones en tiempo real entre el conjunto y el reciclador asignado.",
  },
  {
    icon: Recycle,
    titulo: "Educación ambiental",
    descripcion:
      "Guías y contenido interactivo sobre cómo separar, limpiar y entregar materiales reciclables correctamente en tu comunidad.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* ── HEADER ── */}
      <header
        className="fixed left-0 right-0 top-0 z-50 backdrop-blur-md"
        style={{ background: "rgba(5,46,22,0.58)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
            aria-label="VerdeApp — inicio"
          >
            <img
              src="/logo-blanco.png"
              alt="VerdeApp"
              className="h-8 w-auto object-contain"
            />
          </Link>

          <ul className="m-0 flex list-none items-center gap-2 p-0">
            <li><ThemeToggle /></li>
            <li className="hidden sm:block">
              <Link
                to="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                Iniciar sesión
              </Link>
            </li>
            <li>
              <Link
                to="/register"
                className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-400 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
              >
                Registrarse
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        {/* ── HERO ── */}
        <section
          className="relative flex min-h-screen items-center justify-center overflow-hidden"
          aria-labelledby="hero-heading"
        >
          {/* Fondo */}
          <div className="absolute inset-0" aria-hidden="true">
            <img
              src="/conjuntos-residenciales-fondo.jpeg"
              alt=""
              className="h-full w-full object-cover object-center"
              style={{ filter: "brightness(0.40) saturate(1.15)" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, rgba(5,46,22,0.80) 0%, rgba(21,128,61,0.42) 55%, rgba(5,46,22,0.78) 100%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: "url('/hojas-fondo.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                mixBlendMode: "overlay",
              }}
            />
          </div>

          {/* Contenido */}
          <div className="relative mx-auto max-w-3xl px-6 pt-24 pb-32 text-center lg:px-8">

            {/*
              Logo: una vez tengas el PNG con fondo transparente y colores blancos,
              descomenta esto y ajusta la ruta:

              <div className="mb-8 flex justify-center">
                <img
                  src="/logo-verde-app-blanco.png"
                  alt="VerdeApp"
                  className="h-28 w-auto object-contain drop-shadow-2xl"
                />
              </div>
            */}

            <h1
              id="hero-heading"
              className="mb-4 text-5xl font-extrabold leading-tight tracking-tight text-white drop-shadow sm:text-7xl"
            >
              Verde<span className="text-green-400">App</span>
            </h1>

            <p className="mb-3 text-lg font-semibold text-white/90 sm:text-xl">
              Gestión de residuos para conjuntos residenciales en Bogotá
            </p>

            <p
              className="mx-auto mb-10 max-w-xl text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Conectamos residentes, recicladores y administradores para transformar
              la gestión de residuos en tu comunidad.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/login"
                className="flex w-full items-center justify-center rounded-xl px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto"
                style={{ border: "1px solid rgba(255,255,255,0.28)" }}
              >
                Ya tengo cuenta
              </Link>
              <Link
                to="/register"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-green-400 hover:shadow-xl active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 sm:w-auto"
              >
                Unirse a VerdeApp <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Ola de transición */}
          <div className="absolute bottom-0 left-0 right-0 z-10" aria-hidden="true">
            <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" className="block w-full dark:hidden">
              <path d="M0 80L48 70C96 60 192 40 288 34C384 28 480 36 576 42C672 48 768 48 864 43C960 37 1056 26 1152 23C1248 20 1344 26 1392 29L1440 32V80H0Z" fill="white" />
            </svg>
            <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" className="hidden w-full dark:block">
              <path d="M0 80L48 70C96 60 192 40 288 34C384 28 480 36 576 42C672 48 768 48 864 43C960 37 1056 26 1152 23C1248 20 1344 26 1392 29L1440 32V80H0Z" fill="rgb(3 7 18)" />
            </svg>
          </div>
        </section>

        {/* ── CÓMO FUNCIONA ── */}
        <section
          className="relative overflow-hidden px-6 py-20 sm:py-28"
          aria-labelledby="como-funciona-heading"
        >
          <div className="absolute inset-0" aria-hidden="true">
            <img
              src="/fondo-adicional.jpeg"
              alt=""
              className="h-full w-full object-cover object-center"
              style={{ filter: "blur(3px) brightness(1.8) saturate(0.3)", transform: "scale(1.06)" }}
            />
            <div className="absolute inset-0 bg-white/90 dark:bg-gray-950/93" />
          </div>

          <div className="relative mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-green-600 dark:text-green-400">
                ¿Cómo funciona?
              </p>
              <h2
                id="como-funciona-heading"
                className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl"
              >
                Tres pasos, un ciclo completo
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-gray-500 dark:text-gray-400">
                VerdeApp conecta a todos los actores del reciclaje en el conjunto residencial.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {pasos.map(({ imgSrc, numero, titulo, descripcion }, i) => (
                <article
                  key={numero}
                  className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
                >
                  <span
                    className="absolute right-4 top-3 select-none text-7xl font-black leading-none text-green-50 dark:text-green-950/50"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div className="mb-5 h-14 w-14">
                    <img src={imgSrc} alt="" aria-hidden="true" className="h-full w-full object-contain drop-shadow-md" />
                  </div>
                  <h3 className="mb-2 text-base font-bold text-gray-900 dark:text-white">{titulo}</h3>
                  <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{descripcion}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── PILARES ── fondo verde oscuro, layout horizontal ── */}
        <section
          className="px-6 py-20 sm:py-28"
          style={{ background: "linear-gradient(160deg, #052e16 0%, #14532d 60%, #166534 100%)" }}
          aria-labelledby="pilares-heading"
        >
          <div className="mx-auto max-w-4xl">
            <div className="mb-12">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-green-400">
                Nuestros pilares
              </p>
              <h2
                id="pilares-heading"
                className="text-3xl font-bold text-white sm:text-4xl"
              >
                Una plataforma,<br className="hidden sm:block" /> tres ejes de impacto
              </h2>
            </div>

            <div className="divide-y divide-white/10">
              {pilares.map(({ icon: Icon, titulo, descripcion }, i) => (
                <div key={titulo} className="flex gap-6 py-9 sm:gap-10">
                  <div className="shrink-0 flex flex-col items-center gap-3 pt-1">
                    <span className="text-[10px] font-bold tracking-widest text-green-500">
                      0{i + 1}
                    </span>
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <Icon className="h-5 w-5 text-green-300" aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-base font-bold text-white sm:text-lg">{titulo}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {descripcion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 bg-white px-6 py-8 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <span className="text-sm font-extrabold tracking-tight text-gray-800 dark:text-gray-200">
              Verde<span className="text-green-600 dark:text-green-400">App</span>
            </span>
            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              © {new Date().getFullYear()} VerdeApp. Todos los derechos reservados.
            </p>
          </div>

          <nav
            aria-label="Aviso legal"
            className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800"
          >
            <ul className="m-0 flex list-none flex-wrap justify-center gap-x-5 gap-y-1 p-0">
              {[
                { to: "/terminos-de-uso", label: "Términos de uso" },
                { to: "/privacidad", label: "Privacidad" },
                { to: "/politica-cookies", label: "Cookies" },
                { to: "/contacto", label: "Contacto" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="rounded text-xs text-gray-400 transition-colors hover:text-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:text-gray-500 dark:hover:text-green-400"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
