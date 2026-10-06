/**
 * Archivo: __tests__/components/RoleGuard.test.tsx
 * Descripción: Tests de RoleGuard — solo los roles permitidos entran a la ruta.
 * ¿Impacto? Antes un Admin. de Conjunto en una ruta ajena terminaba en /login
 *           con la sesión activa; estas pruebas fallan si vuelve a pasar.
 */

import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { RoleGuard } from "@/components/RoleGuard";
import { RoleId } from "@/types/auth";
import { mockUser, renderWithProviders } from "../helpers";

function renderGuard(roleId: RoleId | null) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<p>Página de login</p>} />
      <Route path="/dashboard" element={<p>Redirección por rol</p>} />
      <Route
        path="/directorio"
        element={
          <RoleGuard allowedRoles={[RoleId.RESIDENTE]}>
            <p>Contenido del residente</p>
          </RoleGuard>
        }
      />
    </Routes>,
    {
      initialRoute: "/directorio",
      authContext:
        roleId === null
          ? { isAuthenticated: false, user: null }
          : { isAuthenticated: true, user: { ...mockUser, role_id: roleId } },
    },
  );
}

describe("RoleGuard", () => {
  it("deja pasar a un rol permitido", () => {
    renderGuard(RoleId.RESIDENTE);
    expect(screen.getByText("Contenido del residente")).toBeInTheDocument();
  });

  it.each([RoleId.ADMIN_CONJUNTO, RoleId.ADMIN_SISTEMA, RoleId.RECICLADOR])(
    "manda a /dashboard (su propio panel) al rol %i sin permiso, nunca a /login",
    (rol) => {
      renderGuard(rol);
      expect(screen.getByText("Redirección por rol")).toBeInTheDocument();
      expect(screen.queryByText("Página de login")).not.toBeInTheDocument();
    },
  );

  it("sin sesión manda a /login", () => {
    renderGuard(null);
    expect(screen.getByText("Página de login")).toBeInTheDocument();
  });
});
