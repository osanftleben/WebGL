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
recherche/quellen/          ← nicht im Git: Textauszüge und geladene Quellen des Recherche-Agenten
```

## Technik
- three.js über ES-Module und eine **Import-Map in jeder `index.html`**. Sie legt die Versionen fest:
  `"three"`, `"three/addons/"` und je Bibliothek `"<name>/"` → `../lib/<name>-v<haupt>/`.
- JavaScript mit **JSDoc**-Typhinweisen, Module mit `import`/`export`, Top-Level-`await` erlaubt.
- Shader als eigene Dateien `shaders/*.vert` / `*.frag`, laden mit `shader/laden.js`, Pfade per `new URL('./shaders/x.vert', import.meta.url)`.
- Debug: `debug/debug.js` → `stelleBereit({ renderer, scene, camera })`; nur auf 127.0.0.1 aktiv (`window.__debug`).
- **Nichts Nützliches nur im Browser ablegen** (Seite, Konsole, `localStorage`): geht beim Neuladen oder Löschen verloren. Prüfhilfen und Messskripte als Datei unter `.claude/scripts/` (bei Bedarf in die Konsole einfügen), Ergebnisse ins Protokoll bzw. in die Notizen. Spielstände des Spiels selbst sind davon nicht betroffen.
- **Der Nutzer spielt in Firefox, Claude prüft nur in Chromium.** Nichts bauen, das von exakten Gleitkomma-Ergebnissen abhängt (Abgleich JS ↔ Python nur über gerundete oder ganze Werte). Bei browserabhängigen Funktionen den Nutzer gezielt in Firefox prüfen lassen.

## Grafik und Feinschliff
- Vor dem Start mit dem Nutzer festlegen, was „gut genug“ ist (an Bildern/Blickwinkeln), und höchstens 2 Korrekturrunden. Danach Restfehler in den Projektnotizen festhalten und mit der nächsten Aufgabe weitermachen.
- Stil ist stilisiert: robuste, einfache Lösungen vor physikalischer Genauigkeit. Vor einem aufwendigen neuen Verfahren (z. B. Vorberechnung) Aufwand, Risiko und eine einfache Alternative nennen.
- Fehler nicht einzeln flicken: Beim zweiten Fehler mit derselben Ursache das Verfahren überdenken und dem Nutzer vorlegen.
- LOD: jede Stufe höchstens 50 % der Dreiecke der vorherigen (je Objekt gemessen), beliebig viele Stufen; sonst keine Stufe.

## Sitzungen und Token sparen
- Aufgaben mit `/auftrag` beginnen (Ziel, Abnahme, Runden) und mit `/abschluss` beenden.
- **Hauptsitzung und Aufgabensitzungen:** Eine Sitzung, die der Nutzer selbst startet, ist die Hauptsitzung. Sie bespricht, plant und legt mit `/auftrag` Aufträge fest, setzt aber selbst nichts um. Jede Aufgabe läuft in einer eigenen Aufgabensitzung (`start_session`, „fresh“, mit vollständigem Auftrag). Kleinigkeiten bleiben in der Hauptsitzung, z. B. Fragen oder eine Korrektur an den Notizen.
- **Aufgabensitzung:** erkennbar am Auftrag („Du bist eine Aufgabensitzung …“). Erledigt nur diese eine Aufgabe und endet mit `/abschluss`. Führt laufend ein **Protokoll** in `.claude/notizen/protokolle/` (nach jedem Schritt; Aufbau im Skill `auftrag`, Stop-Hook `protokoll_check.py` erinnert). Wird der Verlauf lang, Arbeitsstand in den Projektnotizen festhalten und der Hauptsitzung melden.
- **Recherchen nie in der Sitzung selbst:** ein paar Fragen → Agent `recherche` (Ergebnis in `.claude/notizen/recherche/`, Auszüge in `recherche/quellen/`, Hook `recherche_log.py` protokolliert jeden Abruf); große Recherche → eigene Aufgabensitzung. Danach Fundstellen in die Quellen-Notiz des Projekts übertragen. Meldet der Agent „ANGEHALTEN – Nutzer nötig“, sofort dem Nutzer sagen und nach seiner Bestätigung den Agenten fortsetzen. Vorgeschlagene Downloads dem Nutzer gesammelt vorlegen (Name, Quelle, Größe), erst nach Ja laden. Bildquellen nur als abgelegte Datei auswerten (`recherche/quellen/<thema>/bilder/`): Agent schlägt vor → Nutzer sagt Ja → Sitzung lädt (`curl`, Hook protokolliert) → Agent wertet aus. Meldung „ANGEHALTEN – Bilder laden“ wie oben behandeln.
- Automatisch geladene Projektnotizen (`.claude/rules/projekte/*.md`) kurz halten (Ziel ≤ 5 KB): nur Arbeitsstand, gültige Regeln, Rundgang. Einzelheiten, Verlauf, Quellen, Fall-Entwürfe nach `.claude/notizen/` – nur lesen, wenn die Aufgabe sie braucht.
- Dateien nur ausschnittsweise lesen (`grep`, `offset/limit`), lange Ausgaben kürzen (`tail`, Filter).
- Screenshots klein (`scale: 0.5`) oder als Ausschnitt (`zoom`); erst mit Text/Zahlen prüfen, Bilder für den Rundgang am Ende.
- Vor großen Umbauten den Aufwand nennen; bei knappem Kontingent kleinere Schritte vorschlagen.

## Versionierung
- three.js: Ordner je Release (`three-r187`). Ein Projekt wechselt die Version nur über seine Import-Map.
- Eigene Bibliotheken: Ordner je **Hauptversion** (`render-v1`). Innerhalb einer Hauptversion nur rückwärtskompatible Änderungen; `lib.json` (Version) und `CHANGELOG.md` immer mitpflegen. Inkompatibler Umbau → neue Hauptversion (`/lib-version`), die alte bleibt unverändert.
- Neue Bibliotheken nach Thema schneiden (`/neue-lib`), keine Sammelordner.

## Befehle
- **Zeitlimit 2 Minuten (feste Regel):** Gilt für eigene, von Claude erstellte Skripte: Skriptdateien (`.py/.ps1/.sh/.bat/.cmd`) im Projektordner (außer `tools/`) und im Scratchpad sowie Inline-Code (`python -c`, `python -`). Diese nur über den Wächter starten: `python .claude/hooks/zeitlimit.py <befehl>` (z. B. `python .claude/hooks/zeitlimit.py python .claude/scripts/check.py`). Nach 120 s bricht er den Befehl samt aller Unterprozesse ab (Windows-Job-Objekt). Der Hook `zeitlimit_pruefen.py` blockiert ungeschützte Aufrufe (Bash, PowerShell, Terminal-Panel). Längere Rechnungen in Schritte unter 2 Minuten teilen. Fremde Programme und Werkzeuge (pip, git, glslang, `python -m <modul>`) laufen ohne Zeitlimit.
- **Laufzeiten (feste Regel):** Der Wächter merkt sich je Skript die letzte Laufzeit (`.claude/laufzeiten.json`, nicht im Git). Dauerte der letzte Lauf länger als 2 Minuten oder wurde er abgebrochen, warnen Hook und Wächter beim nächsten Aufruf – diese Warnung immer an den Nutzer weitergeben.
- Die Befehle unten sind in Kurzform notiert; ausgeführt werden sie mit dem Wächter davor.
- Vorschau: `preview_start` mit `webgl-vorschau` → http://127.0.0.1:8000/ (Server: `.claude/scripts/vorschau.py`). Server nur über `preview_start` starten; jede Sitzung beendet ihre selbst gestarteten Server bei `/abschluss` (Hook `server_aufraeumen.py`, auch beim Sitzungsende).
- Gesamtprüfung: `python .claude/scripts/check.py [--uebersicht]`
- Shader einzeln: `python .claude/scripts/shader_check.py <datei>`
- Projekte/Startseite: `python .claude/scripts/projekte.py liste|startseite`
- three.js-Zusatz: `python .claude/scripts/three_addon.py liste <filter>` / `hole <pfad>`
- Bibliotheken: `python .claude/scripts/libs.py liste|neu|hauptversion`

## Wann ist etwas fertig?
1. `check.py` meldet 0 Fehler (der Stop-Hook erzwingt das, sobald `docs/` Änderungen hat).
2. Im Browser geprüft (`/visuell-pruefen`): keine Konsolenfehler, alle Netzwerk-Anfragen gehen an 127.0.0.1, dazu je nach Änderung:
   - **Voller Rundgang** (alle festgelegten Blickpunkte ohne Auffälligkeiten) nur, wenn die Änderung über die Stelle hinaus wirken kann: Licht, Lichtmodell oder gebackene Schatten (jedes Neuberechnen/Neubacken), Shader, Bibliotheken, three.js-Version, mehrfach genutzte Materialien/Formen/Bauteile, Raumaufbau, Sichtbarkeit, Detailstufen, `main.js`/Ladeablauf.
   - **Sonst örtlich:** Abnahme-Blicke plus der nächstgelegene Rundgang-Blickpunkt.
   - Welche Prüfung gilt, legt der Auftrag fest („Rundgang: voll/örtlich – Grund“); im Zweifel voll.
3. Bei Änderungen an einer Bibliothek: alle Projekte geprüft, die sie nutzen.
