"""Eigene Bibliotheken anlegen und neue Hauptversionen erzeugen.

Aufruf:
  python .claude/scripts/libs.py liste
  python .claude/scripts/libs.py neu <name> "<beschreibung>"
  python .claude/scripts/libs.py hauptversion <name>      z. B. shader-v1 -> shader-v2 (Kopie)

Es wird nie etwas überschrieben oder gelöscht.
"""

from __future__ import annotations

import datetime
import json
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import webgl_gemeinsam as g  # noqa: E402

NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def heute() -> str:
    return datetime.date.today().isoformat()


def schreibe_json(pfad: Path, daten: dict) -> None:
    pfad.write_text(json.dumps(daten, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def liste() -> int:
    for (name, haupt), ordner in g.eigene_libs().items():
        try:
            daten = g.lib_json(ordner)
            print(f"{ordner.name:<20} {daten.get('version', '?'):<8} three {daten.get('three') or 'unabhängig'}  – {daten.get('beschreibung', '')}")
        except (OSError, json.JSONDecodeError):
            print(f"{ordner.name:<20} lib.json fehlt oder ist ungültig")
    return 0


def neu(name: str, beschreibung: str) -> int:
    if not NAME_RE.match(name) or name.startswith("three") or re.search(r"-v\d+$", name):
        print(f"FEHLER   ungültiger Name '{name}' (klein, a-z/0-9/-, ohne Versionsendung, nicht 'three…')")
        return 1
    if any(n == name for n, _ in g.eigene_libs()):
        print(f"FEHLER   Bibliothek '{name}' gibt es schon – für Umbauten: hauptversion {name}")
        return 1
    ordner = g.LIB / f"{name}-v1"
    ordner.mkdir(parents=True)
    neueste_three = g.three_versionen()[-1:] or []
    schreibe_json(ordner / "lib.json", {
        "name": name, "version": "1.0.0", "beschreibung": beschreibung,
        "three": neueste_three, "braucht": {}, "dateien": [],
    })
    (ordner / "CHANGELOG.md").write_text(
        f"# {name} – Änderungen\n\n## 1.0.0 – {heute()}\n\n- Erste Version: {beschreibung}.\n", encoding="utf-8")
    print(f"angelegt {g.rel(ordner)}/ (lib.json, CHANGELOG.md)")
    print(f"Import-Map-Eintrag für Projekte: \"{name}/\": \"../lib/{name}-v1/\"")
    return 0


def hauptversion(name: str) -> int:
    vorhandene = sorted(h for n, h in g.eigene_libs() if n == name)
    if not vorhandene:
        print(f"FEHLER   Bibliothek '{name}' gibt es nicht")
        return 1
    alt_haupt = vorhandene[-1]
    neu_haupt = alt_haupt + 1
    alt = g.LIB / f"{name}-v{alt_haupt}"
    neu_ordner = g.LIB / f"{name}-v{neu_haupt}"
    if neu_ordner.exists():
        print(f"FEHLER   {g.rel(neu_ordner)} existiert schon")
        return 1
    shutil.copytree(alt, neu_ordner)
    daten = g.lib_json(neu_ordner)
    daten["version"] = f"{neu_haupt}.0.0"
    schreibe_json(neu_ordner / "lib.json", daten)
    changelog = neu_ordner / "CHANGELOG.md"
    text = g.lies(changelog)
    kopf, _, rest = text.partition("\n\n")
    eintrag = f"## {neu_haupt}.0.0 – {heute()}\n\n- Neue Hauptversion auf Basis von {alt.name}. Inkompatible Änderungen: (bitte ergänzen)\n\n"
    changelog.write_text(f"{kopf}\n\n{eintrag}{rest}", encoding="utf-8")
    print(f"angelegt {g.rel(neu_ordner)}/ als Kopie von {alt.name} (Version {neu_haupt}.0.0)")
    print(f"{alt.name} bleibt unverändert. Projekte wechseln über die Import-Map: \"{name}/\": \"../lib/{name}-v{neu_haupt}/\"")
    return 0


def main() -> int:
    g.utf8_ausgabe()
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    befehl, rest = sys.argv[1], sys.argv[2:]
    if befehl == "liste":
        return liste()
    if befehl == "neu" and len(rest) == 2:
        return neu(rest[0], rest[1])
    if befehl == "hauptversion" and len(rest) == 1:
        return hauptversion(rest[0])
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
