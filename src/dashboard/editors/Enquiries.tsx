'use client'
/** Every form submission, newest first, with a follow-up tick and a CSV download. */
import React, { useMemo, useState } from 'react'
import { api } from '../lib/client'
import { useToast } from '../ui/Toast'
import { when } from '../lib/format'
import { Icon } from '../ui/icons'

export type Enquiry = {
  id: number | string; createdAt: string; name: string; phone: string; email: string; service: string
  message: string; page: string; emailStatus: string; followedUp: boolean; notes?: string
  kind?: string; source?: string; crmStatus?: string
}

const STATUS: Record<string, [string, string]> = {
  sent: ['Emailed', 'good'], failed: ['Email failed', 'bad'], 'not-configured': ['Email not set up', 'warn'],
}


export function EnquiriesTable({ initial }: { initial: Enquiry[] }) {
  const toast = useToast()
  const [rows, setRows] = useState(initial)
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'todo' | 'price-list'>('all')
  const [q, setQ] = useState('')
  const shown = useMemo(() => rows.filter((r) => (filter === 'all' || (filter === 'todo' ? !r.followedUp : r.kind === 'price-list')) &&
    (!q || `${r.name} ${r.email} ${r.phone} ${r.service} ${r.message}`.toLowerCase().includes(q.toLowerCase()))), [rows, filter, q])
  async function follow(r: Enquiry, v: boolean) {
    setRows((x) => x.map((y) => (y.id === r.id ? { ...y, followedUp: v } : y)))
    try { await api(`/api/enquiries/${r.id}?depth=0`, { method: 'PATCH', body: { followedUp: v } }) } catch (e) { toast((e as Error).message, 'bad') }
  }
  async function note(r: Enquiry, notes: string) {
    try { await api(`/api/enquiries/${r.id}?depth=0`, { method: 'PATCH', body: { notes } }); toast('Note saved.', 'good') } catch (e) { toast((e as Error).message, 'bad') }
  }
  return (
    <>
      <div className="actions" style={{ marginBottom: 12 }}>
        <div className="tabs" style={{ margin: 0, border: 0 }}>
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All ({rows.length})</button>
          <button className={filter === 'todo' ? 'on' : ''} onClick={() => setFilter('todo')}>Not followed up ({rows.filter((r) => !r.followedUp).length})</button>
          <button className={filter === 'price-list' ? 'on' : ''} onClick={() => setFilter('price-list')}>Price list downloads ({rows.filter((r) => r.kind === 'price-list').length})</button>
        </div>
        <span style={{ flex: 1 }} />
        <input className="input search" placeholder="Search enquiries" value={q} onChange={(e) => setQ(e.target.value)} />
        <a className="btn" href="/api/dashboard/enquiries-csv">{Icon.download()} Download for Excel (CSV)</a>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Received</th><th>Name</th><th>Contact</th><th>About</th><th>Page</th><th>Email</th><th>Followed up</th></tr></thead>
          <tbody>
            {!shown.length ? <tr><td colSpan={7} className="empty">No enquiries to show.</td></tr> : null}
            {shown.map((r) => (
              <React.Fragment key={r.id}>
                <tr>
                  <td className="muted">{when(r.createdAt)}</td>
                  <td><button className="btn ghost small t-title" onClick={() => setOpen(open === String(r.id) ? null : String(r.id))}>{r.name}</button></td>
                  <td><a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}>{r.phone}</a><br /><a href={`mailto:${r.email}`}>{r.email}</a></td>
                  <td>{r.kind === 'price-list' ? <span className="chip blue">Price list</span> : r.service}</td>
                  <td className="muted">{r.page || '-'}</td>
                  <td><span className={`chip ${STATUS[r.emailStatus]?.[1] ?? 'grey'}`}>{STATUS[r.emailStatus]?.[0] ?? r.emailStatus}</span></td>
                  <td><label className="check"><input type="checkbox" checked={r.followedUp} onChange={(e) => follow(r, e.target.checked)} /><span className="sr-only">Followed up</span></label></td>
                </tr>
                {open === String(r.id) ? (
                  <tr><td colSpan={7} style={{ background: '#fafbfc' }}>
                    {r.kind === 'price-list'
                      ? <p style={{ whiteSpace: 'pre-wrap' }}><b>Price list request.</b> {r.crmStatus ? `(${r.crmStatus})` : ''}{'\n'}{r.source || ''}</p>
                      : <p style={{ whiteSpace: 'pre-wrap' }}><b>Message:</b> {r.message || '(no message)'}</p>}
                    <div className="field"><label>Notes for the team</label>
                      <textarea className="textarea" defaultValue={r.notes || ''} onBlur={(e) => { if (e.target.value !== (r.notes || '')) note(r, e.target.value) }} /></div>
                  </td></tr>
                ) : null}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
