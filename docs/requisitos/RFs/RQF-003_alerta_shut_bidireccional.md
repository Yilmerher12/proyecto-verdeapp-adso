# RQF-003 — Alerta SHUT Bidireccional

<!--
  ¿Qué? Requisito funcional que define las notificaciones entre residentes y recicladores sobre el estado del depósito (SHUT).
  ¿Para qué? Coordinar la recolección de residuos de forma oportuna y evitar la acumulación excesiva.
  ¿Impacto? Optimiza el tiempo del reciclador y mantiene la limpieza del conjunto residencial.
-->

---

## Identificación

| Campo         | Valor                   |
| ------------- | ----------------------- |
| **ID** | RQF-003                 |
| **Nombre** | Alerta SHUT Bidireccional|
| **Módulo** | Notificaciones          |
| **Prioridad** | Alta                    |
| **Estado** | Por implementar         |
| **Usuarios** | reciclador, residente   |

---

## Descripción

El sistema debe permitir al 'Residente' notificar que el SHUT está lleno y al 'Reciclador' notificar que el SHUT ha sido vaciado. Ambas acciones deben disparar notificaciones exclusivas a los usuarios del rol opuesto dentro del mismo conjunto.

---

## Entradas

| Campo         | Tipo   | Obligatorio | Validaciones                                                                 |
| ------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `conjunto_id` | Número | Sí          | Debe ser un ID de conjunto válido en el sistema                              |
| `accion`      | Enum   | Sí          | Valores permitidos: `llenar`, `vaciar`                                       |

---

## Proceso

1. Un **Residente** ingresa al sistema y presiona el botón "SHUT Lleno".
2. El frontend envía una petición al backend indicando la acción `llenar` para el `conjunto_id` al que pertenece el residente.
3. El backend verifica la asociación del usuario con el conjunto y cambia el estado del SHUT en la base de datos a "lleno".
4. El sistema busca todos los usuarios con rol **Reciclador** asociados a ese mismo `conjunto_id`.
5. Se dispara una notificación a los recicladores encontrados.
6. Posteriormente, el **Reciclador** recoge los residuos y presiona el botón "SHUT Vaciado".
7. El frontend envía la petición con la acción `vaciar`.
8. El backend actualiza el estado del SHUT a "vacío".
9. Se busca a los **Residentes** del `conjunto_id` y se les envía una notificación confirmando el vaciado.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Alerta enviada      | 200         | `{"message": "Alerta enviada exitosamente a los usuarios correspondientes."}`                                |
| Conjunto no existe  | 404         | `{"detail": "El conjunto asociado no existe."}`                                                              |
| Usuario no asociado | 403         | `{"detail": "No tiene permisos para enviar alertas en este conjunto."}`                                      |

---

## Endpoints asociados

| Método | Ruta                              | Auth requerida | Descripción                                      |
| ------ | --------------------------------- | -------------- | ------------------------------------------------ |
| POST   | `/api/v1/alertas/shut`            | Sí             | Emite la alerta de SHUT (lleno/vaciado)          |

---

## Reglas de negocio

- RN-001: Un residente no puede enviar la alerta "SHUT Lleno" si el estado actual del SHUT ya es "lleno".
- RN-002: Las notificaciones solo deben llegar a los usuarios del rol opuesto que pertenezcan estrictamente al mismo conjunto residencial.
