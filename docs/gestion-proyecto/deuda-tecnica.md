# Deuda técnica de VerdeApp

<!--
  ¿Qué? Lista de lo que quedó pendiente o a medias en el proyecto, con su prioridad, su
        tamaño y dónde se comprobó.
  ¿Para qué? Es la parte de «deuda técnica documentada y priorizada» del criterio 14 de la
            revisión. La reflexión que compara los backends del programa va en otro documento.
  ¿Impacto? Cada punto salió del código, de un issue abierto o de un documento del repositorio
            el 21 de noviembre de 2026. Cuando un punto se resuelve, se pasa a la sección 4.
-->

| Campo | Valor |
|---|---|
| **Fecha** | 21 de noviembre de 2026 |
| **Cómo se priorizó** | Con el método del proyecto: importancia, complejidad, prioridad (Must, Should, Could) y tamaño (XS a XL, en horas). Ver [prioridad y tamaño](prioridad-y-tamano.md) |
| **Documentos hermanos** | [Despliegue](../despliegue.md) · [Reporte de defectos](../pruebas/reporte-ejecucion-y-defectos.md) · [Plan de pruebas](../pruebas/plan-de-pruebas.md) |

**Qué es deuda técnica aquí:** cosas que hoy funcionan o se dejaron así a propósito, pero que habría que mejorar antes de que el sistema crezca o se despliegue. No son errores nuevos: cada una tiene un motivo y una forma de resolverla.

## 1. Resumen

| Prioridad | Cuántas | Qué significa |
|---|---|---|
| **Must (P0)** | 2 | Hay que resolverlas antes de entregar o de desplegar |
| **Should (P1)** | 8 | Mejoran de forma clara la calidad, sin urgencia |
| **Could (P2)** | 3 | Pulido y funcionalidad opcional |

## 2. Lista priorizada

El tamaño es una estimación a ojo, como en el resto de las tarjetas.

### 2.1 Must (P0)

| ID | Qué falta | Por qué importa | Dónde se ve | Importancia | Complejidad | Tamaño |
|---|---|---|---|---|---|---|
| DT-02 | **Seguridad de la infraestructura antes de desplegar:** el `docker-compose.yml` trae las credenciales de la base escritas y publica Mailpit; `fe/nginx.conf` no tiene HTTPS ni cabeceras de seguridad (CSP, HSTS); las imágenes no están fijadas por digest | Mientras todo corre en local no es un riesgo, pero un despliegue real las dejaría expuestas | Issue [#317](https://github.com/Yilmerher12/proyecto-verdeapp-adso/issues/317) y [despliegue, sección 7](../despliegue.md) | Alta | Media | L |
| DT-03 | **No hay despliegue real:** ni servidor, ni dominio, ni proceso de entrega, ni etiquetas de versión | El proyecto no se puede usar fuera de la máquina del equipo | [Despliegue](../despliegue.md) y `git tag`, que sale vacío | Alta | Media | L |

### 2.2 Should (P1)

| ID | Qué falta | Por qué importa | Dónde se ve | Importancia | Complejidad | Tamaño |
|---|---|---|---|---|---|---|
| DT-04 | **`GET /api/v1/health` no revisa la base de datos:** responde «ok» aunque PostgreSQL esté caída | El `HEALTHCHECK` de Docker diría que el backend está sano cuando no lo está | `be/app/main.py` y `be/Dockerfile` | Media | Baja | XS |
| DT-05 | **Los límites de peticiones viven en la memoria del proceso** (`Limiter` sin almacén compartido) | Con más de una instancia del backend, cada una cuenta por separado y el límite se multiplica | `be/app/utils/limiter.py` y la issue #317 | Media | Media | M |
| DT-06 | **Solo hay 2 pruebas E2E y no corren en el CI** | Un fallo que solo aparece al juntar frontend, backend y base de datos puede pasar sin detectarse | `e2e/tests/` y [plan de pruebas, sección 9](../pruebas/plan-de-pruebas.md) | Media | Media | M |
| DT-07 | **La cobertura del frontend (89 %) es menor que la del backend (97 %)** y no hay pruebas de carga | Más lógica de pantalla sin probar, y no se conoce el límite de usuarios simultáneos | [Informe de pruebas](../pruebas/informe-pruebas-automatizadas.md) | Media | Media | L |
| DT-08 | **Protecciones de rama flojas:** solo `stg` exige revisión; `main` y `develop` no, y ninguna obliga a que el CI esté en verde | Que el CI deba pasar es un acuerdo del equipo y no algo que GitHub imponga | Configuración de GitHub y la sección «Límites de hoy» de `docs/gestion-proyecto/uso-de-git.md` | Media | Baja | XS |
| DT-09 | **Los diagramas se desactualizan sin que nadie lo note:** al revisarlos faltaban columnas en 3 tablas y una relación, y las cifras de tablas estaban viejas | La documentación deja de coincidir con la base de datos real | `docs/referencia-proyecto/diagramas-UML/`, corregidos en el criterio 1 | Media | Media | S |
| DT-10 | **Actualizaciones de versión mayor del frontend sin evaluar** (Vite 8, Vitest 5, ESLint 10, TypeScript 7) y 15 avisos nuevos de `eslint-plugin-react-hooks` 7.1 | Las versiones quedan atrás y las vulnerabilidades futuras serán más difíciles de actualizar | Issues [#331](https://github.com/Yilmerher12/proyecto-verdeapp-adso/issues/331) y [#330](https://github.com/Yilmerher12/proyecto-verdeapp-adso/issues/330) | Media | Media | L |
| DT-11 | **Decisiones sin aprobar:** el plazo de 6 meses para borrar las fotos de evidencia (el comando existe pero no está programado) y la calificación entre Residente y Reciclador | Mientras no se aprueben, quedan como propuesta | [Retención de fotos](politica-retencion-fotos-evidencia.md) y [decisión de calificación](decision-calificacion-residente-reciclador.md) | Media | Baja | XS |

### 2.3 Could (P2)

| ID | Qué falta | Por qué importa | Dónde se ve | Importancia | Complejidad | Tamaño |
|---|---|---|---|---|---|---|
| DT-12 | **Una alerta de seguridad ignorada de forma temporal** (`GHSA-fc5q-39xc-vjpf`, de `picomatch`) en `pnpm audit` | Es una vulnerabilidad conocida sin corregir, aunque solo afecta herramientas de desarrollo | `fe/pnpm-workspace.yaml` | Baja | Baja | XS |
| DT-13 | **Prettier no se aplica ni se revisa en el CI** | El formato del código del frontend depende de cada persona | Issue [#332](https://github.com/Yilmerher12/proyecto-verdeapp-adso/issues/332) | Baja | Baja | S |
| DT-14 | **CORS acepta cualquier método y cabecera** (`allow_methods` y `allow_headers` en `*`), aunque el origen ya sale de `FRONTEND_URL` | Es más permisivo de lo necesario | `be/app/main.py` e issue #317 | Baja | Baja | XS |

## 3. Funcionalidad abierta y por revisar

No es deuda técnica en sentido estricto, pero sigue en el tablero:

- **Funcionalidad pendiente:** mostrar las ECA en un mapa (#666), ampliar el contenido educativo y organizar sus módulos (#519 y #597), y pruebas del módulo de residuos (#555).
- **Por comprobar si siguen vigentes:** #111 (mejorar el diseño visual de los 4 paneles), que se escribió antes de los rediseños de octubre y noviembre, y #450 (notificaciones por conjunto en el panel del Administrador de Conjunto). Antes de trabajarlas hay que verificar en el código que no estén resueltas.

## 4. Lo que ya se resolvió

La deuda también se paga. De la lista original de seguridad de infraestructura (#317), ya está hecho:

- **Las cuentas de prueba solo se siembran en desarrollo** (defecto D-10, PR #146).
- **`ENVIRONMENT` es obligatoria** y `SECRET_KEY` se rechaza si es corta o es el valor de ejemplo (D-25).
- **El origen de CORS sale de `FRONTEND_URL`** y ya no está escrito en el código ([despliegue](../despliegue.md)).
- **Los contenedores del backend corren sin root** y con `HEALTHCHECK` (D-09).
- **Las cabeceras de seguridad** de la API (`X-Frame-Options`, `nosniff`, `Referrer-Policy`) y los límites de peticiones en los endpoints sensibles.
- **La política de retención de fotos de evidencia** tiene su comando de limpieza (`app.limpiar_evidencias`).
- **El formulario de auditoría ya no se rompe al quitar una foto de evidencia** (issue #685, defecto D-36, PR #693). Era el punto DT-01 de la lista Must; los demás puntos conservan su número.

## 5. Cómo se comprobó

Cada punto se contrastó con el código o con el issue indicado: el comportamiento de `/health`, de `nginx.conf`, de `Limiter` y de CORS se leyó en el código; los issues #317, #330, #331, #332, #555, #597 y #666 están abiertos en GitHub; y las protecciones de rama se consultaron con `gh api`.
