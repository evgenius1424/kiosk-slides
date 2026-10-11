import type { MetadataRoute } from 'next'
import { getTranslations } from 'next-intl/server'
import { SITE_NAME } from '@/lib/site'

const BACKGROUND = '#f5f6f3'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations('Metadata')
  return {
    id: '/',
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: t('description'),
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: BACKGROUND,
    theme_color: BACKGROUND,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
