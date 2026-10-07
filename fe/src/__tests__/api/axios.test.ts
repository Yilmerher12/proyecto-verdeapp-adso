/**
 * Archivo: __tests__/api/axios.test.ts
 * ¿Qué? Issue #319 — renovación automática de la sesión con el refresh token.
 * ¿Para qué? El servidor se simula con un "adaptador" de axios: una función
 *           que recibe cada petición y decide qué responder, sin red real.
 *           Así se puede contar cuántas veces se llamó a /auth/refresh.
 */
import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Respuesta = { status: number; data?: unknown };

let llamadas: string[] = [];
let responder: (url: string, intento: number) => Respuesta;

const adaptadorFalso: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const url = config.url ?? "";
  llamadas.push(url);
  const intento = llamadas.filter((u) => u === url).length;
  const { status, data = {} } = responder(url, intento);
  const response: AxiosResponse = { data, status, statusText: "", headers: {}, config };
  if (status >= 400) {
    throw new AxiosError("error", String(status), config, {}, response);
  }
  return response;
};

let api: typeof import("@/api/axios").default;
const adaptadorOriginal = axios.defaults.adapter;
let destino = "";

beforeEach(async () => {
  llamadas = [];
  destino = "";
  // ¿Qué? El adaptador se instala ANTES de importar el módulo, para que las
  //       instancias que crea axios.ts (api y el cliente de renovación)
  //       también lo hereden.
  axios.defaults.adapter = adaptadorFalso;
  vi.resetModules();
  api = (await import("@/api/axios")).default;
  localStorage.setItem("verdeapp:sesion-activa", "1");
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return destino;
      },
      set href(valor: string) {
        destino = valor;
      },
    },
  });
});

afterEach(() => {
  axios.defaults.adapter = adaptadorOriginal;
  sessionStorage.clear();
  localStorage.clear();
  axios.interceptors.response.clear();
});

const esRefresh = (url: string) => url.includes("/auth/refresh");

describe("renovación de sesión (issue #319)", () => {
  it("un 401 renueva la sesión y repite la petición sin mandar al login", async () => {
    responder = (url, intento) => {
      if (esRefresh(url)) return { status: 200 };
      return intento === 1 ? { status: 401 } : { status: 200, data: { ok: true } };
    };

    const respuesta = await api.get("/api/v1/comunicados/feed");

    expect(respuesta.data).toEqual({ ok: true });
    expect(llamadas.filter(esRefresh)).toHaveLength(1);
    expect(destino).toBe("");
  });

  it("si la renovación falla y el reintento también, manda al login con el aviso", async () => {
    // ¿Qué? Todo responde 401: refresh token vencido o revocado.
    responder = () => ({ status: 401 });

    await expect(api.get("/api/v1/users/me")).rejects.toBeTruthy();

    expect(destino).toBe("/login");
    expect(sessionStorage.getItem("verdeapp:session-expired")).toBe("1");
    expect(localStorage.getItem("verdeapp:sesion-activa")).toBeNull();
  });

  it("varias peticiones que fallan juntas producen UNA sola renovación", async () => {
    responder = (url, intento) => {
      if (esRefresh(url)) return { status: 200 };
      return intento === 1 ? { status: 401 } : { status: 200 };
    };

    await Promise.all([
      api.get("/api/v1/notificaciones/no-leidas-count"),
      api.get("/api/v1/comunicados/feed"),
      api.get("/api/v1/users/me"),
    ]);

    expect(llamadas.filter(esRefresh)).toHaveLength(1);
    expect(destino).toBe("");
  });

  it("un 401 en /auth/login (contraseña incorrecta) no intenta renovar", async () => {
    localStorage.removeItem("verdeapp:sesion-activa");
    responder = () => ({ status: 401, data: { detail: "Credenciales incorrectas" } });

    await expect(api.post("/api/v1/auth/login", {})).rejects.toThrow("Credenciales incorrectas");

    expect(llamadas.filter(esRefresh)).toHaveLength(0);
  });

  // ¿Qué? El test de arriba borra la marca de sesión antes de probar, así
  //       que nunca cubría a alguien CON sesión abierta que entra a /login
  //       y se equivoca de contraseña.
  // ¿Para qué? Ese caso mostraba "Tu sesión expiró" en vez del error real
  //           y borraba la marca aunque la sesión siguiera viva.
  it("con sesión abierta, un login fallido muestra el error real y no manda al login", async () => {
    responder = () => ({ status: 401, data: { detail: "Credenciales incorrectas" } });

    await expect(api.post("/api/v1/auth/login", {})).rejects.toThrow("Credenciales incorrectas");

    expect(destino).toBe("");
    expect(sessionStorage.getItem("verdeapp:session-expired")).toBeNull();
    expect(localStorage.getItem("verdeapp:sesion-activa")).toBe("1");
  });

  it("cerrar sesión con la sesión ya vencida no muestra el aviso de sesión expirada", async () => {
    responder = () => ({ status: 401 });

    await expect(api.post("/api/v1/auth/logout")).rejects.toBeTruthy();

    expect(destino).toBe("");
    expect(sessionStorage.getItem("verdeapp:session-expired")).toBeNull();
  });

  it("con dos pestañas: si la renovación falla pero otra pestaña ya renovó, el reintento funciona", async () => {
    // ¿Qué? /auth/refresh responde 401 (la otra pestaña ya gastó el refresh
    //       token), pero el reintento de la petición original sí pasa,
    //       porque las cookies nuevas que dejó la otra pestaña son compartidas.
    responder = (url, intento) => {
      if (esRefresh(url)) return { status: 401 };
      return intento === 1 ? { status: 401 } : { status: 200 };
    };

    await api.get("/api/v1/comunicados/feed");

    expect(destino).toBe("");
  });

  it("las pantallas que usan axios directo también renuevan la sesión", async () => {
    responder = (url, intento) => {
      if (esRefresh(url)) return { status: 200 };
      return intento === 1 ? { status: 401 } : { status: 200 };
    };

    await axios.get("http://localhost:8000/api/v1/auditorias");

    expect(llamadas.filter(esRefresh)).toHaveLength(1);
    expect(destino).toBe("");
  });

  it("con navigator.locks, la renovación pasa por el candado compartido entre pestañas (issue #359)", async () => {
    // ¿Qué? jsdom no trae navigator.locks: se simula uno que corre la
    //       función de una vez, solo para comprobar que se usa y con qué nombre.
    const request = vi.fn((_nombre: string, fn: () => Promise<void>) => fn());
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
    responder = (url, intento) => {
      if (esRefresh(url)) return { status: 200 };
      return intento === 1 ? { status: 401 } : { status: 200 };
    };

    try {
      await api.get("/api/v1/comunicados/feed");
    } finally {
      delete (navigator as { locks?: unknown }).locks;
    }

    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][0]).toBe("verdeapp:renovar-sesion");
    expect(llamadas.filter(esRefresh)).toHaveLength(1);
    expect(destino).toBe("");
  });
});

// ¿Qué? Issue #414: el motivo con el que el servidor rechaza una petición
//       llega a la pantalla en el mensaje del error.
describe("motivo del servidor (issue #414)", () => {
  it("un 429 del límite de peticiones (sin detail) da un mensaje claro y traducido", async () => {
    responder = () => ({ status: 429, data: { error: "Rate limit exceeded: 5 per 1 minute" } });
    // ¿Qué? vi.resetModules() reinicia i18n con el idioma del navegador de
    //       jsdom (inglés); se fija español para comprobar el texto.
    await (await import("@/i18n")).default.changeLanguage("es");

    await expect(api.post("/api/v1/auth/login", {})).rejects.toThrow(
      "Hiciste demasiadas peticiones. Espera un momento e intenta de nuevo."
    );
  });

  it("un rechazo con detail de texto conserva ese texto", async () => {
    responder = () => ({ status: 400, data: { detail: "Ya enviaste este aviso a este conjunto hace menos de 5 minutos." } });

    await expect(api.post("/api/v1/notificaciones/enviar", {})).rejects.toThrow(
      "Ya enviaste este aviso a este conjunto hace menos de 5 minutos."
    );
  });

  it("motivoDelServidor: 422 une los mensajes, y sin motivo devuelve null", async () => {
    const { motivoDelServidor } = await import("@/api/axios");

    expect(
      motivoDelServidor({ response: { status: 422, data: { detail: [{ msg: "Campo obligatorio" }, { msg: "Muy corto" }] } } })
    ).toBe("Campo obligatorio. Muy corto");
    expect(motivoDelServidor({ response: { status: 500, data: {} } })).toBeNull();
    expect(motivoDelServidor(new Error("Network Error"))).toBeNull();
    expect(motivoDelServidor(null)).toBeNull();
  });
});
