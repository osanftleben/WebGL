"""Stop-Hook: Aufgabensitzungen führen ein laufendes Protokoll.

Gilt nur für Aufgabensitzungen (erste Nutzernachricht enthält „Du bist eine Aufgabensitzung“).
Hat die Sitzung Dateien in docs/ geändert (Edit/Write laut Verlauf), muss ihr Protokoll in
.claude/notizen/protokolle/ mindestens so neu sein wie die zuletzt geänderte Datei. Sonst: Exit 2
mit Hinweis -> Claude trägt den Arbeitsstand nach.

Andere Sitzungen im selben Ordner stören nicht: gezählt werden nur Dateien, die diese Sitzung
selbst bearbeitet hat. Schleifenschutz: Läuft Claude schon wegen eines Stop-Hooks weiter
(stop_hook_active), wird nicht erneut blockiert.
"""

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import webgl_gemeinsam as g  # noqa: E402

KENNUNG = "Du bist eine Aufgabensitzung"
PROTOKOLLE = g.WURZEL / ".claude" / "notizen" / "protokolle"
DOCS = g.WURZEL / "docs"
SPIELRAUM_S = 2.0  # Uhren-Unschärfe beim Vergleich der Änderungszeiten
PROTOKOLL_MUSTER = re.compile(r"notizen[\\/]+protokolle[\\/]+([\w.\-]+\.md)")
SCHREIB_WERKZEUGE = {"Edit", "Write", "NotebookEdit", "MultiEdit"}


def text_von(inhalt) -> str:
    """Text einer Nachricht (String oder Liste von Blöcken), ohne Werkzeug-Ergebnisse."""
    if isinstance(inhalt, str):
        return inhalt
    if isinstance(inhalt, list):
        return "\n".join(b.get("text", "") for b in inhalt if isinstance(b, dict) and b.get("type") == "text")
    return ""


def lies_verlauf(pfad: Path) -> tuple[bool, set[Path], str | None]:
    """-> (ist Aufgabensitzung, bearbeitete docs-Dateien, Name der zuletzt genannten Protokolldatei)."""
    aufgabe = None
    dateien: set[Path] = set()
    protokoll = None
    with pfad.open(encoding="utf-8", errors="replace") as f:
        for zeile in f:
            try:
                eintrag = json.loads(zeile)
            except ValueError:
                continue
            nachricht = eintrag.get("message") or {}
            inhalt = nachricht.get("content")
            # Die erste echte Nutzernachricht entscheidet, ob es eine Aufgabensitzung ist.
            if aufgabe is None and eintrag.get("type") == "user" and nachricht.get("role") == "user":
                text = text_von(inhalt)
                if text.strip():
                    aufgabe = KENNUNG in text
                    if not aufgabe:
                        return False, set(), None
            if eintrag.get("type") != "assistant" or not isinstance(inhalt, list):
                continue
            for block in inhalt:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                eingabe = json.dumps(block.get("input") or {}, ensure_ascii=False)
                for treffer in PROTOKOLL_MUSTER.finditer(eingabe):
                    protokoll = treffer.group(1)
                if block.get("name") in SCHREIB_WERKZEUGE:
                    ziel = (block.get("input") or {}).get("file_path") or (block.get("input") or {}).get("notebook_path")
                    if ziel:
                        datei = Path(ziel)
                        if not datei.is_absolute():
                            datei = g.WURZEL / datei
                        try:
                            datei.resolve().relative_to(DOCS)
                        except ValueError:
                            continue
                        dateien.add(datei.resolve())
    return bool(aufgabe), dateien, protokoll


def main() -> None:
    g.utf8_ausgabe()
    try:
        daten = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        sys.exit(0)
    if daten.get("stop_hook_active"):
        sys.exit(0)
    verlauf = Path(daten.get("transcript_path") or "")
    if not verlauf.is_file():
        sys.exit(0)

    aufgabe, dateien, name = lies_verlauf(verlauf)
    if not aufgabe:
        sys.exit(0)
    zeiten = [d.stat().st_mtime for d in dateien if d.is_file()]
    if not zeiten:
        sys.exit(0)  # noch nichts in docs/ geändert
    neueste = max(zeiten)

    protokoll = PROTOKOLLE / name if name else None
    if protokoll is None or not protokoll.is_file():
        print("Protokoll fehlt: Diese Aufgabensitzung hat Dateien in docs/ geändert, aber noch kein "
              "Protokoll. Lege es jetzt an: .claude/notizen/protokolle/<JJJJ-MM-TT>-<kurzname>.md "
              "(Aufbau siehe Skill auftrag) und trage den bisherigen Arbeitsstand ein.", file=sys.stderr)
        sys.exit(2)
    if protokoll.stat().st_mtime + SPIELRAUM_S < neueste:
        print(f"Protokoll veraltet: {g.rel(protokoll)} ist älter als deine letzte Änderung in docs/. "
              "Trage jetzt kurz ein: erledigt, geänderte Dateien, Messwerte, offen, nächster Schritt.",
              file=sys.stderr)
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
