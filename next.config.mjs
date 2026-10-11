import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        ],
      },
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
    ]
  },
  // lib/chat-prompt.ts reads these at runtime, which file tracing can't see.
  outputFileTracingIncludes: {
    '/': ['./FORMAT.md', './public/example.md'],
    '/api/chat': ['./FORMAT.md', './public/example.md'],
  },
  images: {
    unoptimized: true,
  },
}

export default withNextIntl(nextConfig)
