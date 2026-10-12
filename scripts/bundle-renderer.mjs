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
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.NEXT_PUBLIC_SITE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SITE_URL ?? ''),
      'process.env.VERCEL_ENV': '""',
      'process.env.VERCEL_BRANCH_URL': '""',
      'process.env.VERCEL_PROJECT_PRODUCTION_URL': '""',
    },
    banner: {
      js: "import{createRequire}from'module';const require=createRequire(import.meta.url);",
    },
    logLevel: 'warning',
  })
}
