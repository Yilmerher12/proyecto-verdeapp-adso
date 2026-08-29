/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API_BASE_URL } from "@/api/axios";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { UserPlus, Building2 } from "lucide-react";
import { invitarAdministradorConjunto } from "@/lib/adminConjuntoApi";
import { ConjuntoComboboxMultiple } from "@/components/ui/ConjuntoComboboxMultiple";
import type { ConjuntoOption } from "@/components/ui/ConjuntoCombobox";

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
  const [isLoading, setIsLoading] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ¿Qué? Busca conjuntos verificados por nombre, sin filtrar por localidad.
  // ¿Para qué? Antes se cargaban TODOS los conjuntos de una sola vez para
  //           esta lista de casillas — con miles de conjuntos reales
  //           registrados eso ya no es viable (ver ConjuntoComboboxMultiple).
  const fetchConjuntos = (query: string): Promise<ConjuntoOption[]> =>
    axios
      .get(`${API_BASE_URL}/api/v1/geography/conjuntos/todos`, {
        params: { search: query || undefined, limit: 20 },
      })
      .then((res) => res.data)
      .catch(() => []);

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
            <Building2 className="w-4 h-4" />
            {t("invitarAdminConjunto.conjuntosLabel")}
          </label>
          <ConjuntoComboboxMultiple
            value={conjuntosSeleccionados}
            onChange={setConjuntosSeleccionados}
            fetchOptions={fetchConjuntos}
            placeholder={t("invitarAdminConjunto.conjuntoSearchPlaceholder")}
            emptyLabel={t("invitarAdminConjunto.conjuntoNoResults")}
            loadingLabel={t("common.loading")}
          />
          {conjuntosSeleccionados.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("invitarAdminConjunto.selectedCount", { count: conjuntosSeleccionados.length })}
            </p>
          )}
        </div>

        <Button type="submit" fullWidth isLoading={isLoading}>
          {t("invitarAdminConjunto.submit")}
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