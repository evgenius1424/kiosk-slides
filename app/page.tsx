import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { KioskWorkspace } from '@/components/kiosk-workspace'
import { slideStyles } from '@/lib/slide-styles'

export default async function Page() {
  const source = await readFile(path.join(process.cwd(), 'public/example.md'), 'utf8')
  return <>
    <style>{slideStyles}</style>
    <KioskWorkspace initialSource={source} />
  </>
}
