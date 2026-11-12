"""Stop-Hook: strenger Abschluss-Check.

Gibt es in docs/ ungespeicherte Änderungen (laut git), muss check.py fehlerfrei sein,
bevor Claude die Arbeit beenden darf. Sonst: Exit 2 + Fehlerliste -> Claude repariert.

Schleifenschutz: höchstens 3 Blockaden hintereinander pro Sitzung, danach darf Claude
beenden (mit Hinweis), damit keine Endlosschleife entsteht.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import webgl_gemeinsam as g  # noqa: E402

MAX_BLOCKADEN = 3


def zaehler_datei(sitzung: str) -> Path:
    sicher = "".join(z for z in sitzung if z.isalnum() or z in "-_") or "unbekannt"
    return Path(tempfile.gettempdir()) / f"claude-webgl-abschluss-{sicher}.txt"


def main() -> None:
    g.utf8_ausgabe()
    try:
        daten = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        daten = {}
    zaehler = zaehler_datei(str(daten.get("session_id", "")))

    # Nur prüfen, wenn sich in docs/ etwas geändert hat (sonst blockiert z. B. ein reines Gespräch nicht).
    status = subprocess.run(
        ["git", "status", "--porcelain", "--", "docs"],
        cwd=g.WURZEL, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if status.returncode != 0 or not status.stdout.strip():
        zaehler.unlink(missing_ok=True)
        sys.exit(0)

    ergebnis = subprocess.run(
        [sys.executable, str(g.WURZEL / ".claude" / "scripts" / "check.py")],
        cwd=g.WURZEL, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300,
    )
    if ergebnis.returncode == 0:
        zaehler.unlink(missing_ok=True)
        sys.exit(0)

    bisher = int(zaehler.read_text()) if zaehler.is_file() and zaehler.read_text().strip().isdigit() else 0
    fehlerzeilen = [z for z in ergebnis.stdout.splitlines() if z.startswith("FEHLER")]
    if bisher >= MAX_BLOCKADEN:
        zaehler.unlink(missing_ok=True)
        print(f"Abschluss-Check: nach {MAX_BLOCKADEN} Versuchen noch {len(fehlerzeilen)} Fehler – "
              "bitte dem Nutzer offen melden.", file=sys.stderr)
        sys.exit(0)

    zaehler.write_text(str(bisher + 1))
    print("Abschluss-Check fehlgeschlagen – die Aufgabe ist noch nicht fertig. Behebe diese Fehler "
          "(python .claude/scripts/check.py):", file=sys.stderr)
    for z in fehlerzeilen[:40]:
        print(f"  {z}", file=sys.stderr)
    if len(fehlerzeilen) > 40:
        print(f"  … und {len(fehlerzeilen) - 40} weitere", file=sys.stderr)
    sys.exit(2)


if __name__ == "__main__":
    main()
