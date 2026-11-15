# Hinweise verknüpfen (holmes-berliner-faelle)
Ziel: erste Verknüpfung 2 + 3 → „Wendt hat das Abdruckwachs entdeckt“ im Notizbuch, gespeichert, schaltet Kranich-Frage frei | Abnahme: siehe Plan unten | Runden: 0/2 | Sitzung: Aufgabensitzung „Hinweise verknüpfen“

## Festlegungen (Nutzer)
- Bedienung: im Notizbuch Hinweise antippen/anklicken (markiert), ab 2 Knopf „Verknüpfen“, bis 3 wählbar. Neuer Abschnitt „Schlussfolgerungen“ zwischen Hinweisen und Aussagen.
- Falsch: kurzer Satz Sigersons, Auswahl bleibt, Fehlversuche gezählt + gespeichert (noch ohne Folge).
- Text Schlussfolgerung: mit Motiv-Satz („Wer das tat, hatte Grund, ihn zum Schweigen zu bringen.“).
- Kranich-Frage: Claude entscheidet → „Wendts Sorgen“ (über Ida Brandt), neue Aussage „Wendt war beunruhigt“.

## 08:14 Umsetzung (Plan vom Nutzer freigegeben)
- erledigt: Datei `fall1/verknuepfungen.js` (SCHLUSSFOLGERUNGEN mit `aus`-Liste, genaue Mengen-Übereinstimmung, MAX_AUSWAHL 3, 3 Fehlversuch-Sätze, SCHON_NOTIERT); `ui/notizbuch.js` (Hinweise als Knöpfe mit aria-pressed, Abschnitt Schlussfolgerungen, Leiste sticky mit Meldung, Verknüpfen ab 2 aktiv – Leiste erscheint schon ab 1 Markierung mit gesperrtem Knopf); `fall1/spielstand.js` (schluesse, fehlversuche; Version bleibt 1, alte Stände gültig); Kranich-Frage `sorgen` (braucht `abdruckwachs-entdeckt`, Aussage `aussage-sorgen`); `ton/klaenge.js` bleistift(); main.js verdrahtet, `__debug.fehlversuche()`.
- check.py: 0 Fehler.
- offen / nächster Schritt: Browserprüfung (Ablauf, Touch, schmal, Neuladen, fps, Rundgang).

## 08:30 Ablauf im Browser (Chromium, PC-Größe) bestanden
- Hinweise per simuliertem Touch-Tippen gefunden (Leiche nur von der Seite erreichbar, z. B. (4,4|16,8); vorn blockiert die Absperrung bei z 14,4 → Abstand 3,1 > 3 – vorhandenes Verhalten, nicht geändert).
- 1 markiert → Leiste mit gesperrtem Knopf + „Noch mindestens einen Hinweis wählen.“; 1+2 falsch → Satz 1, fv 1; 1+2+3 falsch → Satz 2, fv 2; 2+3 richtig → Eintrag hervorgehoben, Auswahl leer; erneut → „bereits notiert“, kein Fehlversuch.
- Kranich: Frage „Sagen Sie, Schutzmann …“ erscheint, Aussage `aussage-sorgen` gespeichert.
- Neu laden: Schlussfolgerung, Aussage, fehlversuche 2, gestellte Frage erhalten. Alter Spielstand ohne neue Felder lud ohne Fehler.
- offen: schmales Fenster hoch/quer, Konsole/Netz, fps, Rundgang.

## 08:50 Handy, Konsole, Netz, fps, Rundgang
- Handy hoch (375×812) und quer (812×375): Auswahl, Leiste sticky unten, Knopf per echtem Klick bedienbar.
- Zwei Verbesserungen: Notizbuch öffnet oben (vorher sprang es durch den Fokus auf „Schließen“ ans Ende – alt, betraf Querformat stark); neue Schlussfolgerung wird oben eingerastet (vorher halb unter der Leiste).
- Kranich-Frage vor der Schlussfolgerung nicht sichtbar, danach sichtbar. Neustart löscht auch Schlussfolgerungen/Fehlversuche.
- Konsole 0 Fehler, alle Anfragen an 127.0.0.1, 60,2 Bilder/s, Rundgang 1–8 unauffällig (Grafik unverändert).
- Einmal beobachtet, NICHT reproduzierbar (4 Versuche): nach Fensterumschaltung + Neuladen war der Spielstand leer. Vermutlich Eigenheit des Prüfbrowsers (Umschalten der Geräte-Emulation), Spielstandcode unverändert im Lade-/Speicherweg. Nutzer in Firefox darauf achten lassen.
- check.py 0 Fehler. Prüfbrowser-Spielstand per „Fall neu beginnen“ zurückgesetzt.
- offen: Firefox-Prüfung durch Nutzer (auch Feinschliff D), Abnahme, /abschluss.

## 08:27 Abschluss
- Ergebnis: Abnahme vom Nutzer bestätigt („Alles ok“, Firefox), Runden 0/2. Feinschliff D in Firefox ebenfalls ok.
- Notiz aktualisiert (Auftragsblock entfernt, < 5 KB), Einzelheiten in `holmes-fall1.md`.
- Restfehler: einmaliger leerer Spielstand im Prüfbrowser (nicht reproduzierbar, Firefox unauffällig).
- Commit: noch keiner (nur auf Wunsch).
