import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { LandingPage } from "@/pages/LandingPage";
import { PoliticaCookiesPage } from "@/pages/PoliticaCookiesPage";

/**
 * ¿Qué? Ruta /politica-cookies — Landing de fondo + modal de Política de Cookies.
 */
export function CookiesModalPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <LandingPage asBackdrop />
      <Modal onClose={() => navigate("/")} wide aria-label={t("legal.cookies.title")}>
        <PoliticaCookiesPage embedded />
      </Modal>
    </>
  );
}