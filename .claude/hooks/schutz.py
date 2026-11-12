"""PreToolUse-Hook (Edit|Write): blockiert Änderungen an geschützten Stellen.

Gesperrt:
- docs/lib/three-r*/        fremder three.js-Code (Zusätze nur über three_addon.py)
- tools/                    lokale Werkzeuge und Vorrat
- .env / .env.*             Geheimnisse (.env.example erlaubt)
- alte Projektordner        eigenständige Projekte (siehe webgl_gemeinsam.ALTORDNER)
- alles außerhalb des Repos (Ausnahmen: Temp-Ordner und ~/.claude für Claudes Arbeitsdateien)
"""

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import webgl_gemeinsam as g  # noqa: E402


def ablehnen(grund: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": grund,
        }
    }, ensure_ascii=False))
    sys.exit(0)


def liegt_in(pfad: Path, ordner: Path) -> bool:
    try:
        pfad.relative_to(ordner.resolve())
        return True
    except ValueError:
        return False


def main() -> None:
    g.utf8_ausgabe()
    try:
        daten = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        sys.exit(0)  # ohne lesbare Eingabe keine Entscheidung
    datei = (daten.get("tool_input") or {}).get("file_path")
    if not datei:
        sys.exit(0)
    pfad = Path(datei).resolve()

    if not liegt_in(pfad, g.WURZEL):
        if liegt_in(pfad, Path(tempfile.gettempdir())) or liegt_in(pfad, Path.home() / ".claude"):
            sys.exit(0)
        ablehnen(f"{datei} liegt außerhalb des Projektordners {g.WURZEL} – Dateien nur im Projektordner anlegen.")

    teile = pfad.relative_to(g.WURZEL).parts
    if not teile:
        sys.exit(0)
    if teile[0] in g.ALTORDNER:
        ablehnen(f"'{teile[0]}/' ist ein alter, eigenständiger Projektordner und für dieses Setup gesperrt.")
    if teile[0] == "tools":
        ablehnen("tools/ enthält lokale Werkzeuge und den three.js-Vorrat – nicht von Hand ändern.")
    if len(teile) >= 3 and teile[0] == "docs" and teile[1] == "lib" and g.THREE_ORDNER_RE.match(teile[2]):
        ablehnen("docs/lib/three-r*/ ist fremder three.js-Code. Zusätze nur über "
                 "'python .claude/scripts/three_addon.py hole <pfad>' (Skill /three-addon) hinzufügen.")
    name = pfad.name
    if name == ".env" or (name.startswith(".env.") and name != ".env.example"):
        ablehnen(f"{name} kann Geheimnisse enthalten und ist gesperrt.")
    sys.exit(0)


if __name__ == "__main__":
    main()
