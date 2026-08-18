/**
 * Archivo: __tests__/components/LanguageSwitcher.test.tsx
 * Descripción: Tests del componente LanguageSwitcher — selector de idioma ES/EN.
 * ¿Para qué? Verificar que los botones se renderizan (con sigla visible y nombre
 *            completo accesible), tienen estado correcto y llaman a
 *            i18n.changeLanguage() al hacer clic.
 * ¿Impacto? Sin estos tests, un cambio en LanguageSwitcher podría romper el sistema i18n
 *           sin ser detectado hasta que el usuario lo reporte.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { renderWithProviders } from "@/__tests__/helpers";

// ¿Qué? Mock del módulo api/auth para aislar el test de la red.
// ¿Para qué? updateLocale llama a la API — en tests no queremos peticiones reales.
// ¿Impacto? El test verifica comportamiento de UI sin depender del servidor.
vi.mock("@/api/auth", () => ({
  updateLocale: vi.fn().mockResolvedValue({ locale: "en" }),
}));

// ¿Qué? Mock de react-i18next con estado mutable para simular cambio de idioma.
// ¿Para qué? El mock global del setup.ts devuelve "es" fijo — aquí necesitamos
//            verificar que changeLanguage() es llamada.
// ¿Impacto? Permite aserciones sobre el idioma activo y las llamadas a changeLanguage.
const mockChangeLanguage = vi.fn().mockResolvedValue(undefined);
const mockI18n = { language: "es", changeLanguage: mockChangeLanguage };

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: mockI18n,
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockI18n.language = "es";
  });

  // ¿Qué? Verifica que se renderizan los dos botones, con la sigla visible.
  it("renderiza los botones de idioma con sus siglas ES y EN", () => {
    renderWithProviders(<LanguageSwitcher />);

    expect(screen.getByText("ES")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  // ¿Qué? El texto visible es la sigla, pero el nombre accesible sigue siendo completo.
  // ¿Para qué? Un lector de pantalla debe anunciar "Español"/"English", no "ES"/"EN".
  it("expone el nombre completo del idioma como nombre accesible (aria-label)", () => {
    renderWithProviders(<LanguageSwitcher />);

    expect(screen.getByRole("button", { name: "Español" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
  });

  // ¿Qué? Verifica que el botón activo tiene aria-pressed="true".
  // ¿Para qué? WCAG 4.1.2 — accesibilidad de estado.
  it("marca el idioma activo con aria-pressed=true", () => {
    renderWithProviders(<LanguageSwitcher />);

    const esButton = screen.getByRole("button", { name: "Español" });
    const enButton = screen.getByRole("button", { name: "English" });

    // Español activo → aria-pressed="true".
    expect(esButton).toHaveAttribute("aria-pressed", "true");
    // Inglés inactivo → aria-pressed="false".
    expect(enButton).toHaveAttribute("aria-pressed", "false");
  });

  // ¿Qué? Verifica que al hacer clic en "EN" se llama a changeLanguage("en").
  it("llama a changeLanguage('en') al hacer clic en EN", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);

    await user.click(screen.getByRole("button", { name: "English" }));

    expect(mockChangeLanguage).toHaveBeenCalledWith("en");
    expect(mockChangeLanguage).toHaveBeenCalledTimes(1);
  });

  // ¿Qué? Verifica que no se llama changeLanguage si ya está en ese idioma.
  it("no llama a changeLanguage si se hace clic en el idioma ya activo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);

    // Clic en "ES" cuando ya está activo (mockI18n.language === "es").
    await user.click(screen.getByRole("button", { name: "Español" }));

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  // ¿Qué? Verifica que los botones tienen el atributo lang correcto.
  // ¿Para qué? WCAG 3.1.2 Language of Parts — accesibilidad de pronunciación.
  it("asigna el atributo lang correcto a cada botón", () => {
    renderWithProviders(<LanguageSwitcher />);

    expect(screen.getByRole("button", { name: "Español" })).toHaveAttribute("lang", "es");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("lang", "en");
  });

  // ¿Qué? Verifica que el grupo tiene aria-label accesible.
  // ¿Para qué? WCAG 1.3.1 — el propósito del selector es identificable por lectores de pantalla.
  it("el contenedor tiene aria-label apropiado", () => {
    renderWithProviders(<LanguageSwitcher />);

    // El aria-label es la clave de traducción (mock devuelve la clave).
    const group = screen.getByRole("group");
    expect(group).toHaveAttribute("aria-label", "language.selector");
  });
});
