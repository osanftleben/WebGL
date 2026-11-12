"""Kopiert three.js-Zusätze (examples/jsm) samt Abhängigkeiten nach docs/lib/three-rNNN/addons/.

Quelle ist der lokale Vorrat tools/vendor/three-rNNN/ (kein Download).

Aufruf:
  python .claude/scripts/three_addon.py liste [filter] [--three r187]
  python .claude/scripts/three_addon.py hole <pfad> [<pfad> ...] [--three r187]

<pfad> ist relativ zu examples/jsm, z. B. 'controls/OrbitControls.js' oder ein Ordner wie 'libs/draco'.
Ohne --three wird die neueste Version genommen, die in docs/lib UND im Vorrat vorhanden ist.
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import webgl_gemeinsam as g  # noqa: E402

IMPORT_RE = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]""")
LADER_HINWEISE = {
    "DRACOLoader": "braucht Dekoder: 'libs/draco' holen und loader.setDecoderPath('../lib/three-rNNN/addons/libs/draco/') setzen",
    "KTX2Loader": "braucht Transcoder: 'libs/basis' holen und loader.setTranscoderPath(...) auf den lokalen Ordner setzen",
    "MeshoptDecoder": "liegt in 'libs/meshopt_decoder.module.js'",
}


def version_waehlen(gewuenscht: str | None) -> str:
    im_vorrat = {p.name.removeprefix("three-") for p in g.VENDOR.glob("three-r*") if p.is_dir()} if g.VENDOR.is_dir() else set()
    kandidaten = [v for v in g.three_versionen() if v in im_vorrat]
    if gewuenscht:
        if gewuenscht not in kandidaten:
            sys.exit(f"FEHLER   three.js {gewuenscht} fehlt in docs/lib oder im Vorrat tools/vendor (vorhanden: {kandidaten or 'keine'})")
        return gewuenscht
    if not kandidaten:
        sys.exit("FEHLER   keine three.js-Version, die in docs/lib und tools/vendor vorhanden ist")
    return kandidaten[-1]


def quelle(version: str) -> Path:
    return g.VENDOR / f"three-{version}" / "examples" / "jsm"


def ziel(version: str) -> Path:
    return g.LIB / f"three-{version}" / "addons"


def hole_datei(rel_pfad: str, version: str, erledigt: set[str], meldungen: list[str]) -> None:
    rel_pfad = rel_pfad.replace("\\", "/").lstrip("/")
    if rel_pfad in erledigt:
        return
    erledigt.add(rel_pfad)
    q = quelle(version) / rel_pfad
    if not q.is_file():
        meldungen.append(f"FEHLER   {rel_pfad} gibt es im Vorrat nicht")
        return
    z = ziel(version) / rel_pfad
    z.parent.mkdir(parents=True, exist_ok=True)
    if not z.exists():
        shutil.copy2(q, z)
        meldungen.append(f"kopiert  addons/{rel_pfad}")
    if q.suffix != ".js":
        return
    text = q.read_text(encoding="utf-8", errors="replace")
    for name, hinweis in LADER_HINWEISE.items():
        if name in q.stem:
            meldungen.append(f"HINWEIS  {q.stem}: {hinweis}")
    for angabe in IMPORT_RE.findall(text):
        if angabe.startswith(("./", "../")):
            neu = (Path(rel_pfad).parent / angabe).as_posix()
            teile: list[str] = []
            for teil in neu.split("/"):
                if teil == "..":
                    if teile:
                        teile.pop()
                elif teil not in ("", "."):
                    teile.append(teil)
            hole_datei("/".join(teile), version, erledigt, meldungen)
        elif angabe.startswith("three/addons/"):
            hole_datei(angabe.removeprefix("three/addons/"), version, erledigt, meldungen)
        elif angabe in ("three/webgpu", "three/tsl") or angabe.startswith("three/src"):
            meldungen.append(f"FEHLER   {rel_pfad} braucht '{angabe}' (WebGPU/TSL) – im Setup nicht vorgesehen")


def hole(pfade: list[str], version: str) -> int:
    erledigt: set[str] = set()
    meldungen: list[str] = []
    for pfad in pfade:
        pfad = pfad.replace("\\", "/").strip("/")
        q = quelle(version) / pfad
        if q.is_dir():
            for datei in sorted(q.rglob("*")):
                if datei.is_file():
                    hole_datei(datei.relative_to(quelle(version)).as_posix(), version, erledigt, meldungen)
        else:
            hole_datei(pfad, version, erledigt, meldungen)
    for m in dict.fromkeys(meldungen):
        print(m)
    if not any(m.startswith("kopiert") for m in meldungen) and not any(m.startswith("FEHLER") for m in meldungen):
        print("Alles schon vorhanden.")
    print(f"Import im Projekt: import {{ … }} from 'three/addons/{pfade[0]}';  (three.js {version})")
    return 1 if any(m.startswith("FEHLER") for m in meldungen) else 0


def liste(filter_text: str, version: str) -> int:
    basis = quelle(version)
    treffer = [p.relative_to(basis).as_posix() for p in sorted(basis.rglob("*.js")) if filter_text.lower() in p.as_posix().lower()]
    for t in treffer[:200]:
        print(t)
    print(f"{len(treffer)} Treffer (three.js {version})" + (" – nur die ersten 200 gezeigt" if len(treffer) > 200 else ""))
    return 0


def main() -> int:
    g.utf8_ausgabe()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("befehl", choices=["liste", "hole"])
    parser.add_argument("pfade", nargs="*")
    parser.add_argument("--three", help="three.js-Version, z. B. r187")
    args = parser.parse_args()
    version = version_waehlen(args.three)
    if args.befehl == "liste":
        return liste(args.pfade[0] if args.pfade else "", version)
    if not args.pfade:
        parser.error("Bitte mindestens einen Pfad angeben, z. B. controls/OrbitControls.js")
    return hole(args.pfade, version)


if __name__ == "__main__":
    sys.exit(main())
