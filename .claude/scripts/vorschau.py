"""Lokaler Vorschau-Server für docs/ – nur auf 127.0.0.1 erreichbar.

Unterschiede zu `python -m http.server`:
- feste, korrekte MIME-Typen (unter Windows kann die Registry .js sonst falsch zuordnen,
  dann laden ES-Module nicht),
- kein Caching, damit geänderte Dateien beim Neuladen sofort ankommen.

Aufruf: python .claude/scripts/vorschau.py [--port 8000]
"""

import argparse
import functools
import http.server
from pathlib import Path

DOCS = Path(__file__).resolve().parents[2] / "docs"


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".wasm": "application/wasm",
        ".vert": "text/plain; charset=utf-8",
        ".frag": "text/plain; charset=utf-8",
        ".glsl": "text/plain; charset=utf-8",
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".ktx2": "image/ktx2",
        ".hdr": "application/octet-stream",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    handler = functools.partial(Handler, directory=str(DOCS))
    with http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Vorschau: http://127.0.0.1:{args.port}/  (Ordner: {DOCS})", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
