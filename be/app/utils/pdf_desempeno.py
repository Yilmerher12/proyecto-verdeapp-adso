"""
Archivo: utils/pdf_desempeno.py
¿Qué? Arma el PDF del desempeño semanal de un conjunto (issue #558): hoja A4 horizontal.
      Página 1: resumen en 3 tarjetas, gráfica de barras apiladas y los temas a reforzar.
      Página 2: tabla por semana y ranking de temas, con los niveles pintados.
¿Para qué? Que el Administrador de Conjunto lleve a una reunión lo mismo que ve en la
          página "Desempeño". Reutiliza el documento base y el limpiador de texto del PDF
          de la agenda (pdf_agenda.py); las barras son rectángulos de fpdf2, sin dependencias.
¿Impacto? Cada nivel lleva su nombre además del color (el nivel no depende solo del color).
          Los colores son los de la pantalla (teal, ámbar, rojo). Antes de cada tabla se
          reinician los colores del documento: fpdf2 pinta las celdas con el último relleno
          usado, y sin reiniciarlo las tablas salían del rojo del nivel Malo.
"""

import math
from collections.abc import Sequence

from fpdf.fonts import FontFace

from app.utils.pdf_agenda import _Documento, texto_para_pdf

# ¿Qué? (clave, nombre, color fuerte, color del texto sobre él, tinte suave para celdas).
#       El texto va oscuro sobre el ámbar, que es claro, y blanco sobre los otros dos.
NIVELES = (
    ("bueno", "Bueno", (15, 118, 110), (255, 255, 255), (204, 251, 241)),
    ("regular", "Regular", (251, 191, 36), (17, 24, 39), (254, 243, 199)),
    ("malo", "Malo", (220, 38, 38), (255, 255, 255), (254, 226, 226)),
)
GRIS_ENCABEZADO = (232, 236, 233)

# ¿Qué? Una fila de semana: (etiqueta corta, rango completo, bueno, regular, malo).
FilaSemana = tuple[str, str, int, int, int]
# ¿Qué? Una fila de tema, ya en el orden del ranking: (tema, bueno, regular, malo).
FilaTema = tuple[str, int, int, int]

X_GRAFICA_MM = 22.0
ANCHO_GRAFICA_MM = 180.0
ALTO_GRAFICA_MM = 85.0
ALTO_MINIMO_NUMERO_MM = 4.0
X_PANEL_TEMAS_MM = 212.0
ANCHO_PANEL_TEMAS_MM = 75.0
TEMAS_EN_PANEL = 3


def _reiniciar_colores(pdf: _Documento) -> None:
    pdf.set_fill_color(255, 255, 255)
    pdf.set_draw_color(0)
    pdf.set_text_color(0)


def _dibujar_tarjetas(pdf: _Documento, totales: Sequence[int], total: int) -> None:
    y = pdf.get_y()
    ancho, alto, hueco = 62.0, 18.0, 4.0
    for i, ((_, nombre, relleno, texto, _), cantidad) in enumerate(zip(NIVELES, totales, strict=True)):
        x = 10 + i * (ancho + hueco)
        pdf.set_fill_color(*relleno)
        pdf.rect(x, y, ancho, alto, style="F")
        pdf.set_text_color(*texto)
        pdf.set_xy(x + 3, y + 2)
        pdf.set_font("Helvetica", size=9)
        pdf.cell(ancho - 6, 4, nombre)
        pdf.set_xy(x + 3, y + 7)
        pdf.set_font("Helvetica", "B", 14)
        porcentaje = round(100 * cantidad / total) if total else 0
        pdf.cell(ancho - 6, 8, f"{cantidad}  ({porcentaje}%)")
    x = 10 + 3 * (ancho + hueco)
    pdf.set_fill_color(*GRIS_ENCABEZADO)
    pdf.rect(x, y, ancho, alto, style="F")
    pdf.set_text_color(0)
    pdf.set_xy(x + 3, y + 2)
    pdf.set_font("Helvetica", size=9)
    pdf.cell(ancho - 6, 4, "Auditorías en el período")
    pdf.set_xy(x + 3, y + 7)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(ancho - 6, 8, str(total))
    pdf.set_y(y + alto + 8)


def _dibujar_grafica(pdf: _Documento, semanas: Sequence[FilaSemana]) -> float:
    """¿Qué? Dibuja la gráfica con su esquina superior izquierda en (X_GRAFICA_MM, y actual). Devuelve el y final."""
    y_base = pdf.get_y() + ALTO_GRAFICA_MM
    maximo = max((b + r + m for _, _, b, r, m in semanas), default=0) or 1
    # ¿Qué? El eje se parte en 4 intervalos de valor entero: así las líneas guía no llevan decimales.
    paso = math.ceil(maximo / 4)
    tope = paso * 4

    pdf.set_draw_color(215)
    pdf.set_font("Helvetica", size=7)
    pdf.set_text_color(110)
    for i in range(5):
        y = y_base - ALTO_GRAFICA_MM * i / 4
        pdf.line(X_GRAFICA_MM, y, X_GRAFICA_MM + ANCHO_GRAFICA_MM, y)
        pdf.set_xy(10, y - 1.5)
        pdf.cell(11, 3, str(paso * i), align="R")

    ranura = ANCHO_GRAFICA_MM / max(len(semanas), 1)
    barra = min(ranura * 0.6, 16.0)
    for i, (etiqueta, _, *valores) in enumerate(semanas):
        x = X_GRAFICA_MM + i * ranura + (ranura - barra) / 2
        y = y_base
        for (_, _, relleno, texto, _), valor in zip(NIVELES, valores, strict=True):
            if valor <= 0:
                continue
            alto = ALTO_GRAFICA_MM * valor / tope
            y -= alto
            pdf.set_fill_color(*relleno)
            pdf.rect(x, y, barra, alto, style="F")
            if alto >= ALTO_MINIMO_NUMERO_MM:
                pdf.set_text_color(*texto)
                pdf.set_font("Helvetica", "B", 8)
                pdf.set_xy(x, y + alto / 2 - 2)
                pdf.cell(barra, 4, str(valor), align="C")
        pdf.set_text_color(80)
        pdf.set_font("Helvetica", size=7)
        pdf.set_xy(X_GRAFICA_MM + i * ranura, y_base + 1)
        pdf.cell(ranura, 4, etiqueta, align="C")

    # ¿Qué? Leyenda: cuadro de color + nombre del nivel.
    y_leyenda = y_base + 8
    x = X_GRAFICA_MM
    pdf.set_font("Helvetica", size=8)
    pdf.set_text_color(0)
    for _, nombre, relleno, _, _ in NIVELES:
        pdf.set_fill_color(*relleno)
        pdf.rect(x, y_leyenda + 0.5, 3, 3, style="F")
        pdf.set_xy(x + 4, y_leyenda)
        pdf.cell(22, 4, nombre)
        x += 30
    return y_leyenda + 4


def _dibujar_temas_a_reforzar(pdf: _Documento, y: float, temas: Sequence[FilaTema]) -> None:
    pdf.set_xy(X_PANEL_TEMAS_MM, y)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(0)
    pdf.cell(ANCHO_PANEL_TEMAS_MM, 6, "Temas a reforzar", new_x="LEFT", new_y="NEXT")
    a_reforzar = [t for t in temas if t[2] + t[3] > 0][:TEMAS_EN_PANEL]
    if not a_reforzar:
        pdf.set_font("Helvetica", size=8.5)
        pdf.multi_cell(ANCHO_PANEL_TEMAS_MM, 4.5, "Ningún tema salió Regular o Malo en este período.")
        return
    for tema, _, regular, malo in a_reforzar:
        pdf.set_x(X_PANEL_TEMAS_MM)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.multi_cell(ANCHO_PANEL_TEMAS_MM, 4.5, texto_para_pdf(tema), new_x="LEFT", new_y="NEXT")
        pdf.set_x(X_PANEL_TEMAS_MM)
        pdf.set_font("Helvetica", size=8.5)
        pdf.set_text_color(80)
        pdf.cell(ANCHO_PANEL_TEMAS_MM, 4.5, f"Regular: {regular}   Malo: {malo}", new_x="LEFT", new_y="NEXT")
        pdf.set_text_color(0)
        pdf.ln(2)


def _tabla(pdf: _Documento, anchos: Sequence[int], encabezados: Sequence[str], filas: Sequence[Sequence[str]]) -> None:
    """¿Qué? Tabla de 5 columnas: nombre, Bueno, Regular, Malo y Total. Los 3 niveles van pintados:
          encabezado con el color fuerte y, en las filas, tinte suave solo si la cantidad es mayor que 0."""
    _reiniciar_colores(pdf)
    pdf.set_font("Helvetica", size=8.5)
    with pdf.table(
        col_widths=tuple(anchos),
        text_align=("LEFT", "RIGHT", "RIGHT", "RIGHT", "RIGHT"),
        padding=(1, 1.5),
        line_height=4.5,
        headings_style=FontFace(emphasis="BOLD", fill_color=GRIS_ENCABEZADO),
    ) as tabla:
        encabezado = tabla.row()
        for i, titulo in enumerate(encabezados):
            if 1 <= i <= 3:
                _, _, relleno, texto, _ = NIVELES[i - 1]
                encabezado.cell(titulo, style=FontFace(emphasis="BOLD", color=texto, fill_color=relleno))
            else:
                encabezado.cell(titulo)
        for fila in filas:
            celdas = tabla.row()
            for i, valor in enumerate(fila):
                if 1 <= i <= 3 and valor != "0":
                    celdas.cell(texto_para_pdf(valor), style=FontFace(fill_color=NIVELES[i - 1][4]))
                else:
                    celdas.cell(texto_para_pdf(valor))


def construir_pdf_desempeno(
    nombre_conjunto: str,
    periodo_texto: str,
    generado_el: str,
    semanas: Sequence[FilaSemana],
    temas: Sequence[FilaTema],
) -> bytes:
    """
    ¿Qué? Página 1: encabezado, tarjetas, gráfica y temas a reforzar. Página 2: tablas.
    ¿Impacto? `temas` debe venir ya en el orden del ranking de la pantalla (más Regular o Malo primero).
    """
    totales = [sum(fila[2 + i] for fila in semanas) for i in range(3)]
    total = sum(totales)

    pdf = _Documento(orientation="L", format="A4")
    pdf.set_margins(10, 10, 10)
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_title(texto_para_pdf(f"Desempeno semanal - {nombre_conjunto}"))
    pdf.set_creator("VerdeApp")
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 14)
    pdf.multi_cell(0, 8, texto_para_pdf(f"Desempeño semanal - {nombre_conjunto}"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=9)
    pdf.set_text_color(80)
    pdf.multi_cell(
        0,
        5,
        texto_para_pdf(f"{periodo_texto}  |  Generado el {generado_el}"),
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(4)

    _dibujar_tarjetas(pdf, totales, total)
    y_inicio = pdf.get_y()
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(0)
    pdf.cell(0, 6, "Auditorías por semana", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    _dibujar_grafica(pdf, semanas)
    _dibujar_temas_a_reforzar(pdf, y_inicio, temas)

    pdf.add_page()
    _reiniciar_colores(pdf)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, "Detalle por semana", new_x="LMARGIN", new_y="NEXT")
    _tabla(
        pdf,
        (80, 30, 30, 30, 30),
        ("Semana", "Bueno", "Regular", "Malo", "Total"),
        [(rango, str(b), str(r), str(m), str(b + r + m)) for _, rango, b, r, m in semanas],
    )

    pdf.ln(6)
    _reiniciar_colores(pdf)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, "Temas del período (primero los que más hay que reforzar)", new_x="LMARGIN", new_y="NEXT")
    _tabla(
        pdf,
        (110, 30, 30, 30, 30),
        ("Tema", "Bueno", "Regular", "Malo", "Total"),
        [(tema, str(b), str(r), str(m), str(b + r + m)) for tema, b, r, m in temas],
    )

    return bytes(pdf.output())
