import { access } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import claudeManifest from '@/.claude-plugin/plugin.json'
import claudeMarketplace from '@/.claude-plugin/marketplace.json'
import codexMarketplace from '@/.agents/plugins/marketplace.json'
import portableManifest from '@/plugin.json'

describe('agent plugin package', () => {
  it('has a portable manifest and a Codex marketplace entry', async () => {
    expect(portableManifest).toMatchObject({
      name: 'kiosk-slides',
      version: claudeManifest.version,
      description: claudeManifest.description,
    })
    expect(codexMarketplace).toMatchObject({
      name: 'kiosk-slides',
      plugins: [
        {
          name: portableManifest.name,
          source: { source: 'local', path: './' },
          policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
        },
      ],
    })
    await expect(access('skills/kiosk-slides/SKILL.md')).resolves.toBeUndefined()
  })

  it('keeps the Claude marketplace pointed at the same skill', () => {
    expect(claudeMarketplace).toMatchObject({
      name: 'kiosk-slides',
      plugins: [{ name: portableManifest.name, source: './' }],
    })
    expect(claudeManifest.skills).toEqual(['./skills/kiosk-slides'])
  })
})
