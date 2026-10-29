/**
 * Archivo: components/FichaPuntoAcopio.tsx
 * Descripción: Ficha de un punto de acopio en dos bloques, Ubicación y Contacto.
 * ¿Para qué? Es la misma ficha para los 3 roles: se muestra dentro de la fila
 *           desplegada de TablaPuntosAcopio, en el Directorio del Residente, en la
 *           página del Reciclador y en la gestión del Admin del Sistema.
 * ¿Impacto? Sin teléfono, Residente y Reciclador ven la línea general de la UAESP
 *           (aclarando que no es la del punto) y el Admin ve "Sin teléfono", porque
 *           es quien debe completarlo. "Cómo llegar" busca por la dirección; las
 *           coordenadas y la foto llegan con otra tarjeta.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink, MapPin, Navigation } from "lucide-react";
import { googleMapsUrl } from "@/lib/mapsLink";

export interface PuntoFicha {
  id_punto_acopio: string;
  nombre: string;
  direccion: string;
  nombre_localidad: string;
  telefono_contacto: string | null;
  nombre_encargado: string | null;
  /** ¿Qué? Solo lo trae la gestión del Admin; el Directorio solo lista puntos activos. */
  activo?: boolean;
}

interface FichaPuntoAcopioProps {
  punto: PuntoFicha;
  variante: "lectura" | "gestion";
}

// ¿Qué? Línea general de la UAESP (pie de uaesp.gov.co, consultado el 2026-10-28).
// ¿Para qué? Texto de respaldo cuando un punto no tiene teléfono. No es el teléfono de la ECA.
const LINEA_UAESP = "601 3580400";
const LINEA_UAESP_HREF = "tel:+576013580400";

const TITULO_BLOQUE = "mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

export function FichaPuntoAcopio({ punto, variante }: FichaPuntoAcopioProps) {
  const { t } = useTranslation();
  const k = "puntosAcopioTabla.ficha";
  const [copiado, setCopiado] = useState(false);

  // ¿Qué? Copia la dirección y muestra un check un instante.
  // ¿Para qué? Poder pegarla en otra app sin transcribirla.
  const copiarDireccion = async () => {
    try {
      await navigator.clipboard.writeText(punto.direccion);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // ¿Qué? Si el navegador niega el portapapeles no hay nada útil que avisar.
    }
  };

  return (
    <div role="region" aria-label={t(`${k}.ariaLabel`, { nombre: punto.nombre })} className="grid gap-x-10 gap-y-5 p-5 md:grid-cols-2">
      <section>
        <h3 className={TITULO_BLOQUE}>{t(`${k}.location`)}</h3>
        {/* ¿Qué? El texto no se estira (sin flex-1): el botón de copiar queda pegado a la dirección,
            no al borde del bloque. */}
        <p className="flex items-start gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
          <MapPin className="icon-sm mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <span className="min-w-0 break-words">{punto.direccion}</span>
          <button
            type="button"
            onClick={copiarDireccion}
            className="touch-area focus-ring relative shrink-0 cursor-pointer rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-night-hover dark:hover:text-gray-300"
            aria-label={t("directorio.copyAddress")}
            title={t("directorio.copyAddress")}
          >
            {copiado ? <Check className="icon-sm text-accent-600 dark:text-accent-400" /> : <Copy className="icon-sm" />}
          </button>
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{punto.nombre_localidad}</p>
        <a
          href={googleMapsUrl(punto.direccion, punto.nombre_localidad)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t(`${k}.howToGetThereAria`, { nombre: punto.nombre })}
          className="touch-target-h focus-ring mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-accent-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-600 sm:w-auto dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200"
        >
          <Navigation className="icon-sm" aria-hidden="true" />
          {t(`${k}.howToGetThere`)}
          <ExternalLink className="icon-sm" aria-hidden="true" />
        </a>
      </section>

      <section>
        <h3 className={TITULO_BLOQUE}>{t(`${k}.contact`)}</h3>
        <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          <dt className="text-gray-500 dark:text-gray-400">{t("adminPuntosAcopio.panel.phone")}</dt>
          <dd className="break-words font-medium text-gray-900 dark:text-white">
            {punto.telefono_contacto ? (
              punto.telefono_contacto
            ) : variante === "gestion" ? (
              t("adminPuntosAcopio.noPhone")
            ) : (
              <>
                {t(`${k}.noPhonePublished`)}
                <span className="mt-0.5 block text-xs font-normal text-gray-500 dark:text-gray-400">
                  {t(`${k}.uaespLine`)}{" "}
                  <a href={LINEA_UAESP_HREF} className="link-text whitespace-nowrap font-semibold">
                    {LINEA_UAESP}
                  </a>
                </span>
              </>
            )}
          </dd>
          <dt className="text-gray-500 dark:text-gray-400">{t("adminPuntosAcopio.panel.manager")}</dt>
          <dd className="break-words font-medium text-gray-900 dark:text-white">
            {punto.nombre_encargado || t("adminPuntosAcopio.noManager")}
          </dd>
        </dl>
      </section>
    </div>
  );
}
