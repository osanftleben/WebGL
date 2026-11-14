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
4. **Eintragen:** im Arbeitsstand der Projektnotizen einen kurzen Block „Aktueller Auftrag: Ziel – Abnahme – Runden 0/2 – Protokoll: `.claude/notizen/protokolle/<datei>.md`“.
5. **Plan zeigen** (kurz) und auf das Ja warten.
6. **Umsetzen – je nach Sitzung:**
   - **Hauptsitzung** (vom Nutzer gestartet): nicht selbst umsetzen. Aufgabensitzung starten (`start_session`, „fresh“). Der Auftrag beginnt mit „Du bist eine Aufgabensitzung für <projekt>.“ und enthält Ziel, Abnahme, Nicht dazu, Runden, den freigegebenen Plan, den Namen der Protokolldatei und den Hinweis, das Protokoll laufend zu führen und mit `/abschluss` zu enden.
   - **Aufgabensitzung:** zuerst das Protokoll anlegen (siehe unten), dann wie im Skill `feature` umsetzen.

## Protokoll (jede Aufgabensitzung)
Datei `.claude/notizen/protokolle/<JJJJ-MM-TT>-<kurzname>.md`; gibt es sie schon (Fortsetzung), weiterschreiben. Wird nicht automatisch geladen, kostet also keine Tokens.
```
# <Aufgabe> (<projekt>)
Ziel: … | Abnahme: … | Runden: 0/2 | Sitzung: <name>

## <HH:MM> <Schritt>
- erledigt: …
- Dateien: …
- Messwerte: … (falls gemessen)
- offen / nächster Schritt: …
```
**Wann eintragen:** nach jedem fertigen Schritt, jeder Messung, jeder Korrekturrunde und vor riskanten Umbauten – kurz, Stichworte. Ziel: Bricht die Sitzung ab, kann eine neue allein mit dem Protokoll weitermachen. Der Stop-Hook `protokoll_check.py` erinnert, wenn Änderungen in `docs/` neuer sind als der letzte Eintrag.

Während der Arbeit: Jede Rückmeldung des Nutzers „gefällt noch nicht“ ist eine Runde – im Block und im Protokoll hochzählen. Nach der letzten Runde Restfehler in den Projektnotizen festhalten und mit `/abschluss` beenden, nicht weiter feilen.
