---
name: auftrag
description: Startet eine Aufgabe mit klarem Ziel, Abnahme und Grenze (höchstens 2 Korrekturrunden). Zu Beginn jeder neuen Aufgabe oder Sitzung verwenden, besonders bei Grafik, Feinschliff und allem Offenen („schöner“, „realistischer“).
argument-hint: <projekt> <was soll erreicht werden>
---

# Auftrag festlegen

Auftrag: `$ARGUMENTS`

1. **Stand lesen:** Arbeitsstand in `.claude/rules/projekte/<projekt>.md`. Aus `.claude/notizen/` nur lesen, was die Aufgabe braucht.
2. **Mit dem Nutzer festlegen** (`AskUserQuestion`, höchstens 4 Fragen, Vorschläge als Optionen):
   - **Ziel** in einem Satz.
   - **Abnahme:** Woran ist „gut genug“ erkennbar? Konkret: Blickpunkte aus dem Rundgang, Messwerte (Bilder/s, Dateigröße), sichtbare Merkmale.
   - **Nicht dazu:** was ausdrücklich ausgeklammert ist.
   - **Runden:** Höchstzahl Korrekturrunden (Vorgabe 2).
3. **Aufwand einschätzen** (klein / mittel / groß). Bei groß: in Teilaufgaben je Sitzung zerlegen und das vorschlagen.
4. **Eintragen:** im Arbeitsstand der Projektnotizen einen kurzen Block „Aktueller Auftrag: Ziel – Abnahme – Runden 0/2“.
5. **Plan zeigen** (kurz) und auf das Ja warten.
6. **Umsetzen – je nach Sitzung:**
   - **Hauptsitzung** (vom Nutzer gestartet): nicht selbst umsetzen. Aufgabensitzung starten (`start_session`, „fresh“). Der Auftrag beginnt mit „Du bist eine Aufgabensitzung für <projekt>.“ und enthält Ziel, Abnahme, Nicht dazu, Runden, den freigegebenen Plan und den Hinweis, mit `/abschluss` zu enden.
   - **Aufgabensitzung:** wie im Skill `feature` umsetzen.

Während der Arbeit: Jede Rückmeldung des Nutzers „gefällt noch nicht“ ist eine Runde – im Block hochzählen. Nach der letzten Runde Restfehler in den Projektnotizen festhalten und mit `/abschluss` beenden, nicht weiter feilen.
