import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { LandingPage } from "@/pages/LandingPage";
import { PoliticaPrivacidadPage } from "@/pages/PoliticaPrivacidadPage";

/**
 * ¿Qué? Ruta /privacidad — Landing de fondo + modal de Política de Privacidad.
 */
export function PrivacidadModalPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <LandingPage asBackdrop />
      <Modal onClose={() => navigate("/")} wide aria-label={t("legal.privacy.title")}>
        <PoliticaPrivacidadPage embedded />
      </Modal>
    </>
  );
}