import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { LandingPage } from "@/pages/LandingPage";
import { TerminosDeUsoPage } from "@/pages/TerminosDeUsoPage";

/**
 * ¿Qué? Ruta /terminos-de-uso — muestra el Landing de fondo con el modal de
 *       Términos de Uso abierto encima, igual patrón que LoginPage/RegisterPage.
 * ¿Para qué? Que el documento tenga su propia URL (se puede recargar, compartir,
 *           o el profesor puede entrar directo) sin dejar de sentirse un modal.
 */
export function TerminosModalPage() {
    const navigate = useNavigate();

return (
    <>
        <LandingPage />
        <Modal onClose={() => navigate("/")} wide aria-label="Términos de Uso">
        <TerminosDeUsoPage embedded />
        </Modal>
    </>
);
}