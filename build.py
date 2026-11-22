#!/usr/bin/env python3
"""Inline css/ and js/ into a single wasteland.html (CDN libs stay external)."""
import re, pathlib
root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + (root / 'css/style.css').read_text() + '\n</style>')
def js(m):
    return '<script>\n' + (root / m.group(1)).read_text().replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script src="(js/[^"]+)"></script>', js, html)
# single-file: no service worker / manifest / external icon files
html = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\n?', '', html)
html = html.replace('<script>\n', '<script>window.WL_SINGLE = true;</script>\n<script>\n', 1)
(root / 'wasteland.html').write_text(html)
print('wrote wasteland.html', len(html), 'bytes')
