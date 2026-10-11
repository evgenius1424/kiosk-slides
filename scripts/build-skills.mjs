import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { bundleRenderer } from './bundle-renderer.mjs'

const SKILL = 'skills/kiosk-slides'
const REFERENCES = ['FORMAT.md', 'public/example.md']

await bundleRenderer(`${SKILL}/scripts/render.mjs`)

await mkdir(`${SKILL}/references`, { recursive: true })
for (const file of REFERENCES) await copyFile(file, `${SKILL}/references/${file.split('/').pop()}`)

const fonts = (await readdir('public/fonts')).filter(file => file.endsWith('.woff2'))
await mkdir(`${SKILL}/assets/fonts`, { recursive: true })
for (const file of [...fonts, 'LICENSE.md'])
  await copyFile(`public/fonts/${file}`, `${SKILL}/assets/fonts/${file}`)

console.log(`Built ${SKILL}`)
