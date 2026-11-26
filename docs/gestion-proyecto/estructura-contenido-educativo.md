# Estructura del contenido educativo de VerdeApp

<!--
  ¿Qué? Propuesta de cómo se organizan las categorías y los módulos del catálogo educativo,
        con el argumento de cada decisión (issue #597).
  ¿Para qué? Que quien redacte los módulos nuevos (issue #519) sepa en qué categoría va cada
            uno sin decidirlo a solas, y que el grupo revise la estructura antes de tocar el contenido.
  ¿Impacto? Esta tarjeta decide la estructura y corrige dos textos del seed. No redacta módulos
            nuevos: las categorías nuevas aparecen en el catálogo cuando el issue #519 escriba
            su primer módulo.
-->

| Campo | Valor |
|---|---|
| **Fecha** | 23 de noviembre de 2026 |
| **Issue** | #597 (desbloquea al #519) |
| **Base** | [Investigación del contenido educativo](investigacion-contenido-educativo.md) (issue #569) |
| **Estado** | Propuesta para revisar con el grupo |

## 1. De dónde partimos

El seed trae **6 categorías con un solo módulo cada una**. Con eso, la recomendación que recibe el Residente tras una auditoría Regular o Mala siempre es la misma lección, y temas como pilas, medicamentos o aceite no existen en el catálogo.

Cada categoría tiene dos nombres, y conviene no confundirlos:

- **Nombre real:** el que se guarda en la base de datos y el que ve el Residente y el Administrador del Sistema. Une cada auditoría con sus lecciones, así que **no se renombra**.
- **Nombre simple:** una versión corta que solo ve el Reciclador en el desplegable "Tema relacionado" al calificar. Es solo presentación y sí se puede cambiar.

| Nombre real | Nombre simple (Reciclador) | ¿Se califica? |
|---|---|---|
| Separación en la fuente y código de colores | Separación por colores de bolsa | Sí |
| Tipos de residuos y su preparación | Cómo entregar el material | Sí |
| Puntos limpios y Ecopuntos | Objetos grandes (muebles, colchones) | Sí |
| Residuos de construcción y demolición | Escombros de obra o remodelación | Sí |
| Marco distrital y consumo responsable | Cantidad de basura generada | Sí |
| Economía circular y aprovechamiento | (no aparece) | No, solo se lee |

## 2. Cómo se ordena: por quién se lleva cada residuo

La app existe para coordinar al residente con el reciclador por medio del SHUT. Por eso el contenido se ordena según quién recibe cada cosa:

| Grupo | Qué es | Categorías |
|---|---|---|
| **A. Lo que se entrega al reciclador por el SHUT** | Aprovechables (bolsa blanca), orgánicos (verde) y ordinarios (negra) | Colores de bolsa, preparación del material, economía circular, consumo responsable |
| **B. Lo que no va en bolsas ni es del reciclador** | Peligrosos, aparatos, llantas, baterías, voluminosos y escombros | Ecopuntos, construcción y demolición, y **dos categorías nuevas** |

Un tercer grupo (marcos de bicicleta, sillines, canecas) **queda fuera por ahora**: no hay fuente oficial y falta validarlo con recicladores reales.

## 3. Estructura propuesta: 8 categorías, unos 29 módulos

### Grupo A

| Categoría | Módulos propuestos | Qué cambia |
|---|---|---|
| Separación en la fuente y código de colores | Bolsa blanca · Bolsa verde (orgánicos y compostaje) · Bolsa negra · Casos que confunden | De 1 módulo a 4 |
| Tipos de residuos y su preparación | Papel y cartón · Plástico · Vidrio · Metal y latas · Qué hago si está mojado o sucio | De 1 a 5. Nombre simple nuevo: **"Cómo preparar el material"** |
| Economía circular y aprovechamiento | Qué es · El recorrido del material · El reciclador de oficio | De 1 a 3. Solo lectura |
| Marco distrital y consumo responsable | Reducir y reutilizar · Los 10 mandamientos de cero desechos | De 1 a 2 |

### Grupo B

| Categoría | Módulos propuestos | Qué cambia |
|---|---|---|
| Puntos limpios y Ecopuntos | Qué son y qué reciben · Qué no reciben y a dónde va · Cuándo y dónde pasan | De 1 a 3 |
| Residuos de construcción y demolición | Qué son y a dónde llevarlos · Qué no mezclar | De 1 a 2 |
| **Residuos peligrosos del hogar** (nueva) | Pilas · Bombillas · Medicamentos y empaques · Jeringas y cortopunzantes · Aceite de cocina · Envases de insecticidas | 6 módulos. **Se califica** |
| **Aparatos, llantas y baterías** (nueva) | Aparatos electrónicos · Línea blanca · Llantas · Baterías de auto y moto | 4 módulos. **Solo se lee** |

## 4. Decisiones y sus argumentos

1. **No se renombran las 6 categorías actuales.** El nombre real es el vínculo entre una auditoría y sus lecciones. Cambiarlo dejaría las auditorías ya guardadas sin recomendación.
2. **El único nombre que se cambia es uno simple:** "Cómo entregar el material" pasa a "Cómo preparar el material". El anterior se podía leer como "dónde entregar" o "qué bolsa usar", y la lección habla de dejar cada material limpio y seco.
3. **Dos categorías nuevas y no una.** Diez módulos en una sola categoría serían un muro muy largo. Además, la guía de posconsumo de la SDA separa los peligrosos del hogar de los aparatos y vehículos.
4. **"Residuos peligrosos del hogar" se califica**, con el nombre simple **"Peligrosos mezclados con las bolsas"**. Un Reciclador sí puede ver pilas o jeringas dentro de una bolsa, y eso lastima o contamina el material aprovechable. *(Esta razón es una deducción del equipo, no la dice una norma.)*
5. **"Aparatos, llantas y baterías" solo se lee.** Se entregan en comercios y gestores autorizados, y no hay nada que el Reciclador observe sobre ellos en el cuarto de basuras.
6. **Cada módulo termina con "Qué no hacer".** Las normas leídas traen prohibiciones concretas (no verter aceite al alcantarillado, no botar llantas, no mezclar baterías). **No se citan montos de multas**, porque la investigación no pudo confirmarlos.
7. **El mensaje mínimo para el Residente es "no lo mezcles en ninguna bolsa".** Lo demás ("si puedes, llévalo a tal punto") es complemento. Un residente no va a ir a un taller a pedir una constancia, pero sí puede entregar la batería vieja al comprar una nueva, o el aparato viejo al comprar otro. Esas dos vías están en las normas leídas (Resolución 799 de 2025 y Resolución 851 de 2022).

## 5. Qué pasa con la recomendación tras una auditoría

El mecanismo no cambia ([RQF-013](../requisitos/RFs/RQF-013_recomendacion_contenido_educativo.md)): una auditoría Regular o Mala recomienda las lecciones de **la categoría calificada**. Con más módulos por categoría, la recomendación ya no repite siempre la misma lección.

Las categorías de solo lectura (economía circular, aparatos, llantas y baterías) no se recomiendan solas. El Administrador del Sistema puede enviarlas a mano a cualquier conjunto (Flujo C de RQF-013).

## 6. Lo que esta tarjeta ya cambió

- **Seed, módulo de Ecopuntos:** dejó de decir "puntos fijos" que rotan "semana a semana". La nota oficial del 3 de febrero de 2026 dice que cada zona se atiende aproximadamente cada cuatro semanas y que la programación semanal se consulta cada domingo en `uaesp.gov.co/ecopuntos`.
- **Seed, módulo de economía circular:** dejó de citar el Decreto 596 de 2016 y de decir que la actividad está "remunerada". Ahora dice que el aprovechamiento es una actividad complementaria del servicio público de aseo y que el Decreto 1381 de 2024 reconoce en exclusividad, por 15 años, a las organizaciones de recicladores de oficio la recuperación de los residuos aprovechables. El decreto regula una remuneración por tarifa para la organización, no un pago directo a cada reciclador.
- **Frontend:** ícono e ilustración para las dos categorías nuevas, el nuevo nombre simple de preparación del material, y "Aparatos, llantas y baterías" como categoría de solo lectura.

Para que el texto corregido del seed llegue a una base que ya estaba sembrada hay que **reiniciar el volumen de Docker y volver a sembrar** (el seed no actualiza módulos existentes). Quien edite los módulos desde el panel del Administrador del Sistema también los cambia, pero solo en su base.

## 7. Lo que no se resolvió

- **Fecha de vigencia del Decreto 1381:** no se pudo leer su artículo final. Se tomó la exclusividad de 15 años del texto literal; la fecha exacta de entrada en vigencia queda por confirmar en el Diario Oficial antes de citarla.
- **Cómo se entrega un escombro en cantidad pequeña:** la ruta oficial es el Ecopunto, la recolección a domicilio o un gestor autorizado. Que el reciclador lo reciba o lo gestione **no tiene fuente**, y el Decreto 1381 excluye los escombros de lo que corresponde a las organizaciones de recicladores. La app no debería decir "entrégaselo al reciclador" sin validarlo.
- **Jeringas y cortopunzantes:** los puntos rojos de la Subred Sur salen de una búsqueda, no de una página leída completa. Hay que verificarlos antes de redactar.
- **En qué recipiente se entregan los escombros:** no se encontró fuente.
- **Enlaces entre módulos:** hoy un módulo solo tiene un video y una guía; el texto no admite enlaces a otra categoría. Por ahora se escribe como texto ("ver la categoría Separación por colores de bolsa"). Que el texto admita enlaces sería una tarjeta aparte.
- **Bicicletas, sillines y canecas:** fuera de esta propuesta (ver sección 2).

## 7.1 Entrega del issue #519

El catálogo pasó de 6 a **28 módulos** en las 8 categorías. Cada texto cita su fuente oficial, está redactado en un estilo corto (apertura, 3 o 4 tarjetas con listas) y vive en `be/app/data/contenido_educativo.json`. En cada categoría el catálogo los muestra en orden de aprendizaje.

Los 6 módulos originales **ya no existen tal cual**: se revisaron contra los nuevos y se reescribieron, se fusionaron o se eliminaron, para no dejar módulos que repitan lo mismo.

| Categoría | Módulos |
|---|---|
| Separación en la fuente (6) | Los 3 colores de un vistazo · Bolsa blanca · Bolsa negra · Bolsa verde · Casos que confunden · A qué hora sacar la bolsa blanca |
| Preparación del material (4) | Limpio y seco · Papel y cartón · Plástico · Vidrio y latas |
| Ecopuntos (2) | Qué son y qué reciben · Cuándo y dónde pasan |
| Economía circular (3) | Qué es la economía circular · El recorrido del material · El reciclador de oficio |
| Construcción y demolición (2) | Escombros según la cantidad · Cómo elegir un gestor autorizado |
| Consumo responsable (2) | Menos basura desde casa · Los 10 mandamientos |
| Peligrosos del hogar (6) | Pilas · Bombillas · Medicamentos vencidos · Aceite de cocina usado · Envases de insecticida · Jeringas y agujas |
| Aparatos, llantas y baterías (3) | Aparatos eléctricos y línea blanca · Baterías de auto y moto · Llantas |

**Qué pasó con los 6 originales y por qué:**

- **Código de colores** (Separación): repetía lo que explican Blanca, Negra y Verde; se reescribió como "Los 3 colores de un vistazo".
- **Cómo preparar cada material** (Preparación): repetía Papel, Plástico y Vidrio y contradecía la Guía Nacional (decía "enjuagar" el vidrio y la guía dice que no hace falta lavarlo); se eliminó. "Limpio y seco" quedó como la regla general.
- **Ecopuntos: qué son y cómo usarlos**: repetía "qué sí y qué no" y "cuándo pasan"; se fusionó en "Qué son y qué reciben".
- **Economía circular: el papel del reciclador**: se cruzaba con "El reciclador de oficio" y tenía frases sin fuente; se reescribió como "Qué es la economía circular".
- **Manejo de escombros (RCD)**: repetía "Escombros según la cantidad" y "Gestor autorizado" y citaba comparendos sin fuente; se eliminó.
- **Consumo responsable: reducir antes de reciclar**: es el único que responde al tema que califica el Reciclador ("cantidad de basura generada"); se reescribió sin las frases sin fuente y sin su video, que era de un noticiero.
- El video del código de colores era del IDRD y ya no se usa.

**Otros cambios frente a la propuesta de la sección 3:**

- "Qué no mezclar" (construcción y demolición) se reemplazó por "Escombros según la cantidad": ninguna fuente oficial leída lista qué no debe mezclarse con los escombros.
- "A qué hora sacar la bolsa blanca" (Resolución UAESP 701 de 2013) está en Separación y no en consumo responsable, porque trata de cómo presentar el material.
- La Guía Nacional matiza la bolsa verde: se usa solo si hay una ruta de recolección y tratamiento de orgánicos; si no la hay, los orgánicos van a la bolsa negra o al compost casero. Los módulos de Separación lo dicen así.
- "Papel y plástico", "Vidrio, metal y latas" y "Línea blanca" de la propuesta quedaron como "Papel y cartón", "Plástico", "Vidrio y latas" y dentro de "Aparatos eléctricos y línea blanca".
- Casi todos los módulos de separación y preparación se apoyan en la Guía Nacional para la adecuada separación de residuos sólidos (2022), que se leyó después de la investigación #569.

**Pendiente para otra tarjeta** (propuesto en la revisión de esta entrega): módulos de reducción y compost, "¿Para qué sirve reciclar?" con datos de la Guía Nacional, ropa y zapatos usados, un mapa de "qué va a dónde" para peligrosos, qué hace la Línea 110 con muebles y escombros, y una tarjeta "¿Por qué importa?" en cada módulo.

**Límites de la entrega:**

- "Jeringas y agujas" es un módulo corto: las fuentes oficiales leídas no dan un punto de entrega concreto para los hogares. "Envases de insecticida" se apoya en la Resolución 1675 de 2013 y en el plegable del Ministerio de Ambiente (2014); la Guía Nacional no trae una sección de plaguicidas.
- Los 3 videos son de "Marce La Recicladora" (apoyo, no fuente). Solo se confirmó que existen y su título; falta que una persona los vea completos.
- Partes del Decreto 1381 de 2024 y del artículo 25 de la Resolución 799 de 2025 se leyeron por resumen automático; el texto sobre pilas del plegable del Ministerio de Ambiente es de 2014.
- El seed no borra ni actualiza módulos en una base ya sembrada: quien tenga los 6 originales debe reiniciar el volumen de Docker para recibir los 28 actuales.

## 8. Preguntas para el grupo

1. ¿Está de acuerdo con las 8 categorías y con dejar "Aparatos, llantas y baterías" solo de lectura?
2. ¿"Peligrosos mezclados con las bolsas" es un nombre claro para el Reciclador?
3. ¿Alguien puede preguntarle a recicladores reales qué reciben hoy aparte de las bolsas (marcos de bicicleta, canecas, escombros)?
4. ¿Se quiere una tarjeta aparte para que el texto de los módulos admita enlaces entre categorías?

## 9. Fuentes

Las de la [investigación #569](investigacion-contenido-educativo.md), más la nota oficial de los Ecopuntos del 3 de febrero de 2026 y el texto del Decreto 1381 de 2024 en el [Gestor Normativo de la CRA](https://normas.cra.gov.co/Gestor/Docs/decreto_1381_2024.htm) (leído hasta el artículo 2.3.2.5.6.2).
