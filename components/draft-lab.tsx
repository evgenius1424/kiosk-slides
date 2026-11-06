'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { parsePresentation, type Presentation } from '@/lib/presentation'
import { headingText } from '@/lib/presentation/heading'

export type LabVariant = 'now' | 'count' | 'messages' | 'outline' | 'live'

export const LAB_SAMPLE = `---
title: Our four-day week
---

<!--
title: Opening
label: All-hands
footer: Starting with the product team on 3 November.
-->

# We're moving to a
**four-day week**

Same goals, same pay. Fridays off.

---

<!--
title: Why
label: The reason
footer: From our spring team survey.
-->

# Rested teams **ship better work**

<!-- metric -->
**71%**
of us said Friday is our least focused day

---

<!--
title: How
label: The plan
footer: We review it together after the first month.
-->

# How we'll make it **work**

1. Fewer, shorter meetings, none on Monday morning.
2. One shared focus goal for each week.
3. Support stays covered on a rotating rota.

---

<!--
title: Change
label: Before / after
footer: The work stays the same. The waste goes.
-->

# Less busy, **more done**

| Before                           | After                        |
| -------------------------------- | ---------------------------- |
| Five days, half of them meetings | Four days with time to think |

---

<!--
title: Pilot
label: What we tried
footer: Eight weeks with two volunteer teams.
-->

# The pilot **worked**

<!-- metric -->
**+12%**
more work shipped, with fewer late evenings

---

<!--
title: Risks
label: Honest limits
-->

# What we'll **watch**

- Customer replies on Fridays
- Deadlines that land on a Friday
- Anyone working the fifth day anyway

---

<!--
title: Next
label: Timeline
footer: Questions go to the all-hands channel.
-->

# What happens **next**

- [x] Leadership sign-off
- [x] Support rota agreed
- [ ] First four-day week
- [ ] Review after one month

---

<!--
title: Close
label: Thank you
-->

# Questions? **Ask anything.**
`

export const LAB_MESSAGES = [
  'Reading your topic…',
  'Planning the story…',
  'Writing the slides…',
  'Choosing charts and lists…',
  'Checking that every slide fits…',
]

export function labVariant(): LabVariant | null {
  if (typeof window === 'undefined') return null
  return (new URLSearchParams(window.location.search).get('lab') as LabVariant) || null
}

export function useFakeStream(active: boolean, text = LAB_SAMPLE, ms = 14000, delay = 1600) {
  const [length, setLength] = useState(0)
  useEffect(() => {
    if (!active) return setLength(0)
    const started = performance.now() + delay
    const timer = setInterval(() => {
      const t = Math.max(0, performance.now() - started) / ms
      setLength(Math.min(text.length, Math.round(t * text.length)))
    }, 60)
    return () => clearInterval(timer)
  }, [active, text, ms, delay])
  return { text: text.slice(0, length), done: active && length >= text.length }
}

export function useFinishedSlides(text: string, done: boolean) {
  return useMemo(() => finishedSlides(text, done), [text, done])
}

export function useRotating(active: boolean, items: string[], ms = 2600) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (!active) return setIndex(0)
    const timer = setInterval(() => setIndex(i => Math.min(items.length - 1, i + 1)), ms)
    return () => clearInterval(timer)
  }, [active, items, ms])
  return items[index]
}

export function writingLabel(count: number, total: number | undefined, done: boolean) {
  if (done) return 'Putting it together…'
  if (count === 0) return 'Planning your slides…'
  return total ? `Writing slide ${count + 1} of ${total}…` : `Writing slide ${count + 1}…`
}

export function SlideOutline({
  titles,
  writing,
  limit = 4,
}: {
  titles: string[]
  writing: string
  limit?: number
}) {
  return (
    <ol className="lab-outline" role="status">
      {titles.slice(-limit).map((title, i) => (
        <li key={i}>
          <Check size={13} />
          <span>{title}</span>
        </li>
      ))}
      <li className="lab-outline-current">
        <span className="chat-spinner" />
        <span>{writing}</span>
      </li>
    </ol>
  )
}

export function slideHeadings(presentation: Presentation | null) {
  return presentation?.slides.map(slide => headingText(slide.heading)) ?? []
}

export function finishedSource(text: string) {
  const body = text.replace(/\r/g, '')
  const cut = lastSeparator(body)
  return cut > 0 ? body.slice(0, cut) : ''
}

function finishedSlides(text: string, done: boolean): Presentation | null {
  const source = done ? text : finishedSource(text)
  if (!source) return null
  try {
    return parsePresentation(source)
  } catch {
    return null
  }
}

function lastSeparator(text: string) {
  const frontMatterEnd = text.startsWith('---\n') ? text.indexOf('\n---\n', 3) + 5 : 0
  const at = text.lastIndexOf('\n---\n')
  return at >= frontMatterEnd && frontMatterEnd >= 0 ? at : -1
}
