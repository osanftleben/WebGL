"""Hook (UserPromptSubmit): Hinweis, wenn die Sitzung lang wird.

Jede Antwort schickt den ganzen bisherigen Verlauf erneut mit - lange Sitzungen kosten viele Tokens.
Gemessen wird die Größe der Verlaufsdatei der Sitzung. Über der Schwelle wird Claude erinnert,
den Arbeitsstand festzuhalten und eine neue Sitzung vorzuschlagen.
"""

import json
import os
import sys

SCHWELLE_MB = 3.0


def main() -> None:
    # Windows gibt sonst im falschen Zeichensatz aus (Umlaute kaputt)
    sys.stdout.reconfigure(encoding="utf-8")
    try:
        daten = json.load(sys.stdin)
        pfad = daten.get("transcript_path") or ""
        groesse = os.path.getsize(pfad) / 1e6 if pfad and os.path.isfile(pfad) else 0.0
    except (ValueError, OSError):
        return
    if groesse >= SCHWELLE_MB:
        print(f"HINWEIS Sitzungslänge: Verlauf {groesse:.1f} MB (Schwelle {SCHWELLE_MB} MB). "
              "Nach der aktuellen Aufgabe Arbeitsstand in den Projektnotizen festhalten und dem Nutzer "
              "eine neue Sitzung vorschlagen (siehe CLAUDE.md, Sitzungen und Token sparen).")


if __name__ == "__main__":
    main()
