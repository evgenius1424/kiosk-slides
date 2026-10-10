import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { KioskWorkspace } from '@/components/kiosk-workspace'

export default async function Page() {
  const source = await readFile(path.join(process.cwd(), 'public/example.md'), 'utf8')
  return <KioskWorkspace initialSource={source} />
}
