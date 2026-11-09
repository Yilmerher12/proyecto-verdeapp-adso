# Decisión: las cuentas del Administrador del Sistema

<!--
  ¿Qué? Registro de cómo se manejarán las cuentas del Administrador del Sistema: la cuenta compartida de hoy,
        qué pasa con ella en producción y qué opciones hay para crear cuentas propias.
  ¿Para qué? Que quien prepare el despliegue (issue #317) sepa que quitar las cuentas de prueba deja la
             aplicación sin ningún administrador del sistema, y tenga ya pensada la salida.
  ¿Impacto? Es solo documentación: no se construye nada ni se cambia el código. El comando de la opción A
            NO existe todavía; su nombre es una propuesta.
-->

**Fecha:** 2026-11-09
**Rama:** `docs/decisiones-rediseno-panel-admin-sistema`
**Relacionado:** issue #596 (rediseño del panel del Administrador del Sistema), issue #317 (preparar la producción, hallazgo CN-001), issue #621 (esta decisión), `be/app/seed.py` y la tabla de cuentas de prueba del `README.md`.

## 1. El problema

Hoy hay **una sola cuenta de Administrador del Sistema**, compartida por todo el equipo de desarrollo:

- Se crea en `be/app/seed.py` con el correo `admin@verdeapp.com`.
- Su contraseña está escrita en el `README.md`, junto a las de las otras tres cuentas de prueba.
- En el código **no hay ninguna forma de crear otra**. El Administrador del Sistema no tiene registro público; el Administrador de Conjunto sí se crea por invitación (HU-018), pero esa invitación la manda un Administrador del Sistema que ya existe.

El issue #317 (preparar el proyecto para un despliegue) pide, en su punto CN-001, que **el seed no corra en producción** y que las cuentas de prueba no existan allá, porque su contraseña es pública. Es una petición correcta, pero tiene una consecuencia que no estaba escrita: **si se quitan las cuentas de prueba, producción queda sin ningún Administrador del Sistema**. Y sin él nadie puede invitar a Administradores de Conjunto, publicar novedades, atender el soporte técnico ni crear contenido educativo.

## 2. Por qué una cuenta compartida no sirve fuera del desarrollo

1. **No se sabe quién hizo qué.** La aplicación ya anota las acciones de un administrador (`log_accion_admin` en `be/app/utils/audit_log.py`, issue #376), pero la anotación lleva el correo de quien la hizo. Con una cuenta compartida, todo queda a nombre de `admin@verdeapp.com`.
2. **La contraseña es pública.** Está en el repositorio. Aunque se cambie después, quedó en el historial de git y hay que darla por comprometida.
3. **Quien deja el equipo se lleva la contraseña.** Cambiarla obliga a avisar a todos, y la cuenta sigue sin tener dueño.

## 3. Las opciones

### A. Un comando de consola que crea la cuenta (propuesto: `uv run python -m app.crear_admin_sistema`)

Seguiría el mismo patrón de los comandos que ya existen (`app.purgar_tokens`, `app.limpiar_adjuntos`, `app.limpiar_evidencias`): se corre a mano, desde `be/`, en el servidor.

- **Cómo funcionaría:** pide el correo y la contraseña **por consola** (no como argumentos, para que no queden en el historial del terminal), aplica las mismas reglas de contraseña de la aplicación, crea el usuario con el rol de Administrador del Sistema ya verificado, y si el correo ya existe no lo duplica.
- **A favor:** es simple y **no agrega ninguna pantalla ni ruta nueva**, así que no abre ninguna puerta por la que atacar. Resuelve el hueco del #317: sirve para crear el primer administrador del sistema de producción.
- **En contra:** exige acceso a la consola del servidor. No sirve para que un administrador cree a otro desde la aplicación.

### B. Invitación desde el panel

Un Administrador del Sistema invita a otro por correo, con el mismo mecanismo que ya existe para invitar a un Administrador de Conjunto (enlace con vencimiento, la persona elige su propia contraseña).

- **A favor:** no hace falta tocar el servidor para sumar a alguien; la persona define su propia contraseña y nunca la ve otra.
- **En contra:** necesita una ruta nueva, una pantalla y correo, y es más superficie para revisar en seguridad. Además **no resuelve el primer administrador**: alguien tiene que existir para invitar, así que igual haría falta la opción A.

### C. Mantener la cuenta compartida

Dejar `admin@verdeapp.com` como está.

- **A favor:** cero trabajo.
- **En contra:** todo lo de la sección 2. Es aceptable solo mientras la aplicación corra únicamente en los computadores del equipo.

## 4. Lo que se decidió

| Situación | Decisión |
| --- | --- |
| **Desarrollo** | Se mantiene la cuenta compartida (opción C). El seed y el `README.md` no cambian. |
| **Producción** | **Una cuenta por persona.** La primera se crea con la opción A. El seed no corre en producción (CN-001) y la cuenta compartida no existe allá. |
| **Invitar a otro administrador del sistema desde el panel** | Opción B, **futura**. Se hablará cuando haya más de una persona administrando en producción. |
| **Registro de acciones** | Ya existe (`log_accion_admin`) y con una cuenta por persona empieza a servir de verdad: dirá quién hizo cada cosa. Mostrarlo dentro del panel queda como idea futura. |

## 5. Qué no se hace en esta tarjeta

- **No se construye el comando** ni se cambia ninguna línea de código. Se deja escrito para que el día que se active el #317 ya esté pensado.
- **No se cambia el seed ni el `README.md`.**
- **No se toca la página "Seguridad"**: sigue en pausa hasta hablarlo con el profesor.

## 6. Qué habría que hacer el día del despliegue

1. Quitar el seed del arranque del backend (`CMD` de `be/Dockerfile`, CN-001 del #317).
2. Construir el comando de la opción A (una tarjeta aparte, cuando se active el #317).
3. Correr el comando una vez por cada persona que vaya a administrar, cada una con su correo y su contraseña propia.
4. Confirmar que `admin@verdeapp.com` no existe en producción. Si por error se sembró, desactivarla y cambiar su contraseña: la que está en el repositorio se da por comprometida.

## 7. Cuándo volver a hablarlo

- Al activar el issue #317 (hay un plan de despliegue).
- Cuando más de una persona vaya a administrar en producción y se quiera sumar gente sin tocar el servidor (opción B).
- Si se decide mostrar el registro de acciones dentro del panel.

## 8. Límites

- La decisión se tomó mientras VerdeApp corre solo en los computadores del equipo: no hay todavía un plan ni un servidor de producción.
- El nombre del comando (`app.crear_admin_sistema`) y su comportamiento son una propuesta: no hay código que los respalde.
- No se revisó con un especialista en seguridad si la opción A cubre todo lo que pedirá el análisis previo al despliegue.

## 9. Texto para dejar en el issue #317

> **Nota sobre la cuenta inicial de producción (issue #621).** El punto CN-001 pide que las cuentas de prueba no existan en producción. Eso incluye a `admin@verdeapp.com`, que es la **única** cuenta de Administrador del Sistema que existe hoy, y en el código no hay otra forma de crear una. Sin ella, producción quedaría sin nadie que pueda invitar Administradores de Conjunto, publicar novedades o atender el soporte. Antes de activar este issue hay que agregar un paso: construir un comando de consola (propuesto: `uv run python -m app.crear_admin_sistema`, que pida el correo y la contraseña) y usarlo para crear la cuenta de cada persona que administrará. La decisión completa, con las opciones que se descartaron, está en `docs/gestion-proyecto/decision-cuentas-administrador-sistema.md`.
