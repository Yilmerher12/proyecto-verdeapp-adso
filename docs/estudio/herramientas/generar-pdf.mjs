/*
  ¿Qué? Convierte los documentos de estudio (`docs/estudio/N-nombre.md`) en PDF con la portada y el
        diseño de VerdeApp, dibujando los diagramas Mermaid.
  ¿Para qué? El texto vive en Markdown (se edita y se revisa en git como cualquier archivo) y el
            PDF se regenera con un solo comando cada vez que cambia el proyecto, sin pasarlo a mano.
  ¿Impacto? Usa el Edge o el Chrome que ya tiene el equipo (no descarga otro navegador). Si no hay
            ninguno, se indica la ruta de un navegador con la variable CHROME_PATH.

  Uso (desde esta carpeta):
    pnpm pdf                    → genera los PDF de todos los documentos
    pnpm pdf 1-el-proyecto      → genera solo uno (el nombre, sin .md)
*/

import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import MarkdownIt from 'markdown-it'
import { chromium } from 'playwright-core'

const aqui = dirname(fileURLToPath(import.meta.url))
const carpetaDocs = resolve(aqui, '..')
const logoBlanco = resolve(aqui, '../../../fe/public/logos/logo-white.svg')
const hojaEstilo = readFileSync(join(aqui, 'estilo.css'), 'utf8')
const rutaMermaid = createRequire(import.meta.url).resolve('mermaid/dist/mermaid.min.js')

const md = new MarkdownIt({ html: false, linkify: false })

// ¿Qué? Los bloques ```mermaid se dejan como texto dentro de <pre class="mermaid">.
// ¿Para qué? Mermaid los dibuja como diagrama una vez cargada la página.
// ¿Impacto? Cualquier otro bloque de código se muestra como código normal.
const fenceNormal = md.renderer.rules.fence
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (token.info.trim() === 'mermaid') {
    return `<div class="diagrama"><pre class="mermaid">${md.utils.escapeHtml(token.content)}</pre></div>\n`
  }
  return fenceNormal(tokens, idx, options, env, self)
}

function escapar(texto) {
  return md.utils.escapeHtml(texto)
}

// ¿Qué? Separa el título (primer `# `) y el resumen (`<!-- resumen: ... -->`) del resto del texto.
// ¿Para qué? Van en la portada; el título no se repite al empezar la primera página de texto.
function leerDocumento(textoMd) {
  const titulo = (textoMd.match(/^# (.+)$/m) ?? [])[1] ?? 'Documento de estudio'
  const resumen = (textoMd.match(/<!--\s*resumen:\s*([\s\S]*?)\s*-->/) ?? [])[1] ?? ''
  const cuerpo = textoMd
    .replace(/^# .+$/m, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  return { titulo, resumen, cuerpo }
}

function armarHtml({ titulo, resumen, cuerpo }, numero, total, carpetaBase, esAnexo) {
  const hoy = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<base href="${pathToFileURL(carpetaBase).href}/">
<title>${escapar(titulo)}</title>
<style>${hojaEstilo}</style>
</head>
<body>
<section class="portada">
  <img class="logo" src="${pathToFileURL(logoBlanco).href}" alt="VerdeApp">
  <div>
    <p class="etiqueta">${esAnexo ? 'Anexo' : `Documento ${numero} de ${total}`}</p>
    <h1>${escapar(titulo)}</h1>
    ${resumen ? `<p class="resumen">${escapar(resumen)}</p>` : ''}
  </div>
  <div class="pie">VerdeApp · Documentos de estudio · Generado el ${hoy}</div>
</section>
<main>
${md.render(cuerpo)}
</main>
</body>
</html>`
}

// ¿Qué? Abre el navegador que ya esté instalado.
// ¿Para qué? Evitar descargar otro Chromium (Playwright pide una versión exacta y ya dio problemas).
async function abrirNavegador() {
  if (process.env.CHROME_PATH) {
    return chromium.launch({ executablePath: process.env.CHROME_PATH })
  }
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel })
    } catch {
      // se prueba con el siguiente
    }
  }
  throw new Error('No encontré Edge ni Chrome. Instala uno o define CHROME_PATH con la ruta del navegador.')
}

async function generar(navegador, archivo, numero, total, tmp) {
  const textoMd = readFileSync(join(carpetaDocs, `${archivo}.md`), 'utf8')
  // ¿Qué? Un archivo con «anexo» en el nombre se rotula «Anexo» en la portada y no cuenta en el total.
  const html = armarHtml(leerDocumento(textoMd), numero, total, carpetaDocs, /anexo/i.test(archivo))
  const rutaHtml = join(tmp, `${archivo}.html`)
  writeFileSync(rutaHtml, html)

  const pagina = await navegador.newPage()
  await pagina.goto(pathToFileURL(rutaHtml).href)

  if (await pagina.$('.mermaid')) {
    await pagina.addScriptTag({ path: rutaMermaid })
    try {
      await pagina.evaluate(async () => {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: '#dcfce7',
            primaryBorderColor: '#16a34a',
            primaryTextColor: '#14532d',
            lineColor: '#15803d',
            secondaryColor: '#f0fdf4',
            tertiaryColor: '#ffffff',
            fontFamily: 'Segoe UI, Arial, sans-serif',
          },
        })
        await window.mermaid.run({ querySelector: '.mermaid' })
      })
    } catch (error) {
      throw new Error(`Un diagrama de ${archivo}.md tiene un error de sintaxis: ${error.message}`)
    }
  }

  const salida = join(carpetaDocs, `${archivo}.pdf`)
  await pagina.pdf({ path: salida, preferCSSPageSize: true, printBackground: true })
  await pagina.close()
  console.log(`Listo: ${salida}`)
}

// ¿Qué? Los documentos se llaman `N-nombre.md` (N de 1 en adelante) y se ordenan por su número.
// ¿Para qué? Con 10 o más documentos, un orden alfabético pondría el 10 antes del 2.
const todos = readdirSync(carpetaDocs)
  .filter((nombre) => /^\d+-.+\.md$/.test(nombre))
  .map((nombre) => nombre.replace(/\.md$/, ''))
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))

const pedidos = process.argv.slice(2)
const aGenerar = pedidos.length ? pedidos : todos

if (!aGenerar.length) {
  console.error('No hay documentos `N-nombre.md` en docs/estudio.')
  process.exit(1)
}

const tmp = mkdtempSync(join(tmpdir(), 'verdeapp-estudio-'))
const navegador = await abrirNavegador()
try {
  for (const archivo of aGenerar) {
    const numero = parseInt(archivo, 10)
    await generar(navegador, archivo, numero, todos.filter((nombre) => !/anexo/i.test(nombre)).length, tmp)
  }
} finally {
  await navegador.close()
  rmSync(tmp, { recursive: true, force: true })
}
