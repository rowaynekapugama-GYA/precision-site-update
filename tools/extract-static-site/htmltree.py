"""A small offset-preserving HTML tree for the generated Precision Dental markup.

Every node keeps the byte offsets of its start tag, its content and its end tag,
so a template can be produced by replacing exact source ranges. Nothing is ever
re-serialised, which is what makes the round trip byte for byte.
"""
import re

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
        'source', 'track', 'wbr'}
RAW = {'script', 'style', 'svg', 'textarea', 'iframe', 'template', 'noscript'}

TAG_RE = re.compile(r'<!--.*?-->|<(/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?)*)\s*(/?)>', re.S)
ATTR_RE = re.compile(r'([^\s=/>]+)(?:\s*=\s*("([^"]*)"|\'([^\']*)\'|([^\s>]+)))?')


class Node:
    __slots__ = ('tag', 'attrs', 'start', 'open_end', 'close_start', 'end', 'children',
                 'parent', 'attr_spans', 'kind', 'text')

    def __init__(self, tag, start, open_end, attrs=None, attr_spans=None, kind='el'):
        self.tag = tag
        self.attrs = attrs or {}
        self.attr_spans = attr_spans or {}
        self.start = start
        self.open_end = open_end
        self.close_start = open_end
        self.end = open_end
        self.children = []
        self.parent = None
        self.kind = kind
        self.text = None

    def __repr__(self):
        return f'<{self.tag} {self.start}:{self.end}>'


def parse_attrs(s, base):
    """Attributes with the absolute offsets of each value (inside the quotes)."""
    attrs, spans = {}, {}
    for m in ATTR_RE.finditer(s):
        name = m.group(1).lower()
        if m.group(3) is not None:
            val, vs = m.group(3), m.start(3)
        elif m.group(4) is not None:
            val, vs = m.group(4), m.start(4)
        elif m.group(5) is not None:
            val, vs = m.group(5), m.start(5)
        else:
            val, vs = None, None
        attrs[name] = val
        if vs is not None:
            spans[name] = (base + vs, base + vs + len(val))
    return attrs, spans


def parse(src, offset=0, end=None):
    """Parse src[offset:end] into a root node whose children are the top level."""
    end = len(src) if end is None else end
    root = Node('#root', offset, offset)
    root.close_start = end
    root.end = end
    stack = [root]
    pos = offset
    while pos < end:
        m = TAG_RE.search(src, pos, end)
        if not m:
            _text(stack[-1], src, pos, end)
            break
        if m.start() > pos:
            _text(stack[-1], src, pos, m.start())
        whole = m.group(0)
        if whole.startswith('<!--'):
            n = Node('#comment', m.start(), m.end(), kind='comment')
            n.end = m.end()
            n.close_start = m.end()
            n.parent = stack[-1]
            stack[-1].children.append(n)
            pos = m.end()
            continue
        closing, tag, attr_s, selfclose = m.group(1), m.group(2).lower(), m.group(3), m.group(4)
        if closing:
            # pop to the matching open tag
            for i in range(len(stack) - 1, 0, -1):
                if stack[i].tag == tag:
                    for j in range(len(stack) - 1, i - 1, -1):
                        stack[j].close_start = m.start() if j == i else stack[j].close_start
                        stack[j].end = m.end() if j == i else stack[j].end
                    stack[i].close_start = m.start()
                    stack[i].end = m.end()
                    del stack[i:]
                    break
            else:
                raise ValueError(f'stray </{tag}> at {m.start()}: {src[m.start()-80:m.start()+20]!r}')
            pos = m.end()
            continue
        attrs, spans = parse_attrs(attr_s, m.start(3))
        n = Node(tag, m.start(), m.end(), attrs, spans)
        n.parent = stack[-1]
        stack[-1].children.append(n)
        if tag in VOID or selfclose:
            n.close_start = m.end()
            n.end = m.end()
            pos = m.end()
            continue
        if tag in RAW:
            close = re.compile(r'</' + tag + r'\s*>', re.I).search(src, m.end(), end)
            if not close:
                raise ValueError(f'unclosed <{tag}> at {m.start()}')
            n.close_start = close.start()
            n.end = close.end()
            n.kind = 'raw'
            pos = close.end()
            continue
        stack.append(n)
        pos = m.end()
    if len(stack) != 1:
        raise ValueError(f'unclosed tags: {stack[1:]}')
    return root


def _text(parent, src, a, b):
    n = Node('#text', a, b, kind='text')
    n.close_start = b
    n.end = b
    n.text = src[a:b]
    n.parent = parent
    parent.children.append(n)


def walk(n):
    yield n
    for c in n.children:
        yield from walk(c)


def has_text(n):
    """True when the node, or anything inside it that is not raw, carries text."""
    if n.kind == 'text':
        return bool(n.text.strip())
    if n.kind in ('raw', 'comment'):
        return False
    return any(has_text(c) for c in n.children)
