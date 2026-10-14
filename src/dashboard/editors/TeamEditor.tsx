'use client'
/** Add, edit, reorder and hide the people on the Meet the Team page. */
import React, { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '../lib/client'
import { AutoTextarea, Notice, TextInput, Toggle, useUnsavedWarning } from '../ui/fields'
import { ImageSlot } from '../ui/MediaPicker'
import { PublishButton } from '../ui/PublishButton'
import { useToast } from '../ui/Toast'
import { Icon } from '../ui/icons'

export type Member = {
  id?: number | string
  tmp?: string
  name: string; role: string; qualifications: string; photo: string; photoMedia: number | string | null
  photoAlt: string; bio: string; profileUrl: string; profileLinkText: string; hidden: boolean; order: number
  registrationType: string; registrationNumber: string
}

const keyOf = (m: Member) => String(m.id ?? m.tmp)

function Row({ m, open, onToggle, onChange, onRemove }: { m: Member; open: boolean; onToggle: () => void; onChange: (p: Partial<Member>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: keyOf(m) })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`sec${open ? ' open' : ''}${isDragging ? ' dragging' : ''}${m.hidden ? ' is-hidden' : ''}`}>
      <div className="sec-head" onClick={onToggle}>
        <button type="button" className="handle" aria-label={`Drag to move ${m.name || 'this person'}`} {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>{Icon.grip()}</button>
        {m.photo ? <img src={m.photo} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} /> : null}
        <span className="sec-title">{m.name || 'New team member'} <span className="help" style={{ fontWeight: 400 }}>{m.role}</span></span>
        {m.registrationNumber ? <span className="chip grey">{m.registrationNumber}</span> : null}
        {m.hidden ? <span className="chip warn">Hidden</span> : null}
        <button type="button" className="btn small ghost" onClick={(e) => { e.stopPropagation(); onChange({ hidden: !m.hidden }) }}>{m.hidden ? Icon.eye() : Icon.eyeOff()} {m.hidden ? 'Show' : 'Hide'}</button>
        <span className="chev">{Icon.chevron()}</span>
      </div>
      {open ? (
        <div className="sec-body">
          <div className="row">
            <TextInput label="Name" value={m.name} onChange={(v) => onChange({ name: v })} />
            <TextInput label="Role" value={m.role} onChange={(v) => onChange({ role: v })} help="For example Principal Dentist or Dental Assistant." />
          </div>
          <TextInput label="Qualifications (optional)" value={m.qualifications} onChange={(v) => onChange({ qualifications: v })}
            help="Exactly as on the practitioner's registration. Leave blank for non-clinical staff." />
          <div className="row">
            <TextInput label="Registration type (practitioners only)" value={m.registrationType} onChange={(v) => onChange({ registrationType: v })}
              help="As on the AHPRA public register, for example General Dentist or Oral Health Therapist." />
            <TextInput label="AHPRA registration number" value={m.registrationNumber} onChange={(v) => onChange({ registrationNumber: v.trim().toUpperCase() })} placeholder="DEN0000000000"
              help="Shown in the website footer and on the team card. Check it on the public register first. Leave blank for non-clinical staff." />
          </div>
          <ImageSlot label="Photo" value={m.photo} onChange={(v) => onChange({ photo: v.value, photoMedia: v.media })} />
          <TextInput label="Photo description (alt text)" value={m.photoAlt} onChange={(v) => onChange({ photoAlt: v })} help="For example: Lizzy, Oral Health Therapist at Precision Dental" />
          <div className="field"><label>About this person</label>
            <AutoTextarea value={m.bio} onChange={(v) => onChange({ bio: v })} rows={4} />
            <div className="help">Leave an empty line between paragraphs. No patient testimonials.</div></div>
          <div className="row">
            <TextInput label="Profile page (optional)" value={m.profileUrl} onChange={(v) => onChange({ profileUrl: v.trim() })} help="For example /our-team/dentist-fortitude-valley-dr-billy-choi/" />
            <TextInput label="Profile link wording" value={m.profileLinkText} onChange={(v) => onChange({ profileLinkText: v })} />
          </div>
          <Toggle label="Hide this person from the website" checked={m.hidden} onChange={(v) => onChange({ hidden: v })} />
          <button className="btn danger small" onClick={onRemove}>{Icon.trash()} Remove from the team</button>
        </div>
      ) : null}
    </div>
  )
}

export function TeamEditor({ initial }: { initial: Member[] }) {
  const toast = useToast()
  const [team, setTeam] = useState<Member[]>(initial)
  const [removed, setRemoved] = useState<(number | string)[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  useUnsavedWarning(dirty)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const change = (k: string, p: Partial<Member>) => { setTeam((t) => t.map((m) => (keyOf(m) === k ? { ...m, ...p } : m))); setDirty(true) }
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const a = team.findIndex((m) => keyOf(m) === e.active.id)
    const b = team.findIndex((m) => keyOf(m) === e.over!.id)
    setTeam(arrayMove(team, a, b))
    setDirty(true)
  }
  function add() {
    const tmp = `new-${Date.now()}`
    setTeam((t) => [...t, { tmp, name: '', role: '', qualifications: '', photo: '', photoMedia: null, photoAlt: '', bio: '', profileUrl: '', profileLinkText: '', hidden: false, order: t.length + 1, registrationType: '', registrationNumber: '' }])
    setOpen(tmp)
    setDirty(true)
  }
  function remove(m: Member) {
    if (!window.confirm(`Remove ${m.name || 'this person'} from the team? To keep them for later, use Hide instead.`)) return
    if (m.id) setRemoved((r) => [...r, m.id!])
    setTeam((t) => t.filter((x) => keyOf(x) !== keyOf(m)))
    setDirty(true)
  }
  async function save() {
    if (team.some((m) => !m.name.trim())) { toast('Every team member needs a name.', 'bad'); return }
    setBusy(true)
    try {
      for (const id of removed) await api(`/api/team/${id}`, { method: 'DELETE' })
      const next: Member[] = []
      for (const [i, m] of team.entries()) {
        const data = {
          name: m.name.trim(), role: m.role, qualifications: m.qualifications, photo: m.photo, photoMedia: m.photoMedia ?? null,
          photoAlt: m.photoAlt, bio: m.bio, profileUrl: m.profileUrl, profileLinkText: m.profileLinkText, hidden: m.hidden, order: i + 1,
          registrationType: m.registrationType, registrationNumber: m.registrationNumber,
        }
        if (m.id) {
          const before = initial.find((x) => x.id === m.id)
          const same = before && JSON.stringify({ ...before, order: i + 1, tmp: undefined }) === JSON.stringify({ ...m, order: i + 1, tmp: undefined }) && before.order === i + 1
          if (!same) await api(`/api/team/${m.id}?depth=0`, { method: 'PATCH', body: data })
          next.push({ ...m, order: i + 1 })
        } else {
          const r = await api<{ doc: { id: number } }>('/api/team?depth=0', { method: 'POST', body: data })
          next.push({ ...m, id: r.doc.id, tmp: undefined, order: i + 1 })
        }
      }
      setTeam(next)
      setRemoved([])
      setDirty(false)
      toast('Team saved. Press Publish website to put it live.', 'good')
    } catch (e) {
      toast((e as Error).message, 'bad')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Notice tone="info" icon={Icon.info()}><p>Names, roles and qualifications must come from the practice and match each practitioner&apos;s public registration. Photos of non-dentist staff only with their approval.</p></Notice>
      <div className="sections">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={team.map(keyOf)} strategy={verticalListSortingStrategy}>
            {team.map((m) => (
              <Row key={keyOf(m)} m={m} open={open === keyOf(m)} onToggle={() => setOpen(open === keyOf(m) ? null : keyOf(m))}
                onChange={(p) => change(keyOf(m), p)} onRemove={() => remove(m)} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="actions">
          <button className="btn" onClick={add}>{Icon.plus()} Add a team member</button>
          <span style={{ flex: 1 }} />
          <span className="help" style={{ color: dirty ? 'var(--pd-warn)' : undefined }}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <button className="btn primary" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving...' : 'Save team'}</button>
          <PublishButton />
        </div>
      </div>
    </>
  )
}
