"""Legt ein neues WebGL-Projekt aus der Vorlage an.

Aufruf: python .claude/skills/neues-projekt/scripts/anlegen.py <ordnername> "<Titel>"

- kopiert die Vorlage nach docs/<ordnername>/
- trägt in die Import-Map die neueste three.js-Version und je Bibliothek die neueste Hauptversion ein
- legt .claude/rules/projekte/<ordnername>.md für Projektnotizen an
- aktualisiert die Startseite docs/index.html
Es wird nichts überschrieben.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
WURZEL = SKILL.parents[2]
sys.path.insert(0, str(WURZEL / ".claude" / "scripts"))
import projekte  # noqa: E402
import webgl_gemeinsam as g  # noqa: E402

NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
TEXT_ENDUNGEN = {".html", ".js", ".css", ".vert", ".frag", ".json", ".md"}


def importmap_text() -> str:
    three = g.three_versionen()
    if not three:
        sys.exit("FEHLER   keine three.js-Version in docs/lib")
    imports = {
        "three": f"../lib/three-{three[-1]}/three.module.js",
        "three/addons/": f"../lib/three-{three[-1]}/addons/",
    }
    for name, haupt in sorted(g.neueste_libs().items()):
        imports[f"{name}/"] = f"../lib/{name}-v{haupt}/"
    text = json.dumps({"imports": imports}, ensure_ascii=False, indent=2)
    return "\n".join("    " + zeile for zeile in text.splitlines())


def main() -> int:
    g.utf8_ausgabe()
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    name, titel = sys.argv[1], sys.argv[2].strip()
    if not NAME_RE.match(name) or name == "lib":
        print(f"FEHLER   ungültiger Ordnername '{name}' (klein, a-z, 0-9, Bindestrich; nicht 'lib')")
        return 1
    ziel = g.DOCS / name
    regel = WURZEL / ".claude" / "rules" / "projekte" / f"{name}.md"
    for pfad in (ziel, regel):
        if pfad.exists():
            print(f"FEHLER   {g.rel(pfad)} existiert schon – nichts angelegt")
            return 1

    ersetzungen = {"{{TITEL}}": titel, "{{IMPORTMAP}}": importmap_text()}
    vorlage = SKILL / "vorlage"
    for quelle in sorted(vorlage.rglob("*")):
        if not quelle.is_file():
            continue
        neu = ziel / quelle.relative_to(vorlage)
        neu.parent.mkdir(parents=True, exist_ok=True)
        if quelle.suffix.lower() in TEXT_ENDUNGEN:
            text = quelle.read_text(encoding="utf-8")
            for alt, wert in ersetzungen.items():
                text = text.replace(alt, wert)
            neu.write_text(text, encoding="utf-8")
        else:
            neu.write_bytes(quelle.read_bytes())
        print(f"angelegt {g.rel(neu)}")

    regel.parent.mkdir(parents=True, exist_ok=True)
    regel.write_text(
        f'---\npaths:\n  - "docs/{name}/**"\n---\n\n'
        f"# Projekt: {titel}\n\n"
        f"- Ordner: `docs/{name}/`, online unter `…/WebGL/{name}/`\n"
        f"- Ziel: (noch offen)\n"
        f"- Besonderheiten: (noch keine)\n",
        encoding="utf-8",
    )
    print(f"angelegt {g.rel(regel)}")
    return projekte.startseite()


if __name__ == "__main__":
    sys.exit(main())
