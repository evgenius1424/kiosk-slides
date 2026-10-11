import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { build } from 'esbuild'

const SKILLS = ['skills/kiosk-slides-deck', 'skills/kiosk-slides-render']
const REFERENCES = ['FORMAT.md', 'public/example.md']

for (const skill of SKILLS) {
  await build({
    entryPoints: ['skills/render.ts'],
    outfile: `${skill}/scripts/render.mjs`,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    jsx: 'automatic',
    minify: true,
    legalComments: 'eof',
    define: { 'process.env.NODE_ENV': '"production"' },
    banner: {
      js: "import{createRequire}from'module';const require=createRequire(import.meta.url);",
    },
    logLevel: 'warning',
  })
}

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
