"""Gemeinsame Hilfsfunktionen für die Setup-Skripte und Hooks.

Kennt die Ordnerstruktur (docs/, Bibliotheken, Projekte), liest Import-Maps
und löst Modul-Angaben (z. B. 'render/renderer.js') zu Dateipfaden auf.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[2]
DOCS = WURZEL / "docs"
LIB = DOCS / "lib"
VENDOR = WURZEL / "tools" / "vendor"
GLSLANG = WURZEL / "tools" / "bin" / "glslang" / "glslang.exe"

# Alte, eigenständige Projektordner: für Claude gesperrt (siehe .gitignore und settings.json).
ALTORDNER = [
    "detektorforum",
    "haus-des-gottes",
    "horus-tempel-edfu",
    "sherlock",
    "sherlock-holmes-in-berlin",
    "sherlock2",
    "test",
    "wartenberg",
]

THREE_ORDNER_RE = re.compile(r"^three-r(\d+)$")
LIB_ORDNER_RE = re.compile(r"^([a-z0-9]+(?:-[a-z0-9]+)*)-v(\d+)$")
IMPORTMAP_RE = re.compile(r"<script\s+type=[\"']importmap[\"']\s*>(.*?)</script>", re.S | re.I)
TITEL_RE = re.compile(r"<title>(.*?)</title>", re.S | re.I)


def utf8_ausgabe() -> None:
    """Sorgt unter Windows für UTF-8 auf stdout/stderr (Umlaute in Meldungen)."""
    for strom in (sys.stdout, sys.stderr):
        try:
            strom.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass


def rel(pfad: Path) -> str:
    """Pfad relativ zum Repository, mit Schrägstrichen."""
    try:
        return pfad.resolve().relative_to(WURZEL).as_posix()
    except ValueError:
        return pfad.as_posix()


def lies(pfad: Path) -> str:
    return pfad.read_text(encoding="utf-8", errors="replace")


# --- Projekte -----------------------------------------------------------------


def projekte() -> list[Path]:
    """Alle Projektordner: direkte Unterordner von docs/ mit index.html (ohne lib/)."""
    if not DOCS.is_dir():
        return []
    return [
        p
        for p in sorted(DOCS.iterdir())
        if p.is_dir() and p.name != "lib" and not p.name.startswith((".", "_")) and (p / "index.html").is_file()
    ]


def projekt_von(pfad: Path) -> Path | None:
    """Liefert den Projektordner, zu dem eine Datei gehört (oder None)."""
    try:
        teile = pfad.resolve().relative_to(DOCS).parts
    except ValueError:
        return None
    if len(teile) < 2 or teile[0] == "lib":
        return None
    kandidat = DOCS / teile[0]
    return kandidat if (kandidat / "index.html").is_file() else None


def titel(projekt: Path) -> str:
    treffer = TITEL_RE.search(lies(projekt / "index.html"))
    return treffer.group(1).strip() if treffer else projekt.name


def importmap(projekt: Path) -> dict[str, str] | None:
    """Liest die Import-Map aus index.html. None = keine vorhanden; Fehler -> ValueError."""
    treffer = IMPORTMAP_RE.search(lies(projekt / "index.html"))
    if not treffer:
        return None
    try:
        daten = json.loads(treffer.group(1))
    except json.JSONDecodeError as fehler:
        raise ValueError(f"Import-Map ist kein gültiges JSON: {fehler}") from None
    return dict(daten.get("imports", {}))


def versionen(imports: dict[str, str]) -> tuple[set[str], dict[str, set[int]]]:
    """Welche three.js-Versionen und Bibliotheks-Hauptversionen eine Import-Map nutzt."""
    three: set[str] = set()
    libs: dict[str, set[int]] = {}
    for ziel in imports.values():
        for teil in ziel.split("/"):
            if m := THREE_ORDNER_RE.match(teil):
                three.add(f"r{m.group(1)}")
            elif m := LIB_ORDNER_RE.match(teil):
                libs.setdefault(m.group(1), set()).add(int(m.group(2)))
    return three, libs


# --- Bibliotheken -------------------------------------------------------------


def three_versionen() -> list[str]:
    """Vorhandene three.js-Versionen in docs/lib, aufsteigend (z. B. ['r187'])."""
    if not LIB.is_dir():
        return []
    nummern = sorted(int(m.group(1)) for p in LIB.iterdir() if p.is_dir() and (m := THREE_ORDNER_RE.match(p.name)))
    return [f"r{n}" for n in nummern]


def eigene_libs() -> dict[tuple[str, int], Path]:
    """Eigene Bibliotheken: {(name, hauptversion): ordner}."""
    if not LIB.is_dir():
        return {}
    ergebnis = {}
    for p in sorted(LIB.iterdir()):
        if p.is_dir() and not THREE_ORDNER_RE.match(p.name) and (m := LIB_ORDNER_RE.match(p.name)):
            ergebnis[(m.group(1), int(m.group(2)))] = p
    return ergebnis


def neueste_libs() -> dict[str, int]:
    """Je Bibliotheksname die höchste Hauptversion."""
    neueste: dict[str, int] = {}
    for name, haupt in eigene_libs():
        neueste[name] = max(haupt, neueste.get(name, 0))
    return neueste


def lib_json(ordner: Path) -> dict:
    return json.loads(lies(ordner / "lib.json"))


# --- Modul-Auflösung ----------------------------------------------------------


def loese_auf(angabe: str, von_datei: Path, imports: dict[str, str] | None, basis: Path | None) -> Path | None:
    """Löst eine Modul- oder Dateiangabe zu einem Pfad auf.

    - './x.js', '../x.js' -> relativ zur Datei
    - 'three', 'render/x.js' -> über die Import-Map (relativ zu `basis`, dem Projektordner)
    Gibt None zurück, wenn eine nackte Angabe nicht in der Import-Map steht.
    """
    angabe = angabe.split("?")[0].split("#")[0]
    if angabe.startswith(("./", "../")):
        return (von_datei.parent / angabe).resolve()
    if imports is None or basis is None:
        return None
    if angabe in imports:
        return (basis / imports[angabe]).resolve()
    passend = [k for k in imports if k.endswith("/") and angabe.startswith(k)]
    if not passend:
        return None
    schluessel = max(passend, key=len)
    return (basis / (imports[schluessel] + angabe[len(schluessel):])).resolve()
