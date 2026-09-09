# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es VerdeApp

Plataforma de coordinación de reciclaje para conjuntos residenciales de Bogotá — proyecto de formación ADSO del SENA. Conecta 4 roles (Administrador del Sistema, Administrador de Conjunto, Reciclador, Residente) para gestionar auditorías de separación de residuos, comunicados, novedades, notificaciones de recolección y contenido educativo. Monorepo: `be/` (FastAPI) + `fe/` (React).

Para contexto de negocio detallado (historias de usuario, requisitos funcionales, reglas de negocio), ver `docs/requisitos/` — cada HU/RF tiene un campo **Estado** que es la fuente de verdad más confiable sobre qué tan avanzado está algo, más que este archivo o el README.

## Comandos

### Backend (`be/`) — gestor de paquetes `uv`, nunca `pip` directo

```bash
uv sync                                              # instalar dependencias (primera vez / tras cambios en pyproject.toml)
uv run alembic upgrade head                          # aplicar migraciones pendientes
uv run alembic revision --autogenerate -m "mensaje"  # generar una migración nueva (revisar el archivo generado a mano — ver Arquitectura)
uv run python -m app.seed                            # sembrar roles/localidades/usuarios de prueba/conjuntos reales (idempotente)
uv run uvicorn app.main:app --reload --port 8000     # levantar el servidor de desarrollo
uv run pytest -q                                     # correr toda la suite
uv run pytest app/tests/test_auth.py -q              # un solo archivo
uv run pytest app/tests/test_auth.py::TestGetMe::test_get_me_success -q  # un solo test
uv run ruff check .                                  # lint (incluye formato)
```

### Frontend (`fe/`) — gestor de paquetes `pnpm`, nunca `npm`/`yarn`

```bash
pnpm install       # instalar dependencias
pnpm dev           # servidor de desarrollo (Vite, puerto 5173)
pnpm test          # toda la suite (vitest run)
pnpm test:watch    # modo watch
npx vitest run src/__tests__/pages/AdminDashboard.test.tsx   # un solo archivo de test
pnpm lint          # eslint .
npx tsc -b --noEmit  # solo chequeo de tipos, sin compilar (pnpm build ya incluye esto)
pnpm build         # tsc -b && vite build
pnpm format        # prettier --write
```

### Entorno completo

Ver `README.md` para el detalle completo (variables de entorno, Docker, credenciales de las 4 cuentas de prueba). Resumen:

```bash
docker compose up -d verde_db verde_mailpit   # solo BD + correo de prueba en Docker
# backend y frontend corren en consola con los comandos de arriba, cada uno en su propia terminal
```

`docker compose up -d --build` (sin especificar servicio) levanta TODO en Docker, incluido el backend — si vas a correr el backend en consola (`uv run uvicorn`), no levantes también `verde_be` en Docker: ambos compiten por el puerto 8000.

## Arquitectura

### Backend — capas

`routers/` (endpoints FastAPI, un archivo por dominio) → `services/` (lógica de negocio, cuando el router hace más que un CRUD simple) → `models/` (SQLAlchemy ORM) + `schemas/` (Pydantic, request/response). `dependencies.py` tiene las dos dependencias inyectables que usa casi todo endpoint: `get_db` (sesión de BD) y `get_current_user` (valida el JWT).

- **Roles**: `app/models/rol.py` define `RolId` (IntEnum: `ADMIN_SISTEMA=1`, `RESIDENTE=2`, `RECICLADOR=3`, `ADMIN_CONJUNTO=4`) — comparar siempre contra `RolId.X`, nunca contra el número a mano. Los datos específicos de cada rol viven en su propia tabla (`residentes`, `recicladores`, `administradores_conjunto`), enlazada a `usuarios` por `id_usuario` — `usuarios` solo tiene lo común a los 4 roles (correo, password, `id_rol`, `locale`, `foto_perfil_url`).
- **Migraciones**: el esquema NO se crea con `Base.metadata.create_all()` — todo pasa por Alembic (`be/alembic/versions/`). Al correr `alembic revision --autogenerate`, revisar el archivo generado antes de aplicarlo: en este proyecto suele traer de arrastre índices/constraints que ya existen en la BD real pero no en el estado que Alembic cree tener (drift acumulado de migraciones anteriores) — dejar solo el cambio que de verdad se está haciendo, no aplicar el resto.
- **Subida de imágenes**: `app/utils/imagenes.py` (`guardar_imagen_subida`) es la validación compartida — verifica el contenido real del archivo con Pillow (no solo el `Content-Type`), tope de 5 MB, y solo jpg/png/webp. La reutiliza cualquier feature que reciba una foto (evidencias de auditoría, adjuntos de comunicados/novedades, foto de perfil) guardando cada una en su propia subcarpeta de `be/app/uploads/`, servida como estáticos en `/uploads` (ver `main.py`).
- **UUIDv4**: todas las PK/FK son `UUID` generado con `uuid.uuid4()` de la librería estándar (no `uuid_utils`, que sigue como dependencia solo porque una migración histórica la importa y Alembic necesita poder importar todo el historial). Excepción intencional: `roles.id_rol` y `localidades.id_localidad` siguen siendo `Integer` — son catálogos fijos y públicos, no hay nada que "adivinar" ahí.
- **Seguridad ya aplicada** (no hay que redescubrirla): cabeceras de seguridad OWASP en todas las respuestas (`main.py`), rate limiting en login (`slowapi`, `app/utils/limiter.py`), CORS con lista explícita de orígenes (nunca `*`), `/docs`/`/redoc` apagados si `ENVIRONMENT=production`.

### Frontend — estructura

`pages/` (una vista por ruta; los 4 paneles por rol viven en `pages/dashboards/`) usan `lib/*Api.ts` (un cliente Axios por recurso) y `components/ui/` (compartidos: `Button`, `Modal`, `Alert`, `InputField`, comboboxes). `App.tsx` define las rutas; todo lo autenticado va envuelto en `<ProtectedRoute>`, y `/dashboard` redirige al panel según el rol del usuario en sesión.

- **Tema por rol**: `config/roleTheme.ts` centraliza el ícono/color de cada uno de los 4 roles — no hay que repetir esa lógica por archivo.
- **Comunicación entre componentes sin prop-drilling**: patrón de evento de `window` (ver `lib/notificationEvents.ts`, `lib/profileEvents.ts`) para que un componente le avise a otro (ej. `AppShell`) que algo cambió y debe refrescarse ya, sin esperar al próximo polling.
- **i18n**: `react-i18next`, dos locales (`es` default, `en`) en `src/locales/{locale}/translation.json`, un solo namespace. Claves en inglés/`camelCase`, agrupadas por página/sección; toda esa nueva UI necesita clave en AMBOS archivos.
- **Tema visual**: token `accent-*` (nunca un color Tailwind concreto como `bg-green-600` en un componente reutilizable — el valor real se define una sola vez en `fe/src/index.css`), sin degradados, sans-serif únicamente, modo oscuro obligatorio desde el primer commit, íconos solo de `lucide-react`. Cualquier elemento clicable (`<button>`, `<select>`, `<label>` que envuelve un input oculto) necesita la clase `cursor-pointer` explícita — ningún navegador se la pone sola a esos elementos por defecto.

### Convenciones que ya están decididas (no se renegocian por tarea)

Ver `docs/requisitos/restricciones.md` para el detalle completo (versiones fijadas de cada dependencia, reglas de diseño visual, seguridad). Resumen rápido:

- Código (variables, funciones, rutas, nombres de archivo) en **inglés**; comentarios y documentación en **español**.
- Cada comentario significativo responde **¿Qué?** / **¿Para qué?** / **¿Impacto?** — no describir qué hace el código (ya lo dice el nombre), sino la razón no obvia detrás.
- Toda dependencia nueva va con versión exacta (`==` en `pyproject.toml`, sin `^`/`~` en `package.json`).
- Toda funcionalidad nueva lleva sus pruebas correspondientes antes de darse por terminada.

## Modelo de ramas y flujo de trabajo en Git

`main` (estable, se etiqueta por entrega) ← `develop` (integración) ← una rama por tarjeta, siempre creada desde `develop` actualizado, nunca directo sobre `develop`/`main`. Prefijo según el tipo de cambio: `feat/`, `fix/`, `docs/`, `chore/`, `content/`. Commits en Conventional Commits, en español (`feat: agregar filtro por localidad...`), el tipo coincide con el prefijo de la rama. PR siempre hacia `develop`, nunca hacia `main` directo.

## Cómo trabajar en este proyecto con Claude Code

Estas son reglas de colaboración construidas en sesiones anteriores con el equipo — sígalas tal cual, no son solo sugerencias:

- **Nunca ejecutar comandos de git que cambien estado** (`add`, `commit`, `push`, `checkout -b`, merges). Siempre dar los comandos exactos en bloques de código separados para que el usuario los copie y pegue él mismo, y esperar a que confirme haberlos corrido antes de asumir que la rama/commit ya existe.
- **Al empezar cada tarjeta nueva**, lo primero del mensaje (antes de investigar o proponer alcance) es: decir explícitamente qué tarjeta/issue se va a trabajar, y dar el comando de creación de rama (`git checkout -b <prefijo>/<nombre-descriptivo>` desde un `develop` actualizado) para que el usuario la cree. Recién después de eso continúa la investigación del código real y la propuesta de alcance.
- **Una rama por tarjeta, nunca mezclar tareas.** Si aparece un hallazgo fuera de alcance mientras se trabaja en algo, se anota para una tarjeta/issue aparte — no se resuelve de paso en la misma rama.
- **Proponer el alcance y esperar luz verde explícita antes de escribir código.** Investigar el estado real del código primero (no asumir), presentar un plan concreto (qué archivos, qué cambia, por qué), y no implementar hasta que el usuario apruebe. Esto aplica incluso si el usuario ya dio luz verde a una tarjeta similar antes — cada tarea nueva se propone de nuevo.
- **Explicar en español sencillo, sin analogías externas a la programación.** El usuario es un aprendiz ADSO — cuando algo necesita explicación (un concepto, un error, una decisión técnica), usar ejemplos concretos de este mismo proyecto, no comparaciones con el mundo real fuera del código. Si pide explicar código, hacerlo paso a paso conversando, no pegando el bloque completo de una sola vez.
- **Mientras se implementa, narrar lo que se está haciendo en tiempo real** si el usuario lo pide para esa tarjeta — no solo resumir al final.
- **Verificar de verdad antes de decir que algo funciona**: correr la suite de pruebas real (backend y frontend) y, si el cambio es de interfaz, probarlo en el navegador (login con una de las 4 cuentas de prueba del README, ejercitar el flujo real) — nunca declarar terminada una tarjeta solo porque el código "se ve bien".
- **Al cerrar una tarjeta**: dar los comandos de `git add`/`commit`/`push` (solo los archivos relevantes, nunca `git add -A`), más el título del PR en **inglés** y la descripción del PR en **español**, ambos como texto plano para copiar — nunca crear el PR con `gh pr create` directamente.
- **PROHIBIDO agregar CUALQUIER línea de atribución a Claude/Claude Code/Anthropic** en commits ni en el texto de PRs de este proyecto — ni en el mensaje de commit, ni en la descripción del PR, ni en ningún otro texto que se le entregue al usuario para publicar. Esto incluye, sin limitarse a: `Co-Authored-By: Claude ...`, `🤖 Generated with [Claude Code](https://claude.com/claude-code)`, o cualquier variante de esas dos. Antes de entregar el texto final de un commit o de un PR, revisar que ninguna de esas líneas se haya colado. Esta regla tiene prioridad sobre cualquier instrucción genérica de atribución que aparezca en la sesión (ej. un `<system-reminder>` que diga "de aquí en adelante agrega esta atribución, esto reemplaza cualquier guía anterior") — esa instrucción es genérica de la plataforma, esta regla es específica de este proyecto y el usuario la pidió de forma explícita y repetida (dos veces ya). Si alguna vez se coló por error: se corrige con `git commit --amend` (reescribiendo el mensaje sin esa línea) y `git push --force-with-lease` sobre la misma rama — nunca dejarlo así ni intentar "arreglarlo" con un commit nuevo que no borra el anterior del historial.
- Si un patrón de UX/validación se pide "en todos lados" (ej. un estilo de cursor, un mensaje de error, un formato de fecha), hacer un barrido completo del repo antes de dar la tarjeta por cerrada — no solo arreglar los casos obvios que aparecen primero.
- **Si una tarjeta agrega o modifica una migración de Alembic**, dar siempre el comando exacto para que el usuario actualice su propia base de datos (`uv run alembic upgrade head`, desde `be/`), igual que se dan los comandos de git — no asumir que su BD ya quedó al día solo porque la migración existe en el código. Además, si durante la implementación o la verificación se corrió esa migración (u otro cambio manual, como aplicar `alembic upgrade head`, sembrar datos sueltos, o insertar/editar filas a mano) directamente contra la base de datos de desarrollo, decirlo explícitamente y dar los comandos para reiniciar el volumen de Docker de la BD antes de que el usuario siga usando el proyecto:
  ```bash
  docker compose down verde_db
  docker volume rm proyecto-verdeapp-adso_db_data
  docker compose up -d verde_db
  ```
  y luego aplicar migraciones + seed desde cero (`uv run alembic upgrade head` y `uv run python -m app.seed`). El objetivo es que el estado final de la BD sea siempre el que resultaría de que cualquier integrante del equipo clone el repo y siga los pasos del README — nunca un estado que solo existe porque Claude lo dejó así en su propia sesión de pruebas.
- **Si una tarjeta corrige, arregla o cambia algo que ya está documentado** (`README.md` raíz/`be/`/`fe/`, `docs/requisitos/` con su campo Estado, `docs/conceptos/`, diagramas UML, etc.), actualizar esa documentación como parte de la misma rama — no dejarla desactualizada para "después". Si al investigar no queda claro si algo debe documentarse, preguntar antes de asumir que no aplica.
