'use client'
/** The blog post body: headings, lists, links, quotes, inline photos and the Book/Call buttons. */
import React, { useEffect, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { Node } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { friendlyToTokens, tokensToFriendly } from '../../render/util'
import { CTA_MARKER } from '../../render/posts'
import { MediaPicker } from '../ui/MediaPicker'
import { mediaSrc } from '../lib/client'

/** The Book Online and Call buttons, shown in the editor as one labelled block. */
const CtaButtons = Node.create({
  name: 'ctaButtons',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  parseHTML() {
    return [{ tag: 'div.article-cta-marker' }]
  },
  renderHTML() {
    return ['div', { class: 'article-cta-marker' }]
  },
  addNodeView() {
    return () => {
      const dom = document.createElement('div')
      dom.className = 'cta-node'
      dom.contentEditable = 'false'
      dom.textContent = 'Book Online and Call buttons appear here'
      return { dom }
    }
  },
})

/** What the editor produces, tidied into the same markup the site's articles use. */
export function editorHtmlToBody(html: string): string {
  let out = html
    .replace(/<li><p>([\s\S]*?)<\/p><\/li>/g, '<li>$1</li>')
    .replace(/<a ([^>]*?)>/g, (_m, attrs: string) => {
      const href = /href="([^"]*)"/.exec(attrs)?.[1] ?? ''
      return `<a href="${href}">`
    })
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<br>)+<\/p>/g, '')
    .replace(/<div class="article-cta-marker"><\/div>/g, CTA_MARKER)
    .replace(/<img ([^>]*?)>/g, (_m, attrs: string) => {
      const src = /src="([^"]*)"/.exec(attrs)?.[1] ?? ''
      const alt = /alt="([^"]*)"/.exec(attrs)?.[1] ?? ''
      return `<img src="${src}" alt="${alt}" loading="lazy">`
    })
  out = out.replace(/<\/(p|h2|h3|h4|ul|ol|blockquote|div)>(?=<(p|h2|h3|h4|ul|ol|blockquote|div|img))/g, '</$1>\n')
  out = out.replace(/(<img [^>]*>)(?=<)/g, '$1\n')
  return friendlyToTokens(out)
}

function Bar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const b = (label: string, on: boolean, run: () => void, title?: string) => (
    <button type="button" className={on ? 'on' : ''} title={title || label} onMouseDown={(e) => e.preventDefault()} onClick={run}>{label}</button>
  )
  return (
    <div className="tt-bar" role="toolbar" aria-label="Formatting">
      {b('Paragraph', editor.isActive('paragraph'), () => editor.chain().focus().setParagraph().run())}
      {b('Heading', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Main heading in the post')}
      {b('Subheading', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
      <span className="sep" />
      {b('B', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Bold')}
      {b('I', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Italic')}
      {b('Link', editor.isActive('link'), () => {
        const prev = editor.getAttributes('link').href as string | undefined
        const url = window.prompt('Link address (a page on this site starts with /, for example /contact/)', prev || '')
        if (url === null) return
        if (!url.trim()) editor.chain().focus().extendMarkRange('link').unsetLink().run()
        else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
      })}
      <span className="sep" />
      {b('Bullet list', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
      {b('Numbered list', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
      {b('Quote', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run())}
      <span className="sep" />
      {b('Photo', false, onImage, 'Add a photo from the Media Library')}
      {b('Book/Call buttons', false, () => editor.chain().focus().insertContent([{ type: 'ctaButtons' }, { type: 'paragraph' }]).run(), 'Add the Book Online and Call buttons')}
      <span className="sep" />
      {b('Undo', false, () => editor.chain().focus().undo().run())}
      {b('Redo', false, () => editor.chain().focus().redo().run())}
    </div>
  )
}

export function BodyEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [picking, setPicking] = useState(false)
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, codeBlock: false, code: false, horizontalRule: false, strike: false }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: null, rel: null, class: null } }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: 'Start writing the post...' }),
      CtaButtons,
    ],
    content: tokensToFriendly(value || ''),
    onUpdate: ({ editor: e }) => onChange(editorHtmlToBody(e.getHTML())),
  })
  useEffect(() => () => editor?.destroy(), [editor])
  if (!editor) return <div className="tt"><div className="ProseMirror">Loading the editor...</div></div>
  return (
    <div className="tt">
      <Bar editor={editor} onImage={() => setPicking(true)} />
      <EditorContent editor={editor} />
      {picking ? (
        <MediaPicker title="Add a photo to the post" onClose={() => setPicking(false)} onPick={(d) => {
          setPicking(false)
          const alt = d.alt || window.prompt('Describe the photo for someone who cannot see it') || ''
          editor.chain().focus().insertContent([{ type: 'image', attrs: { src: mediaSrc(d), alt } }, { type: 'paragraph' }]).run()
        }} />
      ) : null}
    </div>
  )
}
