import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Presentation } from '@/lib/presentation'
import { downloadFile } from '../download'
import type { DownloadFormat } from '../download-menu'
import type { Notice } from './toast'

export function useDownload({
  presentation,
  name,
  shareSafe,
  site,
  notice,
}: {
  presentation: Presentation
  name: string
  shareSafe: boolean
  site: string
  notice: Notice
}) {
  const t = useTranslations('Workspace')
  const [busy, setBusy] = useState(false)
  const download = async (format: DownloadFormat) => {
    setBusy(true)
    try {
      const { presentationHtml, fetchAsDataUrl } = await import('../slide/presentation-html')
      const html = await presentationHtml(
        { ...presentation, title: name },
        {
          shareSafe,
          site,
          embedImage: fetchAsDataUrl,
          embedFont: file => fetchAsDataUrl(`/fonts/${file}`),
        },
      )
      if (format === 'pdf') {
        const { presentationPdf } = await import('../presentation-pdf')
        downloadFile(await presentationPdf(html, name), `${fileName(name)}.pdf`)
        notice(t('toast.pdfDownloaded'))
      } else {
        downloadFile(html, `${fileName(name)}.html`, 'text/html')
        notice(t('toast.downloaded'))
      }
    } catch (err) {
      notice((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return { busy, download }
}

function fileName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'kiosk-slides'
  )
}
