---
name: veroeffentlichen
description: Bereitet die Veröffentlichung auf GitHub Pages vor – Prüfung, Übersicht der Änderungen, Commit und Push jeweils nur nach ausdrücklichem Ja.
disable-model-invocation: true
---

# Veröffentlichen (GitHub Pages)

1. `python .claude/scripts/check.py --uebersicht` – bei Fehlern abbrechen und melden.
2. `git status` und `git diff --stat` zeigen; in einfachen Worten zusammenfassen, was sich geändert hat.
3. Commit-Nachricht auf Deutsch vorschlagen. **Erst nach Ja committen.**
4. Remote prüfen (`git remote -v`). Fehlt es: erklären, dass zuerst ein GitHub-Repository verbunden werden muss, und nichts weiter tun.
5. **Erst nach erneutem Ja pushen** (`git push`).
6. Hinweis: GitHub Pages muss einmalig eingestellt sein (Settings → Pages → Branch `main`, Ordner `/docs`). Die Seite ist nach ein bis zwei Minuten unter `https://<nutzer>.github.io/<repo>/` erreichbar.
