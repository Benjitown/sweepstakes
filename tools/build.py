#!/usr/bin/env python3
"""Builds the shippable game from the source files. Python 3.8+, standard library only.

    python tools/build.py                  dist/sweepstakes.html     one self-contained file: double-click to play, works offline
                                           dist/sweepstakes-web.zip  index.html + font licence, for itch.io, game sites or any web host
    python tools/build.py --fragment F     also writes the page without <html>/<head>/<body>, for hosts that add their own wrapper

How the JavaScript bundle works: starting at src/main.js it follows the import lines depth-first, which is
the order a browser evaluates ES modules, strips the import/export keywords and puts every module in one
function scope. That works because each module-level name is unique across files, which this script checks.
Stylesheets are inlined in <link> order and the fonts and icon become data: URIs.
"""
import base64, pathlib, re, sys, urllib.parse, zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'


def fail(msg):
    sys.exit(f'build failed: {msg}')


def data_uri(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()


IMPORT = re.compile(r"""^import\s*(?:\{([^}]*)\}\s*from\s*)?(['"])(.+?)\2;?[ \t]*\n?""", re.M)
TOP_NAME = re.compile(r'^(?:export\s+)?(?:const|let|var|class|function\*?|async\s+function)\s+([\w$]+)', re.M)


def bundle(entry):
    """Concatenate ES modules in evaluation order into one strict-mode function scope."""
    order, state = [], {}

    def visit(path):
        if state.get(path) is not None:  # done, or on the stack (an import cycle): same rule as the browser
            return
        state[path] = 'visiting'
        if not path.is_file():
            fail(f'missing module {path.relative_to(ROOT)}')
        text = path.read_text(encoding='utf-8')
        for m in IMPORT.finditer(text):
            visit((path.parent / m.group(3)).resolve())
        state[path] = 'done'
        order.append((path, text))

    visit(entry.resolve())
    seen, parts = {}, []
    for path, text in order:
        rel = path.relative_to(ROOT).as_posix()
        body = IMPORT.sub('', text)
        body = re.sub(r'^export\s+(?=(?:const|let|var|class|function|async)\b)', '', body, flags=re.M)
        if re.search(r'^export\b', body, re.M):
            fail(f'{rel}: only "export const/let/function/class" is supported by this bundler')
        for name in TOP_NAME.findall(body):
            if name in seen:
                fail(f'"{name}" is declared at the top of both {seen[name]} and {rel}; module-level names must be unique')
            seen[name] = rel
        parts.append(f'// ---- {rel} ----\n{body.strip()}\n')
    return "(() => {\n'use strict';\n" + '\n'.join(parts) + '})();\n', [p for p, _ in order]


def inline_css(html):
    links = re.findall(r'<link rel="stylesheet" href="([^"]+)">\n?', html)
    if not links:
        fail('no stylesheets linked from index.html')
    css = []
    for href in links:
        path = ROOT / href
        text = path.read_text(encoding='utf-8')
        # fonts referenced from the stylesheet become data URIs
        text = re.sub(r"url\((['\"]?)([^)'\"]+\.woff2)\1\)",
                      lambda m: f"url({data_uri((path.parent / m.group(2)).resolve(), 'font/woff2')})", text)
        css.append(text.strip())
    first = html.index('<link rel="stylesheet"')
    html = re.sub(r'<link rel="stylesheet" href="[^"]+">\n?', '', html)
    return html[:first] + '<style>\n' + '\n'.join(css) + '\n</style>\n' + html[first:], len(links)


def build(fragment=None):
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    html, n_css = inline_css(html)

    icon = (ROOT / 'assets/icon.svg').read_text(encoding='utf-8')
    icon = 'data:image/svg+xml,' + urllib.parse.quote(re.sub(r'\s*\n\s*', '', icon), safe=" =:/,.-'")
    html = html.replace('<link rel="icon" href="assets/icon.svg">', f'<link rel="icon" href="{icon}">')

    tag = '<script type="module" src="src/main.js"></script>'
    if tag not in html:
        fail('index.html must load the game with ' + tag)
    js, modules = bundle(ROOT / 'src/main.js')
    html = html.replace('<!-- ES modules need http://, not file://. Run python tools/serve.py, or open the built dist/sweepstakes.html -->\n', '')
    html = html.replace(tag, '<script>\n' + js + '</script>')

    licence = (ROOT / 'assets/fonts/LICENSE.txt').read_text(encoding='utf-8')
    if '-->' in licence:
        fail('licence text cannot contain -->')
    html = html.replace('</body>', f'<!--\nFONT LICENCE (the fonts are embedded in this file)\n\n{licence}-->\n</body>')

    DIST.mkdir(exist_ok=True)
    (DIST / 'sweepstakes.html').write_text(html, encoding='utf-8')
    with zipfile.ZipFile(DIST / 'sweepstakes-web.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.writestr('index.html', html)
        z.writestr('LICENSE-fonts.txt', licence)

    if fragment:
        head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
        body = re.search(r'<body>\n?(.*?)</body>', html, re.S).group(1)
        title = re.search(r'<title>.*?</title>', head).group(0)
        style = re.search(r'<style>.*?</style>', head, re.S).group(0)
        pathlib.Path(fragment).write_text(f'{title}\n{style}\n{body}', encoding='utf-8')

    kb = (DIST / 'sweepstakes.html').stat().st_size / 1024
    print(f'built dist/sweepstakes.html ({kb:.0f} KB: {len(modules)} modules, {n_css} stylesheets) and dist/sweepstakes-web.zip'
          + (f', plus {fragment}' if fragment else ''))


if __name__ == '__main__':
    args = sys.argv[1:]
    frag = None
    if args[:1] == ['--fragment'] and len(args) == 2:
        frag = args[1]
    elif args:
        sys.exit(__doc__)
    build(frag)
