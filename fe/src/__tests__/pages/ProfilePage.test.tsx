/**
 * Archivo: __tests__/pages/ProfilePage.test.tsx
 * Descripción: Tests del panel "Mi perfil".
 * ¿Para qué? Issue #13 (hallazgo U8 de la auditoría) — antes "Nombre y
 *           apellidos son obligatorios" era un solo Alert genérico que no
 *           decía cuál de los dos campos estaba vacío. Ahora cada campo se
 *           valida al salir de él (onBlur), con el error anclado a ese
 *           campo — esta prueba cubre justo ese comportamiento nuevo.
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { API_BASE_URL } from "@/api/axios";
import { ProfilePage } from "@/pages/ProfilePage";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: {},
  };
  return { default: { ...instance, create: () => instance } };
});

const perfil = {
  id: 1,
  email: "residente@example.com",
  role_id: 2,
  first_name: "Ana",
  last_name: "Martínez",
  numero_telefonico: null,
  nombre_conjunto: "Conjunto de Prueba",
  torre: "1",
  apto: "402",
  asociacion: null,
  nombre_localidad: "Usaquén",
  conjuntos_administrados: null,
  mostrar_contacto_directorio: false,
  foto_perfil_url: null,
};

function renderPage() {
  return renderWithProviders(<ProfilePage />, {
    authContext: { user: mockUser, isAuthenticated: true },
  });
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: perfil });
    mockPut.mockResolvedValue({ data: {} });
  });

  it("marca el campo Nombre con su propio error al salir vacío, sin tocar Apellidos", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("heading", { name: "Ana Martínez" });
    await user.click(screen.getByRole("button", { name: "Editar" }));

    const inputNombre = await screen.findByLabelText("Nombre");
    await user.clear(inputNombre);
    await user.tab();

    expect(await screen.findByText("El nombre es obligatorio.")).toBeInTheDocument();
    expect(screen.queryByText("Los apellidos son obligatorios.")).not.toBeInTheDocument();
  });

  // ¿Qué? Issue #400 (CN-048): la foto de perfil pasa por enlaceAdjuntoSeguro.
  it("muestra la foto de perfil subida con la URL del backend", async () => {
    mockGet.mockResolvedValue({ data: { ...perfil, foto_perfil_url: "/uploads/perfiles/ana.png" } });
    renderPage();

    expect(await screen.findByRole("img", { name: "Ana Martínez" })).toHaveAttribute(
      "src",
      `${API_BASE_URL}/uploads/perfiles/ana.png`
    );
  });

  it("no pinta la foto si la ruta guardada no es segura", async () => {
    mockGet.mockResolvedValue({ data: { ...perfil, foto_perfil_url: "/uploads/%2e%2e/api/ana.png" } });
    renderPage();

    await screen.findByRole("heading", { name: "Ana Martínez" });
    expect(screen.queryByRole("img", { name: "Ana Martínez" })).not.toBeInTheDocument();
  });

  it("guarda el perfil cuando los campos son válidos", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("heading", { name: "Ana Martínez" });
    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.stringContaining("/users/me"),
        expect.objectContaining({ nombre: "Ana", apellidos: "Martínez" })
      );
    });
  });

  // ¿Qué? Rediseño del perfil: foto y nombre arriba, y debajo dos bloques —
  //       información personal y datos propios del rol.
  describe("datos por rol", () => {
    it("Residente: nombre completo en una sola casilla y su conjunto en el bloque del rol", async () => {
      renderPage();

      await screen.findByRole("heading", { name: "Ana Martínez" });
      expect(screen.getByText("Nombre completo")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Mi conjunto" })).toBeInTheDocument();
      expect(screen.getByText("Conjunto de Prueba")).toBeInTheDocument();
    });

    it("Reciclador: localidad base y asociación en el bloque de su zona de trabajo", async () => {
      mockGet.mockResolvedValue({
        data: { ...perfil, role_id: 3, asociacion: "INDEPENDIENTE", nombre_conjunto: null, torre: null, apto: null },
      });
      renderPage();

      expect(await screen.findByRole("heading", { name: "Mi zona de trabajo" })).toBeInTheDocument();
      expect(screen.getByText("Usaquén")).toBeInTheDocument();
      expect(screen.getByText("INDEPENDIENTE")).toBeInTheDocument();
    });

    it("Admin de Conjunto: cada conjunto que administra va en su propia casilla", async () => {
      mockGet.mockResolvedValue({
        data: { ...perfil, role_id: 4, conjuntos_administrados: ["CONJUNTO UNO", "CONJUNTO DOS"], nombre_conjunto: null, torre: null, apto: null },
      });
      renderPage();

      expect(await screen.findByRole("heading", { name: "Conjuntos que administras" })).toBeInTheDocument();
      expect(screen.getByText("CONJUNTO UNO")).toBeInTheDocument();
      expect(screen.getByText("CONJUNTO DOS")).toBeInTheDocument();
    });

    it("Admin del Sistema: no dibuja el bloque de datos del rol", async () => {
      mockGet.mockResolvedValue({
        data: { ...perfil, role_id: 1, nombre_conjunto: null, torre: null, apto: null, nombre_localidad: null },
      });
      renderPage();

      await screen.findByRole("heading", { name: "Ana Martínez" });
      expect(screen.getByRole("heading", { name: "Información personal" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Mi conjunto" })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Conjuntos que administras" })).not.toBeInTheDocument();
    });
  });

  // ¿Qué? Mismas reglas que el registro: antes el perfil solo revisaba que
  //       el nombre no estuviera vacío.
  it("no deja guardar un nombre con números", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("heading", { name: "Ana Martínez" });
    await user.click(screen.getByRole("button", { name: "Editar" }));

    const inputNombre = await screen.findByLabelText("Nombre");
    await user.clear(inputNombre);
    await user.type(inputNombre, "Ana2");
    await user.tab();

    expect(await screen.findByText("Solo se permiten letras, espacios, apóstrofe, punto o guion")).toBeInTheDocument();
    expect(inputNombre).toHaveAttribute("maxLength", "100");
  });

  // ¿Qué? Verifica el estado de carga: el backend todavía no responde.
  // ¿Para qué? Comprobar que la persona ve "Cargando tu perfil..." y no una pantalla vacía.
  // ¿Impacto? Si no se muestra ese elemento la pantalla queda en blanco hasta que los datos lleguen
  it("should show the loading message when the profile has not arrived yet", () => {
    // Arrange: un backend que nunca responde
    mockGet.mockReturnValue(new Promise(() => {}));

    // Act
    renderPage();

    // Assert
    expect(screen.getByText("Cargando tu perfil...")).toBeInTheDocument();
  });

  // ¿Qué? Verifica la regla del teléfono (7 a 10 dígitos) al salir del campo.
  // ¿Para qué? El campo solo deja escribir dígitos, así que el caso inválido real es "muy corto".
  // ¿Impacto? Si se quita la validación, se podría guardar un teléfono de 3 dígitos.
  it("should show the phone error when the phone has fewer than 7 digits", async () => {
    // Arrange
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Ana Martínez" });
    await user.click(screen.getByRole("button", { name: "Editar" }));

    // Act
    await user.type(screen.getByLabelText("Teléfono"), "123");
    await user.tab();

    // Assert
    expect(await screen.findByText("El número telefónico tiene un formato inválido.")).toBeInTheDocument();
  });

  // ¿Qué? Verifica que una foto de más de 5 MB se rechaza en el navegador, antes de subirla.
  // ¿Para qué? Evitar el viaje al backend con un archivo que de todas formas rechazaría.
  // ¿Impacto? Si se quita el tope, la persona no vería ningún aviso y la foto se enviaría.
  it("should show the size error when the photo is larger than 5 MB", async () => {
    // Arrange
    const user = userEvent.setup();
    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Ana Martínez" });
    // querySelector justificado: el input de archivo es invisible (className="hidden") y no tiene
    // etiqueta propia, así que getByRole y getByLabelText no lo encuentran. El botón de la cámara
    // sí tiene etiqueta, pero solo hace clic sobre este input.
    const inputFoto = container.querySelector('input[type="file"]') as HTMLInputElement;
    // El archivo pesa 1 byte de verdad; se le finge un tamaño de 6 MB para no crear 6 MB en memoria.
    const fotoGrande = new File(["x"], "grande.png", { type: "image/png" });
    Object.defineProperty(fotoGrande, "size", { value: 6 * 1024 * 1024 });

    // Act
    await user.upload(inputFoto, fotoGrande);

    // Assert
    expect(await screen.findByText("La foto no puede superar 5 MB.")).toBeInTheDocument();
  });

  // ¿Qué? Verifica que "Cancelar" cierra el formulario de edición.
  // ¿Para qué? Comprobar que la persona vuelve a la vista normal sin guardar nada.
  // ¿Impacto? Si Cancelar no cierra, la persona queda atrapada en el formulario.
  it("should close the edit form when the user cancels", async () => {
    // Arrange
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Ana Martínez" });
    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();

    // Act
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });
});
