"""Projekte auflisten und die Startseite docs/index.html aktualisieren.

Aufruf:
  python .claude/scripts/projekte.py liste        Projekte mit Titel und Versionen
  python .claude/scripts/projekte.py startseite   Projektliste auf der Startseite neu schreiben
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import webgl_gemeinsam as g  # noqa: E402

BLOCK_RE = re.compile(r"(<!-- PROJEKTE:START[^>]*-->)(.*?)(<!-- PROJEKTE:ENDE -->)", re.S)


def beschreibung(projekt: Path) -> str:
    try:
        imports = g.importmap(projekt) or {}
    except ValueError:
        imports = {}
    three, _ = g.versionen(imports)
    return f"{projekt.name} · three.js {', '.join(sorted(three)) or '?'}"


def liste() -> int:
    projekte = g.projekte()
    if not projekte:
        print("Noch keine Projekte in docs/.")
        return 0
    for projekt in projekte:
        print(f"{projekt.name:<28} {g.titel(projekt):<40} {beschreibung(projekt)}")
    return 0


def startseite() -> int:
    pfad = g.DOCS / "index.html"
    text = g.lies(pfad)
    if not BLOCK_RE.search(text):
        print("FEHLER   docs/index.html: Markierungen PROJEKTE:START/ENDE fehlen")
        return 1
    projekte = g.projekte()
    if projekte:
        eintraege = "\n".join(
            f'      <li><a href="{p.name}/">{html.escape(g.titel(p))}<span>{html.escape(beschreibung(p))}</span></a></li>'
            for p in projekte
        )
        inhalt = f'\n    <ul class="projekte">\n{eintraege}\n    </ul>\n    '
    else:
        inhalt = '\n    <p class="leer">Noch keine Projekte.</p>\n    '
    neu = BLOCK_RE.sub(lambda m: m.group(1) + inhalt + m.group(3), text, count=1)
    if neu != text:
        pfad.write_text(neu, encoding="utf-8")
        print(f"Startseite aktualisiert: {len(projekte)} Projekt(e)")
    else:
        print("Startseite ist aktuell")
    return 0


def main() -> int:
    g.utf8_ausgabe()
    befehl = sys.argv[1] if len(sys.argv) > 1 else "liste"
    if befehl == "liste":
        return liste()
    if befehl == "startseite":
        return startseite()
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
