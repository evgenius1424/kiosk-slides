export const SITE_NAME = 'Kiosk Slides'
export const SITE_URL = siteUrl()

function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return host ? `https://${host}` : 'http://127.0.0.1:3000'
}
