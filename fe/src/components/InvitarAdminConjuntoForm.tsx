/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import axios from "axios";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { UserPlus, Building2 } from "lucide-react";
import { invitarAdministradorConjunto } from "@/lib/adminConjuntoApi";

interface ConjuntoOption {
  id_conjunto_residencial: number;
  nombre_conjunto: string;
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
  const [correo, setCorreo] = useState("");
  const [conjuntos, setConjuntos] = useState<ConjuntoOption[]>([]);
  const [idsSeleccionados, setIdsSeleccionados] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ¿Qué? Carga TODOS los conjuntos verificados, sin filtrar por
    //       localidad, porque aquí el Administrador del Sistema necesita
    //       ver el listado completo para elegir a cuáles asignar.
    axios
      .get("http://localhost:8000/api/v1/geography/conjuntos/todos")
      .then((res) => setConjuntos(res.data))
      .catch((err) => console.error("Error cargando conjuntos", err));
  }, []);

  const toggleConjunto = (id: number) => {
    setIdsSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);

    if (idsSeleccionados.length === 0) {
      setError("Selecciona al menos un conjunto residencial para asignar.");
      return;
    }

    setIsLoading(true);
    try {
      await invitarAdministradorConjunto(correo, idsSeleccionados, token);
      setMensajeExito(
        `Invitación enviada a ${correo}. Cuando la acepte, quedará asignado a los conjuntos seleccionados.`
      );
      setCorreo("");
      setIdsSeleccionados([]);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "No se pudo enviar la invitación. Verifica los datos e intenta de nuevo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-xl">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5 text-green-600" />
        <h3 className="font-bold text-gray-800 text-lg">Invitar Administrador de Conjunto</h3>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Solo necesitas su correo. La persona invitada definirá su propia
        contraseña y completará sus datos al aceptar la invitación.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField
          label="Correo del administrador a invitar *"
          name="correo"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />

        <div>
          <label className="text-xs font-bold text-gray-600 flex items-center gap-1 mb-2">
            <Building2 className="w-4 h-4" />
            Conjuntos a asignar *
          </label>
          <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-xl p-3 space-y-2">
            {conjuntos.length === 0 && (
              <p className="text-sm text-gray-400">Cargando conjuntos...</p>
            )}
            {conjuntos.map((c) => (
              <label
                key={c.id_conjunto_residencial}
                className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={idsSeleccionados.includes(c.id_conjunto_residencial)}
                  onChange={() => toggleConjunto(c.id_conjunto_residencial)}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 accent-green-600"
                />
                {c.nombre_conjunto}
              </label>
            ))}
          </div>
          {idsSeleccionados.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {idsSeleccionados.length} conjunto(s) seleccionado(s)
            </p>
          )}
        </div>

        <div className="rounded-xl overflow-hidden bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-sm">
          <Button type="submit" fullWidth isLoading={isLoading}>
            Enviar invitación
          </Button>
        </div>
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