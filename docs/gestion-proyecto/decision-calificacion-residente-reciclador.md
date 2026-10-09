# Decisión — Calificación de los residentes al reciclador

<!--
  ¿Qué? Registro de la decisión sobre si los residentes pueden calificar
        al reciclador (issue #11), con las opciones evaluadas, sus riesgos
        y la alternativa que se propone en su lugar.
  ¿Para qué? Que cualquiera (compañero, instructor, o el equipo dentro de
             unos meses) entienda por qué VerdeApp no tiene esta función,
             sin tener que reconstruir la discusión — y que, si algún día
             se vuelve a proponer, se parta de lo ya analizado.
  ¿Impacto? No cambia código. Deja registrado qué NO hace la plataforma
            y por qué (ver también la tabla de alcance en
            propuesta-tecnica.md).
-->

| Campo          | Valor                                                        |
| -------------- | ------------------------------------------------------------ |
| **Issue**      | [#11](https://github.com/Yilmerher12/proyecto-verdeapp-adso/issues/11) — Diseñar salvaguardas para calificación de residentes al reciclador |
| **Fecha**      | 2026-09-24                                                   |
| **Estado**     | Propuesta — pendiente de aprobación del equipo               |
| **Decisión**   | No implementar la calificación de residentes al reciclador   |

---

## 1. Contexto

Se propuso agregar una **calificación bidireccional**, al estilo de aplicaciones como Uber: hoy el reciclador califica al conjunto, y la idea era que los residentes también pudieran calificar al reciclador.

Lo que ya existe en VerdeApp:

- **El reciclador califica al conjunto** (RQF-009, HU-010): después de recoger, registra una auditoría con el nivel de separación (Bueno / Regular / Malo), el tema y **de 1 a 3 fotos obligatorias** como evidencia (tabla `auditorias_conjunto`).
- **Si la calificación es Regular o Mala**, la app recomienda contenido educativo a los residentes de ese conjunto (RQF-013). Es decir, el sistema ya está diseñado para mejorar la separación **en la fuente**: en cada hogar.
- **El Admin de Conjunto decide qué recicladores trabajan en su conjunto**: los autoriza y puede revocar esa autorización (HU-038, tabla `recicladores_conjuntos`, columna `fecha_revocacion`).

El issue #11 ya advertía el riesgo: *"calificaciones maliciosas sin motivo. Falta definir reglas antes de programar"*. Este documento es ese análisis.

---

## 2. Opciones evaluadas

### Opción A — Calificación con salvaguardas

Permitir que el residente califique al reciclador, pero con reglas para limitar el abuso:

- Un número mínimo de calificaciones antes de mostrar un promedio.
- Mostrar el promedio, no calificaciones individuales.
- Exigir una foto como evidencia, igual que en la auditoría.
- Limitar cada cuánto puede calificar un mismo residente.

**Por qué no es suficiente**, incluso con esas reglas:

1. **La evidencia no es posible en la práctica.** La auditoría del reciclador exige fotos porque él está en el cuarto de basuras cuando califica. El residente, en cambio, casi nunca coincide con el reciclador: va a dejar su bolsa y se va. No tiene qué fotografiar sobre el trabajo del reciclador.
2. **Lo que se ve en el SHUT no depende del reciclador.** Bolsas rotas, residuos mal separados, bolsas dejadas adelante que llenan el cuarto más rápido: son consecuencias de cómo entregan **los residentes**. Calificar al reciclador por eso invierte la responsabilidad, justo la que VerdeApp intenta enseñar con RQF-013.
3. **El mínimo de calificaciones no se alcanza.** La mayoría de residentes no calificaría nunca: solo quiere dejar su bolsa. Con pocas calificaciones, las que sí llegan tienden a venir de quienes están molestos o tienen mala intención, y dos o tres bastan para bajar un promedio.

### Opción B — No implementarla

Mantener la calificación en un solo sentido (reciclador → conjunto), que sí tiene evidencia y sí apunta a quien puede corregir el problema.

### Opción C — Alternativas sin puntaje

Dar visibilidad sobre el trabajo del reciclador **sin** convertirlo en una calificación de opinión (detalle en la sección 5).

---

## 3. Riesgos de implementar la calificación

| Riesgo | Por qué es real en VerdeApp |
| ------ | --------------------------- |
| **Calificaciones sin evidencia** | El residente casi nunca está presente cuando el reciclador trabaja (ver Opción A, punto 1). |
| **Responsabilidad invertida** | Los problemas visibles del SHUT dependen de cómo entregan los residentes, no del reciclador. |
| **Pocas calificaciones, sesgadas** | Con pocos residentes activos por conjunto, un par de usuarios molestos o malintencionados definen el promedio. |
| **Poder desbalanceado** | El residente calificaría sin rendir cuentas, mientras el reciclador ya es evaluado por el Admin de Conjunto, que puede revocarlo. |
| **Impacto sobre el trabajo del reciclador** | Los usuarios de VerdeApp son recicladores de oficio de Bogotá, que dependen de ser autorizados por los conjuntos. Una mala calificación visible puede llevar a que un conjunto revoque su autorización (HU-038): una función que usan pocos podría costarle el trabajo a alguien. |

**Por qué la comparación con Uber no aplica:** allí la calificación bidireccional funciona porque hay una transacción directa entre dos personas presentes todo el viaje, el pasajero paga por un servicio que recibe él mismo, y cada conductor acumula cientos de calificaciones que diluyen las injustas. En VerdeApp no se cumple ninguna de las tres condiciones: no hay transacción directa entre residente y reciclador, el reciclador trabaja para el conjunto (no para cada residente) y el volumen de calificaciones sería muy bajo.

---

## 4. Decisión

**No se implementa la calificación de los residentes al reciclador** (Opción B), y se propone la Opción C como trabajo futuro.

La necesidad de fondo detrás de la propuesta sigue siendo válida: **saber si un reciclador cumple con su trabajo**. La sección 5 propone cómo cubrirla sin los riesgos anteriores.

---

## 5. Alternativa propuesta (trabajo futuro)

Estas ideas no son requisitos todavía. Si el equipo las aprueba, cada una se convierte en su propio issue.

### 5.1 Indicadores objetivos del reciclador, visibles solo para el Admin de Conjunto

Datos que la app **ya guarda** hoy, calculados sin depender de la opinión de nadie:

| Indicador | De dónde sale |
| --------- | ------------- |
| Cada cuánto avisa su llegada al conjunto | Tabla `notificaciones`, `tipo = LLEGADA_RECICLADOR`, `id_emisor` = el reciclador, `id_conjunto_residencial`, `created_at` |
| Cuánto tarda en liberar el SHUT después de un aviso de "SHUT lleno" | Tabla `notificaciones`: tiempo entre un `SHUT_LLENO` y el siguiente `SHUT_LIBRE` del mismo conjunto |
| Si cierra su visita (avisa que terminó) | Tabla `notificaciones`, `tipo = FINALIZACION_RECICLADOR` |
| Si audita el conjunto con regularidad | Tabla `auditorias_conjunto`, `id_reciclador`, `created_at` |

Son hechos registrados por el propio sistema, no opiniones, y solo los ve quien ya tiene la responsabilidad de decidir sobre el reciclador: el Admin de Conjunto.

### 5.2 Reporte de incidentes concretos

Si un residente ve un problema **puntual** atribuible al reciclador (por ejemplo, dejó el cuarto de basuras abierto), puede reportarlo:

- Con **foto obligatoria** y una descripción.
- El reporte le llega **solo al Admin de Conjunto**, que lo revisa y decide.
- **Sin puntaje, promedio ni ranking** visible para nadie.

### 5.3 (Opcional) Reconocimiento solo en positivo

Un botón de "agradecer" al reciclador. Motiva y reconoce su trabajo sin la posibilidad de perjudicarlo.

---

## 6. Cuándo volver a evaluar

Tiene sentido reabrir esta decisión si se cumplen **las dos** condiciones:

1. VerdeApp está en producción con suficientes residentes activos por conjunto como para que un promedio sea representativo.
2. Aparece una necesidad real que los indicadores objetivos (5.1) y los reportes de incidentes (5.2) no cubren.
