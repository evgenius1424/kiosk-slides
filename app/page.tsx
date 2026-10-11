import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { KioskWorkspace } from '@/components/kiosk-workspace'
import { copyPrompt, formatGuide } from '@/lib/chat-prompt'
import { fontFace, fonts } from '@/lib/deck'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'
import { slideStyles } from '@/lib/slide-styles'

const STRUCTURED_DATA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  creator: { '@type': 'Person', name: 'Evgenii', url: 'https://github.com/evgenius1424' },
})

export default async function Page() {
  const [example, guide, prompt] = await Promise.all([readFile(path.join(process.cwd(), 'public/example.md'), 'utf8'), formatGuide(), copyPrompt()])
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: STRUCTURED_DATA }} />
    <style>{fonts.map(f => fontFace(f, `/fonts/${f.file}`)).join('') + slideStyles}</style>
    <KioskWorkspace example={example} help={{ guide, prompt }} />
  </>
}
