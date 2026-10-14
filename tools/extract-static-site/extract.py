"""One-off: turn the deployed Precision Dental static site into the CMS content model.

Reads the 125 HTML files of the 9 October 2026 release and writes:

  content/chrome.json          the shared head, header, footer and sticky bar
  content/site-settings.json   practice details, hours, socials, flags
  content/blocks/*.json        sections that are identical on many pages
  content/pages/*.json         one per page: SEO, sections, editable fields
  content/posts/*.json         one per article
  content/team.json            the Meet the Team cards

Every value is a slice of the original source, so the renderer can put each page
back together byte for byte. The TypeScript renderer and the parity check prove it.
"""
import glob
import html
import json
import os
import re
import sys
from collections import Counter, OrderedDict

sys.path.insert(0, os.path.dirname(__file__))
from htmltree import parse, walk, has_text, Node  # noqa: E402

SITE = sys.argv[1]
OUT = sys.argv[2]
BLOGDATA = sys.argv[3]

ORIGIN = 'https://precisiondentistry.com.au'
BOOKING = 'https://booking.au.hsone.app/soe/new/Precision%20Dental?pid=AUSHC01'
MAP_EMBED = ('https://www.google.com/maps?q=HQ%20South%20Tower%2C%20520%20Wickham%20Street%2C'
             '%20Fortitude%20Valley%20QLD%204006&output=embed')


def esc(s):
    return html.escape(str(s), quote=True)


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write('\n')


# --------------------------------------------------------------- settings
HOURS_ROWS = ('<li><span>Mon</span><span>9am to 6pm</span></li>\n'
              '          <li><span>Tue</span><span>10am to 7pm</span></li>\n'
              '          <li><span>Wed</span><span>9am to 6pm</span></li>\n'
              '          <li><span>Thu</span><span>9am to 6pm</span></li>\n'
              '          <li><span>Fri</span><span>8am to 5pm</span></li>\n'
              '          <li><span>Sat and Sun</span><span>Closed</span></li>')
HOURS_LIST = ('<p>Monday: 9am to 6pm</p>\n<p>Tuesday: 10am to 7pm</p>\n<p>Wednesday: 9am to 6pm</p>\n'
              '<p>Thursday: 9am to 6pm</p>\n<p>Friday: 8am to 5pm</p>\n<p>Saturday and Sunday: Closed</p>')

SOCIALS = [('Facebook', 'facebook'), ('Instagram', 'instagram'), ('YouTube', 'youtube'),
           ('LinkedIn', 'linkedin'), ('Google Business Profile', 'googleBusiness')]

# literal -> token, applied longest and most specific first
TOKENS = [
    (BOOKING, '{{site:booking}}'),
    (MAP_EMBED, '{{site:mapEmbed}}'),
    (HOURS_ROWS, '{{site:hoursRows}}'),
    (HOURS_LIST, '{{site:hoursList}}'),
    ('Mon, Wed, Thu 9am to 6pm. Tue 10am to 7pm. Fri 8am to 5pm.', '{{site:hoursSummary}}'),
    ('S13, HQ South Tower, 520 Wickham Street, Fortitude Valley QLD 4006', '{{site:address}}'),
    ('S13, HQ South Tower<br>520 Wickham Street<br>Fortitude Valley QLD 4006', '{{site:addressLines}}'),
    ('S13, HQ South Tower, Fortitude Valley QLD 4006', '{{site:addressShort}}'),
    ('S13, HQ South Tower, 520 Wickham Street', '{{site:addressStreet}}'),
    ('520 Wickham Street, Fortitude Valley', '{{site:street}}, {{site:suburb}}'),
    ('tel:0738521160', 'tel:{{site:phoneTel}}'),
    ('(07) 3852 1160', '{{site:phone}}'),
    ('mailto:admin@precisiondentistry.com.au', 'mailto:{{site:email}}'),
    ('admin@precisiondentistry.com.au', '{{site:email}}'),
    ('ABN 45 166 034 199', 'ABN {{site:abn}}'),
    ('Bupa, HCF and CBHS', '{{site:preferredFunds}}'),
    ('Free on-site parking for patients.', '{{site:parking}}'),
    ('src="/assets/img/logo.png" alt="Precision Dental logo"', 'src="{{site:logo}}" alt="Precision Dental logo"'),
]
for label, key in SOCIALS:
    TOKENS.append((f'<a href="#" aria-label="{label}">', f'<a href="{{{{site:{key}}}}}" aria-label="{label}">'))


def tokenise(s):
    for lit, tok in TOKENS:
        s = s.replace(lit, tok)
    # "520 Wickham St" on its own (the stat line), never inside "Street"
    s = re.sub(r'520 Wickham St(?!reet)', '{{site:streetShort}}', s)
    return s


SETTINGS = OrderedDict([
    ('practiceName', 'Precision Dental'),
    ('logo', '/assets/img/logo.png'),
    ('phone', '(07) 3852 1160'),
    ('email', 'admin@precisiondentistry.com.au'),
    ('address', OrderedDict([
        ('unit', 'S13, HQ South Tower'),
        ('street', '520 Wickham Street'),
        ('streetShort', '520 Wickham St'),
        ('suburb', 'Fortitude Valley'),
        ('state', 'QLD'),
        ('postcode', '4006'),
        ('latitude', -27.453),
        ('longitude', 153.0377),
        ('mapEmbed', MAP_EMBED),
    ])),
    ('parking', 'Free on-site parking for patients.'),
    ('abn', '45 166 034 199'),
    ('hours', [
        OrderedDict([('day', 'Monday'), ('open', True), ('opens', '09:00'), ('closes', '18:00')]),
        OrderedDict([('day', 'Tuesday'), ('open', True), ('opens', '10:00'), ('closes', '19:00')]),
        OrderedDict([('day', 'Wednesday'), ('open', True), ('opens', '09:00'), ('closes', '18:00')]),
        OrderedDict([('day', 'Thursday'), ('open', True), ('opens', '09:00'), ('closes', '18:00')]),
        OrderedDict([('day', 'Friday'), ('open', True), ('opens', '08:00'), ('closes', '17:00')]),
        OrderedDict([('day', 'Saturday'), ('open', False), ('opens', ''), ('closes', '')]),
        OrderedDict([('day', 'Sunday'), ('open', False), ('opens', ''), ('closes', '')]),
    ]),
    ('bookingUrl', BOOKING),
    ('preferredFunds', 'Bupa, HCF and CBHS'),
    ('paymentAccepted', 'Cash, EFTPOS, Visa, Mastercard, American Express'),
    ('socials', OrderedDict([(k, '') for _l, k in SOCIALS])),
    ('colours', OrderedDict([('navy', ''), ('blue', ''), ('blueDark', '')])),
    ('tracking', OrderedDict([('ga4Id', ''), ('gtmId', ''), ('metaPixelId', '')])),
    ('features', OrderedDict([
        ('mode', 'open'),
        ('emergencyDentistry', True),
        ('cdbs', False),
        ('zipAfterpay', False),
        ('countdown', False),
        ('countdownDate', ''),
    ])),
    ('seoDefaults', OrderedDict([
        ('titleSuffix', ' | Precision Dental'),
        ('description', ''),
        ('ogImage', '/assets/img/og-image.jpg'),
    ])),
    ('imageReplacements', []),
])


# --------------------------------------------------------------- the shell
def split_page(h):
    """head (up to and including '<body>\\n'), pre (to and including '<main>\\n'),
    main inner, post (from '\\n</main>')."""
    b = h.index('<body>\n') + len('<body>\n')
    mo = h.index('<main')
    m = h.index('>\n', mo) + 2
    e = h.index('\n</main>')
    return h[:b], h[b:m], h[m:e], h[e:]


LD_RE = re.compile(r'(<script type="application/ld\+json">\n)(.*?)(\n</script>)', re.S)


def seo_from_head(head):
    def grab(pat):
        m = re.search(pat, head)
        return m.group(1) if m else None
    t = grab(r'<title>(.*?)</title>')
    d = grab(r'<meta name="description" content="(.*?)">')
    canon = grab(r'<link rel="canonical" href="(.*?)">')
    og = grab(r'<meta property="og:image" content="(.*?)">')
    return t, d, canon, og


# ------------------------------------------------------------ field extraction
INLINE = {'a', 'b', 'strong', 'em', 'i', 'span', 'br', 'small', 'sup', 'sub', 'mark', 'abbr',
          'time', 'u', 's', 'code', 'q', 'cite'}
DECOR_CLASSES = {'num', 'dot', 'arr', 'chev', 'ic', 'go', 'mi-img', 'n', 'plus'}


def classes(n):
    return set((n.attrs.get('class') or '').split())


def is_decor(n):
    if n.kind in ('raw', 'comment'):
        return True
    if n.kind == 'text':
        return not n.text.strip()
    if classes(n) & DECOR_CLASSES:
        return True
    if n.tag == 'img':
        return True
    return not has_text(n)


def all_inline(n):
    for c in n.children:
        if c.kind in ('text', 'raw', 'comment'):
            continue
        if is_decor(c):
            continue
        if c.tag not in INLINE or not all_inline(c):
            return False
    return True


def direct_text(n):
    return any(c.kind == 'text' and c.text.strip() for c in n.children)


def token_only(v):
    rest = re.sub(r'\{\{site:[a-zA-Z]+\}\}', '', v)
    rest = re.sub(r'<[^>]+>', '', rest)
    return not re.sub(r'[\s.,:;·|()-]+', '', html.unescape(rest))


def label_for(n):
    c = classes(n)
    t = n.tag
    if t == 'h1':
        return 'Main heading'
    if t == 'h2':
        return 'Heading'
    if t in ('h3', 'h4', 'h5', 'h6'):
        return 'Subheading'
    if t == 'p':
        if 'lede' in c:
            return 'Intro paragraph'
        if 'sub' in c:
            return 'Line under the heading'
        if 'disclaimer' in c:
            return 'Disclaimer wording'
        return 'Paragraph'
    if t == 'li':
        return 'List item'
    if t == 'span':
        if n.parent is not None and n.parent.tag == 'li':
            return 'List item'
        if 'pill' in c:
            return 'Small label'
        if 'q' in c:
            return 'Question'
        if 'role' in c:
            return 'Role'
        return 'Text'
    if t == 'a':
        return 'Button text' if 'btn' in c else 'Link text'
    if t == 'button':
        if n.parent is not None and n.parent.tag in ('h2', 'h3', 'h4'):
            return 'Subheading'
        return 'Button text'
    if t in ('strong', 'b'):
        return 'Bold text'
    if t == 'figcaption':
        return 'Caption'
    if t in ('td', 'th'):
        return 'Table cell'
    if t == 'label':
        return 'Form label'
    if t == 'option':
        return 'Choice in the list'
    if t == 'small':
        return 'Small print'
    if t == 'blockquote':
        return 'Quote'
    if t == 'dt':
        return 'Term'
    if t == 'dd':
        return 'Description'
    if t == 'em':
        return 'Text'
    return 'Text'


def group_for(n, sec_node):
    """'Item 2' style grouping for fields inside repeated cards, rows or questions."""
    parts = []
    cur = n.parent
    while cur is not None and cur is not sec_node:
        par = cur.parent
        if par is not None and cur.kind == 'el':
            STATE = {'open', 'active', 'is-on', 'on', 'show', 'current', 'selected', 'reveal'}
            def base(el):
                return [c for c in (el.attrs.get('class') or '').split() if c not in STATE][:1]
            first = base(cur)
            sibs = [c for c in par.children if c.kind == 'el' and c.tag == cur.tag and base(c) == first]
            groupable = bool(first) or cur.tag in ('article', 'div', 'tr', 'figure', 'li')
            if len(sibs) >= 2 and groupable and cur.tag not in ('p', 'h2', 'h3', 'br', 'strong', 'b'):
                idx = sibs.index(cur) + 1
                parts.append(idx)
        cur = par
    if not parts:
        return None
    return '.'.join(str(p) for p in reversed(parts))


class Extractor:
    def __init__(self, src, sec_node):
        self.src = src
        self.sec = sec_node
        self.ranges = []      # (start, end, field)
        self.n = 0

    def add(self, start, end, typ, label, node):
        self.n += 1
        fid = f'f{self.n}'
        val = self.src[start:end]
        f = OrderedDict([('id', fid), ('label', label), ('type', typ), ('value', val)])
        g = group_for(node, self.sec)
        if g:
            f['group'] = g
        self.ranges.append((start, end, f))
        return f

    def text_range(self, a, b, node, label):
        seg = self.src[a:b]
        lead = len(seg) - len(seg.lstrip())
        trail = len(seg) - len(seg.rstrip())
        a2, b2 = a + lead, b - trail
        if a2 >= b2:
            return
        val = self.src[a2:b2]
        if token_only(val):
            return
        typ = 'rich' if '<' in val else 'text'
        self.add(a2, b2, typ, label, node)

    def visit(self, n):
        if n.kind in ('raw', 'comment'):
            return
        if n.kind == 'text':
            if n.text.strip():
                self.text_range(n.start, n.end, n, label_for(n.parent))
            return
        if n.tag == 'img':
            sp = n.attr_spans
            if 'src' in sp and '{{' not in n.attrs.get('src', ''):
                self.add(sp['src'][0], sp['src'][1], 'image', 'Photo', n)
            if 'alt' in sp or 'alt' in n.attrs:
                if 'alt' in sp:
                    self.add(sp['alt'][0], sp['alt'][1], 'alt', 'Photo description (alt text)', n)
            return
        if n.tag in ('input', 'select', 'textarea', 'form', 'br', 'hr'):
            if n.tag in ('select', 'form'):
                for c in n.children:
                    self.visit(c)
            return
        if n.tag == 'a':
            href = n.attrs.get('href') or ''
            if 'href' in n.attr_spans and href and not href.startswith(('tel:', 'mailto:', '#')) \
                    and '{{' not in href:
                self.add(n.attr_spans['href'][0], n.attr_spans['href'][1], 'link',
                         'Button link' if 'btn' in classes(n) else 'Link address', n)
        if classes(n) & DECOR_CLASSES:
            return
        if not has_text(n):
            for c in n.children:
                if c.kind == 'el':
                    self.visit(c)
            return
        texty = [c for c in n.children if not is_decor(c)]
        container = (not direct_text(n) and len(texty) >= 2) or not all_inline(n)
        if container:
            for c in n.children:
                self.visit(c)
            return
        # inline content: one field per run of text between decorations
        runs, cur = [], []
        for c in n.children:
            if is_decor(c) and not (c.kind == 'text'):
                if cur:
                    runs.append(cur)
                    cur = []
                if c.kind == 'el':
                    self.visit(c)
                continue
            cur.append(c)
        if cur:
            runs.append(cur)
        for run in runs:
            if not any((c.kind == 'text' and c.text.strip()) or (c.kind == 'el' and has_text(c)) for c in run):
                continue
            els = [c for c in run if c.kind == 'el']
            txt = [c for c in run if c.kind == 'text' and c.text.strip()]
            if len(els) == 1 and not txt:
                self.visit(els[0])
                continue
            # links inside rich text keep their address in the value
            self.text_range(run[0].start, run[-1].end, n, label_for(n))


def extract_section(src, node):
    ex = Extractor(src, node)
    for c in node.children:
        ex.visit(c)
    ex.ranges.sort(key=lambda r: r[0])
    out, pos = [], node.start
    for a, b, f in ex.ranges:
        if a < pos:
            raise ValueError(f'overlapping field ranges at {a}')
        out.append(src[pos:a])
        out.append('{{' + f['id'] + '}}')
        pos = b
    out.append(src[pos:node.end])
    template = ''.join(out)
    # renumber fields in document order
    fields = [f for _a, _b, f in ex.ranges]
    mapping = {}
    for i, f in enumerate(fields, 1):
        mapping[f['id']] = f'f{i}'
    template = re.sub(r'\{\{(f\d+)\}\}', lambda m: '{{' + mapping[m.group(1)] + '}}', template)
    for f in fields:
        f['id'] = mapping[f['id']]
    # a group with one field in it (a plain bullet list) is just noise in the editor
    counts = Counter(f.get('group') for f in fields if f.get('group'))
    for f in fields:
        if f.get('group') and counts[f['group']] < 2:
            del f['group']
    return template, fields


def plain(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s))


def section_kind(node, idx):
    c = classes(node)
    if node.tag == 'nav' and 'breadcrumbs' in c:
        return 'breadcrumbs'
    if 'cta' in c:
        return 'cta'
    if 'contact' in c:
        return 'contact'
    if 'page-hero' in c or 'hero' in c:
        return 'header'
    if 'disclaimer-section' in c:
        return 'disclaimer'
    if 'article-index' in c:
        return 'articleIndex'
    return 'content'


def first_heading(src, node):
    m = re.search(r'<h([12])[^>]*>(.*?)</h\1>', src[node.start:node.end], re.S)
    if not m:
        m = re.search(r'<h3[^>]*>(.*?)</h3>', src[node.start:node.end], re.S)
        if not m:
            return None
        return plain(m.group(1)).strip()
    return plain(m.group(2)).strip()


def nice(t):
    return t.replace('{{site:phone}}', '(07) 3852 1160')


# ------------------------------------------------------------------- main
def main():
    files = sorted(os.path.relpath(p, SITE) for p in glob.glob(f'{SITE}/**/*.html', recursive=True))
    blog = json.load(open(BLOGDATA))
    article_slugs = {v['slug'].strip('/'): int(k) for k, v in blog.items()}

    pages = {f: read(f'{SITE}/{f}') for f in files}

    # ---- chrome from a standard page
    std = pages['about-us.html']
    head, pre, _main, post = split_page(std)
    chrome = OrderedDict()
    t, d, canon, og = seo_from_head(head)
    head_tpl = head
    head_tpl = head_tpl.replace(f'<title>{t}</title>', '<title>{{seo:title}}</title>')
    head_tpl = head_tpl.replace(f'<meta name="description" content="{d}">',
                                '<meta name="description" content="{{seo:description}}">{{seo:robots}}')
    head_tpl = head_tpl.replace(f'<link rel="canonical" href="{canon}">',
                                '<link rel="canonical" href="{{seo:canonical}}">')
    head_tpl = head_tpl.replace(f'<meta property="og:title" content="{t}">',
                                '<meta property="og:title" content="{{seo:title}}">')
    head_tpl = head_tpl.replace(f'<meta property="og:description" content="{d}">',
                                '<meta property="og:description" content="{{seo:description}}">')
    head_tpl = head_tpl.replace(f'<meta property="og:url" content="{canon}">',
                                '<meta property="og:url" content="{{seo:url}}">')
    head_tpl = head_tpl.replace(f'<meta property="og:image" content="{og}">',
                                '<meta property="og:image" content="{{seo:ogImage}}">')
    head_tpl = head_tpl.replace('\n</head>\n<body>\n', '{{site:headExtra}}\n</head>\n<body>\n{{site:bodyStart}}')
    assert head_tpl.count('{{seo:') == 8, head_tpl
    chrome['head'] = tokenise(head_tpl)
    ldm = LD_RE.search(post)
    chrome['pre'] = tokenise(pre)
    chrome['post'] = tokenise(post[:ldm.start(2)] + '{{schema}}' + post[ldm.end(2):])

    write_json(f'{OUT}/chrome.json', chrome)
    write_json(f'{OUT}/site-settings.json', SETTINGS)

    # ---- shared blocks
    blocks = {}
    page_records = {}
    posts = {}
    counts = Counter()

    for f in files:
        h = pages[f]
        stem = f[:-5]
        if stem in article_slugs:
            continue
        hd, pr, mn, ps = split_page(h)
        t, d, canon, og = seo_from_head(hd)
        url = '/' if stem == 'index' else (None if stem == '404' else f'/{stem}/')
        rec = OrderedDict()
        rec['key'] = stem
        rec['file'] = f
        rec['url'] = url
        rec['label'] = None
        rec['group'] = None
        seo = OrderedDict()
        seo['title'] = tokenise(html.unescape(t))
        seo['description'] = tokenise(html.unescape(d)) if d is not None else ''
        seo['ogImage'] = ''
        seo['canonical'] = ''
        seo['noindex'] = stem == '404'
        rec['seo'] = seo
        rec['lastmod'] = None

        layout = OrderedDict()
        # head
        std_head = None
        if d is not None and canon is not None:
            exp_canon = ORIGIN + (url or '')
            if canon == exp_canon and og == ORIGIN + '/assets/img/og-image.jpg':
                std_head = True
        if std_head:
            built = chrome['head']
            # check by substitution later in the TS parity test
            layout['head'] = 'std'
        else:
            layout['head'] = tokenise(hd.replace(f'<title>{t}</title>', '<title>{{seo:title}}</title>'))
        layout['pre'] = 'std' if tokenise(pr) == chrome['pre'] else tokenise(pr)
        ldm = LD_RE.search(ps)
        schema_literal = None
        if ldm:
            post_t = ps[:ldm.start(2)] + '{{schema}}' + ps[ldm.end(2):]
            schema_literal = ldm.group(2)
        else:
            post_t = ps
        layout['post'] = 'std' if tokenise(post_t) == chrome['post'] else tokenise(post_t)
        layout['schema'] = 'gen'
        if layout['post'] != 'std' and schema_literal is not None:
            layout['schemaLiteral'] = schema_literal
        elif schema_literal is None:
            layout['schema'] = 'none'
        rec['layout'] = layout

        # ---- sections
        main_t = tokenise(mn)
        root = parse(main_t)
        sections = []
        gap_start = 0
        idx = 0
        for node in root.children:
            if node.kind in ('text', 'comment'):
                continue
            before = main_t[gap_start:node.start]
            gap_start = node.end
            kind = section_kind(node, idx)
            sec = OrderedDict()
            sec['key'] = f's{idx + 1}'
            sec['kind'] = kind
            sec['before'] = before
            outer = main_t[node.start:node.end]
            if kind in ('cta', 'contact'):
                name = kind
                if name in blocks and blocks[name]['html'] != outer:
                    raise SystemExit(f'{f}: shared block {name} differs')
                blocks.setdefault(name, {'html': outer, 'node': node, 'src': main_t})
                sec['shared'] = name
                sec['label'] = {'cta': 'Book Your Visit band', 'contact': 'Enquiry form and map'}[name]
                sections.append(sec)
                idx += 1
                continue
            if kind == 'articleIndex':
                sec['label'] = 'Article list (fills in automatically from Blog Posts)'
                sec['generated'] = 'articleIndex'
                sec['template'] = '{{gen:articleIndex}}'
                sec['fields'] = []
                sections.append(sec)
                idx += 1
                continue
            outer_t = outer
            local_src = main_t
            gen = None
            if 'class="team-grid"' in outer:
                m = re.search(r'(<div class="team-grid">)(.*?)(</div></div></section>)$', outer, re.S)
                gen = 'team'
                team_html = m.group(2)
                outer_t = outer[:m.start(2)] + '{{gen:team}}' + outer[m.end(2):]
                page_records.setdefault('_team_html', team_html)
            if 'Dental Articles</h3>' in outer and stem == 'sitemap':
                m = re.search(r'<div><h3>Dental Articles</h3>.*?</ul></div>', outer, re.S)
                outer_t = outer[:m.start()] + '{{gen:sitemapArticles}}' + outer[m.end():]
                gen = 'sitemapArticles'
            if outer_t != outer:
                sub = parse(outer_t)
                n2 = [c for c in sub.children if c.kind == 'el'][0]
                template, fields = extract_section(outer_t, n2)
            else:
                template, fields = extract_section(main_t, node)
            # alternation
            cls = node.attrs.get('class') or ''
            if node.tag == 'section' and cls in ('body-section', 'body-section section-alt') \
                    and node.attrs.get('id') != 'faq':
                sec['altAuto'] = True
                sec['alt'] = cls.endswith('section-alt')
                template = template.replace(f'<section class="{cls}"', '<section class="body-section{{alt}}"', 1)
            if 'faq-item' in outer:
                kind = 'faq'
                sec['kind'] = 'faq'
            if gen:
                sec['generated'] = gen
            heading = first_heading(main_t, node)
            if kind == 'breadcrumbs':
                label = 'Breadcrumb trail'
            elif kind == 'header':
                label = 'Page header' + (f': {nice(heading)}' if heading else '')
            elif kind == 'faq':
                label = 'Questions and answers' + (f': {nice(heading)}' if heading and 'Frequently' not in heading else '')
            elif kind == 'disclaimer':
                label = 'Disclaimer'
            elif gen == 'team':
                label = 'Team members (edit these under Team)'
            elif heading:
                label = nice(heading)
            else:
                label = f'Section {idx + 1}'
            sec['label'] = label
            sec['pinned'] = kind in ('breadcrumbs',) or (kind == 'header' and idx <= 1)
            sec['template'] = template
            sec['fields'] = fields
            sections.append(sec)
            idx += 1
        rec['tail'] = main_t[gap_start:]
        rec['sections'] = sections
        page_records[stem] = rec
        counts['pages'] += 1

    team_html = page_records.pop('_team_html')

    # ---- shared block models
    for name, b in blocks.items():
        src = b['src']
        template, fields = extract_section(src, b['node'])
        label = {'cta': 'Book Your Visit band', 'contact': 'Enquiry form and map'}[name]
        write_json(f'{OUT}/blocks/{name}.json', OrderedDict([
            ('key', name), ('label', label), ('template', template), ('fields', fields)]))

    # ---- page labels and groups
    for stem, rec in page_records.items():
        h1 = None
        for s in rec['sections']:
            for fl in s.get('fields', []):
                if fl['label'] == 'Main heading':
                    h1 = plain(fl['value']).strip()
                    break
            if h1:
                break
        if stem == 'index':
            label, group = 'Home', 'Main pages'
        elif stem == '404':
            label, group = 'Page not found (404)', 'Other'
        elif stem.startswith('service/'):
            label, group = h1 or stem, 'Treatments and services'
        elif stem.startswith('dentist-'):
            label, group = h1 or stem, 'Suburb pages'
        elif stem in ('privacy-policy', 'disclaimer', 'treatment-risks', 'accreditation',
                      'exceptional-infection-control', 'sitemap'):
            label, group = h1 or stem, 'Legal and practice information'
        else:
            label, group = h1 or stem, 'Main pages'
        rec['label'] = nice(label)
        rec['group'] = group

    # ---- sitemap lastmods
    sm = read(f'{SITE}/sitemap.xml')
    lastmod = dict(re.findall(r'<loc>' + re.escape(ORIGIN) + r'(.*?)</loc><lastmod>(.*?)</lastmod>', sm))
    for stem, rec in page_records.items():
        rec['lastmod'] = lastmod.get(rec['url']) if rec['url'] else None
        write_json(f'{OUT}/pages/{stem.replace("/", "__")}.json', rec)

    # ---- team
    cards = re.findall(r'<article class="team-card reveal">(.*?)</article>', team_html, re.S)
    team = []
    for i, c in enumerate(cards, 1):
        img = re.search(r'<img src="(.*?)" alt="(.*?)" loading="lazy" width="900" height="900">', c)
        name = re.search(r'<h3>(.*?)</h3>', c).group(1)
        role = re.search(r'<span class="role">(.*?)</span>', c).group(1)
        bio = re.findall(r'<p>(.*?)</p>', c, re.S)
        link = re.search(r'<a class="explore" href="(.*?)">(.*?)<span class="ic">', c)
        team.append(OrderedDict([
            ('name', html.unescape(name)), ('role', html.unescape(role)), ('qualifications', ''),
            ('photo', img.group(1)), ('photoAlt', html.unescape(img.group(2))),
            ('bio', '\n\n'.join(html.unescape(b) for b in bio)),
            ('profileUrl', link.group(1) if link else ''),
            ('profileLinkText', html.unescape(link.group(2)) if link else ''),
            ('hidden', False), ('order', i)]))
    write_json(f'{OUT}/team.json', team)

    # ---- posts
    idx_html = pages['blog.html']
    cards = re.findall(r'<article class="art-card" data-cats="(.*?)">\n<a class="art-card-img" href="(.*?)".*?'
                       r'<p class="art-card-ex">(.*?)</p>', idx_html, re.S)
    card_by = {href.strip('/'): (html.unescape(cats).split('|'), html.unescape(ex)) for cats, href, ex in cards}
    cta_html = None
    for slug, num in sorted(article_slugs.items(), key=lambda kv: kv[1]):
        h = pages[f'{slug}.html']
        hd, pr, mn, ps = split_page(h)
        t, d, canon, og = seo_from_head(hd)
        mt = tokenise(mn)
        title = re.search(r'<h1>(.*?)</h1>', mt).group(1)
        meta = re.search(r'<p class="art-meta">(?:<time datetime="(.*?)">.*?</time>)?.*?<span class="dot">·</span>(\d+) min read</p>', mt)
        fig = re.search(r'<figure class="art-figure">\n<img src="(.*?)" alt="(.*?)" width="1200" height="630" fetchpriority="high">(.*?)\n</figure>', mt, re.S)
        body = re.search(r'<section class="body-section article-body"><div class="container"><div class="prose">(.*?)</div></div></section>\n', mt, re.S).group(1)
        cm = re.search(r'<div class="btn-group article-cta">.*?</a></div>', body, re.S)
        if cm:
            if cta_html is None:
                cta_html = cm.group(0)
            assert cm.group(0) == cta_html
            body = body.replace(cta_html, '<div class="article-cta-marker"></div>')
        faq = []
        for q, a in re.findall(r'<span class="q">(.*?)</span>.*?<div class="faq-a" id="faq\d+"><div>(.*?)</div></div>', mt, re.S):
            faq.append(OrderedDict([('q', html.unescape(q)),
                                    ('a', [html.unescape(p) for p in re.findall(r'<p>(.*?)</p>', a, re.S)])]))
        risk = 'Any surgical or invasive procedure carries risks' in mt
        rel = re.findall(r'<a class="art-rel-card" href="/(.*?)/">', mt)
        ld = json.loads(LD_RE.search(ps).group(2))
        bp = next(n for n in ld['@graph'] if n['@type'] == 'BlogPosting')
        cats, excerpt = card_by[slug]
        post = OrderedDict()
        post['slug'] = slug
        post['order'] = num
        post['status'] = 'published'
        post['title'] = html.unescape(title)
        post['categories'] = cats
        post['author'] = 'Precision Dental'
        post['published'] = meta.group(1)
        post['modified'] = bp['dateModified']
        post['readMinutes'] = int(meta.group(2))
        post['excerpt'] = excerpt
        post['image'] = fig.group(1)
        post['imageAlt'] = html.unescape(fig.group(2))
        post['imageCaption'] = html.unescape(re.sub(r'</?figcaption>', '', fig.group(3))) if fig.group(3) else ''
        post['body'] = body
        post['faq'] = faq
        post['risk'] = risk
        post['related'] = rel
        seo = OrderedDict()
        seo['title'] = tokenise(html.unescape(t))
        seo['description'] = tokenise(html.unescape(d))
        seo['ogImage'] = ''
        seo['canonical'] = ''
        seo['noindex'] = False
        post['seo'] = seo
        post['lastmod'] = lastmod.get(f'/{slug}/')
        write_json(f'{OUT}/posts/{slug}.json', post)
        counts['posts'] += 1

    print(dict(counts), 'blocks', list(blocks), 'team', len(team))


if __name__ == '__main__':
    main()
