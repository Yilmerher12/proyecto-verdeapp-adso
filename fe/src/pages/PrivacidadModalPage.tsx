import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { LandingPage } from "@/pages/LandingPage";
import { PoliticaPrivacidadPage } from "@/pages/PoliticaPrivacidadPage";

/**
 * ¿Qué? Ruta /privacidad — Landing de fondo + modal de Política de Privacidad.
 */
export function PrivacidadModalPage() {
  const navigate = useNavigate();

  return (
    <>
      <LandingPage />
      <Modal onClose={() => navigate("/")} wide aria-label="Política de Privacidad">
        <PoliticaPrivacidadPage embedded />
      </Modal>
    </>
  );
}