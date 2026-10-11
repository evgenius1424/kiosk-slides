import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { build } from 'esbuild'

const SKILL = 'skills/kiosk-slides'
const REFERENCES = ['FORMAT.md', 'public/example.md']

await build({
  entryPoints: ['skills/render.ts'],
  outfile: `${SKILL}/scripts/render.mjs`,
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

await mkdir(`${SKILL}/references`, { recursive: true })
for (const file of REFERENCES) await copyFile(file, `${SKILL}/references/${file.split('/').pop()}`)

const fonts = (await readdir('public/fonts')).filter(file => file.endsWith('.woff2'))
await mkdir(`${SKILL}/assets/fonts`, { recursive: true })
for (const file of [...fonts, 'LICENSE.md'])
  await copyFile(`public/fonts/${file}`, `${SKILL}/assets/fonts/${file}`)

console.log(`Built ${SKILL}`)
