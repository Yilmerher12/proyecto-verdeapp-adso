/**
 * Archivo: __tests__/pages/RegisterPage.test.tsx
 * Descripción: Tests de la página de registro de VerdeApp — selector de rol,
 *              campos de identidad, ubicación de residencia/operación,
 *              credenciales, términos obligatorios y envío.
 * ¿Para qué? Asegurar que el flujo real de registro (con rol, conjunto y
 *           localidad) funciona correctamente y valida inputs.
 * ¿Impacto? Si el registro falla silenciosamente, los usuarios no podrían
 *           crear cuentas.
 */

import { createEvent, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { RegisterPage } from "@/pages/RegisterPage";
import { renderWithProviders } from "../helpers";

// ¿Qué? Mock de axios — RegisterPage llama a axios.get() para cargar
//       Localidades y Conjuntos apenas se monta (useEffect).
// ¿Para qué? Sin este mock, cada test dispararía una petición HTTP real.
// ¿Impacto? IMPORTANTE: a diferencia de un mock genérico, aquí se preserva
//           axios.create() como una función real (que a su vez devuelve un
//           objeto con sus propios interceptors.request/response). Esto es
//           necesario porque src/api/axios.ts hace "axios.create({...})" y
//           luego "api.interceptors.request.use(...)" sobre el resultado —
//           ese archivo se ejecuta indirectamente cuando RegisterPage
//           renderiza LandingPage -> LanguageSwitcher -> api/auth.ts ->
//           api/axios.ts. Si axios.create no es una función real, esa
//           cadena falla con "Cannot read properties of undefined
//           (reading 'interceptors')" antes de que el test llegue a correr.
vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: {
      ...actual.default,
      get: vi.fn(),
      create: actual.default.create, // se preserva real para que interceptors funcione
    },
  };
});

const mockedAxiosGet = axios.get as unknown as ReturnType<typeof vi.fn>;

const LOCALIDADES_MOCK = [
  { id_localidad: 1, nombre_localidad: "Usaquén" },
  { id_localidad: 11, nombre_localidad: "Suba" },
];

const CONJUNTOS_MOCK = [
  { id_conjunto_residencial: 1, nombre_conjunto: "TORRES DE ARANJUEZ" },
];

beforeEach(() => {
  mockedAxiosGet.mockImplementation((url: string) => {
    if (url.includes("/geography/localidades")) {
      return Promise.resolve({ data: LOCALIDADES_MOCK });
    }
    if (url.includes("/geography/conjuntos/")) {
      return Promise.resolve({ data: CONJUNTOS_MOCK });
    }
    return Promise.resolve({ data: [] });
  });
});

/**
 * ¿Qué? Llena los campos comunes a Residente y Reciclador: Nombres,
 *       Apellidos, Correo, Confirmar correo, Contraseña, Confirmar
 *       contraseña — y marca el checkbox de Términos.
 */
async function llenarCamposComunes(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<{
    nombre: string;
    apellidos: string;
    email: string;
    confirmEmail: string;
    password: string;
    confirmPassword: string;
  }> = {},
) {
  const datos = {
    nombre: "Juan",
    apellidos: "Pérez Gómez",
    email: "juan@correo.com",
    confirmEmail: "juan@correo.com",
    password: "Password1",
    confirmPassword: "Password1",
    ...overrides,
  };

  await user.type(screen.getByLabelText("Nombres *"), datos.nombre);
  await user.type(screen.getByLabelText("Apellidos *"), datos.apellidos);
  await user.type(screen.getByLabelText("Correo Electrónico *"), datos.email);
  await user.type(screen.getByLabelText("Confirmar Correo Electrónico *"), datos.confirmEmail);
  await user.type(screen.getByLabelText("Contraseña *"), datos.password);
  await user.type(screen.getByLabelText("Confirmar Contraseña *"), datos.confirmPassword);

  await user.click(screen.getByRole("checkbox"));
}

describe("RegisterPage", () => {
  it("renderiza el formulario de registro con los campos comunes", async () => {
    renderWithProviders(<RegisterPage />, { initialRoute: "/register" });

    expect(screen.getByRole("heading", { name: "Crea tu cuenta" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombres *")).toBeInTheDocument();
    expect(screen.getByLabelText("Apellidos *")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo Electrónico *")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar Correo Electrónico *")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña *")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar Contraseña *")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrar Cuenta|Completa los campos/ })).toBeInTheDocument();
  });

  it("muestra los campos de Ubicación de Residencia cuando el rol es Residente", () => {
    renderWithProviders(<RegisterPage />, { initialRoute: "/register" });

    expect(screen.getByText("Ubicación de Residencia *")).toBeInTheDocument();
    expect(screen.getByText("Localidad")).toBeInTheDocument();
    expect(screen.getByText("Conjunto Residencial")).toBeInTheDocument();
  });

  it("muestra los campos de Perfil Operativo cuando se selecciona Reciclador", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { initialRoute: "/register" });

    await user.click(screen.getByText("Reciclador"));

    expect(screen.getByText("Perfil Operativo *")).toBeInTheDocument();
    expect(screen.getByText("Localidad de Trabajo *")).toBeInTheDocument();
    expect(screen.getByLabelText("Asociación (Opcional)")).toBeInTheDocument();
    expect(screen.queryByText("Ubicación de Residencia *")).not.toBeInTheDocument();
  });

  it("muestra enlace para iniciar sesión", () => {
    renderWithProviders(<RegisterPage />, { initialRoute: "/register" });
    expect(screen.getAllByText("Iniciar sesión").length).toBeGreaterThan(0);
  });

  it("mantiene el botón deshabilitado si no se aceptan los términos", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { initialRoute: "/register" });

    await user.type(screen.getByLabelText("Nombres *"), "Juan");
    await user.type(screen.getByLabelText("Apellidos *"), "Pérez");
    await user.type(screen.getByLabelText("Correo Electrónico *"), "juan@correo.com");
    await user.type(screen.getByLabelText("Confirmar Correo Electrónico *"), "juan@correo.com");
    await user.type(screen.getByLabelText("Contraseña *"), "Password1");
    await user.type(screen.getByLabelText("Confirmar Contraseña *"), "Password1");

    expect(
      screen.getByRole("button", { name: "Completa los campos y acepta los términos" }),
    ).toBeDisabled();
  });

  it("muestra error si la contraseña es muy corta", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { initialRoute: "/register" });

    await llenarCamposComunes(user, { password: "Ab1", confirmPassword: "Ab1" });

    await user.click(screen.getByText("Reciclador"));
    await waitFor(() => screen.getByText("Localidad de Trabajo *"));
    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "1");

    await user.click(screen.getByRole("button", { name: "Registrar Cuenta" }));

    expect(screen.getByText("La contraseña debe tener al menos 8 caracteres.")).toBeInTheDocument();
  });

  it("muestra error si las contraseñas no coinciden", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { initialRoute: "/register" });

    await llenarCamposComunes(user, { confirmPassword: "Password2" });
    await user.click(screen.getByText("Reciclador"));
    await waitFor(() => screen.getByText("Localidad de Trabajo *"));
    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "1");

    await user.click(screen.getByRole("button", { name: "Registrar Cuenta" }));

    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
  });

  it("muestra error si los correos no coinciden", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { initialRoute: "/register" });

    await llenarCamposComunes(user, { confirmEmail: "otro@correo.com" });
    await user.click(screen.getByText("Reciclador"));
    await waitFor(() => screen.getByText("Localidad de Trabajo *"));
    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "1");

    await user.click(screen.getByRole("button", { name: "Registrar Cuenta" }));

    expect(screen.getByText("Los correos electrónicos no coinciden.")).toBeInTheDocument();
  });

  it("bloquea el pegado en el campo Confirmar Correo Electrónico", () => {
    renderWithProviders(<RegisterPage />, { initialRoute: "/register" });

    const input = screen.getByLabelText("Confirmar Correo Electrónico *");
    const pasteEvent = createEvent.paste(input);
    fireEvent(input, pasteEvent);

    expect(pasteEvent.defaultPrevented).toBe(true);
  });

  it("bloquea el pegado en el campo Confirmar Contraseña", () => {
    renderWithProviders(<RegisterPage />, { initialRoute: "/register" });

    const input = screen.getByLabelText("Confirmar Contraseña *");
    const pasteEvent = createEvent.paste(input);
    fireEvent(input, pasteEvent);

    expect(pasteEvent.defaultPrevented).toBe(true);
  });

  it("permite pegar en el campo Contraseña (no es un campo de confirmación)", () => {
    renderWithProviders(<RegisterPage />, { initialRoute: "/register" });

    const input = screen.getByLabelText("Contraseña *");
    const pasteEvent = createEvent.paste(input);
    fireEvent(input, pasteEvent);

    expect(pasteEvent.defaultPrevented).toBe(false);
  });

  it("ejecuta register con el payload correcto al registrar un Reciclador", async () => {
    const registerMock = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<RegisterPage />, {
      initialRoute: "/register",
      authContext: { register: registerMock },
    });

    await user.click(screen.getByText("Reciclador"));
    await waitFor(() => screen.getByText("Localidad de Trabajo *"));

    await llenarCamposComunes(user, {
      nombre: "Carlos",
      apellidos: "Ramírez",
      email: "carlos@correo.com",
      confirmEmail: "carlos@correo.com",
    });

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "1");

    await user.click(screen.getByRole("button", { name: "Registrar Cuenta" }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          rol: "reciclador",
          correo_electronico: "carlos@correo.com",
          nombre: "Carlos",
          apellidos: "Ramírez",
          localidad_id: 1,
        }),
      );
    });
  });

  it("mantiene el botón deshabilitado para Residente si falta Conjunto/Torre/Apto", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { initialRoute: "/register" });

    await llenarCamposComunes(user);

    expect(
      screen.getByRole("button", { name: "Completa los campos y acepta los términos" }),
    ).toBeDisabled();
  });
});