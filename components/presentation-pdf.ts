import { imagePdf, type PdfPage } from '@/lib/pdf'

export async function presentationPdf(html: string, title: string): Promise<Blob> {
  const page = new DOMParser().parseFromString(html, 'text/html')
  const css = [...page.querySelectorAll('style')].map(style => style.textContent).join('')
  const canvas = document.createElement('canvas')
  canvas.width = PIXEL_WIDTH
  canvas.height = PIXEL_HEIGHT
  const context = canvas.getContext('2d')!
  const frames = [...page.querySelectorAll('.slide-frame')]
  const pages: PdfPage[] = []
  for (const [i, frame] of frames.entries()) {
    const svg = slideSvg(page, css, frame)
    if (i === 0) await loadImage(svg)
    context.drawImage(await loadImage(svg), 0, 0, canvas.width, canvas.height)
    pages.push({ jpeg: await jpeg(canvas), width: canvas.width, height: canvas.height })
  }
  return imagePdf(pages, PAGE_POINTS, title)
}

const WIDTH = 1920
const HEIGHT = 1080
const PIXEL_WIDTH = 5120
const PIXEL_HEIGHT = 2880
const QUALITY = 0.95
const PAGE_POINTS: [number, number] = [960, 540]

function slideSvg(page: Document, css: string, frame: Element) {
  const root = page.createElement('div')
  root.className = page.body.className
  root.setAttribute(
    'style',
    `${page.body.getAttribute('style') ?? ''};width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden`,
  )
  const style = page.createElement('style')
  style.textContent = css
  const slide = frame.cloneNode(true) as HTMLElement
  slide.style.cssText = `width:${WIDTH}px;height:${HEIGHT}px;container-type:inline-size`
  root.append(style, slide)
  const markup = new XMLSerializer().serializeToString(root)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIXEL_WIDTH}" height="${PIXEL_HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><foreignObject width="${WIDTH}" height="${HEIGHT}">${markup}</foreignObject></svg>`
}

async function loadImage(svg: string) {
  const image = new Image()
  image.decoding = 'sync'
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await image.decode()
  return image
}

async function jpeg(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  )
  if (!blob) throw new Error('Could not draw the slides. Try again.')
  return new Uint8Array(await blob.arrayBuffer())
}
