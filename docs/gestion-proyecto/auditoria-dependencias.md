# Auditoría de Dependencias

<!--
  ¿Qué? Registro de la auditoría de seguridad de dependencias (backend con
        pip-audit, frontend con pnpm audit) ejecutada el 2026-08-24.
  ¿Para qué? Dejar constancia de qué se encontró, qué se corrigió y qué
             queda pendiente, con la razón de negocio detrás de cada
             decisión — no solo un volcado de la herramienta.
  ¿Impacto? Sin esto, nadie del equipo sabe si las dependencias del proyecto
            tienen vulnerabilidades conocidas, ni si ya se revisaron.
-->

**Fecha:** 2026-08-24
**Herramientas:** `pip-audit` (backend, vía `uvx`) y `pnpm audit` (frontend)

---

## Resumen ejecutivo

| | Antes | Después |
| --- | --- | --- |
| Backend — vulnerabilidades | 24 (en 4 paquetes) | 21 (en 1 paquete, sin corrección disponible) |
| Frontend — vulnerabilidades | 92 (1 crítica, 36 altas, 45 moderadas, 10 bajas) | 44 (0 críticas, 16 altas, 20 moderadas, 8 bajas) |

Todas las vulnerabilidades que afectaban **paquetes que llegan al navegador del usuario o al servidor en producción** con una corrección disponible ya están resueltas. Lo que queda pendiente es, en su mayoría, herramientas que solo corren en la máquina del desarrollador (nunca se despliegan), o un caso sin corrección posible que ya se evaluó como no explotable en nuestro caso de uso.

Después de cada cambio se corrió la batería completa de pruebas (backend: 183/183, frontend: 132/132) y se verificó un login real contra los contenedores de Docker reconstruidos, para confirmar que nada se rompió.

---

## Backend (`pip-audit`)

### Corregido

| Paquete | Antes | Ahora | Motivo |
| --- | --- | --- | --- |
| `cryptography` | 46.0.6 | 50.0.0 | 4 vulnerabilidades, incluida un oráculo de Bleichenbacher en descifrado PKCS#7 y una vulnerable a OpenSSL desactualizado en el wheel. |
| `pydantic-settings` | 2.13.1 | 2.15.0 | Un origen de secretos anidado podía seguir symlinks fuera de `secrets_dir`. |
| `python-multipart` | 0.0.22 | 0.0.32 | 6 vulnerabilidades de denegación de servicio y contrabando de parámetros en el parseo de formularios multipart — FastAPI lo usa para cualquier endpoint que reciba `multipart/form-data`. |

### Aceptado, sin corrección posible

**`ecdsa` 0.19.2** — ataque de temporización "Minerva" sobre la curva P-256 (CVE-2024-23342). El propio proyecto `ecdsa` no publica una versión corregida: su postura oficial es que esto es inherente a cualquier implementación de ECDSA en Python puro, y recomienda usar `pyca/cryptography` para trabajo criptográfico sensible.

**Por qué no nos afecta en la práctica:** `ecdsa` llega como dependencia transitiva de `python-jose` (nuestra librería de JWT), pero **nuestros tokens se firman con `HS256`** (HMAC simétrico, ver `be/app/config.py:69` y RNF-001.2), no con `ES256` (curva elíptica). El código vulnerable de `ecdsa` nunca se ejecuta en nuestros flujos reales. Se documenta como riesgo aceptado, no como pendiente.

---

## Frontend (`pnpm audit`)

### Corregido (paquetes de producción — llegan al navegador)

| Paquete | Antes | Ahora | Motivo |
| --- | --- | --- | --- |
| `axios` | 1.13.5 | 1.19.0 | Más de 15 avisos acumulados: SSRF vía bypass de `NO_PROXY`, inyección de headers, "prototype pollution" que permitía secuestro de peticiones/respuestas. |
| `react-router` (vía `react-router-dom`) | 7.13.0 | 7.18.2 | Varias altas, incluida una deserialización insegura que permitía ejecución remota de código no autenticada. |
| `jspdf-autotable` | 5.0.7 | 5.0.8 | Parche menor. |

### Corregido (solo herramientas de desarrollo — nunca se despliegan)

| Paquete | Antes | Ahora | Motivo |
| --- | --- | --- | --- |
| `vitest` / `@vitest/coverage-v8` | 4.0.18 | 4.1.11 | Única vulnerabilidad **crítica** del reporte: si alguien deja corriendo el servidor de la interfaz de Vitest, se pueden leer/ejecutar archivos arbitrarios en la máquina. Solo importa en desarrollo local. |
| `vite` | 7.3.1 | 7.3.6 | Varias altas: bypass de `server.fs.deny`, lectura arbitraria de archivos vía WebSocket del servidor de desarrollo. Solo aplica mientras corre `pnpm dev`. |

### Hallazgo aparte: dependencias sin usar

Mientras se investigaba una vulnerabilidad de `dompurify` (arrastrada por `jspdf`/`jspdf-autotable`, usados para exportar PDF), se encontró que **`jspdf` y `jspdf-autotable` no se importan en ningún archivo de `fe/src`** — están instalados pero el código no los usa. Quedó pendiente de decisión del equipo: si de verdad no hay un PDF que exportar todavía, se pueden eliminar por completo (`pnpm remove jspdf jspdf-autotable`), lo que de paso elimina esta cadena de vulnerabilidades de raíz.

### Pendiente — herramientas de desarrollo, override de pnpm no efectivo

Se intentó forzar versiones corregidas de `dompurify`, `undici` y `js-yaml` (dependencias transitivas profundas) usando `pnpm.overrides` en `package.json`. A pesar de una reinstalación completamente limpia (borrando `node_modules` y `pnpm-lock.yaml`), pnpm siguió resolviendo las versiones vulnerables — una limitación conocida de pnpm con dependencias opcionales/anidadas muy profundas, no un error de configuración. Se revirtieron esos overrides por ser inefectivos (dejarlos habría sido engañoso: parecían resolver el problema sin hacerlo de verdad).

Todas las vulnerabilidades restantes son de este tipo:

- **`dompurify`** (vía `jspdf`) — varios XSS. Solo se explota si `jspdf` renderiza HTML no confiable; ver el hallazgo de dependencia sin usar arriba — probablemente el fix real es eliminar `jspdf`, no perseguir la versión de `dompurify`.
- **`undici`** (vía `jsdom`, usado solo por Vitest para simular un navegador en las pruebas) — nunca se ejecuta en producción.
- **`js-yaml`, `brace-expansion`, `esbuild`, `postcss`, `@babel/core`, `nanoid`** — todas vía la cadena de ESLint/Vite/TypeScript-ESLint, herramientas de build y lint que nunca se empaquetan ni se sirven a un usuario final.

---

## Actualización — 2026-08-31

Se repitió la auditoría contra lo que está instalado hoy (recomendación explícita de una revisión técnica externa del proyecto, hecha el 2026-08-29). Nada nuevo que corregir — se deja constancia igual, para que quede claro que sí se repitió y qué se encontró.

| | 2026-08-24 | 2026-08-31 |
| --- | --- | --- |
| Backend — vulnerabilidades | 21 (1 paquete, sin corrección) | 21 (mismo 1 paquete, sin corrección) |
| Frontend — vulnerabilidades | 44 (0 críticas, 16 altas, 20 moderadas, 8 bajas) | 19 (0 críticas, 11 altas, 6 moderadas, 2 bajas) |
| Frontend — solo producción (`pnpm audit --prod`) | — | 0 |

**Backend:** sigue siendo únicamente `ecdsa` 0.19.2 (ataque de temporización Minerva) — mismo riesgo aceptado y documentado arriba, sin cambios. El identificador con el que lo reporta la base de datos de vulnerabilidades cambió de `CVE-2024-23342` a `PYSEC-2026-1325`, pero es el mismo problema subyacente, no uno nuevo.

**Frontend:** el número bajó de 44 a 19 sin que se hiciera ningún cambio a propósito para esto — mejoró solo, probablemente por la eliminación de `jspdf`/`jspdf-autotable` (issue #113, ya cerrado) que arrastraba buena parte de la cadena de `dompurify`, y por actualizaciones normales de `pnpm-lock.yaml` en el camino. Las 19 restantes siguen siendo exclusivamente herramientas de desarrollo (`brace-expansion`, `postcss`, `nanoid`, `@babel/core`, todas vía la cadena de ESLint/Vite/TypeScript-ESLint) — ninguna se empaqueta en el build de producción, confirmado con `pnpm audit --prod` (0 resultados).

Se verificó además que `uv.lock` y `pnpm-lock.yaml` siguen sincronizados con sus manifiestos (`uv sync --frozen` y `pnpm install --frozen-lockfile`, ambos sin cambios).

---

## Cómo repetir esta auditoría

```bash
# Backend
cd be
uvx pip-audit --requirement <(uv export --no-hashes --no-dev) -s osv

# Frontend
cd fe
pnpm audit
```

Recomendación: correrlo cada vez que se actualicen dependencias mayores, o al menos una vez por trimestre.
