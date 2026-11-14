# WebGL-Projekte

Sammlung von three.js-Projekten, veröffentlicht über GitHub Pages (Ordner `docs/` im Branch `main`).
Sessions starten im Hauptordner `WebGL/`.

## Grundregeln
- **Kein Node.js:** kein `node`, `npm`, `npx`, kein Build-Schritt, kein TypeScript. Werkzeuge laufen mit Python.
- **Nichts aus dem Internet zur Laufzeit:** keine CDNs, keine externen Schriften, Skripte, Texturen oder Dekoder. Alle Pfade relativ. `check.py` prüft das.
- **Was in `docs/` liegt, ist öffentlich.** Keine Notizen, Geheimnisse oder Arbeitsdateien dort ablegen.
- **Alte Projektordner** (`detektorforum`, `haus-des-gottes`, `horus-tempel-edfu`, `sherlock`, `sherlock-holmes-in-berlin`, `sherlock2`, `test`, `wartenberg`) sind eigenständig und gesperrt: nicht lesen, nicht ändern.
- Größere Änderungen: erst kurz den Plan zeigen, nach dem Ja umsetzen. Commits und Pushes nur auf ausdrücklichen Wunsch.

## Aufbau
```
docs/                       ← Website (GitHub Pages)
├─ index.html               ← Startseite, Projektliste wird von projekte.py gepflegt
├─ .nojekyll                ← GitHub soll die Dateien unverändert ausliefern
├─ lib/
│  ├─ three-r<nr>/          ← three.js (fremd, gesperrt; Zusätze nur über /three-addon)
│  └─ <name>-v<haupt>/      ← eigene Bibliotheken (render, shader, ressourcen, debug, …)
└─ <projekt>/               ← je Projekt: index.html, main.js, style.css, shaders/
.claude/                    ← Setup: Hooks, Skripte, Regeln, Skills, Agenten, Workflows
tools/                      ← nicht im Git: glslang (bin/), three.js-Vorrat (vendor/)
```

## Technik
- three.js über ES-Module und eine **Import-Map in jeder `index.html`**. Sie legt die Versionen fest:
  `"three"`, `"three/addons/"` und je Bibliothek `"<name>/"` → `../lib/<name>-v<haupt>/`.
- JavaScript mit **JSDoc**-Typhinweisen, Module mit `import`/`export`, Top-Level-`await` erlaubt.
- Shader als eigene Dateien `shaders/*.vert` / `*.frag`, laden mit `shader/laden.js`, Pfade per `new URL('./shaders/x.vert', import.meta.url)`.
- Debug: `debug/debug.js` → `stelleBereit({ renderer, scene, camera })`; nur auf 127.0.0.1 aktiv (`window.__debug`).
- **Der Nutzer spielt in Firefox, Claude prüft nur in Chromium.** Nichts bauen, das von exakten Gleitkomma-Ergebnissen abhängt (Abgleich JS ↔ Python nur über gerundete oder ganze Werte). Bei browserabhängigen Funktionen den Nutzer gezielt in Firefox prüfen lassen.

## Grafik und Feinschliff
- Vor dem Start mit dem Nutzer festlegen, was „gut genug“ ist (an Bildern/Blickwinkeln), und höchstens 2 Korrekturrunden. Danach Restfehler in den Projektnotizen festhalten und mit der nächsten Aufgabe weitermachen.
- Stil ist stilisiert: robuste, einfache Lösungen vor physikalischer Genauigkeit. Vor einem aufwendigen neuen Verfahren (z. B. Vorberechnung) Aufwand, Risiko und eine einfache Alternative nennen.
- Fehler nicht einzeln flicken: Beim zweiten Fehler mit derselben Ursache das Verfahren überdenken und dem Nutzer vorlegen.

## Sitzungen und Token sparen
- Aufgaben mit `/auftrag` beginnen (Ziel, Abnahme, Runden) und mit `/abschluss` beenden.
- **Hauptsitzung und Aufgabensitzungen:** Eine Sitzung, die der Nutzer selbst startet, ist die Hauptsitzung. Sie bespricht, plant und legt mit `/auftrag` Aufträge fest, setzt aber selbst nichts um. Jede Aufgabe läuft in einer eigenen Aufgabensitzung (`start_session`, „fresh“, mit vollständigem Auftrag). Kleinigkeiten bleiben in der Hauptsitzung, z. B. Fragen oder eine Korrektur an den Notizen.
- **Aufgabensitzung:** erkennbar am Auftrag („Du bist eine Aufgabensitzung …“). Erledigt nur diese eine Aufgabe und endet mit `/abschluss`. Wird der Verlauf lang, Arbeitsstand in den Projektnotizen festhalten und der Hauptsitzung melden.
- Automatisch geladene Projektnotizen (`.claude/rules/projekte/*.md`) kurz halten (Ziel ≤ 5 KB): nur Arbeitsstand, gültige Regeln, Rundgang. Einzelheiten, Verlauf, Quellen, Fall-Entwürfe nach `.claude/notizen/` – nur lesen, wenn die Aufgabe sie braucht.
- Dateien nur ausschnittsweise lesen (`grep`, `offset/limit`), lange Ausgaben kürzen (`tail`, Filter).
- Screenshots klein (`scale: 0.5`) oder als Ausschnitt (`zoom`); erst mit Text/Zahlen prüfen, Bilder für den Rundgang am Ende.
- Vor großen Umbauten den Aufwand nennen; bei knappem Kontingent kleinere Schritte vorschlagen.

## Versionierung
- three.js: Ordner je Release (`three-r187`). Ein Projekt wechselt die Version nur über seine Import-Map.
- Eigene Bibliotheken: Ordner je **Hauptversion** (`render-v1`). Innerhalb einer Hauptversion nur rückwärtskompatible Änderungen; `lib.json` (Version) und `CHANGELOG.md` immer mitpflegen. Inkompatibler Umbau → neue Hauptversion (`/lib-version`), die alte bleibt unverändert.
- Neue Bibliotheken nach Thema schneiden (`/neue-lib`), keine Sammelordner.

## Befehle
- Vorschau: `preview_start` mit `webgl-vorschau` → http://127.0.0.1:8000/ (Server: `.claude/scripts/vorschau.py`)
- Gesamtprüfung: `python .claude/scripts/check.py [--uebersicht]`
- Shader einzeln: `python .claude/scripts/shader_check.py <datei>`
- Projekte/Startseite: `python .claude/scripts/projekte.py liste|startseite`
- three.js-Zusatz: `python .claude/scripts/three_addon.py liste <filter>` / `hole <pfad>`
- Bibliotheken: `python .claude/scripts/libs.py liste|neu|hauptversion`
- Rechnungen, die länger als 2 Minuten dauern (z. B. `holmes_licht.py berechne`), im **Terminal-Panel** starten (`run_in_terminal`), nicht als Hintergrundaufgabe der Sitzung – die bricht mit der Sitzung ab.

## Wann ist etwas fertig?
1. `check.py` meldet 0 Fehler (der Stop-Hook erzwingt das, sobald `docs/` Änderungen hat).
2. Im Browser geprüft (`/visuell-pruefen`): keine Konsolenfehler, alle Netzwerk-Anfragen gehen an 127.0.0.1, **Rundgang** über alle festgelegten Blickpunkte des Projekts ohne Auffälligkeiten (nicht nur die geänderte Stelle).
3. Bei Änderungen an einer Bibliothek: alle Projekte geprüft, die sie nutzen.
