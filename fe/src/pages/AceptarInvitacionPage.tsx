/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { LandingPage } from "@/pages/LandingPage";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Building2, ShieldCheck, XCircle } from "lucide-react";
import {
    consultarInvitacion,
    aceptarInvitacion,
    type InvitacionInfo,
} from "@/lib/adminConjuntoApi";

/**
 * ¿Qué? Pantalla pública a la que llega la persona invitada al hacer
 *       clic en el enlace de su correo: /aceptar-invitacion?token=...
 * ¿Para qué? Aquí, y solo aquí, la persona define su propia contraseña
 *           y completa sus datos personales. El Administrador del
 *           Sistema que la invitó nunca ve ni define esta información.
 */
export function AceptarInvitacionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [cargandoInfo, setCargandoInfo] = useState(true);
  const [infoInvitacion, setInfoInvitacion] = useState<InvitacionInfo | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    numero_telefonico: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (!token) {
      setCargandoInfo(false);
      return;
    }
    consultarInvitacion(token)
      .then((info) => setInfoInvitacion(info))
      .catch(() => setInfoInvitacion({ correo_electronico: "", nombres_conjuntos: [], valido: false }))
      .finally(() => setCargandoInfo(false));
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errors: Record<string, string> = {};

    if (!formData.nombre.trim()) errors["nombre"] = "El nombre es obligatorio.";
    if (!formData.apellidos.trim()) errors["apellidos"] = "Los apellidos son obligatorios.";
    if (formData.password.length < 8) {
      errors["password"] = "La contraseña debe tener al menos 8 caracteres.";
    }
    if (formData.password !== formData.confirmPassword) {
      errors["confirmPassword"] = "Las contraseñas no coinciden.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await aceptarInvitacion({
        token,
        password: formData.password,
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        numero_telefonico: formData.numero_telefonico || "N/A",
      });
      setExito(true);
    } catch (err: any) {
      setGeneralError(
        err.response?.data?.detail ||
          "No se pudo crear tu cuenta. El enlace puede haber expirado o ya fue utilizado."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Estado: cargando info de la invitación ───
  if (cargandoInfo) {
    return (
      <>
        <LandingPage />
        <Modal onClose={() => navigate("/")}>
          <div className="p-10 text-center text-gray-500">Verificando tu invitación...</div>
        </Modal>
      </>
    );
  }

  // ─── Estado: token inválido, vencido, o ya usado ───
  if (!infoInvitacion?.valido) {
    return (
      <>
        <LandingPage />
        <Modal onClose={() => navigate("/")}>
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 flex items-center justify-center rounded-full border border-red-200">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Invitación no válida</h2>
            <p className="text-gray-600 text-sm">
              Este enlace ya fue utilizado, expiró, o no es correcto. Pide al
              equipo de VerdeApp que te envíe una nueva invitación.
            </p>
            <Button onClick={() => navigate("/")} fullWidth>
              Volver al inicio
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  // ─── Estado: cuenta creada con éxito ───
  if (exito) {
    return (
      <>
        <LandingPage />
        <Modal onClose={() => navigate("/")}>
          <div className="p-8 text-center space-y-4 animate-fade-in">
            <div className="mx-auto w-20 h-20 bg-green-100 flex items-center justify-center rounded-full border border-green-200">
              <ShieldCheck className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">¡Cuenta creada!</h2>
            <p className="text-gray-600 text-sm">
              Ya puedes iniciar sesión con tu correo y la contraseña que
              acabas de definir, para administrar tus conjuntos asignados.
            </p>
            <div className="pt-4 rounded-xl overflow-hidden bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-sm">
              <Button onClick={() => navigate("/")} fullWidth>
                Ir a iniciar sesión
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // ─── Estado: formulario de aceptación ───
  return (
    <>
      <LandingPage />
      <Modal onClose={() => navigate("/")} wide>
        <div className="p-8 max-w-2xl mx-auto overflow-y-auto max-h-[90vh] animate-fade-in">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Crea tu cuenta de administrador</h2>
            <p className="text-gray-500 mt-1">
              Invitación para: <strong>{infoInvitacion.correo_electronico}</strong>
            </p>
          </div>

          <div className="mb-6 p-4 bg-green-50/50 border border-green-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-bold text-gray-700">
                Vas a administrar:
              </span>
            </div>
            <ul className="text-sm text-gray-600 list-disc list-inside">
              {infoInvitacion.nombres_conjuntos.map((nombre) => (
                <li key={nombre}>{nombre}</li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Nombres *"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
            />
            {fieldErrors.nombre && <p className="text-xs text-red-500">{fieldErrors.nombre}</p>}

            <InputField
              label="Apellidos *"
              name="apellidos"
              value={formData.apellidos}
              onChange={handleChange}
            />
            {fieldErrors.apellidos && <p className="text-xs text-red-500">{fieldErrors.apellidos}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Teléfono"
                name="numero_telefonico"
                value={formData.numero_telefonico}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <InputField
                  label="Contraseña *"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                />
                {fieldErrors.password && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.password}</p>
                )}
              </div>
              <div>
                <InputField
                  label="Confirmar Contraseña *"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repite la contraseña"
                  disablePaste
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="w-full pt-4">
              <div className="rounded-xl overflow-hidden bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-sm">
                <Button type="submit" fullWidth isLoading={isLoading}>
                  Crear mi cuenta
                </Button>
              </div>
            </div>
          </form>

          {generalError && (
            <div className="mt-6">
              <Alert type="error" message={generalError} />
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}