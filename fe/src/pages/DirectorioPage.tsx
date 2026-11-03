import { ANCHO_PAGINA } from "@/config/anchoPagina";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Phone, Map as MapIcon, HardHat, Warehouse, MessageCircle, Info, ExternalLink, Search, X, TriangleAlert } from "lucide-react";
import { useAvisoCerradoEnSesion } from "@/hooks/useAvisoCerradoEnSesion";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { TablaPuntosAcopio } from "@/components/TablaPuntosAcopio";
import { normalizarTexto } from "@/lib/normalizarTexto";

interface Localidad {
  id_localidad: number;
  nombre_localidad: string;
}

interface Reciclador {
  id_reciclador: number;
  nombre: string;
  apellidos: string;
  numero_telefonico: string | null;
  asociacion: string | null;
  nombre_localidad: string | null;
}

interface PuntoAcopio {
  id_punto_acopio: string;
  nombre: string;
  direccion: string;
  telefono_contacto: string | null;
  nombre_encargado: string | null;
  nombre_localidad: string;
  url_foto: string | null;
}

type TabId = "recicladores" | "puntos";

interface DirectorioPageProps {
  soloAcopio?: boolean;
}

// ¿Qué? URL de la fuente oficial usada en el banner de Puntos de Acopio.
// ¿Para qué? Que el link del "Ver fuente" y el de la documentación de
//           soporte (docs/gestion-proyecto/fuente-datos-puntos-acopio-eca.md)
//           apunten siempre al mismo lugar si algún día cambia.
const FUENTE_ECA_URL =
  "https://www.uaesp.gov.co/sites/default/files/archivos-adjuntos/Listado_Inventario_inicial_ECA_y_Bodegas_PR.pdf";

export function DirectorioPage({ soloAcopio = false }: DirectorioPageProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [tab, setTab] = useState<TabId>(soloAcopio ? "puntos" : "recicladores");
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  // ¿Qué? La pestaña Recicladores queda fija a la localidad del residente
  //       (HU-006/CA-006.6) — por eso tiene su propio estado, separado del
  //       de Puntos de Acopio, que sigue siendo un filtro libre.
  // ¿Impacto? Cambiar de pestaña no se pisa entre sí: elegir otra localidad
  //           en Puntos de Acopio no afecta lo que se ve en Recicladores.
  const [localidadPropiaId, setLocalidadPropiaId] = useState<number | "">("");
  const [localidadPropiaNombre, setLocalidadPropiaNombre] = useState<string | null>(null);
  const [localidadPuntosId, setLocalidadPuntosId] = useState<number | "">("");
  const [localidadCargada, setLocalidadCargada] = useState(false);
  const [recicladores, setRecicladores] = useState<Reciclador[]>([]);
  const [puntos, setPuntos] = useState<PuntoAcopio[]>([]);
  // ¿Qué? Búsqueda por nombre o dirección y fila desplegada de la tabla de puntos.
  // ¿Para qué? El filtro de localidad ya llega del backend; el de nombre se aplica
  //           aquí porque la lista de una localidad es corta.
  // ¿Impacto? La fila abierta se cierra al cambiar de pestaña, de localidad o de búsqueda.
  const [busquedaPuntos, setBusquedaPuntos] = useState("");
  const [puntoAbiertoId, setPuntoAbiertoId] = useState<string | null>(null);
  // ¿Qué? Antes empezaba en "false". Mientras se resuelve la localidad del
  //       usuario (primer useEffect, antes de siquiera pedir el directorio),
  //       "cargandoDirectorio" se quedaba en false — el contenido caía en la
  //       rama de "sin resultados" un instante, antes de que el segundo
  //       useEffect empezara a cargar de verdad (RNF-004.3).
  // ¿Impacto? Ahora el indicador de carga se ve desde el primer render,
  //           hasta que el segundo useEffect lo apaga en su "finally".
  const [cargandoDirectorio, setCargandoDirectorio] = useState(true);
  const [errorDirectorio, setErrorDirectorio] = useState(false);

  // 1. Cargar localidades y detectar la del usuario en paralelo
  useEffect(() => {
    if (!user) return;

    Promise.all([
      axios.get<Localidad[]>(`${API_BASE_URL}/api/v1/geography/localidades`),
      axios.get(`${API_BASE_URL}/api/v1/users/me`),
    ])
      .then(([resLocalidades, resPerfil]) => {
        const lista: Localidad[] = resLocalidades.data;
        setLocalidades(lista);

        const nombreLocalidad: string | null = resPerfil.data.nombre_localidad;
        if (nombreLocalidad) {
          const match = lista.find((l) => l.nombre_localidad === nombreLocalidad);
          if (match) {
            setLocalidadPropiaId(match.id_localidad);
            setLocalidadPropiaNombre(match.nombre_localidad);
            // ¿Qué? Puntos de Acopio arranca preseleccionado en la misma
            //       localidad por conveniencia, pero a diferencia de
            //       Recicladores, aquí sí se puede cambiar libremente.
            setLocalidadPuntosId(match.id_localidad);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLocalidadCargada(true));
     
  }, [user]);

  // 2. Cargar directorio cuando ya se resolvió la localidad y cambia tab/filtro
  useEffect(() => {
    if (!user || !localidadCargada) return;
    // ¿Qué? Reinicia "cargando"/"error" antes de disparar la petición que
    //       viene justo debajo, para que la pantalla muestre el estado de
    //       carga real de este nuevo filtro/tab en vez del resultado (o
    //       error) del anterior mientras la petición nueva está en vuelo.
    // ¿Para qué? La regla react-hooks/set-state-in-effect avisa por el
    //           patrón general de "setState sincrónico dentro de un
    //           effect", pero aquí no dispara un re-render en cascada
    //           real: es el mismo estado que ya se usa para pintar el
    //           spinner de esta misma petición, no un efecto secundario
    //           sobre otro estado no relacionado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargandoDirectorio(true);
    setErrorDirectorio(false);

    const localidadActiva = tab === "recicladores" ? localidadPropiaId : localidadPuntosId;
    const params = localidadActiva ? { localidad_id: localidadActiva } : {};

    // ¿Qué? Antes el catch ponía la lista en [] — se veía exactamente igual
    //       que "no hay resultados para este filtro" (un caso real y válido).
    // ¿Impacto? Ahora un fallo de red/servidor muestra su propio aviso en
    //           vez de disfrazarse de búsqueda vacía.
    if (tab === "recicladores") {
      axios
        .get(`${API_BASE_URL}/api/v1/directorio/recicladores`, { params })
        .then((res) => setRecicladores(res.data))
        .catch(() => {
          setRecicladores([]);
          setErrorDirectorio(true);
        })
        .finally(() => setCargandoDirectorio(false));
    } else {
      axios
        .get(`${API_BASE_URL}/api/v1/directorio/puntos-acopio`, { params })
        .then((res) => setPuntos(res.data))
        .catch(() => {
          setPuntos([]);
          setErrorDirectorio(true);
        })
        .finally(() => setCargandoDirectorio(false));
    }
     
  }, [tab, localidadPropiaId, localidadPuntosId, localidadCargada, user]);

  const consultaPuntos = normalizarTexto(busquedaPuntos.trim());
  const puntosVisibles = puntos.filter(
    (p) => !consultaPuntos || normalizarTexto(`${p.nombre} ${p.direccion}`).includes(consultaPuntos),
  );

  const waLink = (tel: string) => `https://wa.me/57${tel.replace(/\D/g, "")}`;
  const callLink = (tel: string) => `tel:+57${tel.replace(/\D/g, "")}`;

  return (
    <div className={`${ANCHO_PAGINA.normal} space-y-6 pt-6`}>
      {/* ¿Qué? Tarjeta 1: título, subtítulo y controles (pestañas y filtros) juntos.
          ¿Para qué? Antes eran dos bloques sueltos (el título en una tarjeta y los controles flotando
                    debajo sobre el fondo de la página).
          ¿Impacto? El contenido (la lista) va en una segunda tarjeta, debajo. */}
      <div className="bg-white dark:bg-night-card rounded-2xl border border-gray-100 dark:border-night-line p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {soloAcopio ? t("appShell.nav.puntosAcopio") : t("appShell.nav.directorioGeneral")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {soloAcopio
            ? t("directorio.subtitleAcopio")
            : t("directorio.subtitleGeneral")}
        </p>

      {/* Controles: tabs + filtro localidad */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {!soloAcopio && (
          // ¿Qué? En celular (375 px) las dos pestañas se reparten el ancho de la tarjeta en partes iguales (el
          //       texto largo baja a una segunda línea); desde `sm` van juntas, cada una del tamaño de su texto.
          // ¿Para qué? Con `whitespace-nowrap` las dos medían 326 px y se salían 22 px de la tarjeta de 278 px.
          <div className="grid w-full grid-cols-2 rounded-xl border border-gray-200 bg-white p-1 dark:border-night-line dark:bg-night-panel sm:flex sm:w-auto sm:shrink-0">
            {(
              [
                { id: "recicladores" as TabId, label: t("directorio.tabs.recyclers"), icon: <HardHat className="icon-md shrink-0" /> },
                { id: "puntos" as TabId, label: t("appShell.nav.puntosAcopio"), icon: <Warehouse className="icon-md shrink-0" /> },
              ] as const
            ).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  setPuntoAbiertoId(null);
                }}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-sm font-medium leading-tight transition-colors sm:whitespace-nowrap sm:px-4 ${
                  tab === id
                    ? "bg-accent-700 text-white shadow-sm dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ¿Qué? La pestaña Recicladores no deja elegir localidad — queda
            fija a la del residente (HU-006/CA-006.6), así que en vez de un
            <select> (que sugeriría que sí se puede cambiar) se muestra un
            indicador fijo. Puntos de Acopio sigue con el filtro libre. */}
        {tab === "recicladores" && !soloAcopio ? (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-night-line dark:bg-night-panel dark:text-gray-200">
            <MapIcon className="icon-md shrink-0 text-accent-600" />
            {localidadPropiaNombre
              ? t("directorio.ownLocality", { localidad: localidadPropiaNombre })
              : t("directorio.ownLocalityUnknown")}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[12.5rem]">
              <Search className="icon-md pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <input
                type="search"
                value={busquedaPuntos}
                onChange={(e) => {
                  setBusquedaPuntos(e.target.value);
                  setPuntoAbiertoId(null);
                }}
                aria-label={t("directorio.searchPoints")}
                placeholder={t("directorio.searchPoints")}
                className="w-full rounded-lg border border-edge bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-night-edge dark:bg-night-panel dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <MapIcon className="icon-md shrink-0 text-accent-600" />
              <select
                value={localidadPuntosId}
                aria-label={t("adminPuntosAcopio.fields.locality")}
                onChange={(e) => {
                  setLocalidadPuntosId(e.target.value === "" ? "" : Number(e.target.value));
                  setPuntoAbiertoId(null);
                }}
                className="min-w-0 max-w-full cursor-pointer rounded-lg border border-edge bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-night-edge dark:bg-night-panel dark:text-gray-200"
              >
                <option value="">{t("directorio.allLocalities")}</option>
                {localidades.map((l) => (
                  <option key={l.id_localidad} value={l.id_localidad}>
                    {l.nombre_localidad}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Contenido */}
      {tab === "recicladores" && !soloAcopio ? (
        // ¿Qué? Tarjeta 2 de la pestaña Recicladores: arriba la franja con el aviso "¿Qué es este directorio?"
        //       (se puede cerrar con la X y queda un enlace con su título; solo se recuerda en la sesión) y
        //       debajo la lista, una fila por reciclador con Llamar y WhatsApp a la vista.
        // ¿Para qué? Antes eran tarjetas sueltas en dos columnas con la localidad repetida en cada una (ya
        //           está fija arriba) y el aviso flotando como otro bloque.
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-night-line dark:bg-night-card">
          <div className="border-b border-gray-100 dark:border-night-line">
            <InfoBanner
              enFranja
              id="directorio-recicladores"
              titulo={t("directorio.infoRecicladores.titulo")}
              descripcion={t("directorio.infoRecicladores.descripcion")}
              paraQueSirve={t("directorio.infoRecicladores.paraQueSirve")}
              fuenteTexto={t("directorio.infoRecicladores.fuenteTexto")}
            />
          </div>
          {cargandoDirectorio ? (
            <div className="p-4">
              <LoadingState message={t("common.loading")} />
            </div>
          ) : errorDirectorio ? (
            <div className="p-4">
              <Alert type="error" message={t("common.loadError")} />
            </div>
          ) : recicladores.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={HardHat} message={t("directorio.emptyRecyclers")} />
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-night-line">
              {recicladores.map((r) => (
                <FilaReciclador key={r.id_reciclador} reciclador={r} waLink={waLink} callLink={callLink} />
              ))}
            </ul>
          )}
        </div>
      ) : !cargandoDirectorio && !errorDirectorio && puntosVisibles.length > 0 ? (
        <TablaPuntosAcopio
          puntos={puntosVisibles}
          variante="lectura"
          abiertoId={puntoAbiertoId}
          onAlternar={(id) => setPuntoAbiertoId((actual) => (actual === id ? null : id))}
          encabezado={<FranjaEca soloAcopio={soloAcopio} />}
        />
      ) : (
        // ¿Qué? Tarjeta 2 sin tabla (cargando, error o sin resultados): mantiene la misma franja arriba.
        // ¿Para qué? Que la advertencia de la lista de 2020 se vea siempre, también cuando no hay filas.
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-night-line dark:bg-night-card">
          <FranjaEca soloAcopio={soloAcopio} />
          <div className="p-4">
            {cargandoDirectorio ? (
              <LoadingState message={t("common.loading")} />
            ) : errorDirectorio ? (
              <Alert type="error" message={t("common.loadError")} />
            ) : puntos.length === 0 ? (
              <EmptyState icon={Warehouse} message={t("directorio.emptyPoints")} />
            ) : (
              <EmptyState icon={Search} message={t("directorio.noPointsMatch")} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ¿Qué? Franja que va arriba de la lista de puntos de acopio, dentro de su tarjeta: el aviso "¿Qué es una
//       ECA?" (se puede cerrar y queda un enlace) y, siempre visible, la nota de procedencia con "Ver fuente".
// ¿Para qué? La nota tiene que aclarar de dónde sale el dato (lista oficial de la UAESP de marzo de 2020) y
//           que no son todas las ECA de la ciudad; sin ella, alguien podría tomar los 9 puntos como el total
//           real de Bogotá. El enlace lleva al inventario de la UAESP, que lista muchas más.
// ¿Impacto? El texto de la ECA cambia por rol y no dice que se pueda entregar por cuenta propia hasta que
//           la UAESP lo confirme (#500). La nota NO se puede cerrar.
function FranjaEca({ soloAcopio }: { soloAcopio: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="border-b border-gray-100 dark:border-night-line">
      <InfoBanner
        enFranja
        id="directorio-eca"
        titulo={t("directorio.infoPuntos.titulo")}
        descripcion={t(soloAcopio ? "directorio.infoPuntos.descripcionReciclador" : "directorio.infoPuntos.descripcionResidente")}
      />
      <p className="flex items-start gap-2 border-t border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-800 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-200">
        <TriangleAlert className="icon-sm mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          {t("directorio.infoPuntos.nota")}{" "}
          <a
            href={FUENTE_ECA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
          >
            {t("directorio.infoPuntos.fuenteLink")}
            <ExternalLink className="icon-sm" aria-hidden="true" />
          </a>
        </span>
      </p>
    </div>
  );
}

// ¿Qué? Caja informativa compartida por las 2 pestañas del directorio, con
//       la misma estructura (qué es / para qué sirve / de dónde viene) pero
//       contenido distinto según el tipo de dato. Se puede cerrar con la X.
// ¿Para qué? Usa los tokens accent-* de la marca (no el Alert genérico de
//           tipo "info", que es azul neutro) para que se sienta parte del
//           sistema de diseño de VerdeApp, no una alerta del navegador.
//           Cerrada, queda un enlace con el título para volver a abrirla.
// ¿Impacto? Sin esto, alguien nuevo en el directorio no tiene forma de
//           saber, por ejemplo, qué es una ECA. La preferencia solo dura la
//           sesión (ver useAvisoCerradoEnSesion): en cada inicio de sesión
//           vuelve a mostrarse.
function InfoBanner({
  id,
  titulo,
  descripcion,
  paraQueSirve,
  fuenteTexto,
  enFranja = false,
}: {
  id: string;
  titulo: string;
  descripcion: string;
  paraQueSirve?: string;
  fuenteTexto?: string;
  /** ¿Qué? Dentro de la tarjeta de la lista: sin esquinas ni borde propios, a todo el ancho. */
  enFranja?: boolean;
}) {
  const { t } = useTranslation();
  const { cerrado, cerrar, reabrir } = useAvisoCerradoEnSesion(id);

  if (cerrado) {
    const enlace = (
      <button type="button" onClick={reabrir} className="link-text inline-flex cursor-pointer items-center gap-1.5 text-sm">
        <Info className="icon-sm" aria-hidden="true" />
        {titulo}
      </button>
    );
    return enFranja ? <div className="px-5 py-3">{enlace}</div> : enlace;
  }

  return (
    <div
      className={
        enFranja
          ? "bg-accent-50 px-5 py-4 dark:bg-accent-300/10"
          : "rounded-2xl border border-accent-200 bg-accent-50 p-4 dark:border-accent-300/40 dark:bg-accent-300/10"
      }
    >
      <div className="flex gap-3">
        <Info className="icon-lg mt-0.5 shrink-0 text-accent-600 dark:text-accent-400" />
        <div className="min-w-0 flex-1 space-y-1.5 text-sm">
          <p className="font-semibold text-accent-900 dark:text-accent-200">{titulo}</p>
          <p className="text-accent-800/90 dark:text-accent-300/90">{descripcion}</p>
          {paraQueSirve && <p className="text-accent-800/90 dark:text-accent-300/90">{paraQueSirve}</p>}
          {fuenteTexto && <p className="text-xs text-accent-800 dark:text-accent-300">{fuenteTexto}</p>}
        </div>
        <button
          type="button"
          onClick={cerrar}
          aria-label={t("common.close")}
          title={t("common.close")}
          className="touch-target-h -mr-1 -mt-1 flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-lg px-1.5 text-accent-700 transition-colors hover:bg-accent-100 dark:text-accent-300 dark:hover:bg-accent-300/15"
        >
          <X className="icon-md" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ¿Qué? Una fila de la lista de recicladores: nombre, asociación (si tiene) y, a la derecha, Llamar y
//       WhatsApp. Si el reciclador no comparte su teléfono, en su lugar dice "No comparte su teléfono".
// ¿Para qué? Lo que el Residente viene a hacer aquí es contactar: los dos botones quedan siempre a la vista,
//           sin desplegar nada. La localidad no se escribe porque la lista ya es de la localidad fija de arriba.
// ¿Impacto? El backend solo manda el teléfono si el reciclador activó `mostrar_contacto_directorio`; sin
//           teléfono es una decisión del reciclador, no un dato faltante.
function FilaReciclador({
  reciclador: r,
  waLink,
  callLink,
}: {
  reciclador: Reciclador;
  waLink: (t: string) => string;
  callLink: (t: string) => string;
}) {
  const { t } = useTranslation();
  const nombre = `${r.nombre} ${r.apellidos}`;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-400/15">
          <HardHat className="icon-lg text-teal-700 dark:text-teal-300" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">{nombre}</p>
          {r.asociacion && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{r.asociacion}</p>}
        </div>
      </div>

      {r.numero_telefonico ? (
        <div className="flex gap-2">
          <a
            href={callLink(r.numero_telefonico)}
            aria-label={`${t("directorio.call")} ${nombre}`}
            className="touch-target-h flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-night-line dark:text-gray-300 dark:hover:bg-night-hover"
          >
            <Phone className="icon-sm" aria-hidden="true" />
            {t("directorio.call")}
          </a>
          <a
            href={waLink(r.numero_telefonico)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${nombre}`}
            className="touch-target-h flex items-center justify-center gap-1.5 rounded-lg bg-accent-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-600 dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
          >
            <MessageCircle className="icon-sm" aria-hidden="true" />
            WhatsApp
          </a>
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("directorio.noPhone")}</p>
      )}
    </li>
  );
}
