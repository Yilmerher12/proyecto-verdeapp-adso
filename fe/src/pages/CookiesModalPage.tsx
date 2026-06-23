import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { LandingPage } from "@/pages/LandingPage";
import { PoliticaCookiesPage } from "@/pages/PoliticaCookiesPage";

/**
 * ¿Qué? Ruta /politica-cookies — Landing de fondo + modal de Política de Cookies.
 */
export function CookiesModalPage() {
  const navigate = useNavigate();

  return (
    <>
      <LandingPage />
      <Modal onClose={() => navigate("/")} wide aria-label="Política de Cookies">
        <PoliticaCookiesPage embedded />
      </Modal>
    </>
  );
}