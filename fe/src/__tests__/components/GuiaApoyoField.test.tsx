/**
 * Archivo: __tests__/components/GuiaApoyoField.test.tsx
 * Descripción: Pruebas del campo de guía de apoyo del contenido educativo.
 * ¿Para qué? A diferencia de ImagenAdjuntaField, este campo deja elegir
 *           entre subir un archivo (imagen o PDF) o pegar un link externo
 *           — estas pruebas cubren ambos modos y el cambio entre ellos.
 */
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuiaApoyoField } from "@/components/ui/GuiaApoyoField";

// ¿Qué? Wrapper controlado — GuiaApoyoField no guarda su propio valor, así
//       que sin esto cada tecla escrita en modo "link" borraría lo anterior
//       (el input siempre volvería al `value` fijo del test).
function GuiaApoyoFieldControlado() {
  const [value, setValue] = useState("");
  return <GuiaApoyoField label="Guía" value={value} onChange={setValue} />;
}

const mockSubirAdjunto = vi.fn();

vi.mock("@/lib/uploadsApi", () => ({
  subirAdjunto: (...args: unknown[]) => mockSubirAdjunto(...args),
}));

function crearArchivo(nombre = "guia.pdf", tipo = "application/pdf", tamanoBytes = 1024): File {
  const contenido = new Uint8Array(tamanoBytes);
  return new File([contenido], nombre, { type: tipo });
}

describe("GuiaApoyoField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("arranca en modo 'subir archivo' cuando no hay valor previo", () => {
    render(<GuiaApoyoField label="Guía" value="" onChange={vi.fn()} />);
    expect(screen.getByText("Seleccionar imagen o PDF")).toBeInTheDocument();
  });

  it("sube un PDF pidiendo explícitamente permitir_pdf", async () => {
    mockSubirAdjunto.mockResolvedValue("/uploads/adjuntos/guia123.pdf");
    const onChange = vi.fn();
    const user = userEvent.setup();

    const { container } = render(<GuiaApoyoField label="Guía" value="" onChange={onChange} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, crearArchivo());

    await waitFor(() => {
      expect(mockSubirAdjunto).toHaveBeenCalledWith(expect.any(File), { permitirDocumentos: true });
      expect(onChange).toHaveBeenCalledWith("/uploads/adjuntos/guia123.pdf");
    });
  });

  it("rechaza un tipo de archivo no permitido sin llamar al backend", async () => {
    const onChange = vi.fn();
    const { container } = render(<GuiaApoyoField label="Guía" value="" onChange={onChange} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const archivo = crearArchivo("nota.txt", "text/plain");
    Object.defineProperty(input, "files", { value: [archivo] });
    fireEvent.change(input);

    expect(await screen.findByText("El archivo debe ser JPG, PNG, WEBP o PDF.")).toBeInTheDocument();
    expect(mockSubirAdjunto).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cambia a modo 'pegar link' y guarda la URL escrita a mano", async () => {
    const user = userEvent.setup();

    render(<GuiaApoyoFieldControlado />);
    await user.click(screen.getByRole("radio", { name: "Pegar link" }));

    const input = screen.getByPlaceholderText("https://...");
    await user.type(input, "https://bogota.gov.co/guia");

    expect(input).toHaveValue("https://bogota.gov.co/guia");
  });

  it("infiere el modo 'link' cuando el valor ya guardado es una URL externa", () => {
    render(<GuiaApoyoField label="Guía" value="https://bogota.gov.co/guia" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("https://bogota.gov.co/guia")).toBeInTheDocument();
  });

  it("muestra el nombre del archivo subido y permite quitarlo", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <GuiaApoyoField label="Guía" value="/uploads/adjuntos/existente.pdf" onChange={onChange} />
    );

    expect(screen.getByText("existente.pdf")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
