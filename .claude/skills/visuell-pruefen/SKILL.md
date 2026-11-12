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
6. **Screenshot** machen und mit der Erwartung vergleichen (leerer/schwarzer Bildschirm = Fehler).
7. Ergebnis kurz melden: OK oder gefundene Probleme mit Ursache. Screenshot zeigen.
