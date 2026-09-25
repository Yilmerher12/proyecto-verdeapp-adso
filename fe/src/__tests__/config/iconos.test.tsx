/**
 * Archivo: __tests__/config/iconos.test.tsx
 * Descripción: Tests del mapa de íconos por concepto (roles y mensajes).
 * ¿Para qué? Verificar las reglas acordadas: cada rol con su propio ícono (sin
 *           chocar con "conjunto") y un ícono fijo por tipo de mensaje.
 * ¿Impacto? Sin estos tests, alguien podría volver a mezclar íconos (ej. usar
 *           Building2 para un rol) sin que nada falle.
 */

import { render } from "@testing-library/react";
import { Building, HardHat, ShieldUser, UserCog, UserRound } from "lucide-react";
import { ROLE_THEME } from "@/config/roleTheme";
import { RoleId } from "@/types/auth";
import { Alert } from "@/components/ui/Alert";

describe("Íconos de rol (roleTheme)", () => {
  it("cada rol usa el ícono de persona acordado", () => {
    expect(ROLE_THEME[RoleId.RESIDENTE].Icon).toBe(UserRound);
    expect(ROLE_THEME[RoleId.RECICLADOR].Icon).toBe(HardHat);
    expect(ROLE_THEME[RoleId.ADMIN_CONJUNTO].Icon).toBe(UserCog);
    expect(ROLE_THEME[RoleId.ADMIN_SISTEMA].Icon).toBe(ShieldUser);
  });

  it("los 4 roles son distintos y ninguno usa el ícono de conjunto", () => {
    const iconos = Object.values(ROLE_THEME).map((r) => r.Icon);
    expect(new Set(iconos).size).toBe(4);
    expect(iconos).not.toContain(Building);
  });
});

describe("Íconos de mensajes (Alert)", () => {
  // ¿Qué? lucide-react pone la clase "lucide-<nombre>" en cada ícono.
  it.each([
    ["success", "lucide-badge-check", "icon-hop"],
    ["error", "lucide-octagon-x", "icon-shake"],
    ["warning", "lucide-triangle-alert", "icon-ring"],
    ["info", "lucide-info", "icon-nudge"],
  ] as const)("tipo %s usa %s y se anima al aparecer", (type, clase, anim) => {
    const { container } = render(<Alert type={type} message="x" />);
    const icono = container.querySelector("svg");
    expect(icono).toHaveClass(clase, "icon-appear", anim);
  });
});
