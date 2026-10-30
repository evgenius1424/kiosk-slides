import { fontChars, fontFamily, fontFilesFor, type Font } from '@/lib/presentation'

export function loadFonts(list: Font[], extended: boolean, text: string) {
  return Promise.all(
    list
      .flatMap(font => fontFilesFor(font, extended, text))
      .map(file => {
        const chars = fontChars(file, text).join('')
        return (
          chars &&
          document.fonts.load(`1em '${fontFamily(file.family, extended)}'`, chars).catch(() => {})
        )
      }),
  )
}
