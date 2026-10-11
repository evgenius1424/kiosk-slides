import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { bundleRenderer } from './bundle-renderer.mjs'

const SKILLS = ['skills/kiosk-slides-deck', 'skills/kiosk-slides-render']
const REFERENCES = ['FORMAT.md', 'public/example.md']

for (const skill of SKILLS) await bundleRenderer(`${skill}/scripts/render.mjs`)

await mkdir('skills/kiosk-slides-deck/references', { recursive: true })
for (const file of REFERENCES)
  await copyFile(file, `skills/kiosk-slides-deck/references/${file.split('/').pop()}`)

const fonts = (await readdir('public/fonts')).filter(file => file.endsWith('.woff2'))
for (const skill of SKILLS) {
  await mkdir(`${skill}/assets/fonts`, { recursive: true })
  for (const file of [...fonts, 'LICENSE.md'])
    await copyFile(`public/fonts/${file}`, `${skill}/assets/fonts/${file}`)
}

console.log(`Built ${SKILLS.join(', ')}`)
