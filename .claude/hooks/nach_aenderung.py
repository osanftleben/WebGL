"""PostToolUse-Hook (Edit|Write): schnelle Prüfung der gerade geänderten Datei.

- .vert/.frag in docs/  -> glslang (shader_check.py)
- .js/.html/.css in docs/ -> keine externen Adressen
- Datei in einer eigenen Bibliothek -> Erinnerung an lib.json/CHANGELOG und betroffene Projekte

Fehler: Exit-Code 2, Meldung auf stderr -> Claude sieht sie sofort.
"""

import json
import sys
from pathlib import Path

SKRIPTE = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SKRIPTE))
import check  # noqa: E402
import shader_check  # noqa: E402
import webgl_gemeinsam as g  # noqa: E402


def main() -> None:
    g.utf8_ausgabe()
    try:
        daten = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        sys.exit(0)
    datei = (daten.get("tool_input") or {}).get("file_path")
    if not datei:
        sys.exit(0)
    pfad = Path(datei).resolve()
    try:
        teile = pfad.relative_to(g.DOCS).parts
    except ValueError:
        sys.exit(0)  # nur docs/ wird hier geprüft
    if not pfad.is_file() or check.ist_fremd(pfad):
        sys.exit(0)

    fehler: list[str] = []
    endung = pfad.suffix.lower()
    if endung in (".vert", ".frag"):
        fehler, _ = shader_check.pruefe(pfad)
    elif endung in (".js", ".html", ".css", ".json"):
        fehler = check.externe_adressen(pfad)

    if fehler:
        print("Prüfung nach der Änderung fehlgeschlagen:", file=sys.stderr)
        for f in fehler:
            print(f"  {f}", file=sys.stderr)
        sys.exit(2)

    # Erinnerung bei Änderungen an eigenen Bibliotheken
    if len(teile) >= 3 and teile[0] == "lib" and (m := g.LIB_ORDNER_RE.match(teile[1])) and not g.THREE_ORDNER_RE.match(teile[1]):
        lib_ordner = teile[1]
        nutzer = []
        for projekt in g.projekte():
            try:
                imports = g.importmap(projekt) or {}
            except ValueError:
                continue
            if any(f"lib/{lib_ordner}/" in ziel for ziel in imports.values()):
                nutzer.append(projekt.name)
        text = (
            f"Du hast die Bibliothek {lib_ordner} geändert. Regeln: nur rückwärtskompatible Änderungen innerhalb "
            f"v{m.group(2)}; Version in lib.json erhöhen und CHANGELOG.md ergänzen (sonst schlägt check.py fehl). "
            f"Betroffene Projekte: {', '.join(nutzer) or 'keine'} – diese im Browser prüfen."
        )
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": text}}, ensure_ascii=False))
    sys.exit(0)


if __name__ == "__main__":
    main()
