import { renderToStaticMarkup } from 'react-dom/server'
import {
  findFont,
  fontFace,
  fontFiles,
  fonts,
  parsePresentation,
  setPresentationTheme,
  themes,
  toneColor,
  type Scale,
  type Theme,
} from '@/lib/presentation'
import { slideStyles } from '@/lib/slide-styles'
import { SlideView } from '@/components/slide'

export const labThemes = themes.map(id => ({ id }))

export type LabPage = { theme: Theme; scale: Scale; width: number; font?: string; tone?: string }

export function labPage(source: string, root: string, page: LabPage) {
  const presentation = parsePresentation(setPresentationTheme(source, page.theme))
  const tone = page.tone ? (toneColor(page.tone, page.theme) ?? page.tone) : presentation.tone
  const look = {
    font: page.font ?? presentation.font,
    scale: page.scale,
    brand: presentation.brand,
  }
  const faces = fontFiles(fonts)
    .map(file => fontFace(file, `file://${root}/public/fonts/${file.file}`))
    .join('')
  const height = Math.round((page.width * 9) / 16)
  const slides = presentation.slides
    .map(
      (slide, i) =>
        `<div class="frame" data-slide="${i + 1}" data-kind="${slide.kind}" data-font="${findFont(look.font).id}">${renderToStaticMarkup(
          <SlideView slide={slide} theme={page.theme} accent={tone} look={look} />,
        )}</div>`,
    )
    .join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${page.theme}</title><style>${faces}${slideStyles}html,body{margin:0;background:#777}.frame{width:${page.width}px;height:${height}px;container-type:inline-size;margin:0 0 8px}</style></head><body>${slides}</body></html>`
}
