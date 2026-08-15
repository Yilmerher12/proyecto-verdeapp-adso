/**
 * Archivo: types/auth.ts
 * Descripción: Tipos e interfaces TypeScript para el sistema de autenticación.
 * ¿Para qué? Definir contratos de datos entre frontend y backend — garantiza que
 * las peticiones y respuestas tengan la forma correcta en tiempo de compilación.
 * ¿Impacto? Sin estos tipos, TypeScript no podría validar los datos en compile-time,
 * permitiendo errores que solo se detectarían en producción.
 */

// Antes cada pantalla comparaba el rol del usuario contra números sueltos (1, 2, 3, 4),
// cada una a su manera, sin que hubiera un solo lugar que dijera qué significa cada
// número. Con esto, en cualquier componente comparamos contra RoleId.RESIDENTE en vez
// del número 2 — se entiende de una con solo leerlo, y coincide siempre con el mismo
// enum que ya usamos en el backend (be/app/models/rol.py).
//
// Se usa un objeto "as const" + un tipo derivado, en vez de un "enum" de TypeScript,
// porque el proyecto tiene activado erasableSyntaxOnly (tsconfig.app.json) — exige que
// todo lo que no sea puramente un tipo se pueda "borrar" al compilar sin generar código
// extra, y un enum normal sí genera código JS real. Este patrón se usa exactamente
// igual que un enum (RoleId.RESIDENTE), tanto como valor como tipo.
export const RoleId = {
  ADMIN_SISTEMA: 1,
  RESIDENTE: 2,
  RECICLADOR: 3,
  ADMIN_CONJUNTO: 4,
} as const;

export type RoleId = (typeof RoleId)[keyof typeof RoleId];

// ════════════════════════════════════════
// 📥 Tipos de REQUEST
// ════════════════════════════════════════

export interface LoginRequest {
  email: string;
  password: string;
}

// Este tipo se había quedado desactualizado: tenía apellido_paterno/apellido_materno
// separados, pero el backend real (be/app/schemas/user.py) ya solo pide un único
// campo "apellidos" desde hace rato. RegisterPage.tsx ya enviaba los campos correctos,
// pero tenía que forzar el envío con "as any" porque este tipo no coincidía — es decir,
// TypeScript no estaba revisando de verdad si el registro mandaba los datos correctos.
export interface RegisterRequest {
  rol: string;
  correo_electronico: string;
  email: string; // se reutiliza para el auto-login que hace AuthContext justo después de registrarse
  password: string;
  nombre: string;
  apellidos: string;
  numero_telefonico?: string;
  localidad_id?: number; // solo aplica para reciclador
  id_conjunto_residencial?: number; // solo aplica para residente
  torre?: string;
  apto?: string;
  asociacion?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

// ════════════════════════════════════════
// 📤 Tipos de RESPONSE
// ════════════════════════════════════════

export interface UserResponse {
  id: number; // Sincronizado como número para coincidir con la BD relacional
  email: string;
  role_id: RoleId;
  is_active: boolean;
  locale?: string;
  first_name: string; // Sincronizado para Navbar y AppShell
  last_name: string;  // Sincronizado para Navbar y AppShell
  perfil?: {
    tipo: "administrador" | "residente" | "reciclador";
    nombre_completo: string;
    telefono?: string;
    unidad_id?: number;
    asociacion?: string;
  };
}

export interface AuthContextType {
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<UserResponse>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<void>;
  resetPassword: (data: ResetPasswordRequest) => Promise<void>;
}

// Interfaces de control requeridas por el cliente API de axios
export interface MessageResponse {
  message: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}