import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, MapPin, Users, Recycle, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { BackToTopButton } from "@/components/ui/BackToTopButton";
import { useRestoreScroll } from "@/hooks/useRestoreScroll";
import { useScrollReveal } from "@/hooks/useScrollReveal";

// ¿Qué? Solo la parte visual (imagen/ícono, número) queda fuera del
//       componente — título y descripción se resuelven adentro con t(),
//       porque estos arreglos ya no pueden tener texto fijo en español.
const PASOS_META = [
  { imgSrc: "/landing/step-1-registration.png", key: "step1" },
  { imgSrc: "/landing/step-2-verification.png", key: "step2" },
  { imgSrc: "/landing/step-3-recycler-pickup.png", key: "step3" },
] as const;

const PILARES_META = [
  { icon: MapPin, key: "pillar1" },
  { icon: Users, key: "pillar2" },
  { icon: Recycle, key: "pillar3" },
] as const;

// ¿Qué? Tarjeta de "¿Cómo funciona?" con su propia animación de revelado.
// ¿Para qué? useScrollReveal() es un hook — no puede llamarse dentro del
//           .map() del componente padre (rompe las reglas de hooks). Cada
//           tarjeta necesita su PROPIA instancia del hook, así que se
//           extrae a un componente aparte.
// ¿Impacto? El "delay" escalonado por índice hace que las 3 tarjetas no
//           aparezcan todas de golpe, sino una tras otra.
function PasoCard({
  imgSrc,
  titulo,
  descripcion,
  numero,
  index,
}: {
  imgSrc: string;
  titulo: string;
  descripcion: string;
  numero: number;
  index: number;
}) {
  const { ref, visible } = useScrollReveal<HTMLElement>();

  return (
    <article
      ref={ref}
      style={{ transitionDelay: visible ? `${index * 120}ms` : "0ms" }}
      className={`group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all duration-700 ease-out hover:-translate-y-1 hover:shadow-lg dark:border-green-800 dark:bg-green-900 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      <span
        className="absolute right-4 top-3 select-none text-7xl font-black leading-none text-green-50 dark:text-white/10"
        aria-hidden="true"
      >
        {numero}
      </span>
      <div className="mb-5 h-14 w-14">
        <img src={imgSrc} alt="" aria-hidden="true" className="h-full w-full object-contain drop-shadow-md" />
      </div>
      <h3 className="mb-2 text-base font-bold text-gray-900 dark:text-white">{titulo}</h3>
      <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{descripcion}</p>
    </article>
  );
}

// ¿Qué? Bloque de "Nuestros pilares" — mismo motivo que PasoCard: cada
//       instancia necesita su propio hook de revelado.
function PilarCard({
  Icon,
  titulo,
  descripcion,
  numero,
  index,
}: {
  Icon: LucideIcon;
  titulo: string;
  descripcion: string;
  numero: string;
  index: number;
}) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${index * 120}ms` : "0ms" }}
      className={`text-left transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <Icon className="h-5 w-5 text-green-300" aria-hidden="true" />
        </div>
        <span className="text-[10px] font-bold tracking-widest text-green-500">{numero}</span>
      </div>
      <h3 className="mb-2 text-base font-bold text-white sm:text-lg">{titulo}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
        {descripcion}
      </p>
    </div>
  );
}

export function LandingPage() {
  const { t } = useTranslation();

  // ¿Qué? Recuerda dónde estaba el usuario en el Landing y lo restaura al
  //       volver (ej: después de cerrar Términos/Privacidad/Cookies desde
  //       el footer, que remontan esta página desde cero).
  useRestoreScroll("landing-scroll-y");

  const pasos = PASOS_META.map(({ imgSrc, key }) => ({
    imgSrc,
    key,
    titulo: t(`landing.howItWorks.${key}.title`),
    descripcion: t(`landing.howItWorks.${key}.description`),
  }));

  const pilares = PILARES_META.map(({ icon, key }) => ({
    icon,
    key,
    titulo: t(`landing.pillars.${key}.title`),
    descripcion: t(`landing.pillars.${key}.description`),
  }));

  const enlacesFooter = [
    { to: "/terminos-de-uso", label: t("landing.footer.terms") },
    { to: "/privacidad", label: t("landing.footer.navPrivacy") },
    { to: "/politica-cookies", label: t("landing.footer.navCookies") },
    { to: "/contacto", label: t("landing.footer.contact") },
  ];

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
            aria-label={t("landing.nav.homeAriaLabel")}
          >
            <img
              src="/logos/logo-white.png"
              alt="VerdeApp"
              className="h-8 w-auto object-contain"
            />
          </Link>

          <ul className="m-0 flex list-none items-center gap-2 p-0">
            <li><LanguageSwitcher /></li>
            <li><ThemeToggle /></li>
            <li className="hidden sm:block">
              <Link
                to="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                {t("landing.nav.login")}
              </Link>
            </li>
            <li>
              <Link
                to="/register"
                className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
              >
                {t("landing.nav.register")}
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
              className="animate-hero-in mb-4 text-5xl font-extrabold leading-tight tracking-tight text-white drop-shadow sm:text-7xl"
            >
              Verde<span className="text-green-400">App</span>
            </h1>

            <p
              className="animate-hero-in mb-3 text-lg font-semibold text-white/90 sm:text-xl"
              style={{ animationDelay: "120ms" }}
            >
              {t("landing.hero.subtitle")}
            </p>

            <p
              className="animate-hero-in mx-auto mb-10 max-w-xl text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.55)", animationDelay: "240ms" }}
            >
              {t("landing.hero.description")}
            </p>

            <div
              className="animate-hero-in flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: "360ms" }}
            >
              <Link
                to="/login"
                className="flex w-full items-center justify-center rounded-xl px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto"
                style={{ border: "1px solid rgba(255,255,255,0.28)" }}
              >
                {t("landing.hero.ctaLogin")}
              </Link>
              <Link
                to="/register"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-green-600 hover:shadow-xl active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 sm:w-auto"
              >
                {t("landing.hero.ctaRegister")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
                {t("landing.howItWorks.eyebrow")}
              </p>
              <h2
                id="como-funciona-heading"
                className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl"
              >
                {t("landing.howItWorks.title")}
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-gray-500 dark:text-gray-400">
                {t("landing.howItWorks.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {pasos.map(({ imgSrc, key, titulo, descripcion }, i) => (
                <PasoCard
                  key={key}
                  imgSrc={imgSrc}
                  titulo={titulo}
                  descripcion={descripcion}
                  numero={i + 1}
                  index={i}
                />
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
                {t("landing.pillars.eyebrow")}
              </p>
              <h2
                id="pilares-heading"
                className="text-3xl font-bold text-white sm:text-4xl"
              >
                {t("landing.pillars.title")}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
              {pilares.map(({ icon, key, titulo, descripcion }, i) => (
                <PilarCard
                  key={key}
                  Icon={icon}
                  titulo={titulo}
                  descripcion={descripcion}
                  numero={`0${i + 1}`}
                  index={i}
                />
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
              {t("landing.footer.rights", { year: new Date().getFullYear() })}
            </p>
          </div>

          <nav
            aria-label={t("landing.footer.legalAriaLabel")}
            className="mt-4 border-t border-gray-100 pt-4 dark:border-green-900"
          >
            <ul className="m-0 flex list-none flex-wrap justify-center gap-x-5 gap-y-1 p-0">
              {enlacesFooter.map(({ to, label }) => (
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

      <BackToTopButton />
    </div>
  );
}
