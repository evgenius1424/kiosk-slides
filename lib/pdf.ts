export type PdfLink = { url: string; x: number; y: number; width: number; height: number }

export type PdfPage = { jpeg: Uint8Array; width: number; height: number; links: PdfLink[] }

export function imagePdf(pages: PdfPage[], size: [number, number], title: string): Blob {
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const write = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part
    parts.push(bytes)
    length += bytes.length
  }
  const object = (id: number, body: string, stream?: Uint8Array) => {
    offsets[id] = length
    write(`${id} 0 obj\n${body}\n`)
    if (stream) {
      write('stream\n')
      write(stream)
      write('\nendstream\n')
    }
    write('endobj\n')
  }
  const [width, height] = size
  let nextId = 4
  const pageIds = pages.map(page => {
    const id = nextId
    nextId += 3 + page.links.length
    return id
  })
  write(HEADER)
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(
    2,
    `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  )
  object(3, `<< /Title <${utf16Hex(title)}> /Creator (Kiosk Slides) >>`)
  pages.forEach((page, i) => {
    const id = pageIds[i]
    const content = encoder.encode(`q ${width} 0 0 ${height} 0 0 cm /Slide Do Q`)
    const linkIds = page.links.map((_, j) => id + 3 + j)
    const annots = linkIds.length
      ? ` /Annots [${linkIds.map(linkId => `${linkId} 0 R`).join(' ')}]`
      : ''
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Slide ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R${annots} >>`,
    )
    object(id + 1, `<< /Length ${content.length} >>`, content)
    object(
      id + 2,
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>`,
      page.jpeg,
    )
    page.links.forEach((link, j) => object(linkIds[j], linkAnnotation(link, width, height)))
  })
  const xref = length
  const count = offsets.length
  write(
    `xref\n0 ${count}\n0000000000 65535 f \n${offsets
      .slice(1)
      .map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`)
      .join('')}trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
  )
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}

const encoder = new TextEncoder()

const HEADER = new Uint8Array([...encoder.encode('%PDF-1.4\n%'), 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])

function utf16Hex(text: string) {
  let hex = 'FEFF'
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).padStart(4, '0')
  return hex.toUpperCase()
}

function linkAnnotation(link: PdfLink, width: number, height: number) {
  const rect = [
    link.x * width,
    (1 - link.y - link.height) * height,
    (link.x + link.width) * width,
    (1 - link.y) * height,
  ]
    .map(n => Number(n.toFixed(2)))
    .join(' ')
  const uri = link.url.replace(/[\\()]/g, '\\$&')
  return `<< /Type /Annot /Subtype /Link /Rect [${rect}] /Border [0 0 0] /H /N /A << /S /URI /URI (${uri}) >> >>`
}
