import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getTranslations } from 'next-intl/server'
import { KioskWorkspace } from '@/components/workspace/kiosk-workspace'
import { AI_DRAFT_ENABLED } from '@/lib/ai-draft/server'
import { copyPrompt, slideCopyPrompt } from '@/lib/chat-prompt'
import { fontFace, fontFiles, fonts } from '@/lib/presentation'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import { slideStyles } from '@/lib/slide-styles'

const SKILL_INSTALL = process.env.SKILL_INSTALL
  ? process.env.SKILL_INSTALL === 'on'
  : process.env.VERCEL_ENV !== 'production'

const SLIDE_AI = process.env.SLIDE_AI === 'on'

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  creator: { '@type': 'Person', name: 'Evgenii', url: 'https://github.com/evgenius1424' },
}

export default async function Page() {
  const [example, prompt, slidePrompt, t] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/example.md'), 'utf8'),
    copyPrompt(),
    slideCopyPrompt(),
    getTranslations('Metadata'),
  ])
  const structuredData = JSON.stringify({ ...STRUCTURED_DATA, description: t('description') })
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <style>
        {fontFiles(fonts)
          .map(f => fontFace(f, `/fonts/${f.file}`))
          .join('') + slideStyles}
      </style>
      <KioskWorkspace
        example={example}
        prompt={prompt}
        slidePrompt={slidePrompt}
        site={SITE_URL}
        skillInstall={SKILL_INSTALL}
        slideAi={SLIDE_AI}
        freeDraft={AI_DRAFT_ENABLED}
      />
    </>
  )
}
