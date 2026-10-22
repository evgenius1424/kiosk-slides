import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getTranslations } from 'next-intl/server'
import { KioskWorkspace } from '@/components/workspace/kiosk-workspace'
import { AI_DRAFT_ENABLED } from '@/lib/ai-draft/server'
import { AUTHOR, REPO_URL } from '@/lib/author'
import { copyPrompt, slideCopyPrompt } from '@/lib/chat-prompt'
import { fontFace, fontFiles, fonts } from '@/lib/presentation'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import { slideStyles } from '@/lib/slide-styles'

const SKILL_INSTALL = process.env.SKILL_INSTALL
  ? process.env.SKILL_INSTALL === 'on'
  : process.env.VERCEL_ENV !== 'production'

const SLIDE_AI = process.env.SLIDE_AI === 'on'

const AUTHOR_ID = `${SITE_URL}/#author`

const PERSON = {
  '@type': 'Person',
  '@id': AUTHOR_ID,
  name: AUTHOR.name,
  url: AUTHOR.linkedin,
  sameAs: [AUTHOR.linkedin, AUTHOR.github],
}

const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'en',
  publisher: { '@id': AUTHOR_ID },
}

const APP = {
  '@type': 'WebApplication',
  '@id': `${SITE_URL}/#app`,
  name: SITE_NAME,
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image`,
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Presentation software',
  operatingSystem: 'Any',
  browserRequirements: 'Requires a modern web browser',
  isAccessibleForFree: true,
  license: 'https://opensource.org/licenses/MIT',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@id': AUTHOR_ID },
  creator: { '@id': AUTHOR_ID },
  sameAs: [REPO_URL],
}

export default async function Page() {
  const [example, prompt, slidePrompt, t] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/example.md'), 'utf8'),
    copyPrompt(),
    slideCopyPrompt(),
    getTranslations('Metadata'),
  ])
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [{ ...APP, description: t('description') }, WEBSITE, PERSON],
  })
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
