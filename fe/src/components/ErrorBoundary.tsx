import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorFallback } from "@/components/ErrorFallback";

/**
 * Archivo: components/ErrorBoundary.tsx
 * Descripción: Atrapa los errores que lanza un componente al dibujarse y
 *              muestra la pantalla de recuperación (ErrorFallback) en su lugar.
 * ¿Para qué? Sin esto, si una página falla al dibujarse (ej. una fecha
 *           inválida que llega del backend), React desmonta TODA la app y
 *           el usuario queda viendo una página en blanco sin forma de volver
 *           (issue #378, hallazgo CN-043 del informe de seguridad).
 * ¿Impacto? Es un componente de clase porque React solo permite atrapar
 *           estos errores con getDerivedStateFromError/componentDidCatch —
 *           no existe una versión con hooks. Solo atrapa errores al dibujar;
 *           los de peticiones a la API ya los manejan los interceptores de
 *           axios y el ServerErrorBanner (RNF-002.4).
 */
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  // ¿Qué? Deja el error completo en la consola del navegador.
  // ¿Para qué? La pantalla de recuperación no muestra detalles técnicos al
  //            usuario, pero el equipo sí necesita verlos para depurar.
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary atrapó un error:", error, info.componentStack);
  }

  render() {
    return this.state.hasError ? <ErrorFallback /> : this.props.children;
  }
}
