/**
 * Archivo: __tests__/lib/sesionActiva.test.ts
 * Descripción: Tests de la marca de sesión activa (issue #404, CN-064).
 * ¿Para qué? Verificar que cada login deje una marca distinta (para que el
 *           navegador avise a las demás pestañas) y que el aviso de "otra
 *           pestaña inició sesión" no se confunda con un cierre de sesión.
 * ¿Impacto? Sin esto, volver a guardar un "1" fijo rompería el aviso entre
 *           pestañas sin que ninguna prueba lo notara.
 */

import { describe, expect, it, vi } from "vitest";
import {
  alIniciarSesionEnOtraPestana,
  haySesionActiva,
  marcarSesionActiva,
} from "@/lib/sesionActiva";

const CLAVE = "verdeapp:sesion-activa";

// ¿Qué? Lo que el navegador le avisa a ESTA pestaña cuando otra pestaña
//       cambia localStorage (jsdom no lo dispara solo entre "pestañas").
function cambioEnOtraPestana(key: string | null, newValue: string | null) {
  window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
}

describe("marcarSesionActiva / haySesionActiva", () => {
  it("cada login deja una marca distinta de la anterior", () => {
    marcarSesionActiva();
    const primera = localStorage.getItem(CLAVE);

    marcarSesionActiva();
    const segunda = localStorage.getItem(CLAVE);

    expect(primera).not.toBeNull();
    expect(segunda).not.toBeNull();
    expect(segunda).not.toBe(primera);
  });

  it("hay sesión con una marca nueva y con un '1' guardado de antes", () => {
    expect(haySesionActiva()).toBe(false);

    marcarSesionActiva();
    expect(haySesionActiva()).toBe(true);

    localStorage.setItem(CLAVE, "1");
    expect(haySesionActiva()).toBe(true);
  });
});

describe("alIniciarSesionEnOtraPestana", () => {
  it("avisa cuando la marca cambia a un valor nuevo", () => {
    const callback = vi.fn();
    const dejarDeEscuchar = alIniciarSesionEnOtraPestana(callback);

    cambioEnOtraPestana(CLAVE, "codigo-nuevo");

    expect(callback).toHaveBeenCalledTimes(1);
    dejarDeEscuchar();
  });

  it("no avisa si se borró la marca ni si cambió otra clave", () => {
    const callback = vi.fn();
    const dejarDeEscuchar = alIniciarSesionEnOtraPestana(callback);

    cambioEnOtraPestana(CLAVE, null);
    cambioEnOtraPestana("theme", "dark");
    cambioEnOtraPestana(null, null);

    expect(callback).not.toHaveBeenCalled();
    dejarDeEscuchar();
  });

  it("deja de avisar después de llamar a la función que devuelve", () => {
    const callback = vi.fn();
    alIniciarSesionEnOtraPestana(callback)();

    cambioEnOtraPestana(CLAVE, "codigo-nuevo");

    expect(callback).not.toHaveBeenCalled();
  });
});
