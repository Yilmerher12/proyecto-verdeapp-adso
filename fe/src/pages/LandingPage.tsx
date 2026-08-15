import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Users, Recycle } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const pasos = [
  {
    imgSrc: "/landing/step-1-registration.png",
    numero: "01",
    titulo: "El conjunto se afilia",
    descripcion:
      "El administrador registra el conjunto en VerdeApp e invita a los residentes y al reciclador asignado.",
  },
  {
    imgSrc: "/landing/step-2-verification.png",
    numero: "02",
    titulo: "Los residentes participan",
    descripcion:
      "Aprenden a reciclar con el contenido educativo e indican cuándo el SHUT está en su capacidad máxima.",
  },
  {
    imgSrc: "/landing/step-3-recycler-pickup.png",
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
    <div className="min-h-screen bg-white dark:bg-green-950">

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
              src="/logos/logo-white.png"
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
          {/* Fondo — antes era una <img> normal que se iba con el scroll junto
              con el resto del Hero. Ahora es un fondo "fijo" (igual que en
              "¿Cómo funciona?"): la foto se queda pegada a la pantalla y el
              contenido se desliza encima, en vez de quedarse estática. */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/landing/hero-background.jpg')",
              backgroundAttachment: "fixed",
            }}
            aria-hidden="true"
          >
            {/* Este degradado es DISTINTO en modo claro y en modo oscuro —
                no es el mismo verde con una capa negra encima. En oscuro es
                más profundo y menos brillante, para que se sienta como la
                versión de noche, no como el mismo día con un filtro. */}
            <div
              className="absolute inset-0 bg-[linear-gradient(160deg,rgba(5,46,22,0.80)_0%,rgba(21,128,61,0.42)_55%,rgba(5,46,22,0.78)_100%)] dark:bg-[linear-gradient(160deg,rgba(1,10,5,0.92)_0%,rgba(6,54,30,0.55)_55%,rgba(1,10,5,0.95)_100%)]"
            />
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: "url('/landing/leaves-overlay.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                mixBlendMode: "overlay",
              }}
            />
          </div>

          {/* Contenido */}
          <div className="relative mx-auto max-w-3xl px-6 pt-24 pb-32 text-center lg:px-8">

            {/*
              Logo: una vez tengasel PNG con fondo transparente y colores blancos,
              descomenta esto y ajusta la ruta:

              <div className="mb-8 flex justify-center">
                <img
                  src="/logos/logo-white-transparent.png"
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
        </section>

        {/* ── CÓMO FUNCIONA ──
             Pasarela versión 3: reutilizamos la MISMA foto del Hero, pero con
             "background-attachment: fixed" — la foto se queda quieta en la
             pantalla y el contenido se desliza encima, dando sensación de
             continuidad en vez de un corte entre secciones.
             Ojo: en Safari de iPhone este efecto no aplica (se ignora
             "fixed" y hace scroll normal) — no se rompe nada, solo no se ve
             el efecto ahí. */}
        <section
          className="relative overflow-hidden bg-cover bg-center px-6 py-20 sm:py-28"
          style={{
            backgroundImage: "url('/landing/hero-background.jpg')",
            backgroundAttachment: "fixed",
          }}
          aria-labelledby="como-funciona-heading"
        >
          {/* En modo claro la foto se asoma con un velo blanco; en modo oscuro
              se asoma igual, pero con un velo verde oscuro — así el efecto de
              "la foto sigue el scroll" se ve en los dos temas, no solo en claro. */}
          <div className="absolute inset-0 bg-white/90 dark:bg-green-950/90" aria-hidden="true" />

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
                  className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-green-800 dark:bg-green-900"
                >
                  <span
                    className="absolute right-4 top-3 select-none text-7xl font-black leading-none text-green-50 dark:text-white/10"
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

        {/* ── PILARES ── antes era una lista apilada verticalmente (muy larga);
             ahora son 3 columnas lado a lado, igual que "¿Cómo funciona?", para
             que la sección no se sienta tan alargada. ── */}
        {/* Mismo criterio que en el Hero: el degradado de modo oscuro no es
            "el mismo verde con negro encima", son tonos propios, más
            profundos, pensados como la versión de noche de este bloque. */}
        <section
          className="relative overflow-hidden bg-[linear-gradient(160deg,#052e16_0%,#14532d_60%,#166534_100%)] px-6 py-16 dark:bg-[linear-gradient(160deg,#01100a_0%,#052e16_60%,#0a3d1f_100%)] sm:py-20"
          aria-labelledby="pilares-heading"
        >
          <div className="relative mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-green-400">
                Nuestros pilares
              </p>
              <h2
                id="pilares-heading"
                className="text-3xl font-bold text-white sm:text-4xl"
              >
                Una plataforma, tres ejes de impacto
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
              {pilares.map(({ icon: Icon, titulo, descripcion }, i) => (
                <div key={titulo} className="text-left">
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <Icon className="h-5 w-5 text-green-300" aria-hidden="true" />
                    </div>
                    <span className="text-[10px] font-bold tracking-widest text-green-500">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mb-2 text-base font-bold text-white sm:text-lg">{titulo}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      {/* En modo oscuro el footer necesita verse claramente MÁS oscuro que el
          final de "Pilares" (que termina en un verde más claro, #0a3d1f) —
          si usan un tono parecido, las dos secciones se leen como una sola,
          sin ningún corte entre ellas. */}
      <footer className="border-t border-gray-100 bg-white px-6 py-8 dark:border-white/10 dark:bg-[#010a05]">
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
            className="mt-4 border-t border-gray-100 pt-4 dark:border-green-900"
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
