# HU-051 — Admin de Conjunto pide que le asignen otro conjunto desde su panel

<!--
  ¿Qué? Historia de usuario de la fila "Solicitar otro conjunto" del panel
        principal del Admin de Conjunto (issue #491).
  ¿Para qué? Dejar escrito cómo un Admin de Conjunto que ya tiene cuenta pide
             administrar otro conjunto, sin repetir el registro.
  ¿Impacto? Es solo información y un mensaje de contacto: la asignación la
            sigue haciendo el Administrador del Sistema (HU-024).
-->

---

## Identificación

| Campo             | Valor                                                              |
| ------------------ | ------------------------------------------------------------------- |
| **ID**             | HU-051                                                              |
| **Título**         | Admin de Conjunto pide que le asignen otro conjunto desde su panel   |
| **Módulo**         | Administración / Conjuntos                                           |
| **Prioridad**      | Media                                                                |
| **Estado**         | Implementada                                                         |
| **RF asociados**   | RQF-012                                                              |

---

## Historia

**Como** Administrador de Conjunto,
**quiero** encontrar en mi panel cómo pedir que me asignen otro conjunto,
**para** no tener que adivinar a quién escribirle ni qué documentos preparar.

---

## Criterios de aceptación

### CA-051.1 — La fila "Solicitar otro conjunto"

- **Dado que** inicié sesión como Administrador de Conjunto,
- **cuando** abro mi panel principal,
- **entonces** veo, debajo de la lista de mis conjuntos, una fila con borde punteado "Solicitar otro conjunto" con la ayuda "Pide que te asignen otro conjunto." Se ve aunque todavía no tenga ningún conjunto asignado.

### CA-051.2 — El paso a paso

- **Dado que** presiono esa fila,
- **cuando** se abre la ventana,
- **entonces** veo tres pasos escritos para quien **ya tiene cuenta** (el tercero dice que el conjunto se asigna a mi cuenta y aparece en el panel), la lista de documentos que debo tener listos y el aviso de que los documentos nunca se suben a VerdeApp.
- **y** la lista de documentos y el aviso de privacidad son **los mismos** que ve quien se registra (RQF-012, `auth.register.adminRequest.*`): al corregirlos, cambian en los dos lugares.

### CA-051.3 — Solicitar acceso

- **Dado que** leí el paso a paso,
- **cuando** presiono "Solicitar acceso",
- **entonces** voy al formulario de contacto (`/contacto?motivo=otro-conjunto`) con el asunto "Solicitud para administrar otro conjunto" y una plantilla del mensaje con los datos que necesita el equipo (mi correo en VerdeApp, nombre y dirección del conjunto, localidad, mi cargo y mi teléfono).
- **y** no puedo enviar la plantilla sin completarla.

### CA-051.4 — El código de acceso a la mano

- **Dado que** despliego uno de mis conjuntos,
- **cuando** miro su contenido,
- **entonces** el **código de acceso** es el primer bloque, antes del NIT y de la cobertura, con sus botones de copiar y de generar un código nuevo (HU-044).

---

## Fuera de alcance

- La solicitud no se crea dentro de VerdeApp ni la aprueba el Administrador del Sistema desde su bandeja: el contacto sigue siendo por correo, y quien asigna el conjunto es el Administrador del Sistema (HU-024).
- Los documentos no se piden ni se guardan en la aplicación.
