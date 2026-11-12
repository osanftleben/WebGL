---
paths:
  - "docs/**/*.vert"
  - "docs/**/*.frag"
  - "docs/**/*.glsl"
---

# Regeln für Shader

- Nur `.vert` (Vertex) und `.frag` (Fragment) verwenden – `shader_check.py` erkennt die Stufe an der Endung.
- **Für `THREE.ShaderMaterial`** (Normalfall): kein `#version`, keine `precision`-Zeile. three.js ergänzt beides sowie
  - Vertex: `modelMatrix`, `modelViewMatrix`, `projectionMatrix`, `viewMatrix`, `normalMatrix`, `cameraPosition`, Attribute `position`, `normal`, `uv`
  - Fragment: `viewMatrix`, `cameraPosition`
  - Schreibweise: `varying` und `gl_FragColor` (three.js übersetzt nach GLSL ES 3.00).
- **Für `THREE.RawShaderMaterial`:** vollständiger Shader mit `#version 300 es`, `precision`, eigenen `in`/`out`-Deklarationen.
- `#include <…>` (three.js-Bausteine) nur wenn nötig – solche Shader kann glslang nicht prüfen, dann zwingend im Browser testen.
- Eigene Uniforms mit Präfix `u` (`uZeit`), Varyings mit Präfix `v` (`vUv`).
- Performance: Verzweigungen und Schleifen mit variabler Länge vermeiden, Rechnungen möglichst in den Vertex-Shader verlagern, `highp` nur wo nötig.
- Ausgabefarbe von `ShaderMaterial` wird nicht automatisch nach sRGB umgerechnet; bei Bedarf `#include <colorspace_fragment>` am Ende.
