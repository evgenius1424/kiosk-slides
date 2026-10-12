export type PdfPage = { jpeg: Uint8Array; width: number; height: number }

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
  const pageIds = pages.map((_, i) => 4 + i * 3)
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
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Slide ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`,
    )
    object(id + 1, `<< /Length ${content.length} >>`, content)
    object(
      id + 2,
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>`,
      page.jpeg,
    )
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
