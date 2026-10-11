import { ImageResponse } from 'next/og'
import { metadataT as t } from '@/i18n/server'
import { SITE_NAME } from '@/lib/site'

export const alt = t('title', { name: SITE_NAME })
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 80, background: 'radial-gradient(circle at 20% 0%, #3a3a42 0%, #141417 70%)', color: '#f5f6f3' }}>
      <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>kiosk<span style={{ color: '#9676ac' }}>.</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: 104, fontWeight: 700, lineHeight: 1.02, letterSpacing: -4 }}>
        <span>{t('image.headline')}</span>
        <span style={{ color: '#b9a0ca' }}>{t('image.highlight')}</span>
      </div>
      <div style={{ display: 'flex', fontSize: 32, color: '#b8b8c0' }}>{t('image.footer')}</div>
    </div>,
    size,
  )
}
