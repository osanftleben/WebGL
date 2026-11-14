"""Hook: Beim Abschluss einer Sitzung die Vorschau-Server beenden, die sie selbst gestartet hat.

Aufruf: python server_aufraeumen.py --anlass stop|ende   (Hook-Daten als JSON auf stdin)
- stop: Stop-Hook. Läuft nach jeder Antwort, räumt aber nur auf, wenn in dieser Antwort
  /abschluss lief.
- ende: SessionEnd-Hook. Räumt immer auf.

Welche Server gehören der Sitzung? Die Vorschau-Server hängen an der Desktop-App, nicht an der
Sitzung. Daher zählt der Verlauf: jeder preview_start mit "reused": false (Port + Uhrzeit des
Ergebnisses). Beendet wird nur ein Prozess, der jetzt auf diesem Port lauscht UND kurz vor dieser
Uhrzeit gestartet wurde. Ein Server, den eine andere Sitzung später neu gestartet oder den diese
Sitzung nur mitbenutzt hat ("reused": true), bleibt stehen.

Jeder Lauf schreibt eine Zeile nach .claude/server_aufraeumen.log (nicht im Git).
"""

import argparse
import ctypes
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from ctypes import wintypes

WURZEL = Path(__file__).resolve().parents[2]
LOG = WURZEL / ".claude" / "server_aufraeumen.log"
ABSCHLUSS_MARKE = "# Aufgabe abschließen"  # Überschrift im Skill abschluss
VORLAUF_S = 90.0   # so lange darf der Serverstart vor dem Ergebnis von preview_start liegen
NACHLAUF_S = 5.0   # Uhren-Unschärfe nach dem Ergebnis


def text_von(inhalt) -> str:
    if isinstance(inhalt, str):
        return inhalt
    if isinstance(inhalt, list):
        teile = []
        for b in inhalt:
            if isinstance(b, dict):
                if b.get("type") == "text":
                    teile.append(b.get("text", ""))
                elif b.get("type") == "tool_result":
                    teile.append(text_von(b.get("content")))
        return "\n".join(teile)
    return ""


def zeit(stempel: str) -> float | None:
    try:
        return datetime.fromisoformat(stempel.replace("Z", "+00:00")).timestamp()
    except (AttributeError, ValueError):
        return None


def lies_verlauf(pfad: Path) -> tuple[list[tuple[int, float]], bool]:
    """-> ([(port, zeitpunkt)] eigener Serverstarts, lief /abschluss in der letzten Antwort?)."""
    starts: dict[str, None] = {}
    eigene: list[tuple[int, float]] = []
    abschluss = False
    with pfad.open(encoding="utf-8", errors="replace") as f:
        for zeile in f:
            try:
                e = json.loads(zeile)
            except ValueError:
                continue
            n = e.get("message") or {}
            inhalt = n.get("content")
            if e.get("type") == "assistant" and isinstance(inhalt, list):
                for b in inhalt:
                    if not isinstance(b, dict) or b.get("type") != "tool_use":
                        continue
                    if str(b.get("name", "")).endswith("preview_start"):
                        starts[b.get("id")] = None
                    if b.get("name") == "Skill" and (b.get("input") or {}).get("skill") == "abschluss":
                        abschluss = True
            if e.get("type") != "user" or n.get("role") != "user":
                continue
            bloecke = inhalt if isinstance(inhalt, list) else []
            ergebnisse = [b for b in bloecke if isinstance(b, dict) and b.get("type") == "tool_result"]
            # Neue Nutzernachricht (kein Werkzeug-Ergebnis, kein eingeblendeter Skill-Text) = neue Antwort
            if not ergebnisse and not e.get("isMeta"):
                abschluss = False
            if ABSCHLUSS_MARKE in text_von(inhalt) or "<command-name>/abschluss" in text_von(inhalt):
                abschluss = True
            for b in ergebnisse:
                if b.get("tool_use_id") not in starts:
                    continue
                text = text_von(b.get("content"))
                port = re.search(r'"port"\s*:\s*(\d+)', text)
                neu = re.search(r'"reused"\s*:\s*false', text)
                t = zeit(e.get("timestamp", ""))
                if port and neu and t is not None:
                    eigene.append((int(port.group(1)), t))
    return eigene, abschluss


def lauschende_pids(port: int) -> set[int]:
    """PIDs, die auf dem Port lauschen (netstat, sprachunabhängig: Gegenstelle 0.0.0.0:0 bzw. [::]:0)."""
    aus = subprocess.run(["netstat", "-ano", "-p", "TCP"], capture_output=True, text=True,
                         encoding="oem", errors="replace").stdout
    aus += subprocess.run(["netstat", "-ano", "-p", "TCPv6"], capture_output=True, text=True,
                          encoding="oem", errors="replace").stdout
    pids = set()
    for z in aus.splitlines():
        teile = z.split()
        if len(teile) >= 5 and teile[0].upper().startswith("TCP") and teile[1].endswith(f":{port}") \
                and teile[2] in ("0.0.0.0:0", "[::]:0") and teile[-1].isdigit():
            pids.add(int(teile[-1]))
    return pids


def startzeit(pid: int) -> float | None:
    """Startzeit eines Prozesses (Unix-Sekunden) über GetProcessTimes."""
    k32 = ctypes.WinDLL("kernel32", use_last_error=True)
    k32.OpenProcess.restype = wintypes.HANDLE
    h = k32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
    if not h:
        return None
    try:
        erzeugt, ende, kern, nutzer = (wintypes.FILETIME() for _ in range(4))
        if not k32.GetProcessTimes(h, ctypes.byref(erzeugt), ctypes.byref(ende),
                                   ctypes.byref(kern), ctypes.byref(nutzer)):
            return None
        wert = (erzeugt.dwHighDateTime << 32) | erzeugt.dwLowDateTime
        return wert / 1e7 - 11644473600.0  # FILETIME (ab 1601, 100 ns) -> Unix
    finally:
        k32.CloseHandle(h)


def log(text: str) -> None:
    try:
        with LOG.open("a", encoding="utf-8") as f:
            f.write(f"{datetime.now():%Y-%m-%d %H:%M:%S} {text}\n")
    except OSError:
        pass


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--anlass", choices=["stop", "ende"], required=True)
    args = parser.parse_args()
    try:
        daten = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        daten = {}
    sitzung = str(daten.get("session_id", "?"))[:8]
    verlauf = Path(daten.get("transcript_path") or "")
    if not verlauf.is_file():
        if args.anlass == "ende":
            log(f"{sitzung} ende: kein Verlauf")
        return

    eigene, abschluss = lies_verlauf(verlauf)
    if args.anlass == "stop" and not abschluss:
        return  # gewöhnliches Antwortende: nichts tun, nichts loggen

    beendet = []
    for port, t in eigene:
        for pid in lauschende_pids(port):
            s = startzeit(pid)
            if s is None or not (t - VORLAUF_S <= s <= t + NACHLAUF_S):
                continue  # nicht der Server, den diese Sitzung gestartet hat
            r = subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)
            if r.returncode == 0:
                beendet.append(f"Port {port} (PID {pid})")
    log(f"{sitzung} {args.anlass}: eigene Starts {len(eigene)}, beendet: {', '.join(beendet) or '-'}")
    if beendet and args.anlass == "stop":
        # Nur Hinweis, blockiert nicht
        print(json.dumps({"systemMessage": "Server-Aufräumen: beendet " + ", ".join(beendet)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
