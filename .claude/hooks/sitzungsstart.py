"""SessionStart-Hook: kurzer Überblick als Kontext für Claude (Ausgabe auf stdout)."""

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import webgl_gemeinsam as g  # noqa: E402


def main() -> None:
    g.utf8_ausgabe()
    zeilen = ["WebGL-Setup – Überblick zum Sitzungsstart:"]

    projekte = g.projekte()
    if projekte:
        zeilen.append("Projekte (docs/):")
        for p in projekte:
            try:
                three, libs = g.versionen(g.importmap(p) or {})
            except ValueError:
                three, libs = set(), {}
            libtext = ", ".join(f"{n}-v{h}" for n in sorted(libs) for h in sorted(libs[n])) or "–"
            zeilen.append(f"  - {p.name}: three {','.join(sorted(three)) or '?'}; {libtext}")
    else:
        zeilen.append("Noch keine Projekte in docs/ (neues Projekt: /neues-projekt).")

    zeilen.append(f"three.js-Versionen: {', '.join(g.three_versionen()) or 'keine'}; "
                  f"Bibliotheken: {', '.join(f'{n}-v{h}' for n, h in g.eigene_libs()) or 'keine'}")

    status = subprocess.run(["git", "status", "--short"], cwd=g.WURZEL, capture_output=True,
                            text=True, encoding="utf-8", errors="replace")
    geaendert = [z for z in status.stdout.splitlines() if z.strip()]
    zeilen.append(f"Git: {len(geaendert)} geänderte/neue Datei(en)" if geaendert else "Git: keine offenen Änderungen")

    if not g.GLSLANG.is_file():
        zeilen.append(f"ACHTUNG: glslang fehlt ({g.rel(g.GLSLANG)}) – Shader-Prüfung nicht möglich.")
    # Automatisch geladene Projektnotizen klein halten (Token sparen, siehe CLAUDE.md)
    for notiz in sorted((g.WURZEL / ".claude" / "rules" / "projekte").glob("*.md")):
        groesse = notiz.stat().st_size
        if groesse > 5 * 1024:
            zeilen.append(f"HINWEIS: {g.rel(notiz)} hat {groesse // 1024} KB (Ziel <= 5 KB) - Einzelheiten nach .claude/notizen/ verschieben.")
    zeilen.append("Vorschau: preview_start 'webgl-vorschau' (http://127.0.0.1:8000/). Prüfung: python .claude/scripts/check.py")
    print("\n".join(zeilen))


if __name__ == "__main__":
    main()
