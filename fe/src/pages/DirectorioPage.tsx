import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Phone, MapPin, Users, Building2, MessageCircle, Info, Copy, Check } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import { Alert } from "@/components/ui/Alert";

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
  id_punto_acopio: number;
  nombre: string;
  direccion: string;
  telefono_contacto: string | null;
  nombre_encargado: string | null;
  nombre_localidad: string;
}

type TabId = "recicladores" | "puntos";

interface DirectorioPageProps {
  soloAcopio?: boolean;
}

// ¿Qué? URL de la fuente oficial usada en el banner de Puntos de Acopio.
// ¿Para qué? Que el link del "Ver fuente" y el de la documentación de
//           soporte (docs/gestion-proyecto/fuente-datos-puntos-acopio-eca.md)
//           apunten siempre al mismo lugar si algún día cambia.
const FUENTE_ECA_URL = "https://datosabiertos.bogota.gov.co/dataset/data_set_aprovechamiento_ecas";

export function DirectorioPage({ soloAcopio = false }: DirectorioPageProps) {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { accessToken } = useAuth() as any;

  const [tab, setTab] = useState<TabId>(soloAcopio ? "puntos" : "recicladores");
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [localidadId, setLocalidadId] = useState<number | "">("");
  const [localidadCargada, setLocalidadCargada] = useState(false);
  const [recicladores, setRecicladores] = useState<Reciclador[]>([]);
  const [puntos, setPuntos] = useState<PuntoAcopio[]>([]);
  // ¿Qué? Antes empezaba en "false". Mientras se resuelve la localidad del
  //       usuario (primer useEffect, antes de siquiera pedir el directorio),
  //       "cargandoDirectorio" se quedaba en false — el contenido caía en la
  //       rama de "sin resultados" un instante, antes de que el segundo
  //       useEffect empezara a cargar de verdad (RNF-004.3).
  // ¿Impacto? Ahora el indicador de carga se ve desde el primer render,
  //           hasta que el segundo useEffect lo apaga en su "finally".
  const [cargandoDirectorio, setCargandoDirectorio] = useState(true);
  const [errorDirectorio, setErrorDirectorio] = useState(false);

  const headers = { Authorization: `Bearer ${accessToken}` };

  // 1. Cargar localidades y detectar la del usuario en paralelo
  useEffect(() => {
    if (!accessToken) return;

    Promise.all([
      axios.get<Localidad[]>(`${API_BASE_URL}/api/v1/geography/localidades`),
      axios.get(`${API_BASE_URL}/api/v1/users/me`, { headers }),
    ])
      .then(([resLocalidades, resPerfil]) => {
        const lista: Localidad[] = resLocalidades.data;
        setLocalidades(lista);

        const nombreLocalidad: string | null = resPerfil.data.nombre_localidad;
        if (nombreLocalidad) {
          const match = lista.find((l) => l.nombre_localidad === nombreLocalidad);
          if (match) setLocalidadId(match.id_localidad);
        }
      })
      .catch(() => {})
      .finally(() => setLocalidadCargada(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // 2. Cargar directorio cuando ya se resolvió la localidad y cambia tab/filtro
  useEffect(() => {
    if (!accessToken || !localidadCargada) return;
    setCargandoDirectorio(true);
    setErrorDirectorio(false);

    const params = localidadId ? { localidad_id: localidadId } : {};

    // ¿Qué? Antes el catch ponía la lista en [] — se veía exactamente igual
    //       que "no hay resultados para este filtro" (un caso real y válido).
    // ¿Impacto? Ahora un fallo de red/servidor muestra su propio aviso en
    //           vez de disfrazarse de búsqueda vacía.
    if (tab === "recicladores") {
      axios
        .get(`${API_BASE_URL}/api/v1/directorio/recicladores`, { headers, params })
        .then((res) => setRecicladores(res.data))
        .catch(() => {
          setRecicladores([]);
          setErrorDirectorio(true);
        })
        .finally(() => setCargandoDirectorio(false));
    } else {
      axios
        .get(`${API_BASE_URL}/api/v1/directorio/puntos-acopio`, { headers, params })
        .then((res) => setPuntos(res.data))
        .catch(() => {
          setPuntos([]);
          setErrorDirectorio(true);
        })
        .finally(() => setCargandoDirectorio(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, localidadId, localidadCargada, accessToken]);

  const waLink = (tel: string) => `https://wa.me/57${tel.replace(/\D/g, "")}`;
  const callLink = (tel: string) => `tel:+57${tel.replace(/\D/g, "")}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-6">
      {/* Encabezado */}
      <div className="bg-white dark:bg-[#132a1c] rounded-2xl border border-gray-100 dark:border-[#2a4d34] p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {soloAcopio ? t("appShell.nav.puntosAcopio") : t("appShell.nav.directorioGeneral")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {soloAcopio
            ? t("directorio.subtitleAcopio")
            : t("directorio.subtitleGeneral")}
        </p>
      </div>

      {/* Controles: tabs + filtro localidad */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!soloAcopio && (
          <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-[#2a4d34] dark:bg-[#132a1c]">
            {(
              [
                { id: "recicladores" as TabId, label: t("directorio.tabs.recyclers"), icon: <Users className="h-4 w-4" /> },
                { id: "puntos" as TabId, label: t("appShell.nav.puntosAcopio"), icon: <Building2 className="h-4 w-4" /> },
              ] as const
            ).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tab === id
                    ? "bg-green-700 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-green-600" />
          <select
            value={localidadId}
            onChange={(e) =>
              setLocalidadId(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#132a1c] dark:text-gray-200"
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

      {/* ¿Qué? Aviso informativo, distinto según la pestaña activa.
          ¿Para qué? El de Recicladores explica qué es y para qué le sirve
          al residente (directorio propio, sin fuente externa). El de
          Puntos de Acopio, además, tiene que aclarar la procedencia del
          dato (UAESP) y por qué solo cubre 6 de 20 localidades — sin esto,
          alguien podría pensar que faltan datos por cargar, cuando en
          realidad es la cobertura real de las ECA en Bogotá. */}
      {tab === "recicladores" && !soloAcopio ? (
        <InfoBanner
          titulo={t("directorio.infoRecicladores.titulo")}
          descripcion={t("directorio.infoRecicladores.descripcion")}
          paraQueSirve={t("directorio.infoRecicladores.paraQueSirve")}
          fuenteTexto={t("directorio.infoRecicladores.fuenteTexto")}
        />
      ) : (
        <InfoBanner
          titulo={t("directorio.infoPuntos.titulo")}
          descripcion={t("directorio.infoPuntos.descripcion")}
          paraQueSirve={t("directorio.infoPuntos.paraQueSirve")}
          fuenteTexto={t("directorio.infoPuntos.fuenteTexto")}
          fuenteHref={FUENTE_ECA_URL}
          fuenteLinkLabel={t("directorio.infoPuntos.fuenteLink")}
        />
      )}

      {/* Contenido */}
      {cargandoDirectorio ? (
        <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</div>
      ) : errorDirectorio ? (
        <Alert type="error" message={t("common.loadError")} />
      ) : tab === "recicladores" && !soloAcopio ? (
        recicladores.length === 0 ? (
          <EmptyState mensaje={t("directorio.emptyRecyclers")} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {recicladores.map((r) => (
              <TarjetaReciclador
                key={r.id_reciclador}
                reciclador={r}
                waLink={waLink}
                callLink={callLink}
              />
            ))}
          </div>
        )
      ) : puntos.length === 0 ? (
        <EmptyState mensaje={t("directorio.emptyPoints")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {puntos.map((p) => (
            <TarjetaPunto key={p.id_punto_acopio} punto={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ¿Qué? Caja informativa compartida por las 2 pestañas del directorio, con
//       la misma estructura (qué es / para qué sirve / de dónde viene) pero
//       contenido distinto según el tipo de dato.
// ¿Para qué? Usa los tokens accent-* de la marca (no el Alert genérico de
//           tipo "info", que es azul neutro) para que se sienta parte del
//           sistema de diseño de VerdeApp, no una alerta del navegador.
// ¿Impacto? Sin esto, alguien nuevo en el directorio no tiene forma de
//           saber, por ejemplo, por qué 14 de 20 localidades no muestran
//           ningún punto de acopio — con esto queda aclarado la primera
//           vez que entra, cada vez que entra.
function InfoBanner({
  titulo,
  descripcion,
  paraQueSirve,
  fuenteTexto,
  fuenteHref,
  fuenteLinkLabel,
}: {
  titulo: string;
  descripcion: string;
  paraQueSirve: string;
  fuenteTexto: string;
  fuenteHref?: string;
  fuenteLinkLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-accent-200 bg-accent-50 p-4 dark:border-accent-800/30 dark:bg-accent-900/10">
      <div className="flex gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-600 dark:text-accent-400" />
        <div className="space-y-1.5 text-sm">
          <p className="font-semibold text-accent-900 dark:text-accent-200">{titulo}</p>
          <p className="text-accent-800/90 dark:text-accent-300/90">{descripcion}</p>
          <p className="text-accent-800/90 dark:text-accent-300/90">{paraQueSirve}</p>
          <p className="text-xs text-accent-700/80 dark:text-accent-400/80">
            {fuenteTexto}
            {fuenteHref && fuenteLinkLabel && (
              <>
                {" — "}
                <a
                  href={fuenteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2 hover:text-accent-900 dark:hover:text-accent-200"
                >
                  {fuenteLinkLabel} ↗
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function TarjetaReciclador({
  reciclador: r,
  waLink,
  callLink,
}: {
  reciclador: Reciclador;
  waLink: (t: string) => string;
  callLink: (t: string) => string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-[#2a4d34] dark:bg-[#132a1c]">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/30">
          <Users className="h-5 w-5 text-teal-700 dark:text-teal-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900 dark:text-white">
            {r.nombre} {r.apellidos}
          </p>
          {r.nombre_localidad && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-[#0d2116] dark:text-gray-300">
              <MapPin className="h-3 w-3" />
              {r.nombre_localidad}
            </span>
          )}
        </div>
      </div>

      {r.asociacion && (
        <span className="mb-4 inline-flex w-fit items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-900/20 dark:text-teal-400">
          {r.asociacion}
        </span>
      )}

      <div className="mt-auto pt-1">
        {r.numero_telefonico ? (
          <div className="flex gap-2">
            <a
              href={callLink(r.numero_telefonico)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-[#2a4d34] dark:text-gray-300 dark:hover:bg-[#2a4d34]"
            >
              <Phone className="h-3.5 w-3.5" />
              {t("directorio.call")}
            </a>
            <a
              href={waLink(r.numero_telefonico)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-700 py-2 text-xs font-medium text-white transition-colors hover:bg-green-600"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("directorio.noPhone")}</p>
        )}
      </div>
    </div>
  );
}

function TarjetaPunto({ punto: p }: { punto: PuntoAcopio }) {
  const { t } = useTranslation();
  const [copiado, setCopiado] = useState(false);

  // ¿Qué? Copia la dirección al portapapeles y muestra una confirmación
  //       breve (ícono de check) antes de volver al ícono de copiar.
  // ¿Para qué? Para que se pueda pegar directo en Google Maps u otra app,
  //           en vez de tener que transcribirla a mano.
  const copiarDireccion = async () => {
    try {
      await navigator.clipboard.writeText(p.direccion);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // ¿Qué? Si el navegador niega el permiso del portapapeles (poco común,
      //       pero posible), no hay nada más que hacer desde aquí — no tiene
      //       sentido mostrar un error por algo tan menor como esto.
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-[#2a4d34] dark:bg-[#132a1c]">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
          <Building2 className="h-5 w-5 text-green-700 dark:text-green-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900 dark:text-white">{p.nombre}</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-[#0d2116] dark:text-gray-300">
            <MapPin className="h-3 w-3" />
            {p.nombre_localidad}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
        <p className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="flex-1">{p.direccion}</span>
          <button
            type="button"
            onClick={copiarDireccion}
            className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-[#2a4d34] dark:hover:text-gray-300"
            aria-label={t("directorio.copyAddress")}
            title={t("directorio.copyAddress")}
          >
            {copiado ? (
              <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </p>
        {p.telefono_contacto && (
          <p className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            {p.telefono_contacto}
          </p>
        )}
        {p.nombre_encargado && (
          <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Users className="h-3.5 w-3.5 shrink-0" />
            {p.nombre_encargado}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center dark:border-[#2a4d34] dark:bg-[#132a1c]/40">
      <MapPin className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{mensaje}</p>
    </div>
  );
}
