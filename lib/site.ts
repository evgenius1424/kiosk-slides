export const SITE_NAME = 'Kiosk Slides'
const PUBLIC_SITE_URL = 'https://kiosk-slides.vercel.app'
export const SITE_URL = siteUrl()
export const SKILL_INSTALL = skillInstall()

function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  const host =
    process.env.VERCEL_ENV === 'preview'
      ? process.env.VERCEL_BRANCH_URL
      : process.env.VERCEL_PROJECT_PRODUCTION_URL
  return host ? `https://${host}` : PUBLIC_SITE_URL
}

function skillInstall() {
  if (process.env.SKILL_INSTALL) return process.env.SKILL_INSTALL === 'on'
  return process.env.VERCEL_ENV !== 'production'
}
