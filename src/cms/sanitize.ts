/** What a blog post body may contain: the markup the site's articles already use. */
import sanitizeHtml from 'sanitize-html'

export function cleanPostBody(html: string): string {
  const out = sanitizeHtml(html, {
    allowedTags: ['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'blockquote', 'strong', 'b', 'em', 'i', 'a', 'br', 'img', 'div', 'figure', 'figcaption', 'sup', 'sub'],
    allowedAttributes: {
      a: ['href'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      div: ['class'],
    },
    allowedClasses: { div: ['article-cta-marker'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    exclusiveFilter: (frame) =>
      (frame.tag === 'div' && !(frame.attribs.class || '').includes('article-cta-marker')) ||
      (frame.tag === 'img' && !frame.attribs.src),
  })
  // the site writes void elements HTML5 style: <img ...> and <br>
  return out.replace(/\s*\/>/g, '>')
}
