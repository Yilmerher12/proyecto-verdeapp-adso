import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, Building, HardHat, Truck, Users, Recycle, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { BackToTopButton } from "@/components/ui/BackToTopButton";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useRestoreScroll } from "@/hooks/useRestoreScroll";
import { useScrollReveal } from "@/hooks/useScrollReveal";

// ¿Qué? Solo la parte visual (ícono) queda fuera del componente — título y
//       descripción se resuelven adentro con t(), porque estos arreglos ya no
//       pueden tener texto fijo en español.
// ¿Para qué? Antes eran 3 imágenes PNG generadas con IA que no correspondían
//           al texto de cada paso (una huella dactilar, texto en inglés dentro
//           de la imagen). Ahora cada ícono es el actor del paso: el conjunto,
//           los residentes y el reciclador.
const PASOS_META = [
  { icon: Building, key: "step1" },
  { icon: Users, key: "step2" },
  { icon: Truck, key: "step3" },
] as const;

const PILARES_META = [
  // Cada ícono sigue el mapa de íconos por concepto: separación = Recycle,
  // recicladores = HardHat (mismo ícono del rol), educación = BookOpen.
  { icon: Recycle, key: "pillar1" },
  { icon: HardHat, key: "pillar2" },
  { icon: BookOpen, key: "pillar3" },
] as const;

// ¿Qué? Un paso de "¿Cómo funciona?": círculo numerado con el ícono y, debajo,
//       la tarjeta con el texto. Entre círculos hay una línea con flecha.
// ¿Para qué? Que los 3 pasos se lean como un recorrido en orden, no como
//           tres tarjetas sueltas. useScrollReveal() es un hook y no puede
//           llamarse dentro del .map() del padre: cada paso lleva su propia
//           instancia, por eso es un componente aparte.
// ¿Impacto? La flecha solo existe desde sm (3 columnas); en celular los pasos
//           se apilan y cada círculo queda sobre su propia tarjeta. El delay
//           escalonado por índice hace que aparezcan uno tras otro.
function PasoCard({
  Icon,
  titulo,
  descripcion,
  numero,
  index,
  esUltimo,
  sinAnimacion,
}: {
  Icon: LucideIcon;
  titulo: string;
  descripcion: string;
  numero: number;
  index: number;
  esUltimo: boolean;
  sinAnimacion: boolean;
}) {
  const { ref, visible } = useScrollReveal<HTMLLIElement>(0.15, sinAnimacion);

  return (
    <li
      ref={ref}
      style={{ transitionDelay: visible ? `${index * 120}ms` : "0ms" }}
      className={`relative flex flex-col items-center transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      {/* Línea + flecha hacia el siguiente círculo: va del borde derecho de
          este círculo (50% + 40px) al borde izquierdo del siguiente, cruzando
          el gap-6 (1.5rem) de la grilla. */}
      {!esUltimo && (
        <div
          aria-hidden="true"
          className="absolute top-9 left-[calc(50%+2.75rem)] right-[calc(-50%+1.25rem)] hidden items-center sm:flex"
        >
          <div className="h-0.5 flex-1 bg-accent-200 dark:bg-accent-800" />
          <ArrowRight className="icon-md -ml-1 shrink-0 text-accent-600 dark:text-accent-400" />
        </div>
      )}

      <div className="relative mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-accent-600 bg-white dark:border-accent-500 dark:bg-accent-900">
        <Icon className="icon-xl text-accent-700 dark:text-accent-300" aria-hidden="true" />
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent-600 text-xs font-bold text-white dark:bg-accent-500 dark:text-accent-950"
        >
          {numero}
        </span>
      </div>

      <article className="w-full flex-1 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-accent-800 dark:bg-accent-900">
        <h3 className="mb-2 text-base font-bold text-gray-900 dark:text-white">{titulo}</h3>
        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{descripcion}</p>
      </article>
    </li>
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
  sinAnimacion,
}: {
  Icon: LucideIcon;
  titulo: string;
  descripcion: string;
  numero: string;
  index: number;
  sinAnimacion: boolean;
}) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>(0.15, sinAnimacion);

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
          <Icon className="icon-lg text-accent-300" aria-hidden="true" />
        </div>
        <span className="text-[10px] font-bold tracking-widest text-accent-500">{numero}</span>
      </div>
      <h3 className="mb-2 text-base font-bold text-white sm:text-lg">{titulo}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
        {descripcion}
      </p>
    </div>
  );
}

// ¿Qué? Bandera a nivel de módulo (no de estado de React) que recuerda si
//       la animación del encabezado ya se mostró una vez durante esta
//       carga de página (esta pestaña, desde el último F5).
// ¿Para qué? React desmonta y vuelve a montar LandingPage por completo cada
//           vez que se navega hacia/desde Login, Registro, Términos,
//           Privacidad, Cookies, Contacto o Aceptar invitación (todas
//           muestran esta misma Landing de fondo). Sin esta bandera, cada
//           uno de esos montajes disparaba la animación otra vez — se veía
//           como si la página se recargara cada vez que se hacía clic en
//           cualquier lado. Al vivir FUERA del componente (variable de
//           módulo), sobrevive a que el componente se desmonte y remonte;
//           solo se reinicia si el usuario recarga el navegador de verdad.
// ¿Impacto? La animación de entrada se ve una vez por carga de página, tal
//           como se espera en la mayoría de sitios — no en cada clic.
let animacionHeroYaSeMostro = false;

interface LandingPageProps {
  // ¿Qué? true cuando este Landing se usa solo como fondo detrás de un
  //       modal (Login, Registro, Términos, Privacidad, Cookies, Contacto,
  //       Aceptar invitación) — no como la página principal.
  // ¿Para qué? En ese caso, esta misma Landing se vuelve a montar desde
  //           cero cada vez, y sin este modo el scroll saltaría de golpe a
  //           donde estaba la última vez que se vio la Landing real.
  // ¿Impacto? Con asBackdrop=true no se restaura ningún scroll. La
  //           animación del encabezado ya se controla aparte (ver
  //           animacionHeroYaSeMostro arriba) y nunca se repite sin
  //           importar el valor de asBackdrop.
  asBackdrop?: boolean;
}

export function LandingPage({ asBackdrop = false }: LandingPageProps = {}) {
  const { t } = useTranslation();

  // ¿Qué? Recuerda dónde estaba el usuario en el Landing y lo restaura al
  //       volver (ej: después de cerrar Términos/Privacidad/Cookies desde
  //       el footer, que remontan esta página desde cero).
  // ¿Impacto? Desactivado cuando asBackdrop=true (ver interfaz arriba).
  useRestoreScroll("landing-scroll-y", !asBackdrop);

  // ¿Qué? Decide UNA sola vez, al crear este componente, si le toca animar.
  // ¿Para qué? useState(() => ...) solo corre esta función en el primer
  //           render de ESTE montaje — perfecto para "consumir" la bandera
  //           de módulo exactamente una vez por montaje real.
  const [debeAnimar] = useState(() => {
    // ¿Qué? De fondo NUNCA anima, sin importar el orden de montaje.
    // ¿Para qué? Si el primer montaje de esta carga de página resultaba
    //           ser justo uno "de fondo" (ej: se entra directo a /register
    //           por URL), esta bandera se consumía ahí y la Landing real
    //           se quedaba sin su única animación — o peor, el de fondo sí
    //           animaba por ser el primero. Cortarlo aquí, antes de tocar
    //           la bandera compartida, evita ambos casos.
    if (asBackdrop) return false;
    if (animacionHeroYaSeMostro) return false;
    animacionHeroYaSeMostro = true;
    return true;
  });

  const heroAnim = debeAnimar ? "animate-hero-in" : "";

  // ¿Qué? Efecto de máquina de escribir para "VerdeApp", letra por letra.
  //       (Antes también escribía un eslogan debajo; se quitó porque sumaba un
  //       quinto nivel de texto al hero sin decir qué hace la app.)
  // ¿Para qué? Mismo criterio de accesibilidad que el resto del Hero: si el
  //           sistema operativo pidió "reducir movimiento", o si esta no es
  //           la primera vez que se monta el Hero real (debeAnimar en false),
  //           el texto aparece completo de una — nunca se queda "escribiendo"
  //           en cada visita.
  // ¿Impacto? aria-label en el <h1> lleva el texto final completo para
  //           lectores de pantalla; los caracteres que se van revelando
  //           quedan aria-hidden, así nadie escucha la palabra a medio
  //           escribir.
  const BRAND = "VerdeApp";
  const BRAND_ACCENT_DESDE = 5; // "Verde" (blanco) | "App" (accent-200; en oscuro accent-50 / accent-300)

  const [prefiereMenosMovimiento] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const debeEscribir = debeAnimar && !prefiereMenosMovimiento;

  const [marcaEscrita, setMarcaEscrita] = useState(debeEscribir ? 0 : BRAND.length);

  useEffect(() => {
    if (!debeEscribir) return;

    let cancelado = false;
    const temporizadores: ReturnType<typeof setTimeout>[] = [];

    const escribirMarca = (i: number) => {
      if (cancelado) return;
      setMarcaEscrita(i);
      if (i < BRAND.length) {
        temporizadores.push(setTimeout(() => escribirMarca(i + 1), 90));
      }
    };

    temporizadores.push(setTimeout(() => escribirMarca(1), 300));

    return () => {
      cancelado = true;
      temporizadores.forEach(clearTimeout);
    };
    // ¿Qué? Issue #225 — este silencio SÍ es intencional (a diferencia de
    //       otros que se corrigieron): la animación de escritura debe
    //       correr UNA sola vez al montar la pantalla. Si se agregaran
    //       "debeEscribir" a las dependencias, un re-render a mitad de la
    //       animación podría reiniciarla desde cero — un efecto visual no
    //       deseado, no un bug real que corregir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pasos = PASOS_META.map(({ icon, key }) => ({
    icon,
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
    <div className="min-h-screen bg-white dark:bg-accent-950">

      {/* ── HEADER ── */}
      <header
        className="fixed left-0 right-0 top-0 z-50 backdrop-blur-md"
        style={{ background: "rgba(5,46,22,0.58)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
            aria-label={t("landing.nav.homeAriaLabel")}
          >
            {/* Barra superior: solo el símbolo; el nombre ya lo muestra el hero. */}
            <BrandLogo variant="mark" tone="light" className="h-9" />
          </Link>

          <ul className="m-0 flex list-none items-center gap-2 p-0">
            <li><LanguageSwitcher /></li>
            <li><ThemeToggle /></li>
            <li className="hidden sm:block">
              <Link
                to="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
              >
                {t("landing.nav.login")}
              </Link>
            </li>
            <li>
              <Link
                to="/register"
                className="rounded-xl bg-accent-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
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
            {/* ¿Qué? Capa de un solo verde semitransparente sobre la foto
                (antes era un degradado: restricciones.md los prohíbe).
                ¿Impacto? 60% en claro y 75% en oscuro: lo justo para que la
                foto se vea y el texto siga pasando WCAG AA sobre la zona más
                clara de la foto (medido con sus pixeles reales). Claro:
                "App" accent-200 3.22 (texto grande, mínimo 3), texto blanco
                4.97 (mínimo 4.5). Oscuro: "Verde" accent-50 7.30, "App"
                accent-300 3.56, texto blanco 8.04. Si se baja más la
                opacidad, "App" vuelve a verse lavado. */}
            <div className="absolute inset-0 bg-accent-950/60 dark:bg-accent-950/75" />
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
            <h1
              id="hero-heading"
              aria-label={BRAND}
              className={`${heroAnim} mb-4 text-5xl font-extrabold leading-tight tracking-tight text-white drop-shadow sm:text-7xl dark:text-accent-50`}
            >
              <span aria-hidden="true">
                {BRAND.slice(0, Math.min(marcaEscrita, BRAND_ACCENT_DESDE))}
                <span className="text-accent-200 dark:text-accent-300">
                  {BRAND.slice(BRAND_ACCENT_DESDE, marcaEscrita)}
                </span>
                {debeEscribir && marcaEscrita < BRAND.length && (
                  <span className="ml-1 inline-block h-[0.9em] w-[3px] align-middle bg-white/80 animate-caret-blink" />
                )}
              </span>
            </h1>


            <p
              className={`${heroAnim} mb-3 text-lg font-semibold text-white/90 sm:text-xl`}
              style={{ animationDelay: "120ms" }}
            >
              {t("landing.hero.subtitle")}
            </p>

            {/* ¿Qué? Antes este texto usaba blanco al 55% de opacidad.
                ¿Para qué? Contra partes más claras de la foto de fondo (o si
                          el degradado oscuro queda más débil ahí), un blanco
                          tan tenue se volvía casi ilegible — no cumplía el
                          contraste mínimo de WCAG para texto sobre imagen.
                ¿Impacto? Subido a 80% de opacidad + una sombra de texto sutil,
                          para que se lea igual sin importar qué haya detrás. */}
            <p
              className={`${heroAnim} mx-auto mb-10 max-w-xl text-sm leading-relaxed`}
              style={{
                color: "rgba(255,255,255,0.85)",
                textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                animationDelay: "240ms",
              }}
            >
              {t("landing.hero.description")}
            </p>

            <div
              className={`${heroAnim} flex flex-col items-center justify-center gap-3 sm:flex-row`}
              style={{ animationDelay: "360ms" }}
            >
              {/* ¿Qué? Antes este botón solo se distinguía por un borde
                  blanco al 28% de opacidad, sin ningún relleno en reposo.
                  ¿Para qué? Sobre una parte más clara de la foto de fondo (o
                            un degradado más débil ahí), ese borde tan sutil
                            prácticamente desaparecía — dejaba de leerse como
                            un botón, causando la confusión real reportada
                            (no era que "el verde" significara otra cosa,
                            era que el botón de al lado casi no se veía).
                  ¿Impacto? Ahora tiene un fondo propio (bg-black/20) desde el
                            reposo, no solo al pasar el mouse — se ve como un
                            botón sin importar qué haya detrás. */}
              <Link
                to="/login"
                className="flex w-full items-center justify-center rounded-xl bg-black/20 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto"
                style={{ border: "1px solid rgba(255,255,255,0.45)" }}
              >
                {t("landing.hero.ctaLogin")}
              </Link>
              <Link
                to="/register"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-700 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-accent-600 hover:shadow-xl active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 sm:w-auto"
              >
                {t("landing.hero.ctaRegister")} <ArrowRight className="icon-md" aria-hidden="true" />
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
          <div className="absolute inset-0 bg-white/90 dark:bg-accent-950/90" aria-hidden="true" />

          <div className="relative mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-accent-600 dark:text-accent-400">
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

            {/* <ol>: los pasos tienen un orden real, y el lector de pantalla
                lo anuncia ("lista de 3 elementos"). */}
            <ol className="m-0 grid list-none grid-cols-1 gap-10 p-0 sm:grid-cols-3 sm:gap-6">
              {pasos.map(({ icon, key, titulo, descripcion }, i) => (
                <PasoCard
                  key={key}
                  Icon={icon}
                  titulo={titulo}
                  descripcion={descripcion}
                  numero={i + 1}
                  index={i}
                  esUltimo={i === pasos.length - 1}
                  sinAnimacion={!debeAnimar}
                />
              ))}
            </ol>
          </div>
        </section>

        {/* ── PILARES ── antes era una lista apilada verticalmente (muy larga);
             ahora son 3 columnas lado a lado, igual que "¿Cómo funciona?", para
             que la sección no se sienta tan alargada. ── */}
        {/* Fondo sólido del verde de marca (antes un degradado). En modo
            oscuro accent-900 ya es la versión "de noche" de la paleta. */}
        <section
          className="relative overflow-hidden bg-accent-900 px-6 py-16 sm:py-20"
          aria-labelledby="pilares-heading"
        >
          <div className="relative mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-accent-400">
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
                  sinAnimacion={!debeAnimar}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      {/* En modo oscuro el footer necesita verse claramente MÁS oscuro que el
          fondo de "Pilares" (verde accent-900) —
          si usan un tono parecido, las dos secciones se leen como una sola,
          sin ningún corte entre ellas. */}
      <footer className="border-t border-gray-100 bg-white px-6 py-8 dark:border-white/10 dark:bg-[#030a06]">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <BrandLogo className="h-7" />
            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              {t("landing.footer.rights", { year: new Date().getFullYear() })}
            </p>
          </div>

          <nav
            aria-label={t("landing.footer.legalAriaLabel")}
            className="mt-4 border-t border-gray-100 pt-4 dark:border-accent-900"
          >
            <ul className="m-0 flex list-none flex-wrap justify-center gap-x-5 gap-y-1 p-0">
              {enlacesFooter.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="rounded text-xs text-gray-400 transition-colors hover:text-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:text-gray-500 dark:hover:text-accent-400"
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
