export const languages = ['en', 'ru'] as const
export type Language = (typeof languages)[number]

export type SlideWords = {
  label: string
  before: string
  after: string
  done: string
  toDo: string
  fullScreen: string
  player: {
    autoplay: { on: string; off: string }
    shareSafe: { on: string; off: string }
    end: string
    credit: string
    slide: string
  }
}

export const slideWords: Record<Language, SlideWords> = {
  en: {
    label: 'One clear idea',
    before: 'Before',
    after: 'After',
    done: 'Done',
    toDo: 'To do',
    fullScreen: 'Toggle full screen',
    player: {
      autoplay: { on: 'Autoplay on', off: 'Autoplay off' },
      shareSafe: { on: 'Screen-share safe on', off: 'Screen-share safe off' },
      end: 'End of presentation',
      credit: 'Made with Kiosk Slides',
      slide: 'Slide {number} of {count}: {title}',
    },
  },
  ru: {
    label: 'Одна ясная мысль',
    before: 'До',
    after: 'После',
    done: 'Сделано',
    toDo: 'Не сделано',
    fullScreen: 'Полный экран',
    player: {
      autoplay: { on: 'Автопоказ включён', off: 'Автопоказ выключен' },
      shareSafe: { on: 'Режим для показа экрана включён', off: 'Режим для показа экрана выключен' },
      end: 'Конец презентации',
      credit: 'Сделано в Kiosk Slides',
      slide: 'Слайд {number} из {count}: {title}',
    },
  },
}

export const isLanguage = (value: string | undefined): value is Language =>
  languages.includes(value as Language)
