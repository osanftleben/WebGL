"""Hook (PreToolUse, Bash/PowerShell): lange Rechnungen nur im Terminal-Panel.

Als Hintergrundaufgabe der Sitzung brechen sie ab, wenn die Sitzung endet (ist zweimal passiert).
Blockiert den Aufruf und nennt den richtigen Weg (run_in_terminal).
"""

import json
import sys

# Befehlsteile, die minutenlang rechnen
LANGE_RECHNUNGEN = [
    "holmes_licht.py berechne",
]


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    try:
        daten = json.load(sys.stdin)
    except ValueError:
        return
    befehl = str((daten.get("tool_input") or {}).get("command", ""))
    for muster in LANGE_RECHNUNGEN:
        if muster in befehl:
            print(f"Blockiert: „{muster}“ rechnet mehrere Minuten. Im Terminal-Panel starten "
                  "(run_in_terminal), dort läuft es auch nach dem Ende der Sitzung weiter.", file=sys.stderr)
            sys.exit(2)


if __name__ == "__main__":
    main()
