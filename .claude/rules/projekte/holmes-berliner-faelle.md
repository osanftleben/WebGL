---
paths:
  - "docs/holmes-berliner-faelle/**"
---

# Projekt: Sherlock Holmes – Die Berliner Fälle

- Ordner: `docs/holmes-berliner-faelle/`, online unter `…/WebGL/holmes-berliner-faelle/`
- Nicht verwechseln mit den alten, gesperrten Ordnern `sherlock-holmes-in-berlin/`, `sherlock/`, `sherlock2/` im Hauptordner (nicht lesen, nicht ändern).

## Ziel
Browserspiel (Deutsch, Erwachsene) für Smartphone und PC: Sherlock Holmes ermittelt 1892 in Berlin, frei begehbar in Ich-Perspektive. Mehrere Fälle, beginnend mit Fall 1.

## Rahmen (gilt für alle Fälle)
- **Zeit/Kanon:** 1892, in der „großen Lücke“ (Mai 1891 – Frühjahr 1894), in der Holmes laut Original als tot gilt. Deckname „Sigerson“ (Original: „Das leere Haus“). Watson weiß nichts; nur Mycroft weiß Bescheid. Begleiter: eine erfundene Berliner Figur.
- **Keine historischen Fehler:** Jede historische Angabe (Zeit, Orte, Straßen, Gebäude, Verkehrsmittel, Personen, Geld, Sprache, Wetter) braucht einen Beleg: zeitgenössische Quellen (z. B. Berliner Adressbuch 1892, Stadtpläne, Reiseführer jener Jahre) oder Fachliteratur/Museen. Fundstelle hier unter „Quellen“ eintragen. Unbelegtes als offen markieren und mit dem Nutzer klären – nichts erfinden.
- **Echte Personen** dürfen vorkommen (Fakten zu ihnen nur belegt). Im Spiel der Hinweis: „Handlungen und Personen können erfunden sein.“
- **Sicht/Steuerung:** Ich-Perspektive. Handy: Joystick links, Wischen rechts; Hoch- und Querformat voll spielbar. PC: Tastatur + Maus. Kein Gamepad.
- **Welt:** Je Fall ein eigenes, zusammenhängendes Viertel. Straßenverlauf, Plätze, Namen exakt nach Stadtplan 1892; markante Bauten erkennbar nach Abbildungen; normale Wohnhäuser typisch, aber vereinfacht (im Hinweis vermerken). Nur fallwichtige Gebäude betretbar (kurzer Übergang an der Tür). Droschke: mitfahren, der Kutscher lenkt. Wenige ansprechbare Figuren, etwas Bewegung im Hintergrund. Tageszeit/Wetter je Fallabschnitt fest; Wetter nur belegt oder ausdrücklich erfunden.
- **Grafik:** stilisiert, komplett selbst im Code erzeugt (keine fremden Modelle/Texturen).
- **Spielablauf:** Hinweise antippen (keine Nahansicht), Notizbuch, Gespräche mit Fragenauswahl (neue Fragen durch Hinweise). Hinweise verknüpfen (Schlussfolgerungen) und am Ende Wer/Wie/Warum mit Hinweisen belegen. Schwierigkeit Leicht/Normal/Schwer: Hervorhebung, Anzahl Tipps, Fehlversuche. Geld nur in Texten erwähnt (korrekt), kein Kassenstand.
- **Menü:** Fall-Liste, nächster Fall frei nach Lösung, gelöste wiederholbar. Einstellung: nur Grafikqualität. Spielstand automatisch im Browser (localStorage), Neustart-Knopf.
- **Sprache:** zeitgemäße Anreden/Begriffe, gut lesbar, heutige Rechtschreibung, kein modernes Vokabular. Schrift in der Spielwelt (Schilder, Zeitungen) wie 1892 üblich (Fraktur/Antiqua je nach Beleg); Bedienoberfläche gut lesbar.
- **Leistung:** mindestens 30 Bilder/s auf Mittelklasse-Handy, am PC 60. Ladegröße unter 20 MB pro Fall.
- **Klänge:** im Browser erzeugt (Web Audio), keine fremden Aufnahmen ohne geklärte Lizenz.
- **Veröffentlichung:** nur auf ausdrücklichen Wunsch pushen.

## Anforderungen erste Version
- Steuerung Handy (hoch/quer) und PC
- ein begehbarer Ort von Fall 1
- Hinweise antippen, Notizbuch, ein Gespräch, automatisches Speichern
- einfache, im Browser erzeugte Geräusche

## Ausbaustufen
- Schwierigkeitsstufen, Droschkenfahrt, Startmenü mit Grafikeinstellung
- Hinweise verknüpfen, Auflösung (Wer/Wie/Warum)
- übrige Orte von Fall 1, danach weitere Fälle (je eigenes Viertel)

## Fall 1: „Die Leiche im Panoptikum“ (gewählt)
- Herbst 1892. In **Castans Panoptikum** (echt; obere Räume des Pschorr-Hauses, Ecke Friedrich-/Behrenstraße, gegenüber dem Südausgang der Kaisergalerie) steht morgens eine echte Leiche zwischen den Figuren.
- Viertel: um Kaisergalerie, Unter den Linden, Friedrichstraße, Bahnhof Friedrichstraße.
- **Entscheidung des Nutzers (Nov. 2026):** Der Fall spielt im echten Castans Panoptikum (statt eines erfundenen Kabinetts – an dieser Stelle gab es schon zwei echte, siehe Quellen). Folgen:
  - Das Haus ist echt, **alle handelnden Personen darin sind erfunden** (Angestellte). Die Brüder Castan als Inhaber höchstens erwähnt, nie verdächtig oder Täter. Echte Personen nie als Täter.
  - Die Verbrecher-Abteilung ist die belegte **Schreckenskammer** (Baedeker 1891: Zuschlag 30 Pf.; Führer um 1900: III. Etage mit Verbrecherköpfen, Richtschwertern, Folterwerkzeugen – Stockwerk für 1892 noch prüfen).
  - Öffnungszeit 1891: täglich 9–10 Uhr (Baedeker) → Leiche wird vor 9 Uhr vom Personal gefunden.
  - Der Hinweis „Handlungen und Personen können erfunden sein“ deckt den erfundenen Mord im echten Haus.
  - Noch offen: hatte Castans Haus eine eigene Werkstatt im Gebäude? Wer leitete den Betrieb 1892? (Nicht raten.)
- Verworfene Ideen (für spätere Fälle): Reichstagsbaustelle Königsplatz, Cholera-Probe Sept. 1892, Lilienthal in Südende.
- **Entscheidungen (Rückfragen):**
  - Anlass: Sigerson folgt einer Spur von Moriartys Bande nach Berlin (roter Faden über mehrere Fälle). Fall 1 hat ein eigenes Motiv; nur ein Fundstück am Ende verrät die Bande → Aufhänger für Fall 2.
  - Einstieg: Sigerson ist frühmorgens zufällig vor dem Kabinett; der junge Schutzmann lässt den „Norweger“ helfen.
  - Opfer: ein Wachsbildner des Hauses. Motiv: Fälschung – Wachsabdrücke von Schlüsseln für einen geplanten Einbruch bei einem erfundenen Juwelier in der Kaisergalerie.
  - 3 Verdächtige; Täter legt Claude im Entwurf fest (Lösung muss fair aus den Hinweisen folgen).
  - Begleiter: junger Schutzmann (erfunden), kennt Holmes' Identität nicht. Gegenspieler: erfundener, skeptischer Kriminalkommissar.
  - Sigerson spricht gutes Deutsch mit leichtem Akzent.
  - Tod andeutend dargestellt (kein Blut/keine Wunden im Detail).
  - Oktober 1892, ein Tag: Fund am Morgen bis Festnahme am Abend unter Gaslicht. Ende: Überführung + Festnahme, dann das Fundstück zur Bande.
  - ~~Kabinett erfunden, ohne Hausnummer~~ → ersetzt durch Castans Panoptikum (siehe oben). Ausstellung: Herrscher/Berühmtheiten (nur 1892 schon bekannte) und Schreckenskammer (dort steht die Leiche).
  - Alle Orte im Viertel (Kabinett, Werkstatt, Wohnung des Opfers, Lokal, Polizeiwache – Lage 1892 prüfen).
  - Erster spielbarer Ort (Version 1): Kabinett innen (Saal + Werkstatt).

### Entwurf Fall 1 (vom Nutzer freigegeben)
- **Datum (vorläufig):** Donnerstag, 13. 10. 1892. Sonne ca. 6.22 / 17.10 Uhr **Berliner Ortszeit** (berechnet nach NOAA-Formeln, gegen heutige Daten geprüft).
- **Figuren (alle erfunden):** Schutzmann Paul Kranich (~24, findet die Leiche auf seinem Rundgang). Kriminalkommissar Gustav Dorn (glaubt an Unfall/Selbstmord wegen Schulden des Opfers). Opfer Emil Wendt, Wachsbildner in Castans Panoptikum.
- **Verdächtige:** Friedrich Lassow (erfundener **Geschäftsführer** von Castans Panoptikum – nicht Inhaber; vom Nutzer bestätigt; Geldsorgen, Lohnstreit; unschuldig, Alibi). Ida Brandt (Kassiererin, Nichte und Erbin; unschuldig, Alibi). **Otto Rehfeld** (Gehilfe) = **Täter**.
- **Tathergang:** Rehfeld goss in Wendts Werkstatt heimlich Schlüssel nach Wachsabdrücken der Schlüssel von *Juwelier Albrecht* (erfunden, Kaisergalerie). Wendt entdeckte es und drohte mit der Polizei; Rehfeld erschlug ihn nachts (nur angedeutet), zog ihm das Kostüm einer Mörderfigur an und stellte ihn in die Verbrecher-Abteilung – sollte wie ein Reklamescherz des Geschäftsführers wirken und die Entdeckung verzögern.
- **Hinweise:**
  1. Die echte Wachsfigur fehlt und liegt in der Werkstatt → jemand mit Schlüssel aus dem Haus.
  2. Dunkles Wachs unter Wendts Fingernägeln, anders als das helle Figurenwachs.
  3. Werkstatt: Wachsplatte mit Abdrücken von Schlüsselbärten, Metallspäne, Gießlöffel.
  4. Frische Brandblase an Rehfelds Hand (im Gespräch).
  5. Lassows Alibi: Kassenabrechnung bis spät, Zeuge im Lokal gegenüber.
  6. Idas Alibi: Wirtin, Haustür nachts verschlossen.
  7. Juwelier: Ladendiener – Schlüssel letzte Woche „kurz verlegt“; Rehfeld war auffällig oft da.
  8. Nachtwächter der Passage hörte nachts Geräusche aus dem Panopticum.
- **Verknüpfungen:** 2 + 3 → Wendt hat das Abdruckwachs entdeckt. 3 + 4 + 7 → Rehfeld hat die Schlüssel gegossen.
- **Auflösung:** Wer? Wie? Warum? – jeweils mit Hinweisen belegen.
- **Tagesablauf:** Morgen: Panopticum, Saal mit Verbrecher-Abteilung + Werkstatt (= Version 1). Vormittag: Gespräche mit den Verdächtigen. Mittag: Kaisergalerie und Juwelier. Nachmittag: Wendts Wohnung (nördlich der Linden, Straße prüfen). Abend unter künstlichem Licht: Sigerson lauert Rehfeld beim Einbruch in der Passage auf, Dorn nimmt ihn fest. Schluss: bei Rehfeld ein Brief aus London mit einem Zeichen von Moriartys Leuten → Fall 2.
- **Bauhinweise:** Uhren zeigen Berliner Ortszeit. Unter den Linden abends elektrische Bogenlampen (Schupmann-Kandelaber, seit 1888), nicht nur Gas. Café Kranzler / Café Bauer an der Ecke Linden/Friedrichstraße nur als Kulisse – dort nichts Erfundenes geschehen lassen. Schutzmann mit Lederhelm mit Spitze und Säbel.

## Offene Punkte
- **Fall 1 – Prüfstand (Nov. 2026):**
  - Laut Baedeker 1891 gab es am geplanten Ort schon zwei echte Panoptiken (Passage-Panoptikum in der Kaisergalerie, Castans Panoptikum gegenüber) → **entschieden: Fall spielt im echten Castans Panoptikum** (siehe oben).
  - Wetter 13. 10. 1892: keine Tageswerte gefunden (Web, Internet Archive) → als erfunden kennzeichnen oder neutral halten.
  - Beleuchtung Friedrichstraße: nicht belegt. Baedeker 1891 nennt elektrisches Licht nur für Unter den Linden (seit 1888) und Leipziger Straße (ab Friedrichstraße westwärts), für die Friedrichstraße nichts.
  - Polizeirevier für die Gegend: nicht gefunden. Belegt: 82 Polizeibureaux, Tag und Nacht offen → Schutzmann kommt „vom nächsten Polizeibureau“, ohne Adresse.
  - Uniformfarbe Schutzmann: nicht belegt (Dunkelblau plausibel, nur Magdeburger Offiziersrock 1851–1900 als Vergleich). Helm mit Spitze und Säbel belegt.
  - Namen gegen Adressbuch 1892 prüfen: nicht möglich – digital.zlb.de sperrt automatische Abrufe und zeigt eine Browserprüfung (nicht umgehen). Nutzer könnte Seiten selbst öffnen.
  - Straßenverlauf und Hausfronten nach Stadtplan/Fotos: offen (Stadtplan 1892 noch nicht gefunden).
- **Schriften:** historisch passende Weltschrift und lesbare Oberflächenschrift, lokal mit freier Lizenz. Widerspricht derzeit `.claude/rules/html.md` („Schriften: System-Schriften“) – Regeländerung erst mit dem Nutzer klären.
- `shaders/basis.vert|frag` aus der Vorlage werden nicht mehr genutzt – löschen nur mit Ja des Nutzers.
- Steuerung noch auf echtem Smartphone testen (bisher nur simulierte Touch-Eingaben).

## Quellen
Je Angabe: Behauptung – Quelle. Erste Recherche (Web, Nov. 2026); vor dem Einbau möglichst mit zeitgenössischer Quelle gegenprüfen.
- Kaisergalerie zwischen Unter den Linden und Friedrichstraße, eröffnet 1873, über 50 Läden/Cafés; Kaiserpanorama dort seit 1883 – entwicklungsstadt.de/geschichte-der-friedrichstrasse-teil-5-revuetheater-und-kaisergalerie/, the-berliner.com/berlin/historic-department-stores-berlins-mostly-vanished-temples-of-consumerism/
- Castans Panopticum 1869–1922; 1888 Umzug ins Pschorr-Haus, Friedrichstraße 165 – berlin.museum-digital.de/pdf/object/121001.pdf
- Stadtbahn Nahverkehr ab 7. 2. 1882, Fernverkehr ab 15. 5. 1882; Bahnhof Friedrichstraße damals „Centralbahnhof Friedrichstraße“ – tip-berlin.de/berlin-besucher/nahverkehr/bahnhof-friedrichstrasse/, structurae.net/de/bauwerke/berliner-stadtbahn
- Polizeipräsident Berlin 1885–1895: Bernhard (Freiherr) von Richthofen – archivportal-d.de/item/DM3VYNO6TLDWJGICFMUYUPPVQHAKYGPU
- Polizeipräsidium Alexanderplatz (Blankenstein), bezogen 1890; Baujahre je Quelle 1885/86–1889/90 – berliner-zeitung.de (Artikel „Rote Burg“), archivportal-d.de
- Alter Dom am Lustgarten stand 1892 noch, Abriss ab Anfang 1893 – berlin.museum-digital.de/pdf/object/116318.pdf
- Reichstagsgebäude: Grundstein 9. 6. 1884, Schlussstein 5. 12. 1894, Architekt Paul Wallot – bundestag.de (Textarchiv 1884-06-06, 1894-12-05). Bismarck-Denkmal am Königsplatz erst 1901.
- Cholera Hamburg 1892: rund 17.000 Erkrankte, ca. 8.600 Tote; Koch am Institut für Infektionskrankheiten Berlin – aerzteblatt.de, edoc.rki.de/bitstream/176904/5189/1/207-261.pdf
- Lilienthal 1892 Flugversuche Südende/Maihöhe bei Steglitz; Foto datiert 7. 8. 1892 – Deutsches Museum, Findbuch NL 334; lilienthal-museum.de
- MEZ im Deutschen Reich erst ab 1. 4. 1893, vorher Ortszeit (Berlin ca. 6,4 min hinter MEZ) – dhm.de/lemo/jahreschronik/1893, berlinstadtservice.de/xinh/Zeit_Berlin.html
- Unter den Linden: 104 elektrische Bogenlampen auf Schupmann-Kandelabern, 1888 aufgestellt (auch Pariser Platz, Opernplatz, Kaiser-Wilhelm-Straße); Gaslaternen dort seit 1826 – en.wikipedia.org/wiki/Ludwig_Schupmann, energie-museum.de (oeffentliche_Beleuchtung.pdf)
- Kaisergalerie: 1869–1873 von Kyllmann & Heyden; Behrenstraße 50–52 / Ecke Friedrichstraße 164 bis Unter den Linden 22–23; Glasdach, Rotunde, Läden, Restaurants, Konzertsaal – sammlung.wienmuseum.at (Objekt 640901), berlin.museum-digital.de/pdf/object/117264.pdf
- Castans Panopticum, Führer um 1900: III. Etage „Schreckenskammer“ (Verbrecherköpfe, Richtschwerter, Folterwerkzeuge), 493 Objekte – berlin.museum-digital.de/pdf/object/121001.pdf
- Ecke Unter den Linden/Friedrichstraße: Café Kranzler, Café Bauer (seit 1878, nur eine Quelle), Café Victoria – berliner-zeitung.de (Artikel 254744), germanhistorydocs.org (Kreuzung um 1900)
- Schutzmannschaft: Lederhelm mit Spitze (Messing/Neusilber-Beschlag), Säbel – deutsche-digitale-bibliothek.de/item/SGZJIIR3EB5JGDOCBBSWG6PZJN3UOZQ2
- **Baedeker, Berlin und Umgebungen, 7. Aufl. 1891** (gemeinfrei, Internet Archive: archive.org/details/berlinundumgebu01firgoog, Volltext …_djvu.txt). Seitenangaben nach dem Buch:
  - S. 60/61: Kaisergalerie, Eingang Unter den Linden 22/23, mündet Ecke Friedrich-/Behrenstraße; erbaut 1869–73 von Kyllmann & Heyden; innen 7,9 m breit, 13,5 m hoch; Terrakotta-Fassaden im Renaissance-Stil; darin Läden, ein Wiener Café, Kaiserpanorama, Passage-Panoptikum.
  - S. 60: Unter den Linden „seit 1888 … abends elektrisch beleuchtet“.
  - S. 46: Passage-Panoptikum (Wachsfiguren, Dioramen, ethnographische Sammlung, Sintflutpanorama), tägl. 10–9 Uhr, Eintritt 50 Pf. Kaiserpanorama (Stereoskopen), 9 Uhr früh bis 10 Uhr abends, 20 Pf.
  - S. 44/107: Castans Panoptikum (Wachsfigurenkabinett) Ecke Behren-/Friedrichstraße, gegenüber dem Südausgang der Kaisergalerie, im Pschorr-Haus (Kayser & v. Großheim), dort seit Ende 1888; tägl. 9–10 Uhr, 50 Pf., Schreckenskammer zusätzlich 30 Pf.
  - S. 107: Von der Ecke Friedrich-/Behrenstraße fahren Pferdebahnen nach Kreuzberg (Linie 14) und zum Görlitzer Bahnhof (Linie 42); Omnibus vom Halleschen Tor durch die ganze Friedrichstraße zur Liesenstraße. Friedrichstraße zwischen Linden und Leipziger Straße Hauptverkehr.
  - S. 110: Leipziger Straße ab Friedrichstraße westwärts abends bis 12 Uhr elektrisch beleuchtet.
  - S. 34: Polizeipräsidium (Frh. v. Richthofen) am Alexanderplatz; 82 Polizeibureaux mit Feuermeldestelle, Tag und Nacht offen; Schutzleute zu Pferde/zu Fuß mit Nummern auf der Achsel; Fremde müssen binnen 6 Tagen vom Wirt polizeilich angemeldet werden.
  - S. 22/23: Droschken 1. und 2. Klasse (je rund 2600), Tarif vom 14. 5. 1880; Kutscher 1. Klasse blauer Rock mit silberner Kragenborte, 2. Klasse gelbe Borte (laut Auswertung; Wortlaut vor Einbau nochmals prüfen).
  - Behrenstraße: Sitz mehrerer der größten Bankhäuser.
- Quellen für die Feinarbeit: Berliner Adressbuch 1892 (ZLB, digital.zlb.de, Bände 1892,1 und 1892,2; gemeinfrei); Straube's illustrierter Führer durch Berlin 1892/93 (ZLB/DDB, gemeinfrei)

## Besonderheiten
- three.js-Zusätze vorerst keine.
- Steuerung über eigene Bibliothek `steuerung-v1`: `ich-steuerung.js` (Laufen/Umsehen, Kollision), `antippen.js` (Hinweise wählen, Fadenkreuz am PC), `kollision.js` (`alsHindernis`), `joystick.js`.
- `main.js` enthält derzeit nur einen grauen Testraum (ohne historische Inhalte); wird durch das Panopticum ersetzt. Lokal stehen `__debug.steuerung` und `__debug.antippen` für Tests bereit.
