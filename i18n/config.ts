export const locales = ['en'] as const
export const defaultLocale: Locale = 'en'

export type Locale = (typeof locales)[number]
