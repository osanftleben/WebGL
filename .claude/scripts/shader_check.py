"""Prüft GLSL-Shader (.vert/.frag) mit glslang.

Zwei Arten von Shadern:
- Für THREE.ShaderMaterial (ohne '#version'): three.js ergänzt Version, Präzision,
  Standard-Uniforms (projectionMatrix …) und Attribute (position, normal, uv).
  Dieses Skript stellt dafür denselben Vorspann voran, damit glslang nicht über
  fehlende Deklarationen stolpert. Zeilennummern werden zurückgerechnet.
- Für THREE.RawShaderMaterial (mit '#version 300 es'): wird unverändert geprüft.

Grenze: Shader mit three.js-Bausteinen ('#include <…>') kann glslang nicht prüfen –
sie werden übersprungen und nur im Browser geprüft.

Aufruf: python .claude/scripts/shader_check.py [datei ...]   (ohne Angabe: alle Shader in docs/)
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import webgl_gemeinsam as g  # noqa: E402

VORSPANN = {
    "vert": """#version 300 es
precision highp float;
precision highp int;
#define attribute in
#define varying out
#define texture2D texture
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
in vec3 position;
in vec3 normal;
in vec2 uv;
""",
    "frag": """#version 300 es
precision highp float;
precision highp int;
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define texture2D texture
#define textureCube texture
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
""",
}

MELDUNG_RE = re.compile(r"^(ERROR|WARNING):\s*(?:\d+|[^:]*):(\d+):\s*(.*)$")


def stufe(pfad: Path) -> str | None:
    return {".vert": "vert", ".frag": "frag"}.get(pfad.suffix.lower())


def alle_shader() -> list[Path]:
    """Alle .vert/.frag in docs/, ohne die fremden three.js-Ordner."""
    if not g.DOCS.is_dir():
        return []
    return sorted(
        p
        for p in g.DOCS.rglob("*")
        if p.suffix.lower() in (".vert", ".frag")
        and not any(g.THREE_ORDNER_RE.match(teil) for teil in p.relative_to(g.DOCS).parts)
    )


def pruefe(pfad: Path) -> tuple[list[str], list[str]]:
    """Prüft eine Shader-Datei. Liefert (fehler, hinweise) als fertige Meldungszeilen."""
    s = stufe(pfad)
    name = g.rel(pfad)
    if s is None:
        return [], [f"{name}: keine .vert/.frag-Datei – nicht geprüft"]
    if not g.GLSLANG.is_file():
        return [f"{name}: glslang fehlt ({g.rel(g.GLSLANG)}) – Shader nicht prüfbar"], []

    text = g.lies(pfad)
    if re.search(r"^\s*#\s*include\s*<", text, re.M):
        return [], [f"{name}: nutzt three.js-Bausteine (#include) – nur im Browser prüfbar"]

    if re.search(r"^\s*#\s*version", text, re.M):
        quelle, versatz = text, 0
    else:
        quelle = VORSPANN[s] + text
        versatz = VORSPANN[s].count("\n")

    ergebnis = subprocess.run(
        [str(g.GLSLANG), "--stdin", "-S", s],
        input=quelle.encode("utf-8"),
        capture_output=True,
        timeout=30,
    )
    ausgabe = (ergebnis.stdout + ergebnis.stderr).decode("utf-8", errors="replace")

    fehler, hinweise = [], []
    for zeile in ausgabe.splitlines():
        m = MELDUNG_RE.match(zeile.strip())
        if not m:
            continue
        art, nummer, text_meldung = m.group(1), int(m.group(2)) - versatz, m.group(3).strip()
        if "compilation terminated" in text_meldung or not text_meldung:
            continue
        ort = f"{name}:{nummer}" if nummer > 0 else f"{name} (Vorspann)"
        (fehler if art == "ERROR" else hinweise).append(f"{ort}: {text_meldung}")
    if ergebnis.returncode != 0 and not fehler:
        fehler.append(f"{name}: glslang meldet einen Fehler (Code {ergebnis.returncode})")
    return fehler, hinweise


def main() -> int:
    g.utf8_ausgabe()
    dateien = [Path(a).resolve() for a in sys.argv[1:]] or alle_shader()
    alle_fehler = 0
    for datei in dateien:
        fehler, hinweise = pruefe(datei)
        for f in fehler:
            print(f"FEHLER   {f}")
        for h in hinweise:
            print(f"HINWEIS  {h}")
        alle_fehler += len(fehler)
    print(f"shader_check: {len(dateien)} Datei(en), {alle_fehler} Fehler")
    return 1 if alle_fehler else 0


if __name__ == "__main__":
    sys.exit(main())
