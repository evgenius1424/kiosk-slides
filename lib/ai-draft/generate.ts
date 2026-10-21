import { parsePresentation } from '@/lib/presentation'
import { type DraftOutcome, MAX_SLIDES } from './config'
import { admitRequest } from './gate'
import { generateDraft, repairDraft } from './provider'

export async function generateFreeDraft(
  brief: string,
  clientIp: string | null,
  signal: AbortSignal,
): Promise<DraftOutcome> {
  const gateResult = await admitRequest(clientIp)
  if (gateResult !== null) {
    logEvent('blocked')
    return gateResult
  }
  logEvent('admitted')

  const firstResult = await generateDraft(brief, signal)
  if (firstResult.kind === 'refused' || firstResult.kind === 'error') {
    logEvent('provider-failed')
    return { kind: 'provider-failure' }
  }

  const firstOutcome = processSource(firstResult.text)
  if (firstOutcome !== 'repair') {
    if (firstOutcome.kind === 'presentation') {
      console.log(
        JSON.stringify({
          event: 'ai-draft',
          outcome: 'success',
          inputTokens: firstResult.inputTokens,
          outputTokens: firstResult.outputTokens,
        }),
      )
    } else {
      logEvent('invalid-output')
    }
    return firstOutcome
  }

  const repairResult = await repairDraft(firstResult.text, signal)
  if (repairResult.kind === 'refused' || repairResult.kind === 'error') {
    logEvent('provider-failed')
    return { kind: 'provider-failure' }
  }

  const repairOutcome = processSource(repairResult.text)
  if (repairOutcome === 'repair') {
    logEvent('invalid-output')
    return { kind: 'invalid-output' }
  }

  if (repairOutcome.kind === 'presentation') {
    console.log(
      JSON.stringify({
        event: 'ai-draft',
        outcome: 'success',
        inputTokens: repairResult.inputTokens,
        outputTokens: repairResult.outputTokens,
      }),
    )
  } else {
    logEvent('invalid-output')
  }
  return repairOutcome
}

function sanitiseOutput(source: string): string | null {
  if (source.includes('http://') || source.includes('https://') || source.includes('![')) {
    return null
  }
  return source
}

function extractSource(text: string): string | null {
  const start = text.lastIndexOf('<presentation>')
  if (start === -1) return null
  const end = text.indexOf('</presentation>', start)
  if (end === -1) return null
  return text.slice(start + '<presentation>'.length, end)
}

function logEvent(outcome: string): void {
  console.log(JSON.stringify({ event: 'ai-draft', outcome }))
}

function processSource(text: string): DraftOutcome | 'repair' {
  const source = extractSource(text)
  if (source === null) return 'repair'

  const sanitised = sanitiseOutput(source)
  if (sanitised === null) return { kind: 'invalid-output' }

  try {
    const presentation = parsePresentation(sanitised)
    if (presentation.slides.length > MAX_SLIDES) return { kind: 'invalid-output' }
    return { kind: 'presentation', source: sanitised }
  } catch {
    return 'repair'
  }
}
