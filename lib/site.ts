export const SITE_NAME = 'Kiosk Slides'
export const SITE_TAGLINE = 'Slides made to be seen'
export const SITE_DESCRIPTION = 'Describe your talk to AI and get a clean, finished deck in seconds. Big, readable slides built for screen sharing and meeting-room TVs, with no layout work.'
export const SITE_URL = siteUrl()

function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return host ? `https://${host}` : 'http://127.0.0.1:3000'
}
