# Anexo: mapa de evidencias y simulacro de preguntas

<!-- resumen: Dónde está la evidencia de cada uno de los 14 criterios de la revisión, un simulacro de preguntas con respuestas cortas, las cifras clave y lo que falta actualizar antes de presentar. -->

## Cómo usar este anexo

Los once documentos anteriores explican el proyecto. Este anexo sirve para **prepararse y presentar**. Tiene cinco partes:

1. **El mapa de evidencias:** para cada criterio de la revisión, qué documento y qué archivo lo demuestra, y en qué estado está **de verdad**.
2. **Una ruta de estudio** de tres días.
3. **El simulacro de preguntas**, con respuestas cortas y el documento donde profundizar.
4. **Las cifras clave**, para tenerlas a la mano (con su fecha y cómo comprobarlas).
5. **Lo que falta actualizar** antes de presentar.

**Una regla para toda la presentación:** si no sabes algo, **dilo y explica dónde está**. Los profesores hacen de clientes: valoran más una limitación bien explicada que una respuesta inventada.

## 1. El mapa de evidencias

Los 14 criterios son los de la lista que dieron los profesores. La lista de chequeo de la que salen (trimestre 6, oferta abierta, repositorio `checklist-proyectos-adso` de `ergrato-dev`) trae algunos ítems más, que aparecen al final de esta parte. El **estado** significa:

- **Cumple:** hay evidencia completa y comprobada.
- **Parcial:** hay evidencia, pero con un límite que debes poder explicar.
- **Pendiente:** falta algo, o hay que aclararlo con los profesores.
- **No se hace:** decisión tomada.

| # | Criterio | Estado | Dónde está la evidencia | Qué debes poder explicar |
|---|---|---|---|---|
| 1 | Conclusión de la documentación general (diagramas, modelos, MER, MR, UML, casos de uso, clases) | **Cumple** | `docs/referencia-proyecto/diagramas-UML/` (4 archivos) y el documento 10 | Qué pregunta responde cada diagrama; las 30 tablas; que el MR se generó desde el código |
| 2 | Informes de Scrum (backlog, sprints, historias puntuadas, tareas asignadas, poker) | **Parcial** | `docs/gestion-proyecto/scrum-resumen.md`, `informes-scrum/` (4 informes), `prioridad-y-tamano.md`, `calculo-horas.md` y el documento 4 | Que hay 53 historias puntuadas y un método de estimación. **Límites:** no hay evidencia escrita de planning poker, y `scrum-resumen.md` aún lista solo las semanas 1 a 3 |
| 3 | Inicialización del backend sin errores (mensajes, estados, variables de entorno) | **Cumple** | `docs/despliegue.md` secciones 1 y 4, `test_config.py` y los documentos 5 y 11 | El orden de arranque y que el backend **se niega a arrancar** con una configuración mala, diciendo por qué |
| 4 | Variables de entorno y despliegue apropiado (back, front) | **Parcial** | `docs/despliegue.md`, `be/.env.example`, `fe/.env.example` y el documento 5 | Las variables están bien manejadas y el modo producción se probó en local. **Límite:** no hay despliegue real (deuda DT-03) |
| 5 | Diagrama de arquitectura | **Cumple** | `docs/arquitectura.md` (5 diagramas) y el documento 2 | Las tres capas, el recorrido de una petición y qué se aplicó de lo aprendido |
| 6 | Bonificación IoT | **No se hace** | `docs/gestion-proyecto/propuesta-tecnica.md` | Que está fuera de alcance por decisión del equipo, porque exige hardware |
| 7 | Plan de pruebas (alcance, niveles, ambiente separado) | **Cumple** | `docs/pruebas/plan-de-pruebas.md` y el documento 3 | Los seis niveles y que la base de pruebas está separada de la de desarrollo |
| 8 | Informe de pruebas unitarias (≥ 20 casos distintos) | **Cumple** | `docs/pruebas/informe-pruebas-automatizadas.md` (42 casos) | Qué verifica un caso de ejemplo y a qué requisito responde |
| 9 | Reporte de ejecución y defectos con severidad y estado | **Cumple** | `docs/pruebas/reporte-ejecucion-y-defectos.md` (36 defectos cerrados, 0 abiertos) | La escala de severidad y el ciclo de un defecto (D-35 y D-36) |
| 10 | Frontend (pantallas, enrutamiento, navegación, colores, UX, UI) | **Cumple** | Documentos 7 y 9, `docs/requisitos/restricciones.md`, `auditoria-rnf-003-*.md` | El menú por rol, las guardas, la paleta, WCAG AA y que se auditó el contraste |
| 11 | README con sección de pruebas; API del 4.º backend documentada | **Parcial** | `README.md` (sección «Pruebas y cobertura»), `docs/api.md` (104 endpoints) y el documento 11 | **Límites:** dos instrucciones del README no coinciden con el código (clave secreta y `DATABASE_URL`, ver el documento 11), y hay que aclarar con los profesores a qué backend se refiere «4.º» |
| 12 | Manejo del repositorio con ramas y commits | **Cumple** | `docs/gestion-proyecto/uso-de-git.md`, el modelo de ramas del README y el documento 4 | El camino `rama → develop → stg → main`, Conventional Commits y las cifras reales. **Límites:** sin etiquetas de versión y con protecciones de rama parciales |
| 13 | Feedback del equipo, trabajo dividido y asignación de tareas | **Cumple** | `retrospectiva-equipo.md`, `informes-scrum/` y el documento 4 | El reparto **desigual** dicho con honestidad, sus causas y los cuatro acuerdos de mejora |
| 14 | Reflexión comparativa de los 4 backends; deuda técnica priorizada | **Parcial** | `docs/gestion-proyecto/deuda-tecnica.md` (13 puntos) y el documento 5 | La deuda técnica está documentada y priorizada. **Pendiente:** la reflexión comparativa, hasta aclarar con los profesores a qué backends se refieren (documento 5, sección 8) |

### 1.1 Otros ítems de la lista de chequeo del trimestre 6

La lista de chequeo trae ítems que no están en los 14 criterios, y conviene saber en qué estado están:

| Ítem de la lista | Estado | Nota |
|---|---|---|
| Visión de cierre: qué queda terminado y qué se lleva al siguiente trimestre, con honestidad | **Cumple** | Documento 5 (estado, deuda y límites) |
| Retrospectiva con reflexión explícita sobre el proceso de pruebas | **Parcial** | La retrospectiva habla del equipo; las semanas del bootcamp están en los informes (documento 4) |
| Matriz de ≥ 20 casos con datos, pasos y resultado esperado frente al obtenido | **Parcial** | Los 42 casos dicen qué verifican y su resultado, pero no traen datos ni pasos |
| Pruebas unitarias automatizadas con ≥ 50 % de cobertura **y una colección Postman con tests** | **Parcial** | La cobertura es de 97 % en el backend, pero no hay colección Postman: la API se prueba con `pytest` y se documenta con Swagger |
| ≥ 2 defectos con ciclo detectar → corregir → verificar demostrado | **Cumple** | Los 36 defectos del registro; dos explicados en el documento 3 |
| Commits que distinguen construcción de corrección de defectos | **Cumple** | Conventional Commits: `feat:` frente a `fix:` (documento 4) |
| Linter sin errores críticos | **Cumple** | `ruff`, `eslint` y `tsc` sin errores (documento 3) |

## 2. Una ruta de estudio de tres días

Los documentos son largos. Este orden pone primero lo que se necesita para entender y correr el proyecto:

| Día | Qué estudiar | Para qué |
|---|---|---|
| **Día 1** | Documentos **1** (el proyecto), **2** (cómo funciona) y **11** (guía para correr) | Entender qué es VerdeApp, cómo está hecha y **ponerla a funcionar en tu computador** |
| **Día 2** | Documentos **3** (seguridad y calidad), **6** (datos), **7** (estándares) y **10** (diagramas) | Poder defender las decisiones técnicas y los datos |
| **Día 3** | Documentos **4** (cómo trabajamos), **5** (estado y mejoras), **8** (investigaciones) y **9** (frontend), y el simulacro de la parte 3 de este anexo | Poder hablar del proceso, de los límites y practicar las respuestas |

**Cómo estudiar cada documento:** léelo; cierra el archivo; responde **en voz alta** las cinco o siete preguntas de «Lo que debes saber explicar»; y revisa solo lo que no supiste.

**El simulacro entre los cuatro (30 minutos):** uno hace de profesor y pregunta, otro responde, y los otros dos escuchan y completan lo que falte. Rotan cada 10 minutos. Si a alguien le toca responder algo que no sabe, no se corrige de inmediato: se anota para repasar.

## 3. El simulacro de preguntas

Las respuestas son **cortas** a propósito: son el punto de partida. Cada pregunta indica el documento donde está explicada a fondo.

### 3.1 El proyecto

**1. ¿Qué es VerdeApp y qué problema resuelve?** *(Doc. 1)*
Una aplicación web para conjuntos residenciales de Bogotá que conecta a residentes, recicladores y administradores. Resuelve cinco problemas: el reciclador no sabe si el SHUT está lleno, el residente no sabe cuándo pasa, nadie mide si se separa bien, nadie enseña qué hacer distinto, y la administración no tiene un canal oficial.

**2. ¿Cuáles son los roles y qué hace cada uno?** *(Doc. 1)*
Residente (avisa el SHUT lleno y estudia), Reciclador (avisa su llegada y califica el conjunto), Administrador de Conjunto (invita recicladores, publica comunicados, ve el desempeño) y Administrador del Sistema (supervisa la plataforma y administra el contenido).

**3. ¿Qué pasa desde que un residente reporta el SHUT lleno hasta que se califica el conjunto?** *(Doc. 1)*
El aviso llega a los recicladores autorizados y a los administradores del conjunto; el reciclador avisa que llegó, vacía el SHUT, y califica el conjunto con un nivel y de 1 a 3 fotos. Si sale Regular o Malo, los residentes reciben la recomendación de la lección del tema que falló.

**4. ¿Por qué el reciclador califica al conjunto y no a cada residente?** *(Doc. 1)*
Porque no hay forma de saber qué apartamento entregó qué bolsa. Calificar a una persona sin pruebas sería injusto; calificar al conjunto con fotos sí se puede sostener.

**5. ¿Qué no hace todavía y por qué?** *(Doc. 1)*
No hay app móvil nativa (la web se adapta al celular), ni chat en tiempo real (exige que alguien conteste al momento), ni calificación del residente al reciclador (riesgo de calificaciones malintencionadas), ni IoT (exige hardware), ni chatbot (costo, seguridad y datos personales).

**6. ¿Cómo se conectan «medir» y «enseñar»?** *(Doc. 1)*
La auditoría que mide cómo se separa dispara la recomendación automática de la lección del tema calificado, comparando el nombre del tema con el de la categoría. No usa inteligencia artificial.

### 3.2 Arquitectura y tecnología

**7. ¿Cuáles son las capas del sistema?** *(Doc. 2)*
Frontend (React, lo que ve la persona), backend (FastAPI, las reglas y la API) y base de datos (PostgreSQL). Solo el backend toca la base de datos.

**8. ¿Qué pasa cuando alguien envía una auditoría?** *(Doc. 2)*
El backend revisa el origen y el límite de peticiones, identifica al usuario por el token de la cookie, comprueba el rol, valida los datos con Pydantic, el servicio aplica las reglas de negocio, guarda todo en una transacción y responde por un esquema de salida.

**9. ¿Por qué las reglas están en el backend y no en el frontend?** *(Doc. 2)*
Porque el frontend corre en el computador de la persona y se puede modificar, y cualquiera puede llamar a la API sin pasar por él. El frontend solo guía; el backend protege.

**10. ¿Por qué FastAPI y PostgreSQL?** *(Doc. 2)*
FastAPI valida y documenta a partir de los mismos tipos que escribimos, y encaja con un frontend aparte. PostgreSQL porque nuestros datos están muy relacionados y necesitamos integridad y transacciones; se usa el mismo motor en todos los entornos.

**11. ¿Qué es una migración y por qué no `create_all()`?** *(Doc. 2)*
Es un archivo versionado que describe un cambio en la base y cómo deshacerlo. `create_all()` solo crea las tablas que faltan y no modifica las existentes, así que no sirve para evolucionar una base con datos.

**12. ¿Por qué UUID versión 4?** *(Doc. 7)*
Para que nadie pueda adivinar un identificador probando números consecutivos. Se cambió del v7 al v4 por pedido del profesor evaluador, porque el v7 guarda la fecha de creación dentro del identificador.

### 3.3 Seguridad

**13. ¿Cómo protegen las contraseñas?** *(Doc. 3)*
Nunca se guardan: se guarda un hash con bcrypt, lento y con sal. Reglas: mínimo 8 caracteres con mayúscula, minúscula y número.

**14. ¿Cómo funciona la sesión?** *(Doc. 3)*
Con dos tokens firmados en cookies `httpOnly` y `SameSite=Strict`: uno de acceso de 15 minutos y uno de renovación de 7 días que sirve una sola vez. Al cerrar sesión, el token se anota como revocado, y cambiar la contraseña invalida todos los tokens anteriores.

**15. ¿Cómo evitan la fuerza bruta?** *(Doc. 3)*
Con dos defensas: un límite de peticiones por dirección IP (por ejemplo, 10 por minuto en el inicio de sesión) y un bloqueo de la cuenta de 15 minutos tras 5 intentos fallidos.

**16. ¿Cómo evitan que se descubra qué correos están registrados?** *(Doc. 3)*
El mensaje de error es siempre el mismo, un registro con correo existente responde igual que uno nuevo, y el código siempre calcula la comparación de bcrypt para que el tiempo de respuesta sea igual.

**17. ¿Cómo validan las fotos que suben?** *(Doc. 3)*
Pillow abre el archivo para comprobar que de verdad es una imagen; máximo 5 MB y 25 millones de píxeles, solo JPG, PNG o WEBP, y una cuota de subidas por usuario.

**18. ¿Qué tan segura es la aplicación frente al OWASP Top 10?** *(Doc. 3)*
Se revisó contra las 10 categorías, se corrigieron los huecos hallados (por ejemplo, un ataque de temporización en el inicio de sesión) y se escribieron pruebas. Reconocemos que no hay autenticación de dos factores, HTTPS propio ni una prueba de penetración profesional.

### 3.4 Pruebas y calidad

**19. ¿Cuántas pruebas tienen y qué cobertura?** *(Doc. 3)*
Según los últimos registros: 1046 pruebas en el backend con 97,54 % de cobertura, 1127 en el frontend con 89,42 % y 2 pruebas E2E. Son cifras que cambian cada semana: antes de citarlas, vuelve a correrlas.

**20. ¿Qué es la cobertura y por qué el umbral solo sube?** *(Doc. 3)*
Es el porcentaje de líneas de código que las pruebas ejecutan. El umbral solo sube para que el avance no se pierda: si un cambio baja la cobertura, la integración continua falla.

**21. ¿Qué hace la integración continua?** *(Doc. 3)*
En cada Pull Request corre `ruff`, `pytest` (contra una base PostgreSQL temporal), `pip-audit`, `tsc`, `eslint`, `vitest`, la compilación de producción y `pnpm audit`. Si algo falla, el cambio no se integra.

**22. ¿Cómo manejan los defectos?** *(Doc. 3)*
Cada defecto se registra con severidad y estado, se corrige en una rama `fix/` con una prueba que lo habría detectado y se integra por Pull Request. Hay 36 defectos cerrados y 0 abiertos; ejemplo: D-36, que rompía el formulario al quitar una foto.

**23. ¿El ambiente de pruebas está separado del de desarrollo?** *(Doc. 3)*
Sí: una base de datos propia (`verdeapp_test_db`, en su propio contenedor), armada con las mismas migraciones, y cada prueba corre dentro de una transacción que se deshace.

**24. ¿Por qué solo 2 pruebas E2E?** *(Doc. 3)*
Son lentas y frágiles, y los flujos críticos ya se cubren con pruebas de API contra una base real y de componentes. Está anotado como deuda técnica y el bootcamp contempla agregar más.

**25. ¿Qué es el bootcamp de testing y cómo lo organizan?** *(Docs. 3 y 4)*
Un reto semanal de pruebas del instructor. Cada integrante rota de capa (Front, API, BD o E2E) y quien revisa un PR trabajó en otra capa esa semana.

### 3.5 Datos y fuentes

**26. ¿De dónde sacaron los conjuntos y los puntos de acopio?** *(Doc. 6)*
Los 14.515 conjuntos, del servicio «Propiedad Horizontal» de la Secretaría de Gobierno en Datos Abiertos Bogotá (noviembre de 2025). Las 799 ECA, del inventario que nos entregó la UAESP (Resolución 698 de 2023).

**27. ¿Qué entregó la UAESP y qué no?** *(Doc. 6)*
Entregó 799 ECA con organización, coordenadas, dirección y localidad. No entregó teléfono, horario, estado de funcionamiento ni fecha de corte; «vigente» significa registrada en el acto administrativo, no que esté abierta.

**28. ¿Qué hicieron cuando el dato tenía dudas?** *(Doc. 6)*
Le preguntamos a la entidad que lo emite. Hicimos tres peticiones a la UAESP; las dos primeras fueron respondidas por un oficio y la tercera (radicado 20267000909842) está pendiente. Mientras tanto no se oculta ni se cambia nada.

**29. ¿Qué hicieron con los datos personales?** *(Docs. 6 y 7)*
No guardamos el nombre de contacto de los conjuntos, los correos de las organizaciones van en un archivo que no se sube al repositorio, los documentos de los administradores se eliminan al terminar la revisión y los oficios no se guardan. Se aplica la Ley 1581 de 2012.

**30. ¿Pueden usar los datos de la UAESP?** *(Doc. 6)*
Sí, citándola como fuente, sin alterar los datos, cumpliendo la Ley 1712 de 2014 y la protección de datos, y sin fines comerciales.

### 3.6 Estándares y diseño

**31. ¿Cómo manejan las fechas?** *(Doc. 7)*
Se guardan en UTC y se muestran con el formato del idioma elegido en la app (español de Colombia o inglés de Estados Unidos), no el del navegador. Bogotá está en UTC-5.

**32. ¿Qué nivel de accesibilidad buscan?** *(Doc. 7)*
WCAG 2.1 AA: HTML semántico, el color nunca como única señal, contraste mínimo de 4,5 a 1 en texto, uso completo con teclado y áreas táctiles de 44 píxeles. Se auditó todo el frontend y se corrigieron 10 huecos.

**33. ¿Cómo evitan que alguien rompa el diseño?** *(Doc. 7)*
Con pruebas automáticas que recorren todo el frontend y cuentan los casos que incumplen (botones escritos a mano, colores sueltos, textos de menos de 11 px). El conteo permitido es cero, y funcionan como un «trinquete»: solo puede mejorar.

**34. ¿Por qué todas las pantallas usan los mismos componentes?** *(Doc. 9)*
Para que la aplicación sea consistente y para poder cambiar el diseño en un solo lugar. Hay un único `Button`, un único `InputField`, un único `Modal`.

### 3.7 Equipo y proceso

**35. ¿Cómo aplican Scrum?** *(Doc. 4)*
Con sprints semanales, una tarjeta por persona, un Scrum Master que rota cada semana y un informe al cierre. El backlog son los issues de GitHub, con un tablero con prioridad y tamaño.

**36. ¿Cómo estiman?** *(Doc. 4)*
Cada tarjeta lleva importancia, complejidad, prioridad (Must, Should, Could) y tamaño de XS a XL en horas. La capacidad mínima es de 2 horas por día por integrante. Son estimaciones a ojo, que se comparan con las horas reales.

**37. ¿Cómo usan Git?** *(Doc. 4)*
Una rama por tarjeta desde `develop`; `develop` pasa a `stg` y de ahí a `main`, con el CI en cada paso. Commits con Conventional Commits y Pull Request con título en inglés y descripción en español.

**38. ¿Por qué el reparto del trabajo no fue igual?** *(Doc. 4)*
Porque la asignación por persona empezó tarde (12 de octubre) y hubo limitaciones de equipo y de tiempo de algunos integrantes. Lo reconocemos y propusimos cuatro acuerdos: avisar a tiempo, anotar la rotación del Scrum Master, comprobar el entorno el primer día y registrar las revisiones en el PR.

**39. ¿Hacen revisión de código?** *(Doc. 4)*
Sí, con límites. En el bootcamp hay revisión cruzada de otra capa, pero solo unos pocos PR tienen una revisión registrada en GitHub, y solo `stg` obliga a que haya una. Es un punto a mejorar.

### 3.8 Estado y límites

**40. ¿VerdeApp está en un servidor público?** *(Doc. 5)*
No. Corre en Docker en los equipos del equipo. Está preparada para desplegarse (configuración por variables de entorno, modo producción probado en local), pero faltan el servidor, el dominio y HTTPS.

**41. ¿Por qué dos requisitos no funcionales figuran como parciales?** *(Doc. 5)*
La disponibilidad (99,9 %) y el tiempo de respuesta (menos de 2 segundos) solo se pueden medir en un servidor real. Además, el requisito de disponibilidad pide copias de seguridad automáticas, que todavía no están configuradas.

**42. ¿Qué es la deuda técnica de su proyecto?** *(Doc. 5)*
Trece puntos priorizados: 2 Must (preparar la infraestructura y desplegar), 8 Should y 3 Could. Por ejemplo, el chequeo de salud no revisa la base de datos y los límites de peticiones viven en la memoria del programa.

**43. ¿Qué harían con más tiempo?** *(Doc. 5)*
Publicar el sistema para medir disponibilidad y tiempo de respuesta, configurar copias de seguridad automáticas, reforzar las pruebas E2E, activar las protecciones de rama y mostrar las ECA en un mapa.

### 3.9 Preguntas incómodas

**44. ¿Por qué una sola persona tiene casi todos los commits y Pull Requests?**
Es la pregunta sobre el reparto del trabajo (pregunta 38). Responde con los hechos (los números están en el documento 4), sin culpar a nadie, con las causas y con los acuerdos de mejora. No intentes esconder los números: están en GitHub y los profesores los pueden ver.

**45. ¿Usaron inteligencia artificial para programar?**
*Esta respuesta la deben acordar los cuatro antes de presentar.* Hay datos objetivos que ayudan: el repositorio tiene reglas escritas de trabajo con asistentes de IA (en `CLAUDE.md`: una rama por tarjeta, los comandos de Git los ejecuta el integrante, sin líneas de atribución), y varios documentos mencionan su uso. **Lo que sí debe cumplirse en cualquier caso:** cada integrante debe poder explicar el sistema y lo que entrega, y por eso existe este conjunto de documentos de estudio.

**46. ¿Esto sirve de verdad a un conjunto residencial?**
Funciona de punta a punta en nuestros computadores, con datos reales de Bogotá, y resuelve el ciclo avisar, medir y enseñar. Lo que no se ha hecho es probarlo con usuarios reales ni con recicladores: son pasos pendientes que reconocemos (documentos 5 y 8).

**47. ¿Qué pasa si falla la demostración?**
Hay una guía de arranque y de solución de problemas (documento 11), los datos de demostración se pueden volver a cargar desde cero, y conviene tener probado antes cómo se ve sin internet (las tipografías y los videos de las lecciones dependen de la conexión).

**48. ¿Qué aprendieron en el proyecto?**
Cada integrante debe tener su propia respuesta. Ideas para apoyarla: que medir y leer antes de decidir cambia las respuestas (documento 8), que una regla escrita evita volver a discutir, que las pruebas protegen los cambios, y que un dato oficial también tiene que verificarse.

## 4. Las cifras clave

Para tenerlas a la mano. **La columna «Cómo comprobarlo» importa:** varias cifras cambian cada semana.

| Dato | Valor | Fecha | Cómo comprobarlo |
|---|---|---|---|
| Historias de usuario | 53, todas implementadas | 26 nov 2026 | `docs/requisitos/HUs/` |
| Requisitos funcionales | 21, todos implementados | 26 nov 2026 | `docs/requisitos/RFs/` |
| Requisitos no funcionales | 6: 4 implementados y 2 parciales | 26 nov 2026 | `docs/requisitos/RNFs/` |
| Endpoints de la API | 104, en 17 routers | 20 nov 2026 | `docs/api.md` |
| Servicios del backend | 16 | 26 nov 2026 | `be/app/services/` |
| Tablas de la base de datos | 30 | 26 nov 2026 | `be/app/models/` |
| Migraciones | 45 | 26 nov 2026 | `be/alembic/versions/` |
| Lecciones educativas | 33, en 8 categorías | 26 nov 2026 | `be/app/data/contenido_educativo.json` |
| Conjuntos residenciales | 14.515 | 27 ago 2026 (consulta) | `be/app/data/` |
| Puntos de acopio (ECA) | 799 | 10 nov 2026 (oficio) | `be/app/data/` |
| Pruebas del backend | 1046, con 97,54 % de cobertura | 24 nov 2026 | `uv run pytest` desde `be/` |
| Pruebas del frontend | 1127, con 89,42 % de cobertura | 23 nov 2026 | `pnpm test` desde `fe/` |
| Pruebas E2E | 2 | 20 nov 2026 | `pnpm test` desde `e2e/` |
| Defectos | 36 cerrados y 0 abiertos | 23 nov 2026 | `docs/pruebas/reporte-ejecucion-y-defectos.md` |
| Deuda técnica | 13 puntos: 2 Must, 8 Should, 3 Could | 26 nov 2026 | `docs/gestion-proyecto/deuda-tecnica.md` |
| Pull Requests integrados | 415 | 26 nov 2026 | `gh pr list --state merged --limit 2000 --json number --jq length` |
| Issues | 271 (255 cerrados y 16 abiertos) | 26 nov 2026 | Pestaña *Issues* de GitHub |
| Commits en `develop` | 892, de los cuales 473 son cambios reales | 26 nov 2026 | `git rev-list --count origin/develop` |
| Umbral de cobertura | Backend 97 %; frontend 89, 87, 84 y 83 | 26 nov 2026 | `be/pyproject.toml` y `fe/vite.config.ts` |
| Estimación original de costos | $14.575.000 COP | — | `docs/gestion-proyecto/costos.md` |

## 5. Lo que falta actualizar antes de presentar

Esta lista junta los pendientes que fueron apareciendo al escribir los documentos. Están ordenados por qué tan urgentes son.

### 5.1 Antes de presentar

| # | Qué | Por qué | Dónde |
|---|---|---|---|
| 1 | **Preguntarle al profesor** a qué se refieren «los 4 backends del programa» y «el 4.º backend» | Falta la reflexión comparativa (criterio 14) y no se sabe qué API documentar (criterio 11) | Documento 5, sección 8 |
| 2 | **Volver a correr las pruebas** y actualizar las cifras | El bootcamp agrega pruebas cada semana, y los documentos citan 1046 y 1127 | Documento 3, sección 4.3 |
| 3 | **Actualizar `scrum-resumen.md` y `retrospectiva-equipo.md`** con la semana 4 | Ambos listan solo las semanas 1 a 3, y existe `semana-04_yordan.md` | `docs/gestion-proyecto/` |
| 4 | **Corregir dos instrucciones del README** | La clave secreta de ejemplo no funciona «tal cual», y `DATABASE_URL` de ejemplo no es la del Método B | `README.md`, documento 11 |
| 5 | **Actualizar `informe-pruebas-automatizadas.md`** | Sus cifras son del 20 de noviembre (1012 y 1124) y ya hay más pruebas | `docs/pruebas/` |
| 6 | **Regenerar los PDF** de `docs/estudio/` | Para que reflejen las últimas correcciones y las portadas digan el total correcto | `pnpm pdf` en `docs/estudio/herramientas/` |
| 7 | **Hacer commit y Pull Request** de `docs/estudio/` | Hoy nada de esto está commiteado | Rama `docs/documentos-de-estudio` |
| 8 | **Acordar la respuesta** sobre el uso de inteligencia artificial | Es una pregunta probable (pregunta 45) | Entre los cuatro |

### 5.2 Cuando ocurra

| Qué | Cuándo | Qué hacer |
|---|---|---|
| **Respuesta de la UAESP a la tercera petición** (radicado 20267000909842) | Hacia finales de noviembre o principios de diciembre de 2026 | Anotarla en `fuente-datos-puntos-acopio-eca.md` y decidir qué hacer con las chatarrerías, depósitos y bodegas |
| **Integración de la rama de la paleta nueva** (`feat/aplicar-paleta-colores`) | Cuando se fusione | Actualizar los documentos 7 y 9 (secciones de colores) y `restricciones.md` |
| **Alerta ignorada de `picomatch`** | A más tardar el 2 de diciembre de 2026 | Quitar la regla de `fe/pnpm-workspace.yaml` si ya hay una versión corregida |
| **Aprobación de las decisiones pendientes** | Cuando el grupo y el profesor las revisen | Plazo de 6 meses para las fotos de evidencia y decisión sobre la calificación del residente al reciclador |

### 5.3 Los límites que conviene tener claros

Para no ser sorprendido en la presentación, estos son los límites **reconocidos**:

- No hay despliegue real, ni HTTPS, ni copias de seguridad automáticas.
- Hay pocas pruebas E2E, y no hay pruebas de carga ni con usuarios reales.
- El reparto del trabajo fue desigual.
- Hay pocas revisiones registradas en GitHub, y las protecciones de rama son parciales.
- No hay etiquetas de versión.
- La reflexión comparativa de los backends está pendiente de aclarar.
- No hay colección Postman.

## Glosario

- **Backlog:** lista de todo lo que falta por hacer, ordenada por importancia.
- **Criterio:** cada punto de la lista con la que los profesores evalúan el proyecto.
- **Deuda técnica:** cosas que funcionan hoy pero que conviene mejorar antes de crecer o publicar.
- **Evidencia:** un documento o archivo que demuestra que un criterio se cumple.
- **Simulacro:** ensayo de la presentación, con preguntas hechas como las haría un profesor.
- **Trazabilidad:** poder seguir un requisito hasta su código y su prueba.
