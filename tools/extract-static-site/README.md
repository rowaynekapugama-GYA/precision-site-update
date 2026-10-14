# One-off: the static site to content/

`extract.py` (with `htmltree.py`) made `content/` from the approved 9 October 2026 static release.
It has already been run; it is kept so the conversion can be checked or repeated.

    python3 -I tools/extract-static-site/extract.py <release folder> content <blogdata.json>

Each page section becomes its original HTML with editable values replaced by `{{fN}}` placeholders,
and practice details by `{{site:...}}` placeholders. `npm run qa:parity -- <release folder>` renders
`content/` and compares every file with the release; it must report 127 of 127 identical.
