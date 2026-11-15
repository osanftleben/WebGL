---
name: visuell-pruefen
description: Öffnet ein WebGL-Projekt in der lokalen Vorschau im eingebauten Browser und prüft Konsole, Netzwerk-Anfragen und Darstellung (Screenshot). Nach jeder sichtbaren Änderung verwenden.
argument-hint: <projekt>
---

# Sichtprüfung im Browser

Projekt: `$ARGUMENTS` (leer = Startseite)

1. Vorschau starten: `preview_start` mit Namen `webgl-vorschau` (läuft schon → wiederverwenden).
2. `http://127.0.0.1:8000/<projekt>/` öffnen bzw. neu laden; 2–3 Sekunden warten (Shader laden asynchron).
3. **Konsole** (`read_console_messages`): keine Fehler. Besonders achten auf `THREE.WebGLProgram: Shader Error`, `Failed to resolve module specifier` (Import-Map), 404.
4. **Netzwerk** (`read_network_requests`): Jede Anfrage muss an `127.0.0.1` gehen. Eine Anfrage an eine andere Adresse ist ein Fehler (Regel: nichts aus dem Internet).
5. **WebGL aktiv:** per `javascript_tool` prüfen: `window.__debug ? __debug.info() : 'kein __debug'` – Draw-Calls > 0 heißt, es wird gezeichnet.
6. **Screenshot** (Token sparen: `scale: 0.5`, Einzelheiten per `zoom`) machen und mit der Erwartung vergleichen (leerer/schwarzer Bildschirm = Fehler).
7. **Rundgang:** Hat das Projekt in `.claude/rules/projekte/<projekt>.md` einen Abschnitt „Rundgang“: Umfang nach dem Auftrag („Rundgang: voll/örtlich“, Regel in CLAUDE.md „Wann ist etwas fertig?“; ohne Angabe selbst nach der Regel entscheiden, im Zweifel voll). **Voll:** von **jedem** Blickpunkt dort einen Screenshot. **Örtlich:** die Abnahme-Blicke plus der nächstgelegene Rundgang-Blickpunkt. Ist das Browserfenster verdeckt (`tabs_context`), den Nutzer bitten, es sichtbar zu machen. Gezielt suchen nach: Flecken, Streifen, harten Hell-Dunkel-Sprüngen an Kanten, zu hellen/dunklen Ecken, schwarzen oder fehlenden Flächen, Flimmern. Jeder Fund ist ein Fehler, auch wenn er nicht zur aktuellen Änderung gehört – melden, nicht übergehen.
8. **Firefox:** Der Nutzer spielt in Firefox, geprüft wird hier in Chromium. Hängt die Änderung vom Browser ab (Rechengenauigkeit, Bild-/Texturladen, neue WebGL- oder Web-Funktionen), den Nutzer bitten, in Firefox neu zu laden und die Konsolenzeilen zu schicken.
9. Ergebnis kurz melden: OK oder gefundene Probleme mit Ursache. Screenshots zeigen.
