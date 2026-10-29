/**
 * Archivo: __tests__/pages/DirectorioPage.test.tsx
 * Descripción: Tests del Directorio del Residente (HU-006) — la pestaña
 *              Recicladores queda fija a la localidad propia (CA-006.6),
 *              mientras que Puntos de Acopio sigue con el filtro libre.
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { DirectorioPage } from "@/pages/DirectorioPage";
import { RoleId } from "@/types/auth";
import { renderWithProviders, mockUser } from "../helpers";

const mockGet = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => mockGet(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: {},
  };
  return { default: { ...instance, create: () => instance } };
});

const residenteUser = { ...mockUser, role_id: RoleId.RESIDENTE };

const localidades = [
  { id_localidad: 1, nombre_localidad: "Usaquén" },
  { id_localidad: 2, nombre_localidad: "Kennedy" },
];

const recicladorUsaquen = {
  id_reciclador: "r1",
  nombre: "Reciclador",
  apellidos: "De Usaquén",
  numero_telefonico: null,
  asociacion: null,
  nombre_localidad: "Usaquén",
};

const puntoKennedy = {
  id_punto_acopio: "p1",
  nombre: "ECA Kennedy",
  direccion: "Carrera 84 # 11A-34",
  telefono_contacto: null,
  nombre_encargado: null,
  nombre_localidad: "Kennedy",
};

const puntoEngativa = {
  id_punto_acopio: "p2",
  nombre: "ECA Engativá",
  direccion: "Calle 80C # 92-44",
  telefono_contacto: "3105550142",
  nombre_encargado: "Marta Rojas",
  nombre_localidad: "Engativá",
};

function mockRespuestas({ nombreLocalidad, puntos = [] }: { nombreLocalidad: string | null; puntos?: unknown[] }) {
  mockGet.mockImplementation((url: string) => {
    if (url.includes("/geography/localidades")) return Promise.resolve({ data: localidades });
    if (url.includes("/users/me")) return Promise.resolve({ data: { nombre_localidad: nombreLocalidad } });
    if (url.includes("/directorio/recicladores")) return Promise.resolve({ data: [recicladorUsaquen] });
    if (url.includes("/directorio/puntos-acopio")) return Promise.resolve({ data: puntos });
    return Promise.resolve({ data: [] });
  });
}

function renderPage(soloAcopio = false) {
  return renderWithProviders(<DirectorioPage soloAcopio={soloAcopio} />, {
    authContext: { user: residenteUser, isAuthenticated: true },
  });
}

describe("DirectorioPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("en Recicladores muestra la localidad propia fija, sin selector editable", async () => {
    mockRespuestas({ nombreLocalidad: "Usaquén" });
    renderPage();

    await screen.findByText("Reciclador De Usaquén");
    expect(screen.getByText("Tu localidad: Usaquén")).toBeInTheDocument();
    // ¿Qué? No debe existir ningún <select> mientras esta pestaña esté activa.
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/directorio/recicladores"),
        expect.objectContaining({ params: { localidad_id: 1 } })
      );
    });
  });

  it("si no se pudo detectar la localidad, lo avisa en vez de mostrar una vacía", async () => {
    mockRespuestas({ nombreLocalidad: null });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No se pudo detectar tu localidad")).toBeInTheDocument();
    });
  });

  it("en Puntos de Acopio el filtro de localidad sigue siendo libre", async () => {
    mockRespuestas({ nombreLocalidad: "Usaquén" });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Reciclador De Usaquén");
    await user.click(screen.getByRole("button", { name: "Puntos de Acopio" }));

    // Preseleccionado en la misma localidad por conveniencia, pero editable.
    const select = await screen.findByRole("combobox");
    expect(select).toHaveValue("1");

    await user.selectOptions(select, "2");

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/directorio/puntos-acopio"),
        expect.objectContaining({ params: { localidad_id: 2 } })
      );
    });

    // Volver a Recicladores no se contamina con el cambio hecho en Puntos.
    await user.click(screen.getByRole("button", { name: "Recicladores" }));
    expect(screen.getByText("Tu localidad: Usaquén")).toBeInTheDocument();
  });

  it("el panel de ECA aclara que son los puntos del dataset de 2020 y enlaza al inventario de la UAESP", async () => {
    mockRespuestas({ nombreLocalidad: "Usaquén" });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Puntos de Acopio" }));

    // ¿Qué? El panel ya no afirma que Bogotá solo tiene ECA en 6 de 20 localidades.
    expect(await screen.findByText(/de marzo de 2020\. No son todas las ECA de Bogotá/)).toBeInTheDocument();
    expect(screen.queryByText(/6 de sus 20/)).not.toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Ver fuente/ })).toHaveAttribute(
      "href",
      expect.stringContaining("Listado_Inventario_inicial_ECA_y_Bodegas_PR.pdf")
    );
  });

  // ¿Qué? Los puntos de acopio se ven como tabla con fila desplegable, para el
  //       Residente (pestaña) y para el Reciclador (soloAcopio): mismo componente.
  describe("tabla de puntos de acopio", () => {
    it("el Residente los ve en una tabla, sin tarjetas, kebab ni columna de estado", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [puntoKennedy, puntoEngativa] });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole("button", { name: "Puntos de Acopio" }));

      expect(await screen.findByText("ECA Kennedy")).toBeInTheDocument();
      expect(screen.getByText("ECA Engativá")).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Punto" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Localidad" })).toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: "Estado" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Acciones de/ })).not.toBeInTheDocument();
    });

    it("el Reciclador ve la misma tabla, sin pestañas", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [puntoKennedy] });
      renderPage(true);

      expect(await screen.findByText("ECA Kennedy")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Recicladores" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ver ficha de ECA Kennedy" })).toBeInTheDocument();
    });

    it("la flecha despliega la ficha con Ubicación y Contacto, y volver a tocarla la pliega", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [puntoKennedy] });
      const user = userEvent.setup();
      renderPage(true);

      const flecha = await screen.findByRole("button", { name: "Ver ficha de ECA Kennedy" });
      expect(flecha).toHaveAttribute("aria-expanded", "false");

      await user.click(flecha);

      const ficha = await screen.findByRole("region", { name: "Ficha de ECA Kennedy" });
      expect(ficha).toHaveTextContent("Ubicación");
      expect(ficha).toHaveTextContent("Carrera 84 # 11A-34");
      expect(ficha).toHaveTextContent("Contacto");
      const abierta = screen.getByRole("button", { name: "Ocultar ficha de ECA Kennedy" });
      expect(abierta).toHaveAttribute("aria-expanded", "true");

      await user.click(abierta);
      expect(screen.queryByRole("region", { name: "Ficha de ECA Kennedy" })).not.toBeInTheDocument();
    });

    it("un clic en cualquier parte de la fila también la despliega", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [puntoKennedy] });
      const user = userEvent.setup();
      renderPage(true);

      await user.click(await screen.findByText("ECA Kennedy"));

      expect(await screen.findByRole("region", { name: "Ficha de ECA Kennedy" })).toBeInTheDocument();
    });

    it("solo hay una fila desplegada a la vez", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [puntoKennedy, puntoEngativa] });
      const user = userEvent.setup();
      renderPage(true);

      await user.click(await screen.findByRole("button", { name: "Ver ficha de ECA Kennedy" }));
      await screen.findByRole("region", { name: "Ficha de ECA Kennedy" });
      await user.click(screen.getByRole("button", { name: "Ver ficha de ECA Engativá" }));

      expect(await screen.findByRole("region", { name: "Ficha de ECA Engativá" })).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Ficha de ECA Kennedy" })).not.toBeInTheDocument();
    });

    it("sin teléfono muestra el texto de respaldo con la línea de la UAESP, aclarando que no es la del punto", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [puntoKennedy] });
      const user = userEvent.setup();
      renderPage(true);

      await user.click(await screen.findByRole("button", { name: "Ver ficha de ECA Kennedy" }));

      const ficha = await screen.findByRole("region", { name: "Ficha de ECA Kennedy" });
      expect(ficha).toHaveTextContent("Sin teléfono publicado.");
      expect(ficha).toHaveTextContent("Línea general de la UAESP (no es la del punto)");
      expect(within(ficha).getByRole("link", { name: "601 3580400" })).toHaveAttribute("href", "tel:+576013580400");
      expect(ficha).toHaveTextContent("Sin encargado");
    });

    it("con teléfono y encargado los muestra, sin el texto de respaldo", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [puntoEngativa] });
      const user = userEvent.setup();
      renderPage(true);

      await user.click(await screen.findByRole("button", { name: "Ver ficha de ECA Engativá" }));

      const ficha = await screen.findByRole("region", { name: "Ficha de ECA Engativá" });
      expect(ficha).toHaveTextContent("3105550142");
      expect(ficha).toHaveTextContent("Marta Rojas");
      expect(ficha).not.toHaveTextContent("UAESP");
    });

    it("'Cómo llegar' abre Google Maps con la dirección, la localidad y Bogotá", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [puntoKennedy] });
      const user = userEvent.setup();
      renderPage(true);

      await user.click(await screen.findByRole("button", { name: "Ver ficha de ECA Kennedy" }));

      const enlace = await screen.findByRole("link", { name: "Cómo llegar a ECA Kennedy en Google Maps" });
      const url = new URL(enlace.getAttribute("href") ?? "");
      expect(url.hostname).toBe("www.google.com");
      expect(url.searchParams.get("query")).toBe("Carrera 84 # 11A-34, Kennedy, Bogotá, Colombia");
      expect(enlace).toHaveAttribute("target", "_blank");
    });

    it("copia la dirección al portapapeles", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [puntoKennedy] });
      const user = userEvent.setup();
      renderPage(true);

      await user.click(await screen.findByRole("button", { name: "Ver ficha de ECA Kennedy" }));
      await user.click(await screen.findByRole("button", { name: "Copiar dirección" }));

      expect(await navigator.clipboard.readText()).toBe("Carrera 84 # 11A-34");
    });

    it("el buscador filtra por nombre o dirección sin importar tildes ni mayúsculas", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [puntoKennedy, puntoEngativa] });
      const user = userEvent.setup();
      renderPage(true);

      await screen.findByText("ECA Kennedy");
      await user.type(screen.getByRole("searchbox", { name: "Buscar por nombre o dirección" }), "engativa");

      expect(screen.getByText("ECA Engativá")).toBeInTheDocument();
      expect(screen.queryByText("ECA Kennedy")).not.toBeInTheDocument();
    });

    it("avisa si ningún punto coincide con la búsqueda", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [puntoKennedy] });
      const user = userEvent.setup();
      renderPage(true);

      await screen.findByText("ECA Kennedy");
      await user.type(screen.getByRole("searchbox"), "zzz");

      expect(screen.getByText("Ningún punto coincide con tu búsqueda.")).toBeInTheDocument();
    });

    it("la fila desplegada se pliega al escribir en el buscador", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [puntoKennedy, puntoEngativa] });
      const user = userEvent.setup();
      renderPage(true);

      await user.click(await screen.findByRole("button", { name: "Ver ficha de ECA Kennedy" }));
      await screen.findByRole("region", { name: "Ficha de ECA Kennedy" });
      await user.type(screen.getByRole("searchbox"), "k");

      expect(screen.queryByRole("region", { name: "Ficha de ECA Kennedy" })).not.toBeInTheDocument();
    });

    it("sin puntos en la localidad muestra el estado vacío, no una tabla", async () => {
      mockRespuestas({ nombreLocalidad: "Kennedy", puntos: [] });
      renderPage(true);

      expect(await screen.findByText("No hay puntos de acopio registrados en esta localidad.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });
});
