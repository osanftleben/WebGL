# Holmes – Befunde des Nutzers (15. 11. 2026)

Gesammelt in der Hauptsitzung, noch **keine Aufträge vergeben**. Nächster Schritt: offene Fragen mit dem Nutzer klären, dann je Punkt `/auftrag` und eine eigene Aufgabensitzung.
Vorher-Bilder: `.claude/notizen/bilder/2026-11-15-befund<N>-*.png|webp`.

## 1. Schwerttafel (Schreckenskammer, III. Etage) – Schwerter schlecht zu erkennen
- Bild: `befund1-schwerter.png`. Bauteil „Schwerttafel“ in `welt/bauteile.js`; laut Notizen Richtschwerter.
- Beobachtung: Griffe/Parierstangen schwarz bzw. dunkelbraun verschwinden vor der sehr dunklen Holztafel; Klingen wirken wie flache helle Latten (keine Schneide, keine Hohlkehle, kaum Glanz), Ende gerade abgeschnitten (bei Richtschwertern üblich: stumpf/rund).
- **Offen:** Problem Kontrast, Form oder beides? Darf die Tafel heller werden / anderen Hintergrund bekommen (z. B. roter Stoff)? Klingenende gerade lassen oder spitz?

## 2. Lambris (Vertäfelung) wirkt „fake“
- Bild: `befund2-vertaefelung.png`.
- **Nutzer, Hauptpunkt:** Die Schrägen an den Füllungen sind zu gleichmäßig schattiert (wie aufgemalt / 3D-Baukasten). Ziel: echtes Profil mit feinen Stufen und Kanten, die kleine Schattenkanten werfen.
- Helle Fassung mit Goldlinien bleibt (belegt, Hirth 1886; Lambris und Türen passend).
- Weitere Beobachtungen (nicht vom Nutzer gewichtet): Goldlinien wie Aufkleber, Fläche überall gleich glatt, Brüstungsgesims schmal/flach, Lambris und Tür exakt gleicher Farbton.
- **Offen:** Türen bekommen dasselbe Profil? (Vorschlag: ja, gleiche Schrägen, sollen passen.) Gebrauchsspuren gewünscht?

## 3. Schatten in Raum A und B fehlen (z. B. Vitrinenbeine)
- Bild: `befund3-beinschatten.webp`.
- **Nutzer:** In Raum A und B dieselbe Schattenberechnung wie zuletzt in der Werkstatt (Fensterschatten gebacken, 87cf3af; Vorgehen in der Projektnotiz, `holmes_schatten.py`, `__debug.backeWerkstattSchatten()`).
- Seit dem Werkstatt-Schritt keine Kontaktflecken unter Möbelbeinen in allen Räumen → in A/B stehen Vitrinen und Sockel ganz ohne Schatten.
- **Offen:** Welche Werfer (Vorschlag: Vitrinen, Büstensockel, Figuren, Säulen, Absperrungen, Glasschränke, Schwerttafel)? Nur Fensterlicht oder auch Kronleuchter/Lampen (deutlich mehr Aufwand)? Werkstatt-Restpunkte (z. B. Wurfschatten auf runden Teilen) für A/B gleich „gut genug“?

## 4. Büsten und Köpfe ohne Eigenschattierung – wirken flach
- Bild: `befund4-buesten.png`.
- Beobachtung: Gesicht von allen Seiten gleich hell; nur die Texturfarbe gibt Unterschiede, keine Abdunklung in Augenhöhlen, unter Nase/Kinn, am Haaransatz, Kopf-Hals-Übergang.
- **Achtung:** Licht laut Projektnotiz abgeschlossen („nur echte Fehler beheben“) – Nutzer muss das für die Figuren bewusst öffnen.
- Vorschlag (einfach): Vertiefungs-Abdunklung einmal beim Laden je Eckpunkt berechnen + leichte Hell-Dunkel-Richtung zum nächsten Fenster. Aufwendig wäre echter Schattenwurf am Kopf (Nase auf Wange) – nicht empfohlen.
- **Offen:** Einfacher Weg ok? Nur Büsten oder alle Köpfe/Figuren in allen Räumen (Ganzfiguren, Figurengruppe, Schutzmann)?

## 5. Glanzflecken auf dem Boden enden an der Raumgrenze
- Bild: `befund5-glanz.png`.
- Heller Glanzstreifen im Nachbarraum endet hart an der Türschwelle, wird im vorderen Raum nicht fortgesetzt. Vermutlich Glanzberechnung je Raum. Echter Fehler.
- **Offen:** Welcher Durchgang (A↔B?).

## 6. Schalen: Innenflächen fehlerhaft – ERLEDIGT (15. 11., nicht committet)
- **Ergebnis:** Es waren die Gipsformen auf der Werkbank (nicht die Näpfchen); jetzt Drehprofil mit Wand, Rand, Innenwand (`schalenForm` in `welt/bauteile.js`). Firefox ok (Nutzer). Offen: Wachstopf und Gießlöffel vermutlich gleicher Fehler (ungeprüft); Schatten der Gipsformen auf die Platte fehlt (früher `wsWirft` → Flecken, entfernt) → Vorschlag: bei Punkt 3/7 mit dem Neubacken lösen.
- Bild: `befund6-schalen.png`.
- Nur die hintere Innenfläche sichtbar, vordere Wand fehlt → vermutlich einseitige Geometrie. Lösung: echte Wandstärke (außen, innen, Rand). Echter Fehler, keine Rückfragen nötig.
- **Offen:** Vermutlich Näpfchen in der Werkstatt – bestätigen.
- **Auftrag vergeben** (15. 11.): Aufgabensitzung `holmes-schalen`, Protokoll `protokolle/2026-11-15-holmes-schalen.md`.

## Empfohlene Reihenfolge (Hauptsitzung)
6 (erledigt) → 7 nur Ursache klären → 2 und 1 (Formänderungen vor dem Neubacken) → 3 → 4 (beide Licht, nacheinander); 5 unabhängig, jederzeit.

## 7. Werkstatt: Schatten an der Wand stimmen nicht (Nutzer: „bitte überprüfen“)
- Bild: `befund7-wandschatten.png` (Ecke mit Wandbrett, 4 Gipsköpfen, angelehnten Brettern, Gipskasten).
- Beobachtungen: großer, sehr weicher dunkler Fleck um Wandbrett und Köpfe, reicht weit **über** die Köpfe hinaus (Schatten nach oben – passt nur bei Licht von unten); unter dem Wandbrett keine klare Schattenkante; hinter den Brettern breite dunkle Wolke bis über ihre Oberkante. Wirkt wie zu stark weichgezeichnet bzw. zu große Hüllkörper.
- Mögliche Ursachen (prüfen, nicht belegt): Quader-Hülle der Büsten/Köpfe (bekannter Restpunkt „Büstenschatten nur grob“), Unschärfe der Lichtkarte (`KARTE_UNSCHAERFE_*` in `holmes_licht.py`), Lichtrichtung beim Backen.
- Erst Ursache klären, dann mit Nutzer entscheiden; Bezug zu Punkt 3 (gleiches Backverfahren) – nicht gleichzeitig mit 3/4.

## Allgemein offen
- Liste vollständig (Nutzer: „erstmal alle Punkte“).
- Bilder in `.claude/notizen/bilder/` (ca. 1,8 MB) nicht git-ignoriert – Nutzer fragen: ins Git oder `.gitignore`?
- Reihenfolge der Aufträge; 3 (Schatten A/B) und 4 (Büsten) berühren beide das Licht – nicht gleichzeitig laufen lassen.
