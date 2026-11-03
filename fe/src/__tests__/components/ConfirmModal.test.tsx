/**
 * Archivo: __tests__/components/ConfirmModal.test.tsx
 * Descripción: Pruebas del estado "en curso" de la ventana de confirmación.
 * ¿Para qué? Issue #458: eliminar, archivar, dar de baja y cerrar sesión
 *           pasan por ConfirmModal; mientras la acción tarda, el botón debe
 *           avisar que trabaja y no dejar confirmar dos veces.
 * ¿Impacto? Si deja de desactivarse, una acción lenta se puede enviar dos veces.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

function renderModal(props: { isConfirming?: boolean; confirmDisabled?: boolean; onConfirm?: () => void }) {
  return render(
    <ConfirmModal
      icon={Trash2}
      variant="danger"
      ariaLabel="Confirmar"
      title="¿Eliminar?"
      description="No se puede deshacer."
      confirmLabel="Sí, eliminar"
      confirmingLabel="Eliminando…"
      onConfirm={props.onConfirm ?? vi.fn()}
      onClose={vi.fn()}
      isConfirming={props.isConfirming}
      confirmDisabled={props.confirmDisabled}
    />
  );
}

describe("ConfirmModal — acción en curso", () => {
  it("en reposo el botón está activo y no está ocupado", () => {
    renderModal({});
    const boton = screen.getByRole("button", { name: "Sí, eliminar" });
    expect(boton).toBeEnabled();
    expect(boton).toHaveAttribute("aria-busy", "false");
  });

  it("mientras confirma: cambia el texto, muestra el spinner y se desactiva", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    const { container } = renderModal({ isConfirming: true, onConfirm });

    const boton = screen.getByRole("button", { name: "Eliminando…" });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute("aria-busy", "true");
    expect(boton.querySelector("svg.animate-spin")).not.toBeNull();
    expect(container.ownerDocument.querySelectorAll("svg.animate-spin")).toHaveLength(1);

    await user.click(boton);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("ConfirmModal — confirmar deshabilitado", () => {
  // ¿Qué? confirmDisabled apaga el botón SIN mostrar el spinner de "en curso".
  // ¿Para qué? El aviso del Reciclador lo usa cuando el estado del conjunto cambió mientras confirmaba.
  it("apaga el botón, no confirma y no muestra el spinner ni cambia el texto", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderModal({ confirmDisabled: true, onConfirm });

    const boton = screen.getByRole("button", { name: "Sí, eliminar" });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute("aria-busy", "false");
    expect(boton.querySelector("svg.animate-spin")).toBeNull();

    await user.click(boton);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
