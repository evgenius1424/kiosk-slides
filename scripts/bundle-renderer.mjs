import { build } from 'esbuild'

export function bundleRenderer(outfile) {
  return build({
    entryPoints: ['skills/render.ts'],
    outfile,
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
