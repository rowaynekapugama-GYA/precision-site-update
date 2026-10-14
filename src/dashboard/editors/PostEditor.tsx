'use client'
/** Write, edit, publish, unpublish and delete a blog post. */
import React, { useMemo, useState } from 'react'
import { api } from '../lib/client'
import { textForEditing, textForSaving } from '../lib/text'
import { autoExcerpt, autoMinutes, CTA_MARKER } from '../../render/posts'
import { friendlyToTokens, slugify, todayBrisbane, tokensToFriendly, unescapeHtml } from '../../render/util'
import { AutoTextarea, Notice, TextInput, Toggle, useUnsavedWarning } from '../ui/fields'
import { ImageSlot } from '../ui/MediaPicker'
import { SeoPanel, type SeoState } from '../ui/SeoPanel'
import { PublishButton } from '../ui/PublishButton'
import { useToast } from '../ui/Toast'
import { Icon } from '../ui/icons'
import { BodyEditor } from './BodyEditor'

export type PostDoc = {
  id?: number | string
  slug: string
  title: string
  status: 'published' | 'draft'
  order: number
  published: string
  author: string
  categories: string[]
  readMinutes: number
  excerpt: string
  image: string
  imageMedia: number | string | null
  imageAlt: string
  imageCaption: string
  body: string
  faq: { q: string; a: string[] }[]
  risk: boolean
  related: string[]
  seo: SeoState
}

type Opt = { slug: string; title: string }

export function AhpraReminder() {
  return (
    <div className="panel ahpra">
      <h3 style={{ marginBottom: 6 }}>Before you publish: advertising rules for dental practices (AHPRA)</h3>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        <li>No testimonials or patient reviews about clinical care.</li>
        <li>No claims such as &ldquo;pain-free&rdquo;, &ldquo;guaranteed&rdquo;, &ldquo;best&rdquo; or &ldquo;expert&rdquo;, and no wording that pressures people to act quickly. {/* qa:allow: this reminder quotes the words to avoid */}</li>
        <li>Any offer must state the exact price, what is included and the dates it runs.</li>
        <li>Posts about surgical or invasive treatment need the risk statement: tick the box under Disclaimers.</li>
      </ul>
    </div>
  )
}

export function PostEditor({ initial, categories, posts, isNew }: { initial: PostDoc; categories: string[]; posts: Opt[]; isNew: boolean }) {
  const toast = useToast()
  const [p, setP] = useState<PostDoc>(initial)
  const [bodyChanged, setBodyChanged] = useState(false)
  const [dirty, setDirty] = useState(isNew)
  const [busy, setBusy] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [slugTouched, setSlugTouched] = useState(!isNew)
  useUnsavedWarning(dirty)
  const set = (patch: Partial<PostDoc>) => { setP((x) => ({ ...x, ...patch })); setDirty(true) }

  const allCats = useMemo(() => [...new Set([...categories, ...p.categories])], [categories, p.categories])
  const live = p.status === 'published'
  const url = `/${p.slug}/`

  function toggleCat(c: string, on: boolean) {
    set({ categories: on ? [...p.categories, c] : p.categories.filter((x) => x !== c) })
  }

  async function save(nextStatus?: 'published' | 'draft') {
    if (!p.title.trim()) { toast('Please add a title.', 'bad'); return }
    if (!p.slug.trim()) { toast('Please add a web address for the post.', 'bad'); return }
    const status = nextStatus ?? p.status
    if (status === 'published') {
      if (!p.body.replace(/<[^>]+>/g, '').trim()) { toast('The post has no words yet.', 'bad'); return }
      if (!p.image) { toast('Please add a featured photo before publishing.', 'bad'); return }
      if (!p.imageAlt.trim()) { toast('Please describe the featured photo (alt text) before publishing.', 'bad'); return }
    }
    setBusy(true)
    const minutes = bodyChanged ? autoMinutes({ title: p.title, body: p.body, faq: p.faq }) : p.readMinutes
    const data = {
      title: p.title.trim(),
      slug: p.slug,
      status,
      order: p.order,
      published: status === 'published' ? (p.published || todayBrisbane()) : p.published,
      author: p.author || 'Precision Dental',
      categories: p.categories.length ? p.categories : ['Dental Articles'],
      readMinutes: minutes,
      excerpt: p.excerpt,
      image: p.image,
      imageMedia: p.imageMedia ?? null,
      imageAlt: p.imageAlt,
      imageCaption: p.imageCaption,
      body: p.body,
      faq: p.faq,
      risk: p.risk,
      related: p.related.filter(Boolean),
      seoTitle: p.seo.title,
      seoDescription: p.seo.description,
      ogImage: p.seo.ogImage,
      ogImageMedia: p.seo.ogImageMedia ?? null,
      canonical: p.seo.canonical,
      noindex: p.seo.noindex,
    }
    try {
      if (isNew && !p.id) {
        const r = await api<{ doc: { id: number } }>('/api/posts?depth=0', { method: 'POST', body: data })
        setDirty(false)
        toast(status === 'published' ? 'Post saved and set to published. Press Publish website to put it live.' : 'Draft saved.', 'good')
        window.location.href = `/admin/posts/${r.doc.id}`
        return
      }
      await api(`/api/posts/${p.id}?depth=0`, { method: 'PATCH', body: data })
      setP((x) => ({ ...x, status, published: data.published, readMinutes: minutes }))
      setDirty(false)
      setBodyChanged(false)
      toast(status === 'published'
        ? 'Saved. Press Publish website to put it live.'
        : nextStatus === 'draft' ? 'The post is now a draft. Publish website to take it off the site.' : 'Draft saved.', 'good')
    } catch (e) {
      toast((e as Error).message, 'bad')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!p.id) return
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone. If it is on the website, it disappears the next time you publish.`)) return
    setBusy(true)
    try {
      await api(`/api/posts/${p.id}`, { method: 'DELETE' })
      setDirty(false)
      toast('Post deleted.', 'good')
      window.location.href = '/admin/posts'
    } catch (e) {
      toast((e as Error).message, 'bad')
      setBusy(false)
    }
  }

  const faqText = (a: string[]) => a.map((x) => tokensToFriendly(x)).join('\n\n')
  const faqFrom = (t: string) => t.split(/\n\s*\n/).map((x) => friendlyToTokens(x.trim())).filter(Boolean)
  const setFaq = (i: number, patch: Partial<{ q: string; a: string[] }>) =>
    set({ faq: p.faq.map((f, n) => (n === i ? { ...f, ...patch } : f)) })
  const moveFaq = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= p.faq.length) return
    const next = [...p.faq]
    ;[next[i], next[j]] = [next[j], next[i]]
    set({ faq: next })
  }

  const excerptHint = autoExcerpt(p.body.split(CTA_MARKER).join(''))

  return (
    <div className="cols">
      <div>
        <AhpraReminder />
        <div className="panel">
          <TextInput label="Title" value={p.title} onChange={(v) => {
            const patch: Partial<PostDoc> = { title: v }
            if (!slugTouched) patch.slug = slugify(v)
            set(patch)
          }} />
          <div className="field">
            <label htmlFor="post-slug">Web address</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="help" style={{ margin: 0 }}>precisiondentistry.com.au/</span>
              <input id="post-slug" className="input" style={{ flex: 1 }} value={p.slug}
                onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) || '' }) }} />
              <span className="help" style={{ margin: 0 }}>/</span>
            </div>
            <div className="help">{live && !isNew ? 'Changing the address of a published post moves it. The old address is redirected to the new one automatically.' : 'Lower case words joined with hyphens. Filled in from the title.'}</div>
          </div>
        </div>
        <div className="panel">
          <h2 style={{ marginBottom: 10 }}>Post</h2>
          <BodyEditor value={p.body} onChange={(html) => { setBodyChanged(true); set({ body: html }) }} />
          <p className="help" style={{ marginTop: 8 }}>Use Heading for each main part of the post and Subheading inside it. Words in curly brackets, like <span className="kbd">{'{phone}'}</span>, fill in from Site Settings.</p>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Frequently asked questions</h2>
            <button className="btn small" onClick={() => set({ faq: [...p.faq, { q: '', a: [] }] })}>{Icon.plus()} Add a question</button></div>
          {!p.faq.length ? <p className="help">Optional. Questions appear in a list under the post and are shown to Google as FAQ.</p> : null}
          {p.faq.map((f, i) => (
            <div key={i} className="item-box">
              <div className="item-title" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ flex: 1 }}>Question {i + 1}</span>
                <button className="btn small ghost" aria-label="Move up" onClick={() => moveFaq(i, -1)}>{Icon.arrowUp()}</button>
                <button className="btn small ghost" aria-label="Move down" onClick={() => moveFaq(i, 1)}>{Icon.arrowDown()}</button>
                <button className="btn small danger" onClick={() => set({ faq: p.faq.filter((_x, n) => n !== i) })}>{Icon.trash()} Remove</button>
              </div>
              <TextInput label="Question" value={tokensToFriendly(f.q)} onChange={(v) => setFaq(i, { q: friendlyToTokens(v) })} />
              <div className="field"><label>Answer</label>
                <AutoTextarea value={faqText(f.a)} onChange={(v) => setFaq(i, { a: faqFrom(v) })} />
                <div className="help">Leave an empty line between paragraphs.</div></div>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2 style={{ marginBottom: 10 }}>SEO</h2>
          <SeoPanel seo={p.seo} onChange={(s) => set({ seo: s })} url={url} defaultOg={p.image || '/assets/img/og-image.jpg'} titleHint={`${p.title} | Precision Dental`} />
        </div>
      </div>

      <div className="sticky">
        <div className="panel">
          <h2 style={{ marginBottom: 8 }}>Publish</h2>
          <p>Status: {live ? <span className="chip good">Published</span> : <span className="chip grey">Draft</span>}</p>
          <p className={dirty ? '' : 'help'} style={{ color: dirty ? 'var(--pd-warn)' : undefined, fontWeight: dirty ? 600 : 400 }}>{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
          <div className="actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            {live ? (
              <>
                <button className="btn primary" disabled={busy} onClick={() => save('published')}>{busy ? 'Saving...' : 'Save changes'}</button>
                <button className="btn" disabled={busy} onClick={() => save('draft')}>Unpublish (make it a draft)</button>
              </>
            ) : (
              <>
                <button className="btn primary" disabled={busy} onClick={() => save('published')}>{busy ? 'Saving...' : 'Publish this post'}</button>
                <button className="btn" disabled={busy} onClick={() => save('draft')}>Save draft</button>
              </>
            )}
            {p.id ? <a className="btn" href={`/admin/preview/post/${p.id}`} target="_blank" rel="noopener" onClick={(e) => { if (dirty) { e.preventDefault(); toast('Save first, then preview.', 'bad') } }}>{Icon.eye()} Preview</a> : null}
            {p.id && live ? <a className="btn" href={url} target="_blank" rel="noopener">{Icon.external()} View live post</a> : null}
            <PublishButton />
            {p.id ? <button className="btn danger" disabled={busy} onClick={remove}>{Icon.trash()} Delete post</button> : null}
          </div>
          <p className="help" style={{ marginTop: 10 }}>A published post goes on the Dental Articles page, the sitemap and Google&apos;s article listing the next time you press Publish website.</p>
        </div>
        <div className="panel">
          <ImageSlot label="Featured photo" value={p.image} original={initial.image || undefined}
            onChange={(v) => set({ image: v.value, imageMedia: v.media, imageAlt: p.imageAlt || v.alt || '' })} />
          <TextInput label="Photo description (alt text)" value={unescapeHtml(p.imageAlt)} onChange={(v) => set({ imageAlt: v })}
            help="Describe what is in the photo for someone who cannot see it." />
          <TextInput label="Caption under the photo (optional)" value={p.imageCaption} onChange={(v) => set({ imageCaption: v })} />
        </div>
        <div className="panel">
          <div className="field"><span className="lab">Date</span>
            <input className="input" type="date" value={p.published || ''} onChange={(e) => set({ published: e.target.value })} />
            <div className="help">Shown on the post. Set automatically when you publish.</div></div>
          <TextInput label="Author" value={p.author} onChange={(v) => set({ author: v })} help="Usually Precision Dental. Use a dentist's name only with their approval." />
          <div className="field"><span className="lab">Categories</span>
            {allCats.map((c) => (
              <label key={c} className="check" style={{ marginBottom: 4 }}>
                <input type="checkbox" checked={p.categories.includes(c)} onChange={(e) => toggleCat(c, e.target.checked)} /><span>{c}</span>
              </label>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input className="input" placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
              <button className="btn small" onClick={() => { const c = newCat.trim(); if (c) { toggleCat(c, true); setNewCat('') } }}>Add</button>
            </div>
            <div className="help">The first one that is not &ldquo;Dental Articles&rdquo; is shown on the post.</div>
          </div>
          <div className="field"><label htmlFor="post-ex">Summary for the blog list</label>
            <AutoTextarea id="post-ex" value={textForEditing(p.excerpt)} placeholder={excerptHint} onChange={(v) => set({ excerpt: unescapeHtml(textForSaving(v)) })} />
            <div className="help">Leave blank to use the opening sentence.</div></div>
          <div className="field"><span className="lab">Disclaimers</span>
            <p className="help">Every post ends with the general information disclaimer.</p>
            <Toggle label="This post is about a surgical or invasive procedure (adds the risk statement)" checked={p.risk} onChange={(v) => set({ risk: v })} />
          </div>
          <div className="field"><span className="lab">Related articles</span>
            {[0, 1, 2].map((i) => (
              <select key={i} className="select" style={{ marginBottom: 6 }} value={p.related[i] || ''}
                onChange={(e) => { const r = [p.related[0] || '', p.related[1] || '', p.related[2] || '']; r[i] = e.target.value; set({ related: r }) }}>
                <option value="">Choose automatically</option>
                {posts.filter((o) => o.slug !== p.slug).map((o) => <option key={o.slug} value={o.slug}>{o.title}</option>)}
              </select>
            ))}
          </div>
          <p className="help">Reading time: about {bodyChanged ? autoMinutes({ title: p.title, body: p.body, faq: p.faq }) : p.readMinutes} min.</p>
        </div>
      </div>
    </div>
  )
}
