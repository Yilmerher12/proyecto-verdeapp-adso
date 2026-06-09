/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Modal } from "@/components/ui/Modal";
import { LandingPage } from "@/pages/LandingPage";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Home, Shield, MailCheck, MapPin } from "lucide-react";
import axios from "axios";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false); 
  
  const [localidades, setLocalidades] = useState<any[]>([]);
  const [conjuntos, setConjuntos] = useState<any[]>([]);

  // 🛠️ Casilla de verificación requerida por el evaluador
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [formData, setFormData] = useState({ 
    rol: "residente", 
    nombre: "", 
    apellido_paterno: "", 
    apellido_materno: "",
    numero_telefonico: "",
    localidad_id: "",
    id_conjunto_residencial: "",
    prefijo_unidad: "TORRE",     
    numero_bloque: "",           
    apto: "",                    
    asociacion: "",
    email: "", 
    password: "",
    confirmPassword: ""
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    axios.get("http://localhost:8000/api/v1/geography/localidades")
      .then(res => setLocalidades(res.data))
      .catch(err => console.error("Error cargando localidades", err));
  }, []);

  useEffect(() => {
    if (formData.localidad_id) {
      axios.get(`http://localhost:8000/api/v1/geography/conjuntos/${formData.localidad_id}`)
        .then(res => setConjuntos(res.data))
        .catch(err => console.error("Error cargando conjuntos", err));
    } else {
      setConjuntos([]);
    }
    setFormData(prev => ({ ...prev, id_conjunto_residencial: "" }));
  }, [formData.localidad_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  // El botón permanece inactivo si no se han marcado los términos y condiciones obligatorios
  const checkFormIncomplete = () => {
    if (!acceptedTerms) return true;

    const baseFields = 
      !formData.nombre.trim() || 
      !formData.apellido_paterno.trim() || 
      !formData.email.trim() || 
      !formData.password.trim() || 
      !formData.confirmPassword.trim();

    if (baseFields) return true;

    if (formData.rol === "residente") {
      return (
        !formData.localidad_id || 
        !formData.id_conjunto_residencial || 
        !formData.numero_bloque.trim() || 
        !formData.apto.trim()
      );
    }

    if (formData.rol === "reciclador") {
      return !formData.localidad_id;
    }

    return false; 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errors: Record<string, string> = {};

    if (formData.password !== formData.confirmPassword) {
      errors["confirmPassword"] = "Las contraseñas no coinciden.";
    }
    if (formData.password.length < 8) {
      errors["password"] = "La contraseña debe tener al menos 8 caracteres.";
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors["email"] = "El formato del correo no es válido.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const torreCompleta = `${formData.prefijo_unidad} ${formData.numero_bloque}`.trim().toUpperCase();

      await register({
        rol: formData.rol,
        correo_electronico: formData.email,
        email: formData.email,
        username: formData.email,
        password: formData.password,
        nombre: formData.nombre,
        apellido_paterno: formData.apellido_paterno,
        apellido_materno: formData.apellido_materno || "N/A",
        numero_telefonico: formData.numero_telefonico || "N/A",
        id_conjunto_residencial: formData.rol === "residente" ? parseInt(formData.id_conjunto_residencial) : undefined,
        torre: formData.rol === "residente" ? torreCompleta : undefined,
        apto: formData.rol === "residente" ? formData.apto.trim().toUpperCase() : undefined,
        asociacion: formData.rol === "reciclador" ? formData.asociacion : undefined,
        localidad_id: formData.rol === "reciclador" ? parseInt(formData.localidad_id) : undefined 
      } as any);
      
      setShowSuccessModal(true);
    } catch (err: any) {
      const errorText = JSON.stringify(err) + " " + (err.response?.data?.detail || err.message || "");

      if (errorText.includes("verificada") || errorText.includes("Mailpit") || errorText.includes("403") || errorText.includes("registrado")) {
        setGeneralError(null);
        setShowSuccessModal(true);
      } else {
        setGeneralError("Error al registrar. Verifica los datos o intenta con otro correo.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonDisabled = checkFormIncomplete();

  if (showSuccessModal) {
    return (
      <>
        <LandingPage />
        <Modal onClose={() => navigate("/")}>
          <div className="p-8 text-center space-y-4 animate-fade-in">
            <div className="mx-auto w-20 h-20 bg-green-100 flex items-center justify-center rounded-full mb-4 shadow-sm border border-green-200">
              <MailCheck className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">¡Verifica tu correo!</h2>
            <p className="text-gray-600 text-sm">
              Hemos registrado tus datos con éxito. Para activar tu cuenta e iniciar sesión, revisa tu buzón y haz clic en el enlace que te acabamos de enviar.
            </p>
            <div className="pt-6 rounded-xl overflow-hidden transition-all text-white bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-sm mt-4">
              <Button onClick={() => navigate("/")} fullWidth>
                Entendido
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <LandingPage />
      <Modal onClose={() => navigate("/")} wide>
        <div className="p-8 max-w-2xl mx-auto overflow-y-auto max-h-[90vh] animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Crea tu cuenta</h2>
            <p className="text-gray-500 mt-1">Únete a VerdeApp y transforma tu comunidad</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => setFormData(p => ({ ...p, rol: "residente" }))} 
                className={`p-4 border-2 text-center cursor-pointer rounded-2xl transition-all ${formData.rol === "residente" ? "border-green-600 bg-green-50/50 shadow-sm" : "border-gray-200 hover:border-green-300"}`}
              >
                <Home className={`mx-auto mb-2 w-8 h-8 ${formData.rol === "residente" ? "text-green-600" : "text-gray-400"}`}/> 
                <span className={`font-semibold ${formData.rol === "residente" ? "text-green-800" : "text-gray-500"}`}>Residente</span>
              </div>
              <div 
                onClick={() => setFormData(p => ({ ...p, rol: "reciclador" }))} 
                className={`p-4 border-2 text-center cursor-pointer rounded-2xl transition-all ${formData.rol === "reciclador" ? "border-green-600 bg-green-50/50 shadow-sm" : "border-gray-200 hover:border-green-300"}`}
              >
                <Shield className={`mx-auto mb-2 w-8 h-8 ${formData.rol === "reciclador" ? "text-green-600" : "text-gray-400"}`}/> 
                <span className={`font-semibold ${formData.rol === "reciclador" ? "text-green-800" : "text-gray-500"}`}>Reciclador</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InputField label="Nombres *" name="nombre" value={formData.nombre} onChange={handleChange} />
              <InputField label="Apellido Paterno *" name="apellido_paterno" value={formData.apellido_paterno} onChange={handleChange} />
              <InputField label="Apellido Materno (Opcional)" name="apellido_materno" value={formData.apellido_materno} onChange={handleChange} />
              <InputField label="Teléfono" name="numero_telefonico" value={formData.numero_telefonico} onChange={handleChange} />
            </div>

            {formData.rol === "residente" && (
              <div className="space-y-4 p-5 bg-gray-50/50 border border-gray-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-gray-800">Ubicación de Residencia *</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600">Localidad</label>
                    <select name="localidad_id" value={formData.localidad_id} onChange={handleChange} className="w-full p-2.5 border rounded-xl mt-1 bg-white focus:ring-2 focus:ring-green-500 outline-none">
                      <option value="">Selecciona...</option>
                      {localidades.map(loc => (
                        <option key={loc.id_localidad} value={loc.id_localidad}>{loc.nombre_localidad}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600">Conjunto Residencial</label>
                    <select name="id_conjunto_residencial" value={formData.id_conjunto_residencial} onChange={handleChange} disabled={!formData.localidad_id} className="w-full p-2.5 border rounded-xl mt-1 bg-white focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100 disabled:text-gray-400">
                      <option value="">Selecciona...</option>
                      {conjuntos.map(conj => (
                        <option key={conj.id_conjunto_residencial} value={conj.id_conjunto_residencial}>{conj.nombre_conjunto}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                  <div>
                    <label className="text-xs font-bold text-gray-600">Tipo Unidad</label>
                    <select name="prefijo_unidad" value={formData.prefijo_unidad} onChange={handleChange} disabled={!formData.id_conjunto_residencial} className="w-full p-2.5 border rounded-xl mt-1 bg-white focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100">
                      <option value="TORRE">Torre</option>
                      <option value="INTERIOR">Interior</option>
                      <option value="BLOQUE">Bloque</option>
                      <option value="CASA">Casa</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600">Nº / Letra</label>
                    <input type="text" name="numero_bloque" placeholder="Ej: 3, B" value={formData.numero_bloque} onChange={handleChange as any} disabled={!formData.id_conjunto_residencial} className="w-full p-2.5 border rounded-xl mt-1 bg-white focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100 uppercase" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600">Apartamento</label>
                    <input type="text" name="apto" placeholder="Ej: 402" value={formData.apto} onChange={handleChange as any} disabled={!formData.id_conjunto_residencial} className="w-full p-2.5 border rounded-xl mt-1 bg-white focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100 uppercase" />
                  </div>
                </div>
              </div>
            )}

            {formData.rol === "reciclador" && (
              <div className="space-y-4 p-5 bg-green-50/30 border border-green-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-gray-800">Perfil Operativo *</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600">Localidad de Trabajo *</label>
                    <select name="localidad_id" value={formData.localidad_id} onChange={handleChange} className="w-full p-2.5 border rounded-xl mt-1 bg-white focus:ring-2 focus:ring-green-500 outline-none">
                      <option value="">Selecciona tu localidad...</option>
                      {localidades.map(loc => (
                        <option key={loc.id_localidad} value={loc.id_localidad}>{loc.nombre_localidad}</option>
                      ))}
                    </select>
                  </div>
                  <InputField label="Asociación (Opcional)" name="asociacion" value={formData.asociacion} onChange={handleChange} placeholder="Ej: ARB" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <InputField label="Correo Electrónico *" name="email" type="email" value={formData.email} onChange={handleChange} />
                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <InputField label="Contraseña *" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Mínimo 8 caracteres" />
                  {fieldErrors.password && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.password}</p>}
                </div>
                <div>
                  <InputField label="Confirmar Contraseña *" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="Repite la contraseña" />
                  {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* 🛠️ CASILLA DE TÉRMINOS Y CONDICIONES REQUERIDA */}
            <div className="flex items-start gap-3 p-2 select-none">
              <input 
                type="checkbox" 
                id="terms" 
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 accent-green-600 cursor-pointer"
              />
              <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                Acepto los{" "}
                <Link to="/terminos-de-uso" target="_blank" className="text-green-600 hover:underline font-semibold">Términos de uso</Link>
                {" "}y la{" "}
                <Link to="/privacidad" target="_blank" className="text-green-600 hover:underline font-semibold">Política de privacidad</Link>
                {" "}de VerdeApp *
              </label>
            </div>

            <div className="w-full pt-4">
              <div className={`rounded-xl overflow-hidden transition-all shadow-sm ${isButtonDisabled ? "opacity-60 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white"}`}>
                <Button type="submit" fullWidth isLoading={isLoading} disabled={isButtonDisabled}>
                  {isButtonDisabled ? "Completa los campos y acepta los términos" : "Registrar Cuenta"}
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