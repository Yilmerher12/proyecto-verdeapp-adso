/**
 * Archivo: __tests__/components/ImagenAdjuntaField.test.tsx
 * Descripción: Pruebas del selector de imagen adjunta (comunicados/novedades).
 * ¿Para qué? Reemplaza el link externo que antes se escribía a mano por
 *           una subida de archivo real — estas pruebas cubren la subida
 *           exitosa, los rechazos del lado del cliente, y quitar la
 *           imagen ya elegida.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImagenAdjuntaField } from "@/components/ui/ImagenAdjuntaField";

const mockSubirAdjunto = vi.fn();

vi.mock("@/lib/uploadsApi", () => ({
  subirAdjunto: (...args: unknown[]) => mockSubirAdjunto(...args),
}));

function crearArchivoImagen(nombre = "foto.png", tipo = "image/png", tamanoBytes = 1024): File {
  const contenido = new Uint8Array(tamanoBytes);
  return new File([contenido], nombre, { type: tipo });
}

describe("ImagenAdjuntaField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el botón de seleccionar cuando no hay imagen", () => {
    render(<ImagenAdjuntaField label="Imagen" value="" onChange={vi.fn()} token="token" />);
    expect(screen.getByText("Seleccionar imagen")).toBeInTheDocument();
  });

  it("sube la imagen elegida y avisa la URL resultante", async () => {
    mockSubirAdjunto.mockResolvedValue("/uploads/adjuntos/abc123.png");
    const onChange = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <ImagenAdjuntaField label="Imagen" value="" onChange={onChange} token="token-123" />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, crearArchivoImagen());

    await waitFor(() => {
      expect(mockSubirAdjunto).toHaveBeenCalledWith(expect.any(File), "token-123");
      expect(onChange).toHaveBeenCalledWith("/uploads/adjuntos/abc123.png");
    });
  });

  it("rechaza un tipo de archivo no permitido sin llamar al backend", async () => {
    // ¿Qué? user.upload() respeta el atributo "accept" del input y jamás
    //       llega a disparar el cambio si el tipo no coincide (igual que
    //       haría un selector de archivos real) — para probar el chequeo
    //       de respaldo (por ejemplo, si alguien arrastra un archivo en
    //       vez de elegirlo del selector), se dispara el evento a mano.
    const onChange = vi.fn();

    const { container } = render(
      <ImagenAdjuntaField label="Imagen" value="" onChange={onChange} token="token" />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const archivo = crearArchivoImagen("documento.pdf", "application/pdf");
    Object.defineProperty(input, "files", { value: [archivo] });
    fireEvent.change(input);

    expect(await screen.findByText("La imagen debe ser JPG, PNG o WEBP.")).toBeInTheDocument();
    expect(mockSubirAdjunto).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rechaza una imagen de más de 5 MB sin llamar al backend", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <ImagenAdjuntaField label="Imagen" value="" onChange={onChange} token="token" />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, crearArchivoImagen("grande.png", "image/png", 6 * 1024 * 1024));

    expect(await screen.findByText("La imagen no puede superar 5 MB.")).toBeInTheDocument();
    expect(mockSubirAdjunto).not.toHaveBeenCalled();
  });

  it("muestra un error si la subida falla en el servidor", async () => {
    mockSubirAdjunto.mockRejectedValue(new Error("falló"));
    const user = userEvent.setup();

    const { container } = render(
      <ImagenAdjuntaField label="Imagen" value="" onChange={vi.fn()} token="token" />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, crearArchivoImagen());

    expect(await screen.findByText("No se pudo subir la imagen. Intenta de nuevo.")).toBeInTheDocument();
  });

  it("muestra la vista previa y permite quitar la imagen ya elegida", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ImagenAdjuntaField
        label="Imagen"
        value="/uploads/adjuntos/existente.png"
        onChange={onChange}
        token="token"
      />
    );

    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.queryByText("Seleccionar imagen")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Quitar imagen" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
