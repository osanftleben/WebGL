---
paths:
  - "docs/**/*.html"
  - "docs/**/*.css"
---

# Regeln für HTML und CSS

- Jede Projekt-`index.html` hat genau eine Import-Map (`<script type="importmap">`) **vor** dem ersten Modul-Skript.
- Die Import-Map nutzt genau eine three.js-Version und je Bibliothek genau eine Hauptversion.
- Keine externen Ressourcen: keine CDN-Skripte, keine Google Fonts, keine fremden Bilder. Schriften: System-Schriften (`system-ui, sans-serif`).
- `<link rel="icon" href="data:,">` verhindert eine unnötige favicon-Anfrage (sonst 404 in der Konsole).
- Alle Pfade relativ (`../lib/…`, `main.js`), nie mit `/` am Anfang.
- Links zu externen Seiten (`<a href="https://…">`) sind erlaubt – sie laden nichts.
- Die Projektliste in `docs/index.html` zwischen `PROJEKTE:START` und `PROJEKTE:ENDE` nicht von Hand ändern, sondern `python .claude/scripts/projekte.py startseite`.
