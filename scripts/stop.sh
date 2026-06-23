#!/usr/bin/env bash
# ¿Qué? Script de parada del sistema NN Auth.
# ¿Para qué? Detener y eliminar todos los contenedores de forma ordenada.
# ¿Impacto? Los datos de PostgreSQL se conservan en el volumen nn_auth_data.
#           Usar --volumes para borrar también los datos (¡irreversible!).
#
# Uso:
#   ./scripts/stop.sh             # detiene contenedores, conserva volúmenes y red
#   ./scripts/stop.sh --volumes   # detiene Y borra el volumen de PostgreSQL (¡pierde datos!)

set -euo pipefail

# ─── Colores ────────────────────────────────────────────────────────────────
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
BOLD="\033[1m"
RESET="\033[0m"

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}$*${RESET}"; }

# ─── Directorio raíz del proyecto ───────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# ─── Flags ──────────────────────────────────────────────────────────────────
VOLUMES_FLAG=""
if [[ "${1:-}" == "--volumes" ]]; then
  VOLUMES_FLAG="--volumes"
  echo ""
  echo -e "${RED}${BOLD}⚠️  ADVERTENCIA: --volumes eliminará TODOS los datos de PostgreSQL.${RESET}"
  echo -e "${RED}   Esta acción es IRREVERSIBLE. Los usuarios y tokens se borrarán.${RESET}"
  echo ""
  read -r -p "¿Confirmas que quieres borrar los volúmenes? [s/N]: " confirm
  if [[ "${confirm}" != "s" && "${confirm}" != "S" ]]; then
    info "Operación cancelada. No se borraron volúmenes."
    exit 0
  fi
fi

# ─── Detener servicios ───────────────────────────────────────────────────────
header "Deteniendo servicios..."
# ¿Qué? docker compose down detiene y elimina los contenedores y la red interna.
# ¿Para qué? Liberar puertos y recursos del sistema de forma limpia.
# ¿Impacto? Sin --volumes, el volumen nn_auth_data persiste para el próximo start.
#           Con --volumes, se borra definitivamente.
info "Ejecutando: docker compose down ${VOLUMES_FLAG}"
# shellcheck disable=SC2086
docker compose down ${VOLUMES_FLAG}

# ─── Resumen ────────────────────────────────────────────────────────────────
echo ""
if [[ -n "${VOLUMES_FLAG}" ]]; then
  echo -e "${BOLD}${YELLOW}╔══════════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${YELLOW}║   NN Auth System detenido — volúmenes eliminados     ║${RESET}"
  echo -e "${BOLD}${YELLOW}╚══════════════════════════════════════════════════════╝${RESET}"
  warn "Los datos de PostgreSQL fueron eliminados permanentemente."
else
  echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${GREEN}║       NN Auth System detenido correctamente          ║${RESET}"
  echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${RESET}"
  success "Los datos de PostgreSQL se conservaron en el volumen nn_auth_data."
fi
echo ""
echo -e "  Para volver a levantar todo: ${BOLD}./scripts/start.sh${RESET}"
echo ""
