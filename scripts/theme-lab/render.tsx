import { renderToStaticMarkup } from 'react-dom/server'
import {
  findFont,
  fontFace,
  fontFiles,
  fonts,
  parsePresentation,
  type Scale,
} from '@/lib/presentation'
import { slideStyles } from '@/lib/slide-styles'
import { SlideView } from '@/components/slide'
import { labFiles, labFonts, labItalics, labThemes, labStyles } from './themes'

export { labThemes }

export type LabPage = { theme: string; scale: Scale; width: number; font?: string; tone?: string }

fonts.push(...labFonts)

export function labPage(source: string, root: string, page: LabPage) {
  const theme = labThemes.find(t => t.id === page.theme)
  if (!theme) throw new Error(`Unknown lab theme ${page.theme}`)
  const presentation = parsePresentation(source)
  const look = { font: page.font ?? theme.font, scale: page.scale, brand: presentation.brand }
  const faces = [
    ...fontFiles(fonts.filter(f => !labFonts.includes(f))).map(file =>
      fontFace(file, `file://${root}/public/fonts/${file.file}`),
    ),
    ...labFiles.map(file => fontFace(file, `file://${root}/scripts/theme-lab/fonts/${file.file}`)),
    ...labItalics.map(
      ({ file, range }) =>
        `@font-face{font-family:'Literata';font-style:italic;font-weight:200 900;src:url(file://${root}/scripts/theme-lab/fonts/${file}) format('woff2');unicode-range:${range}}`,
    ),
  ].join('')
  const height = Math.round((page.width * 9) / 16)
  const slides = presentation.slides
    .map(
      (slide, i) =>
        `<div class="frame" data-slide="${i + 1}" data-kind="${slide.kind}" data-font="${findFont(look.font).id}">${renderToStaticMarkup(
          <SlideView
            slide={slide}
            theme={theme.className}
            accent={page.tone ?? theme.tone}
            look={look}
          />,
        )}</div>`,
    )
    .join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${theme.name}</title><style>${faces}${slideStyles}${labStyles}html,body{margin:0;background:#777}.frame{width:${page.width}px;height:${height}px;container-type:inline-size;margin:0 0 8px}</style></head><body>${slides}</body></html>`
}
