---
name: perf-check
description: Misst Bildrate, Draw-Calls und Speicher eines WebGL-Projekts im Browser und lässt den Code vom Performance-Prüfer auswerten.
argument-hint: <projekt>
---

# Performance prüfen

Projekt: `$ARGUMENTS`

1. Projekt wie bei `/visuell-pruefen` in der Vorschau öffnen.
2. Per `javascript_tool` messen (Projekt muss `debug/debug.js` → `stelleBereit` nutzen):
   - `await __debug.messeFps(5)` → Bildrate
   - `__debug.info()` → Draw-Calls, Dreiecke, Geometrien, Texturen, Shader-Programme
   - Speicherleck-Test: `info()` notieren, 10 Sekunden warten, erneut `info()` – wachsen Geometrien/Texturen ohne Grund, ist das ein Leck.
3. Hinweis an den Nutzer: Die Bildrate im eingebauten Browser ist ein **Vergleichswert**, kein exakter Wert für jedes Gerät (Fenstergröße und Hintergrund-Tab beeinflussen sie).
4. Code auswerten lassen: Subagent `performance-pruefer` mit dem Projektordner und den Messwerten beauftragen.
5. Bericht: Messwerte als kleine Tabelle, die 3 wichtigsten Verbesserungen mit geschätzter Wirkung. Nichts ändern ohne Ja.
