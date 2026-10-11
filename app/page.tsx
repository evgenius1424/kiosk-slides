import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { KioskWorkspace } from '@/components/kiosk-workspace'
import { copyPrompt, formatGuide } from '@/lib/chat-prompt'
import { slideStyles } from '@/lib/slide-styles'

export default async function Page() {
  const [example, guide, prompt] = await Promise.all([readFile(path.join(process.cwd(), 'public/example.md'), 'utf8'), formatGuide(), copyPrompt()])
  return <>
    <style>{slideStyles}</style>
    <KioskWorkspace example={example} help={{ guide, prompt }} />
  </>
}
