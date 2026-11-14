# Sichtbarkeit + LOD Figuren, Teil 2: Detailstufen (holmes-berliner-faelle)
Ziel: weniger Dreiecke an Figuren, Büsten, Köpfen ohne sichtbaren Unterschied | Abnahme: Dreiecke je Rundgang-Blick vorher (4eb7f01)/nachher, kein Aufploppen, keine sichtbaren LOD-Sprünge, 60 Bilder/s, Prüfsumme 77bcb35e, check.py 0 Fehler, Rundgang ohne Konsolenfehler | Runden: 0/2 | Sitzung: Aufgabensitzung LOD

## 15:00 Ausgangslage
- vorgefunden (nicht committet): `welt/stufen.js` neu; `main.js`, `welt/bauteile.js`, `welt/etage3.js`, `welt/menschen.js` geändert – Verfahren vollständig eingebaut, 36 Einheiten (9 Büsten, 24 Schrankköpfe, 3 Gruppenfiguren)
- check.py 0 Fehler, Konsole: Lichtkarte aktiv (77bcb35e)

## 15:10 Vergleich mit 4eb7f01
- Vergleichskopie `tools/vergleich-4eb7f01` (git archive), Launch-Eintrag `vergleich-4eb7f01` (Port 8013)
- erzwungen volle Stufe: alle 12 Rundgang-Blicke bitgleich (Prüfsumme der Bildpunkte, 1388 × 1260, Belichtung fest)

## 15:20 Umschaltprüfung, Korrektur Kleidung
- je Einheit Kamera an der Umschaltgrenze, nur diese Einheit getauscht: Büsten bis 313 Bildpunkte > 8 Stufen, weiße Zacken an den Schultern (Hemd sticht durch den gröberen Rock)
- je Material: Kleidung (Lambert) spart nur ~20 %, verursacht fast alle Abweichungen; Wachs (Köpfe, Hände) spart ~68 %, kaum Abweichung
- Änderung: `menschen.js` `SPAR_KLEIDUNG = false` (Rumpf, Revers, Kragen, Flicken bleiben voll)
- danach Büsten 57–117, Figuren 41–292, Schrankköpfe 153–489 Bildpunkte > 8; im Bild kein Unterschied erkennbar
- Summe Einheiten 100 344 → 62 476 Dreiecke

## 15:30 Messung, Rundgang
- Dreiecke vorher → nachher: A gesamt 62 444 → 51 736; Hofwand 33 902 → 23 044; Büsten nah 22 068 → 18 432; Gruppe nah 46 692 → 43 860; Kopfschrank 29 454 → 28 982; B Kranich 42 302 → 38 960; B schräg 37 006 → 33 664; übrige gleich
- Gehen 5-cm-Schritte: kein Flattern; Zittern ±1,5 cm an 3 128 Orten: ohne Pendeln; CPU Prüfung ≤ 53 µs
- Rundgang-Bilder unauffällig, keine Konsolenfehler, alle Anfragen an 127.0.0.1, check.py 0 Fehler

## 15:35 Abschluss
- Ergebnis: Teil 2 fertig, nicht committet (Commit nur auf Wunsch)
- Restpunkte: Bildrate nicht gemessen (Vorschau nicht sichtbar, keine Bildschleife); Firefox-Prüfung durch den Nutzer offen
- Notizen: Projektnotizen + `holmes-verlauf.md` aktualisiert

## 15:40 Protokoll nach Vorgabe der Hauptsitzung
- Datei umbenannt (vorher `2026-11-14-lod-figuren.md`), Verweis im Arbeitsstand der Projektnotizen ergänzt
- offen / nächster Schritt: Firefox-Prüfung und Bildrate durch den Nutzer, Commit nur auf Wunsch

## 15:50 Korrekturrunde 1/2
- Nutzer: Kleidung voll lassen ist keine Lösung, LOD zu 100 % → Aufgabe offen
- Plan: Ursache = Hemd/Weste/Flicken mit eigenem Gitter unter dem Rock; in der sparsamen Fassung alle Lagen auf dasselbe grobe Gitter (gleiche Winkel/Höhen), sonst innere Lagen ~5 mm nach innen; dann `SPAR_KLEIDUNG` an, Umschaltprüfung je Einheit (Ziel ≤ heutige Abweichung, keine Zacken)

## 16:00 Rückfragen geklärt (Nutzer)
- Umfang: alle Teile der 36 Einheiten (auch Kleidung, Beine, Schuhe, Hut), dazu Leiche, Kranich und künftige Figuren (gleicher Weg)
- Kleidung: gemeinsames grobes Gitter für alle Lagen (Rock, Weste, Hemd, Revers, …)
- Abnahme je Einheit an der Umschaltgrenze: ≤ 1 % der Bildpunkte der Figur > 24 Stufen Abweichung UND kein zusammenhängender Fleck > 3 × 3 Bildpunkte (bei 1080p)
- Kranich (dreht sich): Stufen je Teil umschalten statt zusammenfassen (mehr Draw-Calls ok)
- weiter in dieser Sitzung
- offen: Plan vorlegen, auf Ja warten

## 16:40 Umsetzung (Teil) und Befund Grenzwert
- erledigt: `menschen.js` gemeinsames grobes Rumpfraster (`grobRaster`, `rumpfPunkt` sparsam auf den groben Dreiecken, `zeilen()` legt Zeilen aufliegender Teile auf die Rasterzeilen), Hemdkragen 10 Teilungen, `istSparsam`/`vollStufe` exportiert; `bauteile.js` Bein/Schuh/Hut/Krempe/Melone/Halsabschluss je Stufe (`jeStufe`). Kranich, Leiche, verdeckte Figur NOCH NICHT.
- Zwischenstand Code: `RUMPF_SPALTEN.spar = 26` (Testwert; vorher 18)
- Prüfhilfe in der Konsole: `eval(localStorage.__hilfe)` → `__alle()`, `__miss(i, d)`, `__rundgang(modus)` (Bildhöhe 1080, Belichtung fest)
- Befund: Grenze (≤ 1 % der Figurpunkte > 24 Stufen, kein Fleck > 9 Punkte) reißen ALLE Einheiten, auch die Schrankköpfe ohne Kleidung (1,9–3,1 %), und auch bei 7 m Abstand noch 2–3 %. Ursache: jede Formänderung verschiebt Umrisskanten um Bruchteile eines Bildpunkts; an dunkel/hell-Kanten ändert die Kantenglättung die Farbe dann um > 24 Stufen. Mit Ausschluss von 1-px-Kanten (nur „Kerne“: ganze 3 × 3-Umgebung > 24): meist 0–6, Figur 34: 13, Figur 35: 48.
- offen: Nutzer entscheiden lassen (Überblendung / Grenze nur für Flecken / strenge Grenze = kaum LOD)
- Nutzer: „entscheide du“ → Entscheidung Claude: **Grenze nur für Flecken** (je Einheit an der Umschaltgrenze, 3 Richtungen, 1080p: 0 Bildpunkte, deren ganze 3 × 3-Umgebung > 24 Stufen abweicht). Überblendung (Dither) als möglicher Folgeschritt, falls in Firefox doch Sprünge sichtbar.

## 17:10 Fleckprüfung der 36 Einheiten bestanden
- Flecken lagen in Gesichtern (gemalte Augen verrutschen) und am Schulterteil des Hemds (Figur 35)
- Änderungen: `KOPF_ANTEIL = 0.8` (Kopf, Haar, Bart), `RUMPF_SPALTEN.spar = 18`; `zeilen()` sparsam = eigene Zeilen + Rasterzeilen
- Ergebnis: alle 36 Einheiten 0 Flecken; Summe 100 344 → 73 752 Dreiecke
- nächster Schritt: Kranich, Leiche, verdeckte Figur

## 17:40 Kranich, Leiche, verdeckte Figur angebunden
- Kranich: Körper je Stufe zusammengefasst (statt je Teil umschalten), Hülle dreht mit der Person, Umriss pro Bild neu (`beweglich`) → Bewegung bleibt, weniger Draw-Calls; Helm misst immer am vollen Kopf
- Leiche: Körper und antippbare Hand je eine Einheit, mit der Zelle der Leiche verknüpft; verdeckte Figur: Tuch, Tuchkanten, Kopf, Füße
- `main.js`: `alleStufen([...])` fasst alle 40 Einheiten zusammen

## 18:10 Prüfung
- Volle Stufe bitgleich zu 4eb7f01 in 11 von 12 Blicken; Werkstatt: 2 Bildpunkte anders (Tuchkante liegt deckungsgleich auf dem Tuch, Rundung); Draw-Calls in allen Blicken wie 4eb7f01 (Tuchkanten mit in die Stufe, sonst +1)
- Fleck an der Leiche (Manschette): schon die volle Stufe lässt die Manschettenecken leicht durch den Ärmel stechen; sparsam an anderen Stellen → Ärmel rundum in beiden Stufen 12 Kanten (gespart nur längs), Manschette in beiden Stufen gleich. Fehlversuche: Manschette verkleinert / achteckig ausgerichtet / gekürzt → Flecken an Figur 33/34
- Ergebnis: alle 40 Einheiten 0 Flecken; Dreiecke aller Einheiten 120 760 → 86 768 (Etage 100 344 → 74 264, Leiche 8 644 → 5 250, Figur 2 832 → 1 768, Kranich 8 940 → 5 486)
- Rundgang (auto): A gesamt 62 444 → 51 312, Hofwand 33 902 → 27 230, Büsten nah 22 068 → 19 814, Gruppe nah 46 692 → 45 180, Kopfschrank 29 454 → 29 204, Ecke A|B 15 642 → 14 578, B Kranich 42 302 → 34 652, B schräg 37 006 → 25 902, Werkstatt 6 322 → 5 258, übrige gleich
- Hervorhebung: Kranich, Hand, Figur – beide Stufen dieselben eigenen Materialien; Kranich-Umriss folgt der Drehung
- check.py 0 Fehler, Konsole ohne Fehler, alle Anfragen an 127.0.0.1, Rundgang-Bilder unauffällig; `aktualisiere` 5–15 µs je Bild
- Bildrate nicht messbar (Vorschau gedrosselt, ~1 Bild/s) → Restpunkt

## 18:25 Abschluss (Korrekturrunde 1/2)
- Ergebnis: LOD für alle 40 Figuren-Einheiten mit allen Teilen, 0 Flecken, volle Stufe bitgleich (Werkstatt 2 Bildpunkte); nicht committet (Commit nur auf Wunsch)
- Restpunkte: Bildrate nicht gemessen; Firefox-Prüfung durch den Nutzer; Überblendung als möglicher Folgeschritt
- Notizen: Projektnotizen + `holmes-verlauf.md` aktualisiert

## 18:45 Neue Anforderung (Korrekturrunde 2/2, nicht begonnen)
- Nutzer: Ersparnis zu klein, Ziel **mindestens 40 % pro Objekt**. Heute (sparsam ggü. voll): Gruppenfiguren 34–36 %, Kranich 39 %, Leiche 37/51 %, verdeckte Figur 38 %, Büsten 19–29 %, Schrankköpfe 14–26 % (je Objekt: Tabelle in der Sitzung, Messung `einheiten[i].voll/spar`)
- Entscheidungen des Nutzers: **dritte Stufe** (heutige Stufe bleibt für etwa 3–6 m, zusätzlich grobe Fernstufe ≥ 40 % ab etwa 6–8 m); gilt für **jedes einzelne der 40 Objekte** (auch jede Büste, jeden Schrankkopf); Umsetzung in einer **neuen Aufgabensitzung** (dieser Verlauf zu lang)
- Für die neue Sitzung noch mit dem Nutzer klären: genauer Umschaltabstand der Fernstufe; Abnahme an der Fern-Grenze (Vorschlag: gleiche Fleckprüfung wie heute, 0 Kerne bei 1080p); ob die Firefox-Prüfung von Teil 2 vorher erfolgt; Commit von Teil 2 vor dem Umbau?
- Ansatz-Skizze: `alsStufe` um dritte Fassung erweitern (`bauFern`, eigene Anteile, z. B. Kopf deutlich gröber, Hände/Finger stark vereinfacht), `stufen.js` drei Fassungen mit eigener Grenze + Spielraum; Prüfhilfe `__kerne` auf die zweite Grenze erweitern
- Stand Teil 2: fertig, 0 Flecken, nicht committet; Firefox offen

## 19:05 Auftrag geändert (ersetzt 18:45)
- Firefox-Prüfung Teil 2 durch den Nutzer: sieht perfekt aus. Aber: Ersparnis lohnt nicht, „zweites Modell mit fast gleicher Dreiecksanzahl“
- **Regel des Nutzers:** jede LOD-Stufe höchstens **halb so viele Dreiecke wie die vorherige** (je Objekt gemessen); beliebig viele Stufen erlaubt (z. B. voll → ≤ 50 % → ≤ 25 %)
- Folge: heutige sparsame Stufe (14–51 %) wird **ersetzt**, nicht ergänzt; Umschaltabstand je Stufe und Objektart per Fleckprüfung (0 Kerne, 1080p) ausmessen → gröbere Stufen schalten später um
- Ehrlich mitmessen: Dreiecke je Rundgang-Blick und möglichst Bildrate (mit/ohne LOD); lohnt es sich in den kleinen Räumen nicht, dem Nutzer vorlegen statt weiterbauen
- Umsetzung in neuer Aufgabensitzung (dieser Verlauf zu lang); Teil 2 nicht committet (Commit vorher nur auf Wunsch)
- Vorschlag CLAUDE.md-Regel wartet auf Ja des Nutzers

## 19:10 Abnahme gelockert (Nutzer)
- „größere visuelle Abweichungen möglich, wenn es nicht zu sehr ins Auge springt“
- Folge: Fleckprüfung (0 Kerne) ist keine harte Grenze mehr, nur Hilfe beim Wählen des Umschaltabstands; Abnahme = Sichtprüfung beim Hin- und Weggehen (Claude in Chromium, am Ende der Nutzer in Firefox). Vorrang hat die 50-%-Regel je Stufe; der Abstand wird so gewählt, dass der Wechsel nicht auffällt

## 19:15 CLAUDE.md
- Regel nach Ja des Nutzers eingetragen (Grafik und Feinschliff): LOD-Stufen je höchstens 50 % der vorherigen
