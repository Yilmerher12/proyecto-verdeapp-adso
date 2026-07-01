import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Phone, MapPin, Users, Building2, MessageCircle } from "lucide-react";
import axios from "axios";

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

export function DirectorioPage({ soloAcopio = false }: DirectorioPageProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { accessToken } = useAuth() as any;

  const [tab, setTab] = useState<TabId>(soloAcopio ? "puntos" : "recicladores");
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [localidadId, setLocalidadId] = useState<number | "">("");
  const [localidadCargada, setLocalidadCargada] = useState(false);
  const [recicladores, setRecicladores] = useState<Reciclador[]>([]);
  const [puntos, setPuntos] = useState<PuntoAcopio[]>([]);
  const [cargandoDirectorio, setCargandoDirectorio] = useState(false);

  const headers = { Authorization: `Bearer ${accessToken}` };

  // 1. Cargar localidades y detectar la del usuario en paralelo
  useEffect(() => {
    if (!accessToken) return;

    Promise.all([
      axios.get<Localidad[]>("http://localhost:8000/api/v1/geography/localidades"),
      axios.get("http://localhost:8000/api/v1/users/me", { headers }),
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

    const params = localidadId ? { localidad_id: localidadId } : {};

    if (tab === "recicladores") {
      axios
        .get("http://localhost:8000/api/v1/directorio/recicladores", { headers, params })
        .then((res) => setRecicladores(res.data))
        .catch(() => setRecicladores([]))
        .finally(() => setCargandoDirectorio(false));
    } else {
      axios
        .get("http://localhost:8000/api/v1/directorio/puntos-acopio", { headers, params })
        .then((res) => setPuntos(res.data))
        .catch(() => setPuntos([]))
        .finally(() => setCargandoDirectorio(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, localidadId, localidadCargada, accessToken]);

  const waLink = (tel: string) => `https://wa.me/57${tel.replace(/\D/g, "")}`;
  const callLink = (tel: string) => `tel:+57${tel.replace(/\D/g, "")}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {soloAcopio ? "Puntos de Acopio" : "Directorio General"}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {soloAcopio
            ? "Encuentra los puntos donde puedes entregar material reciclado."
            : "Conecta con los recicladores y puntos de acopio de tu localidad."}
        </p>
      </div>

      {/* Controles: tabs + filtro localidad */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!soloAcopio && (
          <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
            {(
              [
                { id: "recicladores" as TabId, label: "Recicladores", icon: <Users className="h-4 w-4" /> },
                { id: "puntos" as TabId, label: "Puntos de Acopio", icon: <Building2 className="h-4 w-4" /> },
              ] as const
            ).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tab === id
                    ? "bg-green-600 text-white shadow-sm"
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
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="">Todas las localidades</option>
            {localidades.map((l) => (
              <option key={l.id_localidad} value={l.id_localidad}>
                {l.nombre_localidad}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenido */}
      {cargandoDirectorio ? (
        <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
      ) : tab === "recicladores" && !soloAcopio ? (
        recicladores.length === 0 ? (
          <EmptyState mensaje="No hay recicladores registrados en esta localidad." />
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
        <EmptyState mensaje="No hay puntos de acopio registrados en esta localidad." />
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

function TarjetaReciclador({
  reciclador: r,
  waLink,
  callLink,
}: {
  reciclador: Reciclador;
  waLink: (t: string) => string;
  callLink: (t: string) => string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-700 text-base font-bold text-white select-none">
          {r.nombre.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {r.nombre} {r.apellidos}
          </p>
          {r.nombre_localidad && (
            <p className="text-xs text-gray-400">{r.nombre_localidad}</p>
          )}
        </div>
      </div>

      {r.asociacion && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {r.asociacion}
        </p>
      )}

      {r.numero_telefonico ? (
        <div className="flex gap-2">
          <a
            href={callLink(r.numero_telefonico)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Phone className="h-3.5 w-3.5" />
            Llamar
          </a>
          <a
            href={waLink(r.numero_telefonico)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-xs font-medium text-white transition-colors hover:bg-green-500"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        </div>
      ) : (
        <p className="text-xs text-gray-400">Sin teléfono registrado</p>
      )}
    </div>
  );
}

function TarjetaPunto({ punto: p }: { punto: PuntoAcopio }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-start gap-2">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{p.nombre}</p>
          <p className="text-xs text-gray-400">{p.nombre_localidad}</p>
        </div>
      </div>

      <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
        <p className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
          {p.direccion}
        </p>
        {p.telefono_contacto && (
          <p className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            {p.telefono_contacto}
          </p>
        )}
        {p.nombre_encargado && (
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
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
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-900/40">
      <MapPin className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
      <p className="text-sm text-gray-400 dark:text-gray-500">{mensaje}</p>
    </div>
  );
}
