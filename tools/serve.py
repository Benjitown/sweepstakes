#!/usr/bin/env python3
"""Serves the project for development:  python tools/serve.py [port]   then open http://localhost:8000

Browsers only load ES modules over http://, so the source version needs a server (the built
dist/sweepstakes.html doesn't). This one sends the right MIME types, which matters on Windows,
where the registry can make Python serve .js as text/plain and the browser then refuses the module.
Caching is off, so a refresh always shows your latest edit.
"""
import functools, http.server, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml',
                      '.woff2': 'font/woff2', '.json': 'application/json'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):  # quieter: only errors
        if args and str(args[1]).startswith(('4', '5')):
            super().log_message(fmt, *args)


def make_server(port=8000, host='127.0.0.1'):
    return http.server.ThreadingHTTPServer((host, port), functools.partial(Handler, directory=str(ROOT)))


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = make_server(port)
    print(f'Sweepstakes dev server: http://localhost:{port}/  (Ctrl+C to stop)')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
