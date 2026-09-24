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
  sessionStorage.setItem("verdeapp:sesion-activa", "1");
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
    expect(sessionStorage.getItem("verdeapp:sesion-activa")).toBeNull();
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
    sessionStorage.removeItem("verdeapp:sesion-activa");
    responder = () => ({ status: 401, data: { detail: "Credenciales incorrectas" } });

    await expect(api.post("/api/v1/auth/login", {})).rejects.toThrow("Credenciales incorrectas");

    expect(llamadas.filter(esRefresh)).toHaveLength(0);
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
});
