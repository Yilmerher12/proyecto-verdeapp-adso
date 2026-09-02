/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { UserPlus, Building2, MapPin } from "lucide-react";
import { invitarAdministradorConjunto } from "@/lib/adminConjuntoApi";
import { ConjuntoComboboxMultiple } from "@/components/ui/ConjuntoComboboxMultiple";
import type { ConjuntoOption } from "@/components/ui/ConjuntoCombobox";

interface Localidad {
  id_localidad: number;
  nombre_localidad: string;
}

interface InvitarAdminConjuntoFormProps {
  // ¿Qué? El token de sesión del Administrador del Sistema, para autorizar
  //       la llamada al backend (el backend igual revalida que sea rol=1).
  token: string;
}

/**
 * ¿Qué? Formulario para que el Administrador del Sistema invite a una
 *       persona a convertirse en Administrador de Conjunto.
 * ¿Para qué? Solo pide correo + conjunto(s) a asignar — nunca contraseña
 *           ni datos personales del invitado (esos los completa la
 *           persona invitada por su cuenta, ver AceptarInvitacionPage).
 */
export function InvitarAdminConjuntoForm({ token }: InvitarAdminConjuntoFormProps) {
  const { t } = useTranslation();
  const [correo, setCorreo] = useState("");
  const [conjuntosSeleccionados, setConjuntosSeleccionados] = useState<ConjuntoOption[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [localidadId, setLocalidadId] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ¿Qué? Localidades para el selector — mismo endpoint que ya usa el
  //       Directorio, el registro público y el panel de Admin del Sistema.
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/v1/geography/localidades`)
      .then((res) => setLocalidades(res.data))
      .catch(() => {});
  }, []);

  // ¿Qué? Busca conjuntos verificados por nombre, ACOTADOS a la localidad
  //       ya elegida.
  // ¿Para qué? Antes esta búsqueda no tenía forma de filtrar por
  //           localidad — con localidades como Usaquén, que tienen miles
  //           de conjuntos reales, el Admin del Sistema tenía que
  //           acordarse del nombre exacto para encontrarlo. Elegir la
  //           localidad primero acota la búsqueda a un puñado de opciones.
  const fetchConjuntos = (query: string): Promise<ConjuntoOption[]> =>
    axios
      .get(`${API_BASE_URL}/api/v1/geography/conjuntos/todos`, {
        params: { search: query || undefined, id_localidad: localidadId || undefined, limit: 20 },
      })
      .then((res) => res.data)
      .catch(() => []);

  // ¿Qué? Mismas condiciones que ya revisaba handleSubmit al hacer clic,
  //       pero calculadas ANTES, para deshabilitar el botón — antes se
  //       podía pulsar "Enviar invitación" sin correo, y el único aviso
  //       llegaba después de intentarlo.
  const formularioIncompleto = !correo.trim() || conjuntosSeleccionados.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);

    if (conjuntosSeleccionados.length === 0) {
      setError(t("invitarAdminConjunto.validation.noConjuntoSelected"));
      return;
    }

    setIsLoading(true);
    try {
      const ids = conjuntosSeleccionados.map((c) => c.id_conjunto_residencial);
      await invitarAdministradorConjunto(correo, ids, token);
      setMensajeExito(t("invitarAdminConjunto.successMessage", { correo }));
      setCorreo("");
      setConjuntosSeleccionados([]);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          t("invitarAdminConjunto.errorDefault")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-[#0d2116] rounded-2xl border border-gray-100 dark:border-[#2a4d34] shadow-sm max-w-xl">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5 text-green-600" />
        <h3 className="font-bold text-gray-800 dark:text-white text-lg">{t("invitarAdminConjunto.title")}</h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t("invitarAdminConjunto.description")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField
          label={t("invitarAdminConjunto.emailLabel")}
          name="correo"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />

        <div>
          <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-2">
            <MapPin className="w-4 h-4" />
            {t("invitarAdminConjunto.localityLabel")}
          </label>
          <select
            aria-label={t("invitarAdminConjunto.localityLabel")}
            value={localidadId}
            onChange={(e) => setLocalidadId(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500 dark:border-[#2a4d34] dark:bg-[#1f4029] dark:text-gray-100"
          >
            <option value="">{t("invitarAdminConjunto.localitySelectPlaceholder")}</option>
            {localidades.map((l) => (
              <option key={l.id_localidad} value={l.id_localidad}>
                {l.nombre_localidad}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-2">
            <Building2 className="w-4 h-4" />
            {t("invitarAdminConjunto.conjuntosLabel")}
          </label>
          {localidadId === "" ? (
            <p className="rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-xs text-gray-500 dark:border-[#2a4d34] dark:text-gray-400">
              {t("invitarAdminConjunto.selectLocalityFirst")}
            </p>
          ) : (
            <ConjuntoComboboxMultiple
              value={conjuntosSeleccionados}
              onChange={setConjuntosSeleccionados}
              fetchOptions={fetchConjuntos}
              placeholder={t("invitarAdminConjunto.conjuntoSearchPlaceholder")}
              emptyLabel={t("invitarAdminConjunto.conjuntoNoResults")}
              loadingLabel={t("common.loading")}
            />
          )}
          {conjuntosSeleccionados.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("invitarAdminConjunto.selectedCount", { count: conjuntosSeleccionados.length })}
            </p>
          )}
        </div>

        <Button type="submit" fullWidth isLoading={isLoading} disabled={formularioIncompleto}>
          {formularioIncompleto ? t("common.formIncomplete") : t("invitarAdminConjunto.submit")}
        </Button>
      </form>

      {mensajeExito && (
        <div className="mt-4">
          <Alert type="success" message={mensajeExito} />
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Alert type="error" message={error} />
        </div>
      )}
    </div>
  );
}