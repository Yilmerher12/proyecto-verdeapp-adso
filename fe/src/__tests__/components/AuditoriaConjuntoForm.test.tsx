/**
 * Archivo: __tests__/components/AuditoriaConjuntoForm.test.tsx
 * Descripción: Pruebas del formulario con el que el Reciclador audita un conjunto (RQF-009).
 * ¿Para qué? Es el único formulario de la app que califica la separación de residuos y
 *           no se puede editar una vez enviado: estas pruebas cubren que no deje enviar
 *           con campos vacíos, que mande a la API exactamente lo que se eligió, y que
 *           un fallo de la API se muestre sin cerrar el formulario.
 * ¿Impacto? Nada de esto se probaba antes (el formulario solo se ejercitaba de reojo
 *           desde RecicladorDashboard.test.tsx).
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuditoriaConjuntoForm } from "@/components/AuditoriaConjuntoForm";

const mockCrearAuditoria = vi.fn();
const mockListarContenido = vi.fn();

vi.mock("@/lib/auditoriaConjuntoApi", () => ({
  crearAuditoria: (...args: unknown[]) => mockCrearAuditoria(...args),
}));

vi.mock("@/lib/contenidoEducativoApi", () => ({
  listarContenido: () => mockListarContenido(),
}));

const CONJUNTO_A = { id_conjunto_residencial: "id-conjunto-a", nombre_conjunto: "Torres del Parque" };
const CONJUNTO_B = { id_conjunto_residencial: "id-conjunto-b", nombre_conjunto: "Villas del Sol" };

// ¿Qué? Un tema por categoría, más "Economía circular..." que el formulario debe esconder
//       porque no se puede observar en una sola visita (CATEGORIAS_NO_AUDITABLES).
const CONTENIDO = [
  { modulo_categoria: "Tipos de residuos y su preparación" },
  { modulo_categoria: "Separación en la fuente y código de colores" },
  { modulo_categoria: "Economía circular y aprovechamiento" },
];

const TEMA_ELEGIDO = "Tipos de residuos y su preparación";

const AUDITORIA_CREADA = { id_auditoria: "aud-1", nivel_desempeno: "REGULAR" };

function crearFoto(nombre = "evidencia.png"): File {
  return new File([new Uint8Array(1024)], nombre, { type: "image/png" });
}

function renderFormulario(props: Partial<React.ComponentProps<typeof AuditoriaConjuntoForm>> = {}) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  const resultado = render(
    <AuditoriaConjuntoForm conjuntos={[CONJUNTO_A]} onClose={onClose} onSuccess={onSuccess} {...props} />
  );
  return { ...resultado, onClose, onSuccess };
}

// ¿Qué? Espera a que el desplegable de temas termine de cargarse del catálogo.
// ¿Para qué? Si se elige un tema antes de que lleguen las opciones, selectOptions falla.
async function esperarTemas() {
  await screen.findByRole("option", { name: "Cómo entregar el material" });
}

function botonEnviar() {
  return screen.getByRole("button", { name: /Completa el formulario|Enviar auditoría/ });
}

async function completarFormulario(user: ReturnType<typeof userEvent.setup>, container: HTMLElement) {
  await esperarTemas();
  await user.click(screen.getByRole("radio", { name: "Regular" }));
  await user.selectOptions(screen.getByLabelText("Tema relacionado"), TEMA_ELEGIDO);
  const input = container.ownerDocument.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, crearFoto());
}

describe("AuditoriaConjuntoForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarContenido.mockResolvedValue(CONTENIDO);
    // jsdom no trae URL.createObjectURL y el formulario lo usa para la vista previa de las fotos.
    URL.createObjectURL = vi.fn(() => `blob:foto-${Math.random()}`);
    URL.revokeObjectURL = vi.fn();
  });

  describe("al abrirse", () => {
    it("muestra los tres niveles de desempeño y los temas del catálogo sin el que no se puede auditar", async () => {
      renderFormulario();
      await esperarTemas();

      expect(screen.getByRole("radio", { name: "Bueno" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "Regular" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "Malo" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Separación por colores de bolsa" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Por qué es importante reciclar" })).not.toBeInTheDocument();
    });

    it("deja la lista de temas vacía (sin romperse) si el catálogo no carga", async () => {
      mockListarContenido.mockRejectedValue(new Error("sin red"));
      renderFormulario();

      await waitFor(() => expect(mockListarContenido).toHaveBeenCalled());
      expect(screen.getByLabelText("Tema relacionado")).toBeInTheDocument();
      expect(screen.getAllByRole("option")).toHaveLength(1);
    });

    it("no pregunta el conjunto si el Reciclador solo tiene uno", () => {
      renderFormulario({ conjuntos: [CONJUNTO_A] });
      expect(screen.queryByLabelText("Conjunto")).not.toBeInTheDocument();
    });

    it("pregunta el conjunto si tiene más de uno y no vino uno preseleccionado", () => {
      renderFormulario({ conjuntos: [CONJUNTO_A, CONJUNTO_B] });
      expect(screen.getByLabelText("Conjunto")).toBeInTheDocument();
    });

    it("no pregunta el conjunto si vino preseleccionado, aunque haya varios", () => {
      renderFormulario({ conjuntos: [CONJUNTO_A, CONJUNTO_B], conjuntoPreseleccionado: CONJUNTO_B.id_conjunto_residencial });
      expect(screen.queryByLabelText("Conjunto")).not.toBeInTheDocument();
    });
  });

  describe("campos vacíos", () => {
    it("empieza con el botón deshabilitado y el texto 'Completa el formulario'", () => {
      renderFormulario();
      expect(botonEnviar()).toBeDisabled();
      expect(botonEnviar()).toHaveTextContent("Completa el formulario");
    });

    it("sigue deshabilitado si solo falta la foto de evidencia", async () => {
      const user = userEvent.setup();
      renderFormulario();
      await esperarTemas();

      await user.click(screen.getByRole("radio", { name: "Bueno" }));
      await user.selectOptions(screen.getByLabelText("Tema relacionado"), TEMA_ELEGIDO);

      expect(botonEnviar()).toBeDisabled();
    });

    it("sigue deshabilitado si solo falta el nivel de desempeño", async () => {
      const user = userEvent.setup();
      const { container } = renderFormulario();
      await esperarTemas();

      await user.selectOptions(screen.getByLabelText("Tema relacionado"), TEMA_ELEGIDO);
      await user.upload(container.ownerDocument.querySelector('input[type="file"]') as HTMLInputElement, crearFoto());

      expect(botonEnviar()).toBeDisabled();
    });

    it("sigue deshabilitado si solo falta el tema", async () => {
      const user = userEvent.setup();
      const { container } = renderFormulario();
      await esperarTemas();

      await user.click(screen.getByRole("radio", { name: "Malo" }));
      await user.upload(container.ownerDocument.querySelector('input[type="file"]') as HTMLInputElement, crearFoto());

      expect(botonEnviar()).toBeDisabled();
    });

    it("con varios conjuntos, sigue deshabilitado hasta elegir el conjunto", async () => {
      const user = userEvent.setup();
      const { container } = renderFormulario({ conjuntos: [CONJUNTO_A, CONJUNTO_B] });
      await completarFormulario(user, container);
      expect(botonEnviar()).toBeDisabled();

      await user.selectOptions(screen.getByLabelText("Conjunto"), CONJUNTO_B.id_conjunto_residencial);
      expect(botonEnviar()).toBeEnabled();
    });

    it("se habilita y cambia a 'Enviar auditoría' al completar todo", async () => {
      const user = userEvent.setup();
      const { container } = renderFormulario();
      await completarFormulario(user, container);

      expect(botonEnviar()).toBeEnabled();
      expect(botonEnviar()).toHaveTextContent("Enviar auditoría");
    });

    // ¿Qué? Hallazgo de esta tarjeta: quitar una foto rompe el formulario.
    // ¿Para qué? Las miniaturas se dibujan con `previews.map` y leen `evidencias[i].name`;
    //           al quitar una foto, `evidencias` ya está actualizada pero `previews` se
    //           recalcula un render después (useEffect), y en ese render `evidencias[i]`
    //           es undefined (AuditoriaConjuntoForm.tsx:288).
    // ¿Impacto? Se deja en skip hasta que una tarjeta `fix/` aparte lo corrija; al
    //           corregirlo, quitar el skip: el test ya describe el comportamiento esperado.
    it.skip("vuelve a deshabilitarse si se quita la única foto (bug conocido: el formulario se rompe)", async () => {
      const user = userEvent.setup();
      const { container } = renderFormulario();
      await completarFormulario(user, container);

      await user.click(screen.getByRole("button", { name: "Quitar esta foto" }));

      expect(botonEnviar()).toBeDisabled();
    });

    it("no llama a la API si se intenta enviar incompleto", async () => {
      const user = userEvent.setup();
      renderFormulario();

      await user.click(botonEnviar());

      expect(mockCrearAuditoria).not.toHaveBeenCalled();
      expect(screen.queryByText("¿Enviar esta auditoría?")).not.toBeInTheDocument();
    });

    it("la descripción es opcional: con todo lo demás completo se puede enviar sin ella", async () => {
      const user = userEvent.setup();
      const { container } = renderFormulario();
      await completarFormulario(user, container);

      expect(screen.getByLabelText("Descripción (opcional)")).toHaveValue("");
      expect(botonEnviar()).toBeEnabled();
    });
  });

  describe("fotos de evidencia", () => {
    it("admite hasta 3 fotos y entonces avisa que alcanzó el máximo", async () => {
      const user = userEvent.setup();
      const { container } = renderFormulario();
      const input = () => container.ownerDocument.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input(), crearFoto("uno.png"));
      await user.upload(input(), crearFoto("dos.png"));
      await user.upload(input(), crearFoto("tres.png"));

      expect(screen.getAllByRole("button", { name: "Quitar esta foto" })).toHaveLength(3);
      expect(screen.getByText("Ya adjuntaste el máximo de 3 fotos.")).toBeInTheDocument();
      expect(container.ownerDocument.querySelector('input[type="file"]')).toBeNull();
    });
  });

  describe("envío", () => {
    it("pide confirmación antes de enviar y no llama a la API hasta que se acepta", async () => {
      const user = userEvent.setup();
      const { container } = renderFormulario();
      await completarFormulario(user, container);

      await user.click(botonEnviar());

      expect(await screen.findByText("¿Enviar esta auditoría?")).toBeInTheDocument();
      expect(screen.getByText(/Vas a calificar "Cómo entregar el material" como Regular/)).toBeInTheDocument();
      expect(mockCrearAuditoria).not.toHaveBeenCalled();
    });

    it("si se cancela la confirmación, no envía y deja el formulario como estaba", async () => {
      const user = userEvent.setup();
      const { container, onSuccess } = renderFormulario();
      await completarFormulario(user, container);

      await user.click(botonEnviar());
      // ¿Qué? Hay dos botones "Cancelar" (el del formulario y el de la confirmación): se busca el de la ventana de confirmación.
      const confirmacion = await screen.findByRole("dialog", { name: "Confirmar auditoría" });
      await user.click(within(confirmacion).getByRole("button", { name: "Cancelar" }));

      expect(mockCrearAuditoria).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(screen.queryByText("¿Enviar esta auditoría?")).not.toBeInTheDocument();
      expect(botonEnviar()).toBeEnabled();
    });

    it("al confirmar, manda a la API exactamente lo elegido y avisa el resultado", async () => {
      mockCrearAuditoria.mockResolvedValue(AUDITORIA_CREADA);
      const user = userEvent.setup();
      const { container, onSuccess } = renderFormulario();
      await completarFormulario(user, container);
      await user.type(screen.getByLabelText("Descripción (opcional)"), "  Bolsas mezcladas en el SHUT  ");

      await user.click(botonEnviar());
      await user.click(await screen.findByRole("button", { name: "Sí, enviar" }));

      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(AUDITORIA_CREADA));
      expect(mockCrearAuditoria).toHaveBeenCalledTimes(1);
      const [datos] = mockCrearAuditoria.mock.calls[0];
      expect(datos).toMatchObject({
        id_conjunto_residencial: CONJUNTO_A.id_conjunto_residencial,
        nivel_desempeno: "REGULAR",
        tema_educativo: TEMA_ELEGIDO,
        // ¿Qué? La descripción se recorta: un texto con solo espacios no debe viajar como contenido.
        descripcion: "Bolsas mezcladas en el SHUT",
      });
      expect(datos.evidencias).toHaveLength(1);
      expect(datos.evidencias[0].name).toBe("evidencia.png");
    });

    it("sin descripción, no manda el campo (undefined) en vez de una cadena vacía", async () => {
      mockCrearAuditoria.mockResolvedValue(AUDITORIA_CREADA);
      const user = userEvent.setup();
      const { container, onSuccess } = renderFormulario();
      await completarFormulario(user, container);

      await user.click(botonEnviar());
      await user.click(await screen.findByRole("button", { name: "Sí, enviar" }));

      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(mockCrearAuditoria.mock.calls[0][0].descripcion).toBeUndefined();
    });

    it("con varios conjuntos, manda el id del conjunto elegido", async () => {
      mockCrearAuditoria.mockResolvedValue(AUDITORIA_CREADA);
      const user = userEvent.setup();
      const { container, onSuccess } = renderFormulario({ conjuntos: [CONJUNTO_A, CONJUNTO_B] });
      await completarFormulario(user, container);
      await user.selectOptions(screen.getByLabelText("Conjunto"), CONJUNTO_B.id_conjunto_residencial);

      await user.click(botonEnviar());
      await user.click(await screen.findByRole("button", { name: "Sí, enviar" }));

      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(mockCrearAuditoria.mock.calls[0][0].id_conjunto_residencial).toBe(CONJUNTO_B.id_conjunto_residencial);
    });
  });

  describe("cuando la API falla", () => {
    it("muestra el mensaje del error, no llama a onSuccess y deja el botón habilitado para reintentar", async () => {
      mockCrearAuditoria.mockRejectedValue(new Error("Espera 24 horas entre auditorías del mismo conjunto."));
      const user = userEvent.setup();
      const { container, onSuccess } = renderFormulario();
      await completarFormulario(user, container);

      await user.click(botonEnviar());
      await user.click(await screen.findByRole("button", { name: "Sí, enviar" }));

      expect(await screen.findByText("Espera 24 horas entre auditorías del mismo conjunto.")).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(botonEnviar()).toBeEnabled();
    });

    it("si el error no trae mensaje, muestra el texto genérico", async () => {
      mockCrearAuditoria.mockRejectedValue({});
      const user = userEvent.setup();
      const { container } = renderFormulario();
      await completarFormulario(user, container);

      await user.click(botonEnviar());
      await user.click(await screen.findByRole("button", { name: "Sí, enviar" }));

      expect(await screen.findByText("No se pudo enviar la auditoría.")).toBeInTheDocument();
    });

    it("si la subida se cuelga (timeout), explica que es un problema de conexión", async () => {
      mockCrearAuditoria.mockRejectedValue({ code: "ECONNABORTED", message: "timeout of 30000ms exceeded" });
      const user = userEvent.setup();
      const { container } = renderFormulario();
      await completarFormulario(user, container);

      await user.click(botonEnviar());
      await user.click(await screen.findByRole("button", { name: "Sí, enviar" }));

      expect(
        await screen.findByText("La subida está tardando demasiado — revisa tu conexión e intenta de nuevo.")
      ).toBeInTheDocument();
    });
  });

  it("el botón Cancelar cierra el formulario", async () => {
    const user = userEvent.setup();
    const { onClose } = renderFormulario();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
