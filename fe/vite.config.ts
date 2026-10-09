/**
 * Archivo: vite.config.ts
 * Descripción: Configuración de Vite — bundler y servidor de desarrollo.
 * ¿Para qué? Definir plugins (React, TailwindCSS), alias de paths y opciones del servidor.
 * ¿Impacto? Sin esta configuración, Vite no sabría cómo procesar JSX, TypeScript ni TailwindCSS.
 */

/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// ¿Qué? Configuración principal de Vite con plugins, alias y testing.
// ¿Para qué? React para JSX, TailwindCSS para estilos utility-first, alias para imports limpios.
// ¿Impacto? Permite usar `@/` como alias a `src/`, simplificando imports entre módulos.
//           También configura Vitest para tests unitarios con jsdom.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  // ¿Qué? Configuración de Vitest integrada en Vite.
  // ¿Para qué? Definir entorno (jsdom), globals, setup y cobertura.
  // ¿Impacto? Sin esto, Vitest no sabría dónde buscar tests ni cómo simular el DOM.
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // ¿Qué? Tiempo máximo de cada test: 15 s (el valor por defecto es 5 s).
    // ¿Para qué? Los tests de formularios que teclean mucho (RegisterPage,
    //           AdminNovedadesPage...) pasan solos en ~1 s, pero con la suite
    //           completa en una máquina con carga superaban los 5 s y fallaban
    //           sin que hubiera ningún error real (visto en los issues #404 y #400).
    // ¿Impacto? Un test colgado de verdad tarda más en fallar; ninguno se vuelve más permisivo.
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/__tests__/setup.ts",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/types/**",
      ],
      // ¿Qué? Umbral mínimo de cobertura (bootcamp de testing, semana 1:
      //       línea base del 6 de octubre de 2026, redondeada hacia abajo).
      // ¿Para qué? Si la cobertura baja de aquí, "pnpm test" falla — y con
      //           él el job de frontend del CI, que bloquea el PR.
      // ¿Impacto? Solo se sube, nunca se baja (ver docs/matriz-rotacion.md).
      thresholds: { lines: 78, statements: 76, branches: 72, functions: 70 },
    },
  },
});
