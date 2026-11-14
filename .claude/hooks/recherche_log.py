"""PostToolUse-Hook: protokolliert jede Recherche-Aktion (Suche, Seitenabruf, Browser, Download).

Ziel: .claude/notizen/recherche/protokoll/<JJJJ-MM-TT>.log, eine Zeile je Aktion:
  HH:MM:SS  <sitzung>[/<agent>]  <werkzeug>  <ziel>
Lokale Adressen (127.0.0.1, localhost) werden nicht protokolliert – das sind Vorschau-Prüfungen.
Bash/PowerShell nur, wenn der Befehl etwas aus dem Internet holt (curl, wget, Invoke-WebRequest …).
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[2]
ORDNER = WURZEL / ".claude" / "notizen" / "recherche" / "protokoll"
LOKAL = re.compile(r"^(https?://)?(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(/|$)", re.I)
HOLT = re.compile(r"\b(curl|wget|Invoke-WebRequest|iwr|Start-BitsTransfer)\b[^\n]*https?://", re.I)


def ziel_von(werkzeug: str, eingabe: dict) -> str | None:
    if werkzeug == "WebSearch":
        return f"Suche: {eingabe.get('query', '')}"
    if werkzeug == "WebFetch":
        return str(eingabe.get("url", ""))
    if werkzeug in ("Bash", "PowerShell"):
        befehl = str(eingabe.get("command", ""))
        return befehl[:300] if HOLT.search(befehl) else None
    if "Claude_Browser" in werkzeug:
        url = eingabe.get("url")
        if url:
            return None if LOKAL.match(str(url)) else str(url)
        if werkzeug.endswith("__computer"):
            aktion = eingabe.get("action", "")
            if aktion in ("screenshot", "zoom", "wait", "scroll", "scroll_to", "hover"):
                return None  # nur ansehen, nichts auslösen
            return f"Aktion {aktion}: {eingabe.get('action_summary') or eingabe.get('text') or ''}"[:200]
        if werkzeug.endswith(("__get_page_text", "__read_page", "__find")):
            return f"liest Seite (Tab {eingabe.get('tabId', 'vorn')})" + (
                f", sucht „{eingabe.get('query')}“" if eingabe.get("query") else "")
    return None


def main() -> None:
    try:
        daten = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return
    werkzeug = str(daten.get("tool_name", ""))
    ziel = ziel_von(werkzeug, daten.get("tool_input") or {})
    if not ziel:
        return
    # Lese- und Klick-Aktionen im Browser haben keine Adresse; ob gerade die lokale Vorschau offen ist,
    # lässt sich nicht sicher sagen. Deshalb nur beim Recherche-Agenten protokollieren (agent_type, falls
    # der Hook ihn mitbekommt; Seitenaufrufe mit Adresse werden immer protokolliert).
    agent = str(daten.get("agent_type") or "")
    if werkzeug.endswith(("__get_page_text", "__read_page", "__find", "__computer")) and agent != "recherche":
        return
    wer = str(daten.get("session_id", "?"))[:8] + (f"/{agent}" if agent else "")
    jetzt = datetime.now()
    ORDNER.mkdir(parents=True, exist_ok=True)
    kurz = werkzeug.replace("mcp__Claude_Browser__", "Browser.")
    with (ORDNER / f"{jetzt:%Y-%m-%d}.log").open("a", encoding="utf-8") as f:
        f.write(f"{jetzt:%H:%M:%S}  {wer}  {kurz}  {ziel.replace(chr(10), ' ')}\n")


if __name__ == "__main__":
    main()
