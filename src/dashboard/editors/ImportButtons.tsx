'use client'
import React, { useState } from 'react'
import { api } from '../lib/client'
import { useToast } from '../ui/Toast'

export function ImportButtons({ empty }: { empty: boolean }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  async function run(overwrite: boolean) {
    if (overwrite && !window.confirm('Reset the dashboard to the content in the code? Every change made in the dashboard since the last publish is lost.')) return
    setBusy(true)
    try {
      const r = await api<{ message: string }>(`/api/dashboard/import${overwrite ? '?overwrite=1' : ''}`, { method: 'POST', body: {} })
      toast(r.message, 'good')
      setTimeout(() => window.location.reload(), 900)
    } catch (e) {
      toast((e as Error).message, 'bad')
      setBusy(false)
    }
  }
  return (
    <div className="actions">
      <button className={`btn ${empty ? 'primary' : ''}`} disabled={busy} onClick={() => run(false)}>{busy ? 'Working...' : 'Import'}</button>
      <button className="btn danger" disabled={busy} onClick={() => run(true)}>Reset to the code&apos;s content</button>
    </div>
  )
}
