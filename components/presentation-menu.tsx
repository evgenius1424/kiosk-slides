'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Presentation } from '@/lib/presentations'

type Props = {
  items: Presentation[]
  current: Presentation
  onOpen: (id: string) => void
  onCreate: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export function PresentationMenu({ items, current, onOpen, onCreate, onRename, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const sorted = [...items].sort((a, b) => b.updatedAt - a.updatedAt)
  const close = () => { setOpen(false); setEditing(null) }
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) close() }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !editing) close() }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open, editing])
  return <div className="deck-menu" ref={rootRef}>
    <button className="deck-selector" aria-haspopup="true" aria-expanded={open} onClick={() => open ? close() : setOpen(true)}><span>{current.name}</span><ChevronDown size={14} /></button>
    {open && <div className="deck-popover" role="menu" aria-label="Presentations">
      <div className="deck-popover-heading">Presentations <span>Saved in this browser</span></div>
      <ul>{sorted.map(item => <li key={item.id} className={item.id === current.id ? 'selected' : ''}>
        {editing === item.id
          ? <RenameField name={item.name} onDone={name => { if (name) onRename(item.id, name); setEditing(null) }} />
          : <button className="deck-item" role="menuitem" onClick={() => { onOpen(item.id); close() }} onDoubleClick={() => setEditing(item.id)}><span>{item.name}</span>{item.id === current.id && <Check size={14} />}</button>}
        {editing !== item.id && <button className="icon-btn" aria-label={`Rename ${item.name}`} title="Rename" onClick={() => setEditing(item.id)}><Pencil size={13} /></button>}
        {editing !== item.id && <button className="icon-btn" aria-label={`Delete ${item.name}`} title="Delete" onClick={() => { if (confirm(`Delete “${item.name}”? This can’t be undone.`)) onDelete(item.id) }}><Trash2 size={13} /></button>}
      </li>)}</ul>
      <button className="deck-new" role="menuitem" onClick={() => { onCreate(); close() }}><Plus size={15} />New presentation</button>
    </div>}
  </div>
}

function RenameField({ name, onDone }: { name: string; onDone: (name: string) => void }) {
  const [value, setValue] = useState(name)
  const done = useRef(false)
  const finish = (next: string) => { if (done.current) return; done.current = true; onDone(next.trim()) }
  return <input className="deck-rename" aria-label="Presentation name" value={value} maxLength={80} autoFocus onFocus={e => e.target.select()} onChange={e => setValue(e.target.value)} onBlur={() => finish(value)} onKeyDown={e => {
    if (e.key === 'Enter') { e.preventDefault(); finish(value) }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish('') }
  }} />
}
