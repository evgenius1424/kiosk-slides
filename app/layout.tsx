import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import './globals.css'

const ICONS: Metadata['icons'] = {
  icon: [
    {
      url: '/icon-light-32x32.png',
      media: '(prefers-color-scheme: light)',
    },
    {
      url: '/icon-dark-32x32.png',
      media: '(prefers-color-scheme: dark)',
    },
    {
      url: '/icon.svg',
      type: 'image/svg+xml',
    },
  ],
  apple: '/apple-icon.png',
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  const title = t('title', { name: SITE_NAME })
  const description = t('description')
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: t('titleTemplate', { name: SITE_NAME }) },
    description,
    applicationName: SITE_NAME,
    keywords: t.raw('keywords') as string[],
    authors: [{ name: 'Evgenii', url: 'https://github.com/evgenius1424' }],
    creator: 'Evgenii',
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      url: '/',
      siteName: SITE_NAME,
      title,
      description,
      locale: t('ogLocale'),
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
    icons: ICONS,
  }
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f5f6f3',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang={await getLocale()}>
      <body className="antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
