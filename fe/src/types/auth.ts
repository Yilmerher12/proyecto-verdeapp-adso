/**
 * Archivo: types/auth.ts
 * Descripción: Tipos e interfaces TypeScript para el sistema de autenticación.
 * ¿Para qué? Definir contratos de datos entre frontend y backend — garantiza que
 * las peticiones y respuestas tengan la forma correcta en tiempo de compilación.
 * ¿Impacto? Sin estos tipos, TypeScript no podría validar los datos en compile-time,
 * permitiendo errores que solo se detectarían en producción.
 */

// ════════════════════════════════════════
// 📥 Tipos de REQUEST
// ════════════════════════════════════════

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  rol: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  numero_telefonico?: string;
  email: string;
  password: string;
  unidad_id?: number;
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
  role_id: number;
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