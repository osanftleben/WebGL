"""Hook (PreToolUse: Bash, PowerShell, Terminal-Panel): eigene Skripte nur mit Zeitlimit.

Das Zeitlimit gilt nur für eigene, von Claude erstellte Skripte (Wunsch des Nutzers):
  - Skriptdateien (*.py/*.ps1/*.sh/*.bat/*.cmd) im Projektordner (außer tools/) und im
    Claude-Temp-Ordner (Scratchpad),
  - Inline-Code: python -c "…", python - (Code über stdin/Heredoc).
Ein Befehlsteil, der so etwas startet (auch über bash/cmd/powershell/Start-Process/env/xargs …),
muss mit dem Wächter beginnen:
    python .claude/hooks/zeitlimit.py <befehl …>
Sonst wird der Aufruf blockiert. Der Wächter bricht nach 2 Minuten samt Unterprozessen ab.
Fremde Programme und Werkzeuge (pip, git, glslang, python -m <modul>, Skripte außerhalb) bleiben frei.

Dauerte der letzte Lauf eines Skripts über 2 Minuten (oder wurde er abgebrochen), meldet der Hook
vor dem nächsten Aufruf eine Warnung an den Nutzer (systemMessage).
"""

from __future__ import annotations

import json
import os
import re
import shlex
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import zeitlimit as zl  # noqa: E402

# Programme, die einen weiteren Befehl starten: dahinter wird weitergesucht
STARTER = {"bash", "sh", "zsh", "env", "nohup", "time", "exec", "xargs", "start", "start-process", "saps",
           "cmd", "powershell", "pwsh", "timeout", "nice", "call", "sudo", "wsl", "invoke-expression", "iex",
           "uv", "uvx", "pipx", "poetry", "conda", "&", ".", "invoke-command", "icm", "start-job", "sajb"}
TRENNER = set(";&|\n(){}`")
FREMD_IM_PROJEKT = ("tools",)          # Fremdpakete im Projektordner (vendor, bin)
CLAUDE_TEMP = Path(tempfile.gettempdir()) / "claude"


HEREDOC_RE = re.compile(r"<<-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\1")


def ohne_eingebettetes(befehl: str) -> str:
    """Inhalte von Heredocs (<<EOF … EOF) und PowerShell-Here-Strings (@' … '@) entfernen: das sind
    Daten für das Programm davor (z. B. Code für „python -“), keine Befehle."""
    zeilen, aus, ende = befehl.split("\n"), [], None
    for z in zeilen:
        if ende is not None:
            if z.strip() == ende:
                ende = None
            continue
        aus.append(z)
        if z.rstrip().endswith(("@'", '@"')):
            ende = z.rstrip()[-1] + "@"
        else:
            m = HEREDOC_RE.search(z)
            if m:
                ende = m.group(2)
    return "\n".join(aus)


def teile(befehl: str) -> list[str]:
    """Befehl an Trennern außerhalb von Anführungszeichen zerlegen (; && || | & Zeilen, Klammern, $( ))."""
    befehl = ohne_eingebettetes(befehl)
    erg, akt, quote = [], [], ""
    for z in befehl:
        if quote:
            akt.append(z)
            if z == quote:
                quote = ""
        elif z in "\"'":
            quote = z
            akt.append(z)
        elif z in TRENNER:
            erg.append("".join(akt))
            akt = []
        else:
            akt.append(z)
    erg.append("".join(akt))
    return [s.strip().lstrip("$").strip() for s in erg if s.strip().lstrip("$").strip()]


def woerter(teil: str) -> list[str]:
    try:
        roh = shlex.split(teil, posix=False)
    except ValueError:
        roh = teil.split()
    return [w[1:-1] if len(w) >= 2 and w[0] == w[-1] and w[0] in "\"'" else w for w in roh]


def ohne_vorsatz(ws: list[str]) -> list[str]:
    """Umgebungs-Zuweisungen (FOO=1 befehl) vorn entfernen."""
    i = 0
    while i < len(ws) and "=" in ws[i] and ws[i].split("=", 1)[0].replace("_", "").isalnum():
        i += 1
    return ws[i:]


def _innerhalb(p: Path, ordner: Path) -> bool:
    try:
        p.relative_to(ordner.resolve())
        return True
    except ValueError:
        return False


def ist_eigene_datei(wort: str, cwd: str | None) -> bool:
    """Liegt die Skriptdatei im Projektordner (außer tools/) oder im Claude-Temp-Ordner?"""
    w = wort.replace("\\", "/")
    if len(w) > 3 and w[0] == "/" and w[1].isalpha() and w[2] == "/":   # Git-Bash: /c/… → C:/…
        w = f"{w[1].upper()}:/{w[3:]}"
    w = w.replace("$CLAUDE_PROJECT_DIR", str(zl.WURZEL)).replace("${CLAUDE_PROJECT_DIR}", str(zl.WURZEL))
    try:
        p = Path(w)
        if not p.is_absolute():
            p = Path(cwd or os.getcwd()) / p
        p = p.resolve()
    except OSError:
        return True                      # im Zweifel als eigenes Skript behandeln
    if _innerhalb(p, CLAUDE_TEMP):
        return True
    if _innerhalb(p, zl.WURZEL):
        return p.relative_to(zl.WURZEL).parts[:1] not in [(f,) for f in FREMD_IM_PROJEKT]
    return False


def startet_eigenes(teil: str, cwd: str | None, tiefe: int = 0) -> bool:
    ws = ohne_vorsatz(woerter(teil))
    if not ws or tiefe > 4:
        return False
    prog = zl._name(ws[0])
    if prog in zl.PYTHON_NAMEN:
        i = 1
        while i < len(ws) and ws[i].startswith("-") and ws[i] != "-":
            if ws[i] == "-c":
                return True                  # Inline-Code
            if ws[i] == "-m":
                return False                 # fremdes Modul (pip, venv, …)
            i += 2 if ws[i] in zl.PY_MIT_WERT else 1
        if i >= len(ws) or ws[i] == "-":
            return True                      # Code über stdin / Heredoc
        return ist_eigene_datei(ws[i], cwd)
    if ws[0].lower().endswith(zl.SKRIPT_ENDUNGEN):
        return ist_eigene_datei(ws[0], cwd)
    if prog in STARTER or ws[0] in ("&", "."):
        for w in ws[1:]:
            if " " in w and any(startet_eigenes(t, cwd, tiefe + 1) for t in teile(w)):
                return True                  # bash -c "python …", cmd /c "…"
        rest = [w for w in ws[1:] if not w.startswith(("-", "/")) or w.lower().endswith(zl.SKRIPT_ENDUNGEN)]
        rest = ohne_vorsatz(rest)
        if rest and " " not in rest[0] and startet_eigenes(" ".join(shlex.quote(w) for w in rest), cwd, tiefe + 1):
            return True
    return False


def waechter_befehl(teil: str) -> list[str] | None:
    """Beginnt der Teil mit dem Wächter? Dann der eingeklammerte Befehl, sonst None."""
    ws = woerter(teil)
    if len(ws) < 2 or zl._name(ws[0]) not in zl.PYTHON_NAMEN:
        return None
    i = 1
    while i < len(ws) and ws[i].startswith("-"):
        i += 2 if ws[i] in zl.PY_MIT_WERT else 1
    if i >= len(ws) or not ws[i].replace("\\", "/").endswith("hooks/zeitlimit.py"):
        return None
    rest = ws[i + 1:]
    if rest[:1] == ["--sekunden"]:
        rest = rest[2:]
    return rest


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    try:
        daten = json.loads(sys.stdin.buffer.read().decode("utf-8", errors="replace"))
    except ValueError:
        return
    befehl = str((daten.get("tool_input") or {}).get("command", ""))
    cwd = daten.get("cwd")
    warnungen = []
    for teil in teile(befehl):
        innen = waechter_befehl(teil)
        if innen is not None:
            w = zl.warnung(zl.schluessel(innen, cwd))
            if w and w not in warnungen:
                warnungen.append(w)
        elif startet_eigenes(teil, cwd):
            print("Blockiert: eigene Skripte laufen nur mit Zeitlimit (2 Minuten, fest). Befehl so starten:\n"
                  f"  python .claude/hooks/zeitlimit.py {teil.strip()[:160]}\n"
                  "Längere Rechnungen in Schritte unter 2 Minuten teilen.", file=sys.stderr)
            sys.exit(2)
    if warnungen:
        print(json.dumps({"systemMessage": "\n".join(warnungen)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
