import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const TLA_VERSION = '1.8.0'
const JAR_URL = `https://github.com/tlaplus/tlaplus/releases/download/v${TLA_VERSION}/tla2tools.jar`
const SPECS = 'specs'
const BEFORE = /Before\w*$/
const CACHE = join('node_modules', '.cache', 'tla')
const JAR = resolve(CACHE, `tla2tools-${TLA_VERSION}.jar`)

const only = process.argv[2]
await ensureJar()
const configs = readdirSync(SPECS)
  .filter(file => file.endsWith('.cfg') && (!only || file.startsWith(only)))
  .sort()
let failed = 0
for (const config of configs) {
  const name = config.replace(/\.cfg$/, '')
  const expectBug = BEFORE.test(name)
  const result = check(name.replace(BEFORE, ''), config)
  const ok = expectBug ? result.violated : result.passed
  if (!ok) failed++
  const verdict = expectBug
    ? result.violated
      ? `finds the bug: ${result.violated}`
      : 'expected a counterexample and found none'
    : result.passed
      ? `holds (${result.states} states)`
      : `FAILS: ${result.violated ?? 'see output below'}`
  console.log(`${ok ? '✓' : '✗'} ${name}: ${verdict}`)
  if (!ok || process.env.VERBOSE) console.log(result.output)
}
process.exit(failed ? 1 : 0)

function check(module, config) {
  const { stdout, stderr } = spawnSync(
    'java',
    [
      '-XX:+UseParallelGC',
      '-cp',
      JAR,
      'tlc2.TLC',
      '-config',
      config,
      '-workers',
      'auto',
      '-deadlock',
      '-noGenerateSpecTE',
      '-metadir',
      mkdtempSync(join(tmpdir(), 'tlc-')),
      `${module}.tla`,
    ],
    { cwd: SPECS, encoding: 'utf8' },
  )
  const output = `${stdout}${stderr}`
  return {
    output,
    passed: output.includes('No error has been found'),
    violated:
      output.match(/(Invariant|Action property|Temporal properties?) (\w+ )?(is )?violated/)?.[0] ??
      null,
    states: [...output.matchAll(/(\d+) distinct states found/g)].at(-1)?.[1],
  }
}

async function ensureJar() {
  if (existsSync(JAR)) return
  mkdirSync(CACHE, { recursive: true })
  const response = await fetch(JAR_URL)
  if (!response.ok) throw new Error(`Couldn't download ${JAR_URL}: ${response.status}`)
  writeFileSync(JAR, Buffer.from(await response.arrayBuffer()))
}
