"""Gesamtprüfung des WebGL-Setups – Grundlage für den strengen Abschluss-Check.

Prüft:
1. Shader (glslang, siehe shader_check.py)
2. Keine externen Adressen (nichts darf zur Laufzeit aus dem Internet geladen werden)
3. Alle lokal verlinkten Dateien und Module existieren (HTML, Import-Map, JS-Imports)
4. Versionen: three.js und eigene Bibliotheken je Projekt, Verträglichkeit laut lib.json
5. Eigene Bibliotheken: lib.json und CHANGELOG.md vollständig und stimmig
6. Jedes Projekt ist auf der Startseite docs/index.html verlinkt

Ausgabe: nur Fehler und Hinweise. Exit-Code 1, wenn es Fehler gibt.
Aufruf: python .claude/scripts/check.py [--uebersicht]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import shader_check  # noqa: E402
import webgl_gemeinsam as g  # noqa: E402

fehler: list[str] = []
hinweise: list[str] = []

URL_RE = re.compile(r"https?://[^\s\"'`<>)]+", re.I)
PROTOKOLLRELATIV_RE = re.compile(r"""(?:src|href)\s*=\s*["']//|url\(\s*["']?//""", re.I)
ERLAUBTE_URLS = ("http://www.w3.org/",)
HTML_ATTR_RE = re.compile(r"""\b(src|href)\s*=\s*["']([^"']+)["']""", re.I)
JS_IMPORT_RES = [
    re.compile(r"""\b(?:import|export)\s[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]""", re.S),
    re.compile(r"""\bimport\s*['"]([^'"]+)['"]"""),
    re.compile(r"""\bimport\(\s*['"]([^'"]+)['"]\s*\)"""),
    re.compile(r"""\bnew\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url"""),
]
SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


def zeile_von(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def ist_fremd(pfad: Path) -> bool:
    """Liegt die Datei in einem fremden three.js-Ordner?"""
    try:
        teile = pfad.resolve().relative_to(g.DOCS).parts
    except ValueError:
        return False
    return any(g.THREE_ORDNER_RE.match(t) for t in teile)


def eigene_dateien(*endungen: str) -> list[Path]:
    if not g.DOCS.is_dir():
        return []
    return sorted(p for p in g.DOCS.rglob("*") if p.is_file() and p.suffix.lower() in endungen and not ist_fremd(p))


# --- 2. Externe Adressen -------------------------------------------------------


def externe_adressen(pfad: Path) -> list[str]:
    """Findet Internet-Adressen, die zur Laufzeit geladen werden könnten.

    Erlaubt: Links in <a href>, Kommentarzeilen, w3.org-Namensräume,
    Zeilen mit dem Vermerk 'extern-ok'.
    """
    text = g.lies(pfad)
    ist_html = pfad.suffix.lower() == ".html"
    funde = []
    for m in URL_RE.finditer(text):
        url = m.group(0)
        if url.startswith(ERLAUBTE_URLS):
            continue
        zeilen_start = text.rfind("\n", 0, m.start()) + 1
        zeilen_ende = text.find("\n", m.end())
        zeile = text[zeilen_start : zeilen_ende if zeilen_ende != -1 else len(text)]
        davor = zeile[: m.start() - zeilen_start].strip()
        if "extern-ok" in zeile:
            continue
        if davor.startswith(("//", "*", "/*", "<!--", "#")) or "// " in davor:
            continue  # Kommentar
        if ist_html:
            vorher = text[max(0, m.start() - 400) : m.start()]
            if vorher.rfind("<a ") > vorher.rfind(">"):
                continue  # normaler Link <a href="…">
        funde.append(f"{g.rel(pfad)}:{zeile_von(text, m.start())}: externe Adresse {url} – alles muss lokal liegen")
    for m in PROTOKOLLRELATIV_RE.finditer(text):
        funde.append(f"{g.rel(pfad)}:{zeile_von(text, m.start())}: protokoll-relative Adresse (//…) – alles muss lokal liegen")
    return funde


# --- 3. Lokale Verweise ---------------------------------------------------------


def pruefe_html(pfad: Path, imports: dict[str, str] | None) -> None:
    text = g.lies(pfad)
    for m in HTML_ATTR_RE.finditer(text):
        wert = m.group(2).strip()
        if wert.startswith(("#", "data:", "mailto:", "javascript:", "http:", "https:", "//")) or not wert:
            continue
        if wert.startswith("/"):
            fehler.append(f"{g.rel(pfad)}:{zeile_von(text, m.start())}: absoluter Pfad '{wert}' – auf GitHub Pages falsch, relativ angeben")
            continue
        ziel = (pfad.parent / wert.split("?")[0].split("#")[0]).resolve()
        if ziel.is_dir():
            ziel = ziel / "index.html"
        if not ziel.exists():
            fehler.append(f"{g.rel(pfad)}:{zeile_von(text, m.start())}: Datei fehlt: {wert}")
    if imports:
        for schluessel, wert in imports.items():
            ziel = (pfad.parent / wert).resolve()
            if ziel.exists():
                continue
            if schluessel.endswith("/"):
                # Ordner-Eintrag (z. B. 'three/addons/'): darf fehlen, solange nichts daraus importiert wird –
                # tatsächliche Imports prüft pruefe_js(). 'three/addons/' fehlt bei neuen Projekten normal.
                if schluessel != "three/addons/":
                    hinweise.append(f"{g.rel(pfad)}: Import-Map '{schluessel}' zeigt auf fehlenden Ordner {wert}")
            else:
                fehler.append(f"{g.rel(pfad)}: Import-Map '{schluessel}' zeigt auf fehlenden Pfad {wert}")


def ohne_kommentare(text: str) -> str:
    """Ersetzt JS-Kommentare durch Leerzeichen (Zeilenumbrüche bleiben, Zeilennummern stimmen weiter).
    Zeichenketten ('…', "…", `…`) werden dabei respektiert."""
    aus = list(text)
    i, n = 0, len(text)
    zustand = None  # None | "'" | '"' | '`' | "//" | "/*"
    while i < n:
        z = text[i]
        if zustand is None:
            if z in "'\"`":
                zustand = z
            elif text.startswith("//", i):
                zustand = "//"
                continue
            elif text.startswith("/*", i):
                zustand = "/*"
                continue
        elif zustand in "'\"`":
            if z == "\\":
                i += 2
                continue
            if z == zustand or (z == "\n" and zustand != "`"):
                zustand = None
        elif zustand == "//":
            if z == "\n":
                zustand = None
            else:
                aus[i] = " "
        elif zustand == "/*":
            if text.startswith("*/", i):
                aus[i] = aus[i + 1] = " "
                zustand = None
                i += 2
                continue
            if z != "\n":
                aus[i] = " "
        i += 1
    return "".join(aus)


def js_angaben(text: str) -> list[tuple[int, str]]:
    text = ohne_kommentare(text)
    ergebnis = []
    for muster in JS_IMPORT_RES:
        for m in muster.finditer(text):
            ergebnis.append((zeile_von(text, m.start(1)), m.group(1)))
    return ergebnis


def pruefe_js(pfad: Path, kontexte: list[tuple[Path, dict[str, str]]]) -> None:
    """Prüft Imports einer JS-Datei. `kontexte` = (Projektordner, Import-Map), unter denen sie läuft."""
    text = g.lies(pfad)
    for zeile, angabe in js_angaben(text):
        ort = f"{g.rel(pfad)}:{zeile}"
        if angabe.startswith(("http:", "https:", "//")):
            continue  # meldet externe_adressen()
        if angabe.startswith("/"):
            fehler.append(f"{ort}: absoluter Pfad '{angabe}' – relativ oder über die Import-Map angeben")
            continue
        if angabe.startswith(("./", "../")):
            if not g.loese_auf(angabe, pfad, None, None).exists():
                fehler.append(f"{ort}: Datei fehlt: {angabe}")
            continue
        # Nackte Angabe ('three', 'render/…') – über die Import-Map jedes Projekts, das die Datei nutzt
        for projekt, imports in kontexte:
            ziel = g.loese_auf(angabe, pfad, imports, projekt)
            if ziel is None:
                fehler.append(f"{ort}: '{angabe}' steht nicht in der Import-Map von {projekt.name}")
            elif not ziel.exists():
                fehler.append(f"{ort}: '{angabe}' (Import-Map von {projekt.name}) zeigt auf fehlende Datei {g.rel(ziel)}")


# --- 4./5. Versionen und Bibliotheken ----------------------------------------


def pruefe_libs() -> None:
    for (name, haupt), ordner in g.eigene_libs().items():
        ort = g.rel(ordner)
        if not (ordner / "lib.json").is_file():
            fehler.append(f"{ort}: lib.json fehlt")
            continue
        try:
            daten = g.lib_json(ordner)
        except json.JSONDecodeError as f:
            fehler.append(f"{ort}/lib.json: kein gültiges JSON ({f})")
            continue
        if daten.get("name") != name:
            fehler.append(f"{ort}/lib.json: name '{daten.get('name')}' passt nicht zum Ordner '{name}'")
        version = str(daten.get("version", ""))
        m = SEMVER_RE.match(version)
        if not m:
            fehler.append(f"{ort}/lib.json: version '{version}' ist nicht im Format X.Y.Z")
        elif int(m.group(1)) != haupt:
            fehler.append(f"{ort}/lib.json: version {version} passt nicht zur Hauptversion v{haupt} im Ordnernamen")
        if not isinstance(daten.get("three", []), list) or not isinstance(daten.get("braucht", {}), dict):
            fehler.append(f"{ort}/lib.json: 'three' muss eine Liste und 'braucht' ein Objekt sein")
        changelog = ordner / "CHANGELOG.md"
        if not changelog.is_file():
            fehler.append(f"{ort}: CHANGELOG.md fehlt")
        elif m and f"## {version}" not in g.lies(changelog):
            fehler.append(f"{ort}/CHANGELOG.md: kein Eintrag '## {version}' für die aktuelle Version")


def pruefe_projekt_versionen(projekt: Path, imports: dict[str, str]) -> None:
    three, libs = g.versionen(imports)
    ort = g.rel(projekt / "index.html")
    if len(three) != 1:
        fehler.append(f"{ort}: Import-Map muss genau eine three.js-Version nutzen (gefunden: {sorted(three) or 'keine'})")
    for name, hauptversionen in libs.items():
        if len(hauptversionen) > 1:
            fehler.append(f"{ort}: Bibliothek '{name}' in mehreren Hauptversionen eingebunden: {sorted(hauptversionen)}")
    vorhanden = g.eigene_libs()
    for name, hauptversionen in libs.items():
        for haupt in hauptversionen:
            ordner = vorhanden.get((name, haupt))
            if ordner is None or not (ordner / "lib.json").is_file():
                continue  # fehlender Pfad wird bei der Import-Map gemeldet
            try:
                daten = g.lib_json(ordner)
            except json.JSONDecodeError:
                continue
            passend = daten.get("three") or []
            if passend and three and not (three & set(passend)):
                hinweise.append(
                    f"{ort}: {name}-v{haupt} ist nicht als verträglich mit three.js {', '.join(sorted(three))} "
                    f"eingetragen (lib.json: {passend}) – testen und lib.json ergänzen"
                )
            for braucht_name, braucht_version in (daten.get("braucht") or {}).items():
                braucht_haupt = int(str(braucht_version).lstrip("v").split(".")[0])
                if braucht_haupt not in libs.get(braucht_name, set()):
                    fehler.append(f"{ort}: {name}-v{haupt} braucht {braucht_name}-v{braucht_haupt}, das fehlt in der Import-Map")


# --- Hauptablauf --------------------------------------------------------------


def main() -> int:
    g.utf8_ausgabe()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--uebersicht", action="store_true", help="zusätzlich Versionsübersicht je Projekt ausgeben")
    args = parser.parse_args()

    if not g.DOCS.is_dir():
        print("FEHLER   docs/ fehlt")
        return 1

    # Projekte und ihre Import-Maps
    projekte: list[tuple[Path, dict[str, str]]] = []
    for projekt in g.projekte():
        try:
            imports = g.importmap(projekt)
        except ValueError as f:
            fehler.append(f"{g.rel(projekt / 'index.html')}: {f}")
            continue
        if imports is None:
            fehler.append(f"{g.rel(projekt / 'index.html')}: keine Import-Map gefunden")
            continue
        projekte.append((projekt, imports))
        pruefe_projekt_versionen(projekt, imports)

    for ordner in sorted(p for p in g.DOCS.iterdir() if p.is_dir() and p.name != "lib" and not p.name.startswith((".", "_"))):
        if not (ordner / "index.html").is_file():
            hinweise.append(f"{g.rel(ordner)}: Ordner ohne index.html – wird nicht als Projekt behandelt")

    # 1. Shader
    for shader in shader_check.alle_shader():
        f, h = shader_check.pruefe(shader)
        fehler.extend(f)
        hinweise.extend(h)

    # 2. Externe Adressen
    for datei in eigene_dateien(".js", ".html", ".css", ".json"):
        fehler.extend(externe_adressen(datei))

    # 3. Lokale Verweise
    for datei in eigene_dateien(".html"):
        projekt = g.projekt_von(datei)
        imports = dict(projekte).get(projekt) if projekt and datei == projekt / "index.html" else None
        pruefe_html(datei, imports)
    nutzer_von_lib: dict[str, list[tuple[Path, dict[str, str]]]] = {}
    for projekt, imports in projekte:
        for ziel in imports.values():
            teil = ziel.split("lib/")[-1].split("/")[0] if "lib/" in ziel else ""
            if teil:
                nutzer_von_lib.setdefault(teil, []).append((projekt, imports))
    for datei in eigene_dateien(".js"):
        projekt = g.projekt_von(datei)
        if projekt is not None:
            kontexte = [(p, i) for p, i in projekte if p == projekt]
        else:
            teile = datei.resolve().relative_to(g.DOCS).parts
            lib_ordner = teile[1] if len(teile) > 2 and teile[0] == "lib" else ""
            kontexte = nutzer_von_lib.get(lib_ordner, [])
        pruefe_js(datei, kontexte)
    # Relative Imports in kopierten three.js-Zusätzen (fehlende Abhängigkeiten)
    for datei in sorted(g.LIB.glob("three-r*/addons/**/*.js")):
        text = g.lies(datei)
        for zeile, angabe in js_angaben(text):
            if angabe.startswith(("./", "../")) and not g.loese_auf(angabe, datei, None, None).exists():
                fehler.append(f"{g.rel(datei)}:{zeile}: Abhängigkeit fehlt: {angabe} – mit three_addon.py nachholen")

    # 4./5. Bibliotheken
    pruefe_libs()
    genutzt: set[str] = set()
    for _, imports in projekte:
        three, libs = g.versionen(imports)
        genutzt |= {f"three-{v}" for v in three}
        genutzt |= {f"{n}-v{h}" for n, hs in libs.items() for h in hs}
    for ordner in sorted(p for p in g.LIB.iterdir() if p.is_dir()) if g.LIB.is_dir() else []:
        if projekte and ordner.name not in genutzt:
            hinweise.append(f"{g.rel(ordner)}: wird von keinem Projekt genutzt")

    # 6. Startseite
    startseite = g.DOCS / "index.html"
    if not startseite.is_file():
        fehler.append("docs/index.html (Startseite) fehlt")
    else:
        text = g.lies(startseite)
        for projekt, _ in projekte:
            if f'href="{projekt.name}/"' not in text:
                fehler.append(f"docs/index.html: Projekt '{projekt.name}' ist nicht verlinkt – python .claude/scripts/projekte.py startseite")

    if args.uebersicht:
        print("Projekt                      three   Bibliotheken")
        for projekt, imports in projekte:
            three, libs = g.versionen(imports)
            libtext = ", ".join(f"{n}-v{h}" for n in sorted(libs) for h in sorted(libs[n])) or "–"
            print(f"{projekt.name:<28} {','.join(sorted(three)) or '–':<7} {libtext}")
        if not projekte:
            print("(noch keine Projekte)")
        print()

    for f in dict.fromkeys(fehler):
        print(f"FEHLER   {f}")
    for h in dict.fromkeys(hinweise):
        print(f"HINWEIS  {h}")
    print(f"check: {len(projekte)} Projekt(e), {len(set(fehler))} Fehler, {len(set(hinweise))} Hinweis(e)")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
