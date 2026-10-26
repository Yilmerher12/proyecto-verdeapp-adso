"""
Módulo: utils/pdf_agenda.py
Descripción: Arma el PDF del historial de la agenda del conjunto (HU-049, issue #480).
¿Para qué? Un documento presentable para anexar al acta del comité: título, rango
          pedido, total, tabla con los temas y número de página. Lo usa
          agenda_conjunto_service.exportar_pdf.
¿Impacto? No sabe nada de la base de datos: recibe ya las filas listas (texto) y
          devuelve los bytes del PDF.
"""

from collections.abc import Sequence

from fpdf import FPDF
from fpdf.fonts import FontFace

ENCABEZADOS_PDF = ("Tema", "Estado", "Creado", "Archivado", "Autor", "Foto")

# ¿Qué? Lo que se imprime en una celda sin dato (ver construir_pdf_historial).
SIN_DATO = "-"

# ¿Qué? Ancho de cada columna en mm; suman 277 = ancho de una hoja A4 horizontal (297)
#       menos 10 mm de margen por lado.
ANCHOS_COLUMNAS_MM = (110, 25, 25, 25, 52, 40)

# ¿Qué? Letras que la fuente estándar del PDF (Helvetica) no sabe dibujar y su equivalente simple.
# ¿Para qué? Con esa fuente las tildes, la ñ, ¿ y ¡ salen bien, pero fpdf2 lanza un error con las
#           comillas curvas, la raya larga, el euro o los emoji: al pegar un texto de WhatsApp o
#           Word, la descarga habría respondido 500. El CSV conserva el texto exacto.
# ¿Impacto? Lo que no tenga equivalente (emoji, símbolos raros) se imprime como "?".
#           None = el carácter se quita (no se ve y solo estorbaría).
_REEMPLAZOS = str.maketrans(
    {
        "“": '"', "”": '"', "„": '"', "‘": "'", "’": "'", "‚": "'",
        "–": "-", "—": "-", "−": "-", "…": "...", "•": "-", "·": "-",
        "€": "EUR", "\t": " ",
        "\r": None, "​": None, "‌": None, "‍": None, "‎": None, "‏": None,
        "️": None, "﻿": None,
    }
)


def texto_para_pdf(texto: str) -> str:
    """¿Qué? El texto tal como se puede imprimir con la fuente estándar (ver _REEMPLAZOS)."""
    return texto.translate(_REEMPLAZOS).encode("latin-1", "replace").decode("latin-1")


class _Documento(FPDF):
    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("Helvetica", size=8)
        self.set_text_color(100)
        self.cell(w=138.5, h=6, text="VerdeApp")
        self.cell(w=0, h=6, text=f"Página {self.page_no()} de {{nb}}", align="R")


def construir_pdf_historial(
    nombre_conjunto: str,
    estado_texto: str,
    rango_texto: str,
    generado_el: str,
    filas: Sequence[Sequence[str]],
) -> bytes:
    """
    ¿Qué? Hoja A4 horizontal con el encabezado y una tabla de 6 columnas (ENCABEZADOS_PDF).
          Cada fila es (tema, estado, creado, archivado, autor, enlace de la foto).
    ¿Para qué? Horizontal porque con 6 columnas el tema (texto largo) tiene más ancho y se
              parte en menos líneas. El encabezado de la tabla se repite en cada página.
    ¿Impacto? La foto sale como "Ver foto" con enlace (no incrustada). Sin filas, el PDF trae
              la tabla vacía y la línea "No hay temas en este rango."
    """
    pdf = _Documento(orientation="L", format="A4")
    pdf.set_margins(10, 10, 10)
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_title(texto_para_pdf(f"Historial de la agenda - {nombre_conjunto}"))
    pdf.set_creator("VerdeApp")
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 14)
    pdf.multi_cell(0, 8, texto_para_pdf(f"Historial de la agenda - {nombre_conjunto}"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=9)
    pdf.set_text_color(80)
    plural = "tema" if len(filas) == 1 else "temas"
    pdf.multi_cell(
        0,
        5,
        texto_para_pdf(f"Temas: {estado_texto}  |  {rango_texto}\n{len(filas)} {plural}  |  Generado el {generado_el}"),
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(3)

    pdf.set_text_color(0)
    pdf.set_font("Helvetica", size=8.5)
    enlace = FontFace(color=(26, 86, 196), emphasis="UNDERLINE")
    with pdf.table(
        col_widths=ANCHOS_COLUMNAS_MM,
        text_align="LEFT",
        v_align="TOP",
        padding=(1, 1.5),
        line_height=4.5,
        headings_style=FontFace(emphasis="BOLD", fill_color=(232, 236, 233)),
    ) as tabla:
        encabezado = tabla.row()
        for titulo in ENCABEZADOS_PDF:
            encabezado.cell(titulo)
        for tema, estado, creado, archivado, autor, foto in filas:
            fila = tabla.row()
            # ¿Qué? Una celda vacía en papel parece un error (ej. "Archivado" de un tema por tratar):
            #       se escribe "-". Con la fuente estándar no se puede imprimir la raya larga "—".
            #       El CSV sí deja esas celdas vacías: es un archivo de datos y Excel necesita
            #       la columna de fechas limpia para ordenar y filtrar.
            for valor in (tema, estado, creado, archivado, autor):
                fila.cell(texto_para_pdf(valor) or SIN_DATO)
            if foto:
                fila.cell("Ver foto", style=enlace, link=foto)
            else:
                fila.cell(SIN_DATO)

    if not filas:
        pdf.ln(4)
        pdf.cell(0, 6, "No hay temas en este rango.")

    return bytes(pdf.output())
