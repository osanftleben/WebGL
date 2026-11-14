"""Wächter: führt einen Befehl mit festem Zeitlimit aus (höchstens 120 s) und merkt sich die Laufzeit.

Aufruf:
  python .claude/hooks/zeitlimit.py [--sekunden N] <befehl …>
      z. B. python .claude/hooks/zeitlimit.py python .claude/scripts/check.py
      --sekunden verkürzt das Limit (nur zum Testen), verlängern geht nicht.

Garantie (Windows): Der Wächter legt sich und alles, was er startet, in ein Job-Objekt des
Betriebssystems. Nach Ablauf beendet Windows das ganze Job-Objekt auf einmal – samt aller
Unterprozesse (z. B. multiprocessing). Stirbt der Wächter selbst, schließt sich das Job-Objekt
und Windows beendet die übrigen Prozesse ebenfalls (JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE).

Laufzeiten: je Skript in .claude/laufzeiten.json (nicht im Git). Dauerte der letzte Lauf
länger als 2 Minuten oder wurde er abgebrochen, warnt der Wächter beim nächsten Start
(und der Hook zeitlimit_pruefen.py schon vor dem Aufruf).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path

GRENZE_S = 120.0
EXIT_ZEITLIMIT = 124
WURZEL = Path(__file__).resolve().parents[2]
LAUFZEITEN = WURZEL / ".claude" / "laufzeiten.json"

PYTHON_NAMEN = {"python", "python3", "py", "pythonw"}
PIP_NAMEN = {"pip", "pip3"}
SKRIPT_ENDUNGEN = (".py", ".ps1", ".sh", ".bat", ".cmd")
# Python-Schalter mit eigenem Wert (python -X utf8 skript.py)
PY_MIT_WERT = {"-X", "-W", "-Q"}


# ---------------------------------------------------------------- Schlüssel je Skript (auch vom Hook genutzt)

def _name(wort: str) -> str:
    """Programmname ohne Pfad und .exe, klein geschrieben."""
    n = wort.replace("\\", "/").rsplit("/", 1)[-1].lower()
    return n[:-4] if n.endswith(".exe") else n


def _pfad(wort: str, cwd: str | None) -> str:
    """Pfad relativ zum Projekt (mit /), sonst wie angegeben."""
    w = wort.replace("\\", "/")
    if len(w) > 3 and w[0] == "/" and w[1].isalpha() and w[2] == "/":   # Git-Bash: /c/… → C:/…
        wort = f"{w[1].upper()}:/{w[3:]}"
    try:
        p = Path(wort)
        if not p.is_absolute():
            p = Path(cwd or os.getcwd()) / p
        return p.resolve().relative_to(WURZEL).as_posix()
    except (ValueError, OSError):
        return wort.replace("\\", "/")


def _unterbefehl(rest: list[str]) -> str:
    """Erstes schlichtes Wort nach dem Skript (z. B. „berechne“), sonst leer."""
    if rest and rest[0][:1].isalpha() and not any(z in rest[0] for z in "/\\.:"):
        return " " + rest[0]
    return ""


def schluessel(argv: list[str], cwd: str | None = None) -> str | None:
    """Name, unter dem die Laufzeit gemerkt wird; None = nicht merken (z. B. python -c)."""
    if not argv:
        return None
    prog = _name(argv[0])
    if prog in PYTHON_NAMEN:
        i = 1
        while i < len(argv) and argv[i].startswith("-"):
            if argv[i] == "-c":
                return None
            if argv[i] == "-m":
                return f"python -m {argv[i + 1]}" + _unterbefehl(argv[i + 2:]) if i + 1 < len(argv) else None
            i += 2 if argv[i] in PY_MIT_WERT else 1
        if i >= len(argv):
            return None
        return _pfad(argv[i], cwd) + _unterbefehl(argv[i + 1:])
    if prog in PIP_NAMEN:
        return "pip" + _unterbefehl(argv[1:])
    if argv[0].lower().endswith(SKRIPT_ENDUNGEN):
        return _pfad(argv[0], cwd) + _unterbefehl(argv[1:])
    for i, w in enumerate(argv[1:], 1):          # bash x.sh, powershell -File x.ps1, …
        if w.lower().endswith(SKRIPT_ENDUNGEN):
            return _pfad(w, cwd) + _unterbefehl(argv[i + 1:])
    return prog + _unterbefehl(argv[1:])


def lies_laufzeiten() -> dict:
    try:
        return json.loads(LAUFZEITEN.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def merke(schl: str | None, eintrag: dict) -> None:
    if not schl:
        return
    daten = lies_laufzeiten()
    daten[schl] = eintrag
    tmp = LAUFZEITEN.with_name(f"laufzeiten.{os.getpid()}.tmp")
    try:
        tmp.write_text(json.dumps(daten, indent=1, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, LAUFZEITEN)
    except OSError:
        pass


def warnung(schl: str | None) -> str | None:
    """Warntext, wenn der letzte Lauf dieses Skripts über 2 Minuten lag (oder abgebrochen/unvollständig war)."""
    if not schl:
        return None
    e = lies_laufzeiten().get(schl)
    if not e:
        return None
    if e.get("status") == "läuft":
        seit = time.time() - float(e.get("start", time.time()))
        if seit <= GRENZE_S:
            return None
        return (f"WARNUNG Zeitlimit: Der letzte Lauf von „{schl}“ (Start {e.get('beginn', '?')}) hat kein Ende "
                "gemeldet – vermutlich von außen beendet oder noch hängend. Länger als 2 Minuten ist möglich.")
    dauer = float(e.get("dauer_s", 0))
    if dauer < GRENZE_S and e.get("status") != "zeitlimit":
        return None
    wie = (f"wurde vom Zeitlimit nach {dauer:.0f} s abgebrochen" if e.get("status") == "zeitlimit"
           else f"dauerte {dauer:.0f} s")
    return (f"WARNUNG Zeitlimit: Der letzte Lauf von „{schl}“ ({e.get('beginn', '?')}) {wie}. "
            "Dieser Aufruf wird ebenfalls nach 2 Minuten abgebrochen – Rechnung verkleinern oder aufteilen.")


# ---------------------------------------------------------------- Job-Objekt (Windows)

def _job_windows():
    """Legt ein Job-Objekt an (Beenden beim Schließen) und steckt den Wächter selbst hinein.
    Unterprozesse erben die Mitgliedschaft. Gibt (kernel32, job) zurück."""
    import ctypes
    from ctypes import wintypes as wt

    k32 = ctypes.WinDLL("kernel32", use_last_error=True)

    class IO_COUNTERS(ctypes.Structure):
        _fields_ = [(n, ctypes.c_ulonglong) for n in (
            "ReadOperationCount", "WriteOperationCount", "OtherOperationCount",
            "ReadTransferCount", "WriteTransferCount", "OtherTransferCount")]

    class BASIC(ctypes.Structure):
        _fields_ = [("PerProcessUserTimeLimit", ctypes.c_int64), ("PerJobUserTimeLimit", ctypes.c_int64),
                    ("LimitFlags", wt.DWORD), ("MinimumWorkingSetSize", ctypes.c_size_t),
                    ("MaximumWorkingSetSize", ctypes.c_size_t), ("ActiveProcessLimit", wt.DWORD),
                    ("Affinity", ctypes.c_size_t), ("PriorityClass", wt.DWORD), ("SchedulingClass", wt.DWORD)]

    class EXTENDED(ctypes.Structure):
        _fields_ = [("BasicLimitInformation", BASIC), ("IoInfo", IO_COUNTERS),
                    ("ProcessMemoryLimit", ctypes.c_size_t), ("JobMemoryLimit", ctypes.c_size_t),
                    ("PeakProcessMemoryUsed", ctypes.c_size_t), ("PeakJobMemoryUsed", ctypes.c_size_t)]

    k32.CreateJobObjectW.restype = wt.HANDLE
    k32.CreateJobObjectW.argtypes = [ctypes.c_void_p, wt.LPCWSTR]
    k32.SetInformationJobObject.argtypes = [wt.HANDLE, ctypes.c_int, ctypes.c_void_p, wt.DWORD]
    k32.AssignProcessToJobObject.argtypes = [wt.HANDLE, wt.HANDLE]
    k32.GetCurrentProcess.restype = wt.HANDLE
    k32.TerminateJobObject.argtypes = [wt.HANDLE, wt.UINT]

    job = k32.CreateJobObjectW(None, None)
    if not job:
        raise OSError(ctypes.get_last_error(), "CreateJobObject")
    info = EXTENDED()
    info.BasicLimitInformation.LimitFlags = 0x2000          # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    if not k32.SetInformationJobObject(job, 9, ctypes.byref(info), ctypes.sizeof(info)):   # Extended
        raise OSError(ctypes.get_last_error(), "SetInformationJobObject")
    if not k32.AssignProcessToJobObject(job, k32.GetCurrentProcess()):
        raise OSError(ctypes.get_last_error(), "AssignProcessToJobObject")
    return k32, job


def main() -> int:
    for strom in (sys.stdout, sys.stderr):
        try:
            strom.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except (AttributeError, ValueError):
            pass
    argv = sys.argv[1:]
    grenze = GRENZE_S
    if argv[:1] == ["--sekunden"] and len(argv) >= 2:
        grenze = min(GRENZE_S, max(1.0, float(argv[1])))
        argv = argv[2:]
    if not argv:
        print(__doc__)
        return 2

    schl = schluessel(argv)
    w = warnung(schl)
    if w:
        try:
            print(w, file=sys.stderr, flush=True)
        except Exception:  # noqa: BLE001
            pass

    if os.name == "nt":
        try:
            k32, job = _job_windows()
        except OSError as fehler:
            print(f"Zeitlimit: Job-Objekt nicht verfügbar ({fehler}) – Befehl wird nicht ausgeführt.", file=sys.stderr)
            return 2

        def beende_alle(code: int) -> None:
            try:
                k32.TerminateJobObject(job, code)   # trifft auch den Wächter selbst
            finally:
                # Kommt der Aufruf zurück, ist er gescheitert: Wächter hart beenden – das schließt
                # das Job-Objekt, und Windows beendet die übrigen Prozesse (KILL_ON_JOB_CLOSE).
                os._exit(code)
    else:
        def beende_alle(code: int) -> None:
            try:
                os.killpg(os.getpgid(kind.pid), 9)
            finally:
                os._exit(code)

    beginn = time.time()
    beginn_text = time.strftime("%d.%m.%Y %H:%M:%S")
    merke(schl, {"status": "läuft", "start": beginn, "beginn": beginn_text, "befehl": " ".join(argv)[:300]})

    def abschluss(status: str, code: int | None) -> None:
        dauer = time.time() - beginn
        merke(schl, {"status": status, "dauer_s": round(dauer, 1), "beginn": beginn_text,
                     "exitcode": code, "befehl": " ".join(argv)[:300]})

    def zeit_abgelaufen() -> None:
        # Merken und Melden dürfen den Abbruch nie verhindern (z. B. geschlossene Ausgabe hinter „| head“)
        try:
            try:
                abschluss("zeitlimit", EXIT_ZEITLIMIT)
            except Exception:  # noqa: BLE001
                pass
            try:
                print(f"\nZEITLIMIT: nach {grenze:.0f} s abgebrochen (samt Unterprozessen): {' '.join(argv)[:200]}",
                      file=sys.stderr, flush=True)
            except Exception:  # noqa: BLE001
                pass
        finally:
            beende_alle(EXIT_ZEITLIMIT)

    try:
        kind = subprocess.Popen(argv, start_new_session=(os.name != "nt"))
    except OSError as fehler:
        abschluss("fehler", None)
        print(f"Zeitlimit: Befehl nicht startbar: {fehler}", file=sys.stderr)
        return 127
    wecker = threading.Timer(grenze, zeit_abgelaufen)
    wecker.daemon = True
    wecker.start()
    try:
        code = kind.wait()
    except KeyboardInterrupt:
        try:
            abschluss("abgebrochen", 130)
        finally:
            beende_alle(130)
        return 130
    wecker.cancel()
    abschluss("ok" if code == 0 else "fehler", code)
    return code


if __name__ == "__main__":
    sys.exit(main())
