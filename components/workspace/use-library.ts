import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { sameApartFromStyle, withLastStyle } from '@/lib/last-style'
import { parsePresentation } from '@/lib/presentation'
import {
  createPresentation,
  loadLibrary,
  pastedPresentation,
  presentationName,
  refreshLibrary,
  saveLibrary,
  STORAGE_KEY,
  uniqueName,
  type Library,
} from '@/lib/presentations'
import { decodeShare, readShareHash } from '@/lib/share'
import { resumingStart } from '../start-screen'
import type { Notice } from './toast'
import type { Versions } from './use-versions'

export function useLibrary({
  example,
  blank,
  untitled,
  source,
  versions,
  show,
  restartChat,
  onStart,
  notice,
}: {
  example: string
  blank: string
  untitled: string
  source: string
  versions: Versions
  show: (source: string, hash?: string) => void
  restartChat: () => void
  onStart: (start: 'first' | 'new') => void
  notice: Notice
}) {
  const t = useTranslations('Workspace')
  const [library, setLibrary] = useState<Library>(() => ({
    current: 'example',
    items: [
      {
        id: 'example',
        name: presentationName(example) || untitled,
        source: example,
        userNamed: true,
        updatedAt: 0,
      },
    ],
  }))
  const [loaded, setLoaded] = useState(false)
  const [shared, setShared] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)
  const current = library.items.find(p => p.id === library.current) ?? library.items[0]
  const isBlank = (value: string) => sameApartFromStyle(value, blank)
  const openRef = useRef({ show, onStart })
  const baseRef = useRef(library)
  const latestRef = useRef({ library, source, shared })
  useEffect(() => {
    openRef.current = { show, onStart }
    latestRef.current = { library, source, shared }
  })
  const adopt = (next: Library) => {
    const { source, shared } = latestRef.current
    setLibrary(next)
    const shown = next.items.find(p => p.id === next.current)
    if (!shared && shown && shown.source !== source)
      openRef.current.show(shown.source, location.hash)
  }

  useEffect(() => {
    const { show, onStart } = openRef.current
    const next = loadLibrary(withLastStyle(blank), untitled)
    baseRef.current = next
    setLibrary(next)
    const link = readShareHash(location.hash)
    if (!link) {
      const first = next.items.length === 1 && sameApartFromStyle(next.items[0].source, blank)
      if (resumingStart() || first) onStart(first ? 'first' : 'new')
      show(next.items.find(p => p.id === next.current)!.source, location.hash)
      setLoaded(true)
      return
    }
    decodeShare(link.payload)
      .then(value => {
        parsePresentation(value)
        const known = next.items.find(p => p.source === value)
        if (known) setLibrary({ ...next, current: known.id })
        else setShared(link.payload)
        show(value, link.slide)
      })
      .catch(() => setBroken(true))
      .finally(() => setLoaded(true))
  }, [blank, untitled])
  useEffect(() => {
    if (!loaded) return
    const saved = saveLibrary(baseRef.current, library)
    baseRef.current = saved
    if (saved !== library) adopt(saved)
  }, [library, loaded])
  useEffect(() => {
    if (!loaded) return
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const { base, library } = refreshLibrary(baseRef.current, latestRef.current.library)
      baseRef.current = base
      if (library !== latestRef.current.library) adopt(library)
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [loaded])
  useEffect(() => {
    if (shared) return
    setLibrary(l => ({
      ...l,
      items: l.items.map(p =>
        p.id === l.current && p.source !== source ? { ...p, source, updatedAt: Date.now() } : p,
      ),
    }))
  }, [source, shared])

  const open = (id: string) => {
    const target = library.items.find(p => p.id === id)
    if (!target || id === current.id) return
    setLibrary(l => ({ ...l, current: id }))
    show(target.source)
    restartChat()
  }
  const addBlank = () => {
    if (isBlank(current.source)) return current
    const created = createPresentation(untitled, withLastStyle(blank), library.items)
    setLibrary(l => ({ current: created.id, items: [...l.items, created] }))
    show(created.source)
    return created
  }
  const openExample = () => {
    const name = presentationName(example) || untitled
    const reuse = isBlank(current.source)
    const target = {
      ...(reuse ? current : createPresentation(name, example, library.items)),
      name: uniqueName(name, library.items, reuse ? current.id : undefined),
      source: example,
      userNamed: true,
      updatedAt: Date.now(),
    }
    setLibrary(l => ({
      current: target.id,
      items: reuse ? l.items.map(p => (p.id === target.id ? target : p)) : [...l.items, target],
    }))
    show(example)
    restartChat()
  }
  const rename = (id: string, name: string) =>
    setLibrary(l => ({
      ...l,
      items: l.items.map(p =>
        p.id === id ? { ...p, name: uniqueName(name, l.items, id), userNamed: true } : p,
      ),
    }))
  const remove = (id: string) => {
    versions.forget(id)
    const rest = library.items.filter(p => p.id !== id)
    if (id !== current.id) {
      setLibrary(l => ({ ...l, items: rest }))
      return
    }
    const next =
      rest.sort((a, b) => b.updatedAt - a.updatedAt)[0] ??
      createPresentation(untitled, withLastStyle(blank), [])
    setLibrary({ current: next.id, items: rest.length ? rest : [next] })
    show(next.source)
    restartChat()
  }
  const paste = (pasted: string) => {
    const value = withLastStyle(pasted)
    const previous = current
    const name = presentationName(value) || untitled
    const reuse = isBlank(previous.source)
    if (reuse) versions.remember(previous.id, source)
    const target = reuse
      ? {
          ...previous,
          name: previous.userNamed ? previous.name : uniqueName(name, library.items, previous.id),
          source: value,
          updatedAt: Date.now(),
        }
      : createPresentation(name, value, library.items)
    setLibrary(l => ({
      current: target.id,
      items: reuse ? l.items.map(p => (p.id === target.id ? target : p)) : [...l.items, target],
    }))
    setShared(null)
    show(value)
    restartChat()
    notice(t('toast.pasted', { name: target.name }), {
      label: t('toast.undo'),
      run: () => {
        setLibrary(l => ({
          current: previous.id,
          items: reuse
            ? l.items.map(p => (p.id === previous.id ? previous : p))
            : l.items.filter(p => p.id !== target.id),
        }))
        show(previous.source)
        restartChat()
      },
    })
  }
  const generated = (answer: string, fresh: boolean, latest: string) => {
    const value = fresh ? withLastStyle(answer) : answer
    const name = presentationName(value) || untitled
    const reuse = !fresh || isBlank(current.source)
    if (reuse) versions.remember(current.id, latest)
    const target = reuse
      ? {
          ...current,
          name: current.userNamed ? current.name : uniqueName(name, library.items, current.id),
        }
      : createPresentation(name, value, library.items)
    setLibrary(l => ({
      current: target.id,
      items: reuse
        ? l.items.map(p =>
            p.id === target.id
              ? {
                  ...p,
                  name: p.userNamed ? p.name : target.name,
                  source: value,
                  updatedAt: Date.now(),
                }
              : p,
          )
        : [...l.items, target],
    }))
    return { name: target.name, reuse, value }
  }
  const keep = () => {
    const known = library.items.find(p => p.source === source)
    const kept =
      known ?? createPresentation(presentationName(source) || untitled, source, library.items)
    setLibrary(l => ({
      current: kept.id,
      items: known ? l.items : [...l.items.filter(p => !isBlank(p.source)), kept],
    }))
    setShared(null)
    restartChat()
    notice(t('toast.kept', { name: kept.name }))
  }

  return {
    items: library.items,
    current,
    loaded,
    shared,
    broken,
    open,
    addBlank,
    openExample,
    rename,
    remove,
    paste,
    generated,
    keep,
  }
}

export function usePasteAnywhere(onPaste: (value: string) => void) {
  const pasteRef = useRef(onPaste)
  useEffect(() => {
    pasteRef.current = onPaste
  })
  useEffect(() => {
    const handler = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest?.('input,textarea,select,dialog,[contenteditable]')) return
      const value = pastedPresentation(event.clipboardData?.getData('text/plain') ?? '')
      if (value === null) return
      event.preventDefault()
      pasteRef.current(value)
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [])
}
