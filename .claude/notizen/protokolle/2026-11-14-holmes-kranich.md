# Kranich neu (holmes-berliner-faelle)
Ziel: Schutzmann Kranich bekommt neuen Körper, Ausrüstung und Haltung nach belegter Uniform der Berliner Schutzmannschaft 1892; Kopf, Gesicht, Schnurrbart und Helm (3ae345f) bleiben | Abnahme: Blickpunkt 6 (5,3, 12,8, π) und (2,5, 11,0, π+0,6) + neue Nahblicke Kranich vorn/seitlich/schräg hinten + Gesprächsansicht; Merkmale einzeln gegen Bildquellen abgehakt; Draw-Calls an Blickpunkt 6 nicht höher als vorher; 60 Bilder/s; alsStufe/beweglich/registriere (0,4 m) erhalten, Fleckprüfung; Antippen/Gespräch geht; check.py 0, Rundgang, Firefox durch Nutzer | Nicht dazu: Helm, Kopf, Gesicht, Gesprächstexte | Runden: 0/2 | Sitzung: Aufgabensitzung Kranich neu

## 20:36 Start
- erledigt: Projektnotiz, Verlauf (Kranich, Helm, Stufen, Sichtbarkeit), B1-Protokoll gelesen; personen.js gelesen (Waffenrock-Profil, Beine Zylinder, Stiefel Quader, Säbel links, Arme gerade, Helm aus helm.js)
- Nutzer: nur Körper/Ausrüstung/Haltung; Abnahme entscheide ich; Haltung nach Recherche; 2 Runden
- offen / nächster Schritt: Recherche an Agent `recherche` (Thema holmes-schutzmann-uniform-1892), Draw-Calls vorher messen

## 20:50 Ausgangswerte gemessen, Recherche läuft
- erledigt: Agent `recherche` beauftragt (holmes-schutzmann-uniform-1892: Rock, Hose, Stiefel, Koppel, Säbel, Ausrüstung, Mantel Okt., Haltung, Körper; Bildquellen vorschlagen)
- Messwerte (Stand f80bea6, 736 × 630, Pixeldichte 2): B Kranich 103 / 42 412, B schräg 105 / 25 998, Gruppe nah 64 / 48 958; Bildrate nicht messbar (Pane im Hintergrund, 1 Bild/s)
- Befund vorher (Nahblick 5,3 | 13,4): Rumpf kastenförmig, Arme steif gerade, Beine Zylinder, Stiefel Quader, Säbel steif schräg
- offen / nächster Schritt: Ergebnis Recherche, Bildquellen dem Nutzer vorlegen

## 21:15 Recherche angehalten – Bilder laden
- erledigt: Ergebnisdatei `.claude/notizen/recherche/2026-11-14-holmes-schutzmann-uniform-1892.md` (15 Fundstellen; Hauptquelle Verwaltungsberichte Polizei-Präsidium 1882/1892, ZLB)
- Kern: Rock dunkelblau zweireihig halblang (mittel); Tuchhose dunkel, kurze Stiefel; Säbelkoppel; Säbel mit Portepee; Wildlederhandschuhe; Notpfeife; kein Revolver; Paletot vorhanden (Tragezeit unbelegt); militärische Haltung; Einstellung nur gediente Unteroffiziere (9 Jahre), ≥ 1,70 m → 24 Jahre unwahrscheinlich
- offen / nächster Schritt: 6 Bilder dem Nutzer vorlegen; Alter Kranichs mit Nutzer klären

## 21:25 Bilder geladen, Alter geändert
- erledigt: Nutzer: alle 6 Bilder laden → geladen (12,6 MB, recherche/quellen/holmes-schutzmann-uniform-1892/bilder/01–06, alle gültig); Agent zur Auswertung fortgesetzt
- Nutzer: Alter auf ~28 → holmes-fall1.md Z. 41 geändert (mit Beleg); Gesprächstexte ohne Altersangabe; „junger Schutzmann“ (Z. 27/30) belassen
- offen / nächster Schritt: Bildauswertung abwarten, dann Plan zeigen

## 21:45 Bildauswertung, Plan freigegeben
- erledigt: Agent hat 6 Bilder ausgewertet; selbst 01, 05 und Ausschnitt 03 angesehen (Hand auf Säbelgriff, Kragen/Aufschlag hell, weiße Handschuhe, Säbel unter dem Rockschoß); Fundstellen in holmes-quellen.md (Block „Uniform und Ausrüstung …“), holmes-fall1.md Uniformfarbe aktualisiert
- Nutzer: Haltung linke Hand auf Säbelgriff; Knöpfe silbern; kein Mantel; Plan „Ja, umsetzen“
- Plan: kräftig, aufrecht ~1,78 m; Rock zweireihig 2 × 6 silberne Knöpfe (V-förmig), bis Mitte Oberschenkel, Schoß geschlossen, mittleres Blau; Stehkragen + Aufschlag mit hellem Rand; Achselklappe mit Nummer; Hose dunkelblau gerade über runden Stiefeln; weiße Handschuhe; Koppel unsichtbar; Säbel links unter dem Schoß, Scheide dunkel, Ortband hell, Bügelgriff, Troddel. Technik: ein Vertex-Farben-Material (eigene Instanz) für Tuch + Handschuhe; Knöpfe/Ortband/Bügel aus `stahl`; Messing nur Helm
- Restpunkt (nicht Auftrag): Helm auf Bildern mit Kugelspitze und Schuppenkette
- offen / nächster Schritt: personen.js umbauen

## 22:05 personen.js neu geschrieben
- Dateien: docs/holmes-berliner-faelle/welt/personen.js (alte Fassung: git f80bea6)
- Inhalt: Profil ROCK (Saum 0,66, Brust vor, runde Schultern), ein Vertex-Farben-Material `tuch` (Rock 0x2c4378, Hose 0x262c42, Rand 0xd9d8d0, Handschuh 0xf0eee6, Troddel); Hosenbeine gerade, Stiefel Ellipsoid + Schaft; 2 × 6 Knöpfe (stahl) auseinanderlaufend; Stehkragen + heller Rand; Achselklappe hell gerandet + Nummer; Ärmelaufschlag + heller Streifen; weiße Handschuhe (Handform eingefärbt); linke Hand auf Säbelknauf; Säbel: Griff, Knauf, Bügel, Stichblatt, gebogene Scheide (Tube, flach), Mundblech, Ortband, Troddel; Koppel entfernt (unter dem Rock)
- offen / nächster Schritt: im Browser prüfen (Konsole, Bild, Draw-Calls)

## 22:30 Formkorrekturen (eigene, keine Nutzerrunde), Messung
- erledigt: Taille/Schoß im Profil, Arme schlanker (radien 0,05/0,046/0,04, kugel 0,92), Achselklappe flacher/schmaler, Stiefel ein Ellipsoid (halb im Boden, Spitze tiefer)
- Messwerte (736 × 630, Pixeldichte 2, Standard-fov 70): B Kranich 103 → 102 / 43 812, B schräg 105 → 104 / 26 498, Gruppe nah 64 / 48 958 (gleich); 60,3 Bilder/s; Konsole nur „Lichtkarte aktiv (77bcb35e)“
- Nahblicke festgelegt: vorn (5,3 | 12,6 → Kranich), seitlich (8,2 | 15,6), schräg hinten (3,6 | 17,8); jeweils fov 50, Ausschnitt 0,22 nach unten
- offen / nächster Schritt: Fleckprüfung, Gespräch, Bilder an den Nutzer

## 22:55 Fleckprüfung bestanden
- Befund: 1–3 Kerne am inneren Ende der Achselklappe; Ursache: `rumpfPunkt` liefert sparsam Punkte der groben Fläche → starre Klappe verrutschte zwischen den Stufen. Lösung: Lage mit `vollStufe(() => rumpfPunkt(…))`, Klappe kürzer (0,085), 11 mm angehoben, Rand schmaler
- Messwerte: Fleckprüfung Einheit 39 (Kranich) Richtung π ±0,6, 0 ±0,9, ±π/2: 0 Kerne in allen 8 Blicken
- Dateien: .claude/scripts/holmes_pruefhilfen.js (+ `kranich(name)`, KRANICH_NAH)
- offen / nächster Schritt: Gespräch/Antippen, Draw-Calls nachmessen, Bilder an den Nutzer

## 23:10 Stiefel, Gespräch, Bilder an den Nutzer
- erledigt: Stiefel aus Vorfuß + Ferse (2 Ellipsoide); Fleckprüfung wieder 0 (8 Blicke); Gespräch geprüft (Antippen öffnet Dialog, Kranich dreht sich, Beenden schließt); Draw-Calls nach Gespräch 102 / 104 (bei gleichem Ablauf)
- Merkmale abgehakt (gegen Bilder 01/03/05): zweireihig 2 × 6 silberne Knöpfe ✓, Länge Mitte Oberschenkel ✓, Stehkragen mit hellem Rand ✓, Aufschlag mit hellem Streifen ✓, Achselklappe mit Nummer ✓, Hose dunkel gerade über Stiefeln ✓, weiße Handschuhe ✓, Koppel unsichtbar ✓, Säbel links, dunkle Scheide, helles Ortband ✓, Hand auf dem Säbelgriff ✓
- Bilder (Scratchpad kranich/1–7) an den Nutzer; Abnahme offen (Runden 0/2)

## 23:25 Selbstkritik, Helm in den Auftrag, Übergabe
- Nutzer fragte nach Schwächen; Liste: Rumpf röhrenförmig/glatt, Schulterkugeln wie Polster (hinten), Arme ohne Ellbogenknick, linke Hand eher vor als auf dem Griff, Beine gerade Röhren + starrer Stand, Handschuhe = eingefärbte Hand (dünn, gespreizt, grell), Achselklappe seitlich als Viereck, Säbel von vorn nur Stab, Rock kräftig blau, Kopf wirkt klein (Kopf bleibt)
- Nutzer: **Helm gehört zur Ausrüstung** → Helm jetzt Teil des Auftrags (Abweichung von „Helm bleibt“ der Hauptsitzung, Entscheidung des Nutzers). Umfang „entscheide du“: Beschläge silbern (Neusilber, wie Knöpfe; Bilder 03/05), Kugel auf der Spitze (01/02), Schuppenkette mit Rosetten (01/02), Vorderplatte als stilisierter Namenszug-Schild (silbern, keine echte Nachbildung)
- Nutzer: Helm „in derselben Sitzung wie die Korrekturrunde“ → Korrekturrunde 1/2 = meine Hauptpunkte (Handschuhe, Ellbogenknick, Hand auf dem Griff, lockere Beinstellung) + Helm
- Sitzung zu lang (7,3 MB) → Übergabe an neue Aufgabensitzung vorgeschlagen; Stand: personen.js fertig für Runde 0 (nicht committet), Fleckprüfung 0, Draw-Calls 102/104, Gespräch ok; Rundgang, check.py, Firefox offen
- Runden: 1/2 (begonnen)

## 23:35 Fragerunde Korrekturrunde 1 (Nutzer)
- Umfang Runde 1 (alles vom Nutzer gewählt): Ellbogenknick; linke Hand wirklich auf dem Säbelgriff; lockere Beinstellung (Gewicht auf einem Bein); Rumpf lebendiger (Überlappung vorn, leichte Falten Taille/Schoß); Handschuhe voller, Weiß weniger grell; Schultern weicher (keine Polsterkugeln); Achselklappe dezenter (seitlich kein Viereck); Beine mit Knie/Verjüngung; Säbel sichtbarer (Scheide breiter, Troddel deutlicher); Rockfarbe gedämpfter; **Kopf etwas größer** (vorher ausgeklammert, jetzt gewünscht; Helm wächst über helm.js mit)
- Helm: Beschläge silbern, Kugel auf der Spitze, Schuppenkette mit Rosetten, Namenszug-Schild; dazu Auftrag des Nutzers: **originale Pickelhaube als Vorlage nehmen und analysieren, was noch getan werden könnte** → Analyse dem Nutzer vorlegen, bevor gebaut wird
- offen / nächster Schritt: neue Aufgabensitzung (Karte aktualisiert)

## 21:40 Neue Aufgabensitzung: Runde 1 begonnen
- erledigt: Protokoll, Notiz, Quellen, Ergebnisdatei gelesen; Agent `recherche` (holmes-schutzmann-helm-1892) für Helm-Bildquellen beauftragt
- Körper umgebaut (personen.js): Beine als Röhre mit Knie/Verjüngung, rechtes Standbein, linkes entlastet (Knie vor, Fuß vor/außen); Arme mit Ellbogenknick, linke Hand flach auf dem Knauf (Finger über den Bügel); Handschuh eigene Form (geschlossene Finger, Handgelenk), 0xd4cfc1; Schulterkugel 0,8, Schulter 0,176/1,495; Achselklappe ohne hellen Rand (0x243250); Rock 0x2b3b5e; Kopf × 1,08 (Helm mit); Scheide breiter (0,019, flach 0,74), Troddel mit Knoten und größerer Quaste; Rockkante (Überlappung) und Taillennaht über neue Funktion `aufnaht`, Schoßfalten über neue Option `falten` von `oberkoerper` (menschen.js, rückwärtsverträglich)
- Messwerte (8001, 736 × 630, Pixeldichte 2): B Kranich 102 / 45 530, B schräg 104 / 27 570
- 21:34 Nutzer: alle 5 Helm-Bilder laden → geladen (recherche/quellen/holmes-schutzmann-helm-1892/bilder/01–05; 04 nur Vorschau 156 × 150); Agent wertet aus
- offen / nächster Schritt: Nahblicke prüfen, Feinkorrektur, Fleckprüfung; Helm-Analyse vorlegen

## 21:55 Körper-Feinkorrektur, Helm-Analyse entschieden
- erledigt: Schultern: Schulterpunkt 0,168/1,49, Schulterkugel flach (0,053 × 0,03 × 0,055) deckt Ärmelende → keine Polster mehr (hinten geprüft); Profil 1,45–1,535 etwas breiter; Handschuhe schlanker; Nummer kleiner
- Agent: 5 Helm-Bilder ausgewertet (Ergebnisdatei `.claude/notizen/recherche/2026-11-14-holmes-schutzmann-helm-1892.md`); selbst Bild 01 angesehen
- Befund KRANICH_NAH.hinten (3,6 | 17,8): Kamera wird auf x 4,4 geschoben (Hindernis) → Nahblick hinten neu: (5,9 | 17,5)
- Nutzer (Helm, alles gewählt): Glocke höher (Seiten fast senkrecht, runde Kuppel), Vorderschirm länger/steil mit Metallrand, Nackenschirm kurz und spitz, Spitze hoch/schlank (Zwiebelfuß gerippt, Ringe, Kugel), Kreuzblatt-Sockel mit Nieten, Adler-Umriss vorn (stilisiert, mit kleinem Schild), Kokarde rechts, Nackenschiene; dazu wie geplant silbern, Schuppenkette mit Rosetten
- offen / nächster Schritt: helm.js umbauen

## 22:25 Helm neu, Runde 1 fertig zur Abnahme
- Dateien: docs/holmes-berliner-faelle/welt/helm.js (baueHelm(k, leder, metall)), personen.js (Helm mit `stahl`, Messing-Material entfernt), .claude/scripts/holmes_pruefhilfen.js (KRANICH_NAH.hinten 5,9 | 17,5)
- Helm: Glocke 4,5 cm über Scheitel, Seiten über der breitesten Stelle fast senkrecht, runde Kuppel; Vorderschirm 4,6 cm, Neigung 0,4, eckig, Metallrand (Rohr); Nackenschirm kurz und spitz; Spitze als Drehkörper (Ring, gerippter Zwiebelfuß, Dorn) + Kugel; Kreuzblatt (Fuß, 4 Arme, Nieten); Nackenschiene; Adler-Umriss (Sternform) + Brustschild; Schuppenkette 27 Schuppen; Rosetten, rechts Kokarde (leder/metall-Ringe)
- Befund: Vorderschirm nach Original-Neigung (0,62) verdeckte die Augen → 0,4; Fleckprüfung zuerst 6–21 Kerne am Helm (Kette/Adler sparsam gröber) → Kette und Adler in beiden Stufen gleich fein → 0
- Messwerte (frisch geladen, 736 × 630, Pixeldichte 2): B Kranich 101 / 50 434, B schräg 103 / 29 582 (Ziel ≤ 102/104); 60 Bilder/s; Fleckprüfung Einheit 39: 0 Kerne in allen 8 Blicken; Gespräch: Antippen öffnet, Kranich dreht sich (π → 2,54), Beenden schließt
- Bilder: Scratchpad kranich-r1/1–8 an den Nutzer
- offen / nächster Schritt: Abnahme Runde 1 durch den Nutzer; danach höchstens Runde 2

## 22:40 Dritte Aufgabensitzung: Abnahme Runde 1
- erledigt: /auftrag; Ziel, Abnahme, Runden 1/2 aus diesem Protokoll übernommen (Abnahme-Zahlen laut Auftrag: ≤ 102/104, 60 Bilder/s, Fleckprüfung 0 in 8 Blicken, Gespräch, check.py 0, Rundgang 1–8, Firefox)
- offen / nächster Schritt: Bilder Runde 1 neu aufnehmen (Scratchpad der alten Sitzung weg), dem Nutzer vorlegen

## 22:55 Bilder Runde 1 neu, an den Nutzer
- erledigt: Vorschau 8000, Prüfhilfen eingefügt; Bilder per Canvas → kleiner Empfänger im Scratchpad (bildempfang.py, Port 8766): Scratchpad kranich-r1/ 1-vorn, 1-seitlich, 1-hinten, 2-kopf-vorn, 2-kopf-schraeg, 3-bp6-kranich, 3-bp6-schraeg, 4-gespraech
- Gespräch: Antippen öffnet Dialog, „Danke, Schutzmann.“ schließt
- Hinweis: Draw-Calls direkt nach den Nahblicken 93 / 98 (nicht vergleichbar, frisch geladen nachmessen)
- offen / nächster Schritt: Abnahme Runde 1 durch den Nutzer

## 23:05 Runde 2/2 festgelegt
- Nutzer fragte nach Schwächen; Liste (10 Punkte) genannt
- Nutzer: **Draw-Calls zählen nicht, nur die Bildrate** (fest, in Projektnotiz eingetragen) → Abnahme-Grenze 102/104 entfällt
- Umfang Runde 2 (alles vom Nutzer gewählt): Säbel nicht mehr wie Spazierstock (schräg nach hinten unter dem Schoß, Hand flacher auf dem Griff); Achselklappen flach auf der Schulter; linker Arm von hinten sichtbar/natürlich; Schirmrand bündig; Adler plastischer (Flügel, Kopf, Schild); Schuppenkette flache überlappende Schuppen; Wangen rund; Handschuhe mit Fingern/Daumen; Rumpf/Rücken geformt, Saum weniger steif; keine Schulterstufe von vorn; Stand-/Spielbein von vorn erkennbar, Stiefel größer/höher
- Runden: 2/2 (letzte)
- offen / nächster Schritt: Code lesen, Plan zeigen

## 23:15 Plan Runde 2 freigegeben
- Plan (Nutzer: Ja): 1 Säbel seitlich an der Hüfte, Griff nach vorn oben, Scheide schräg nach hinten unter dem Schoß; 2 linke Hand flach auf dem Griff; 3 linker Arm weiter außen (von hinten sichtbar); 4 Achselklappen als `aufnaht` auf der Schulter, Nummer hell; 5 Schirmrand bündig; 6 Adler erhaben (Kopf/Krone, Flügel mit Federstufen, Schwanz, Brustschild); 7 Schuppen flach, dachziegelartig; 8 Wangen: Kieferwinkel/Ohrbuckel weicher nur für Kranich (neue Option in kopf()); 9 Handschuhe mit 4 Fingern + Daumen; 10 Brust/Schulterblätter, Saum wellig/hinten länger; 11 Schulter ohne Stufe; 12 Spielbein deutlicher, Stiefel größer mit Schaft
- offen / nächster Schritt: umsetzen (personen.js, helm.js, menschen.js)

## 23:55 Runde 2 umgesetzt, Bilder an den Nutzer
- Dateien: personen.js (Säbel neu: MUND/GRIFF/SCHEIDE, Griff nach vorn oben, Stichblatt, Bügel unten, Scheide schräg nach hinten außen, Troddel vom Bügel; linke Hand flach auf dem Griff, Ellbogen 0,275 außen; Handschuh mit 4 Fingern à 2 Glieder + Daumen, beide Stufen gleich; Achselklappen als `aufnaht`, Nummer hell mit `vollStufe`; Schultern im Profil breiter 1,37–1,535, Ärmel oben 0,047, Schulterkugel weiter innen; Spielbein Knie 0,13|0,5|0,09, Fuß 0,155|0|0,11; Stiefel größer + Schaft, Hose endet bei 0,12; Kopf `merkmale: { weich: 1 }`), menschen.js (Merkmal `weich`: Kieferwinkel/Ohransatz flacher; `falten.ruecken` Schulterblätter/Rückenrinne, `falten.saum` hinten tiefer/gewellt – beides nur Kranich), helm.js (Vorderschirm 24 Spalten in beiden Stufen, Rand genau durch die Kantenpunkte; Adler gewölbt 96 Spalten mit Federzacken, Schild erhöht; 33 flache gekippte Schuppen)
- Befund: Fleckprüfung zuerst 1/3 Kerne von schräg hinten = helle Klappennummer an der Schulterkante → Nummer in beiden Stufen auf der glatten Fläche → 0
- Messwerte: Fleckprüfung Einheit 39: 0 Kerne in allen 8 Blicken; 60,3 Bilder/s (B Kranich); Gespräch: öffnet, „Danke, Schutzmann.“ schließt; Konsole ohne Fehler
- Bilder: Scratchpad kranich-r2/ (1-vorn, 1-seitlich, 1-hinten, 2-kopf-vorn, 2-kopf-schraeg, 3-bp6-kranich, 3-bp6-schraeg, 4-gespraech, 5-saebel)
- offen / nächster Schritt: Abnahme Runde 2; danach Restfehler notieren, check.py, Rundgang, Firefox

## 00:10 Helm gegen Originalbilder verglichen (Nutzer fragte nach)
- erledigt: Bilder 01/02 (DHM 1881/90) und Aufnahmen aus gleichem Blickwinkel nebeneinander (Scratchpad helmvergleich/vergleich-01, -02; Kamera 1,5 m, fov 16, 62° bzw. 42° von vorn rechts)
- Befund: Adler viel zu klein (Original ~45 % der sichtbaren Breite, von Kreuzblatt bis Kette; Flügel nach oben gefächert, Kopf seitlich, Krone, Namenszug) – unserer ~25 %, zu hoch, Flügel waagerecht; Schuppenkette: Original breites Band (~1/6 Glockenhöhe) aus großen flachen Schuppen – unsere kleine Perlen; Spitze: Original höher (~0,8 × Glockenhöhe), schmaler Hals, gerippter Zwiebel direkt am Hals, langer Kegel – unsere kürzer, Zwiebel klobig; Kreuzblatt: Original breite gerundete Arme – unsere dünne Stäbe; Vorderschirm im Original länger/steiler (bewusst gekürzt, Augen)
- offen / nächster Schritt: Nutzer entscheidet: Ausnahme-Runde Helm oder Restfehler

## 00:35 Helm nach Original (Ausnahme-Runde, Nutzer: „Auch Schirm länger“)
- Dateien: helm.js – Adler größer (0,9 × r quer, 0,42 × r hoch, Mitte u 0,52), Flügel nach oben gefächert (neues ADLER-Profil), Wölbung 8 mm, Brustschild größer; Schuppenband: 35 Schuppen 2,1 × 1,5 cm, flach, Kippung 0,12, Kette 1,6 cm über Unterkante; Spitze nach Original (schmaler Hals + Ring, kräftige gerippte Verdickung, langer Kegel mit 6 Rippen, 11,5 cm + Kugel); Kreuzblatt breiter (0,017) und länger; Vorderschirm 5,6 cm, Neigung 0,58
- Befund: Fotos sind frontaler als geschätzt (Adler fast mittig) → Vergleich bei 32° (Bild 01) und 25° (Bild 02); Fleckprüfung 0 in 8 Blicken
- Befund: mit dem längeren Schirm sind die Augen aus Spielerhöhe (1,65 m) verdeckt
- Bilder: Scratchpad helmvergleich/vergleich-01, vergleich-02, 2-kopf-vorn
- offen / nächster Schritt: Nutzer entscheidet Schirm (Augen) und Abnahme

## 01:20 Helm nach Berliner Darstellungen (Nutzer: Namenszug, niedrige Spitze, Kette zum Kinn, Schirm über den Brauen)
- Quellen ausgewertet: Berlin 1892 Namenszug (Allers 1889, Gartenlaube 1891); Adler mit Band erst ab 1898; niedrige Spitze mit Perlring/Kugel (Allers 1889, Berliner Helm 1898 Forum/Stadtmuseum); Kinnriemen 1898 Metall/Leder, Schuppenkette nur auf Bildern → Nutzer: angelegt zum Kinn
- Dateien: helm.js – Adler entfernt, Namenszug (Schnörkel als Metallrohre) mit Krone; Spitze niedrig (Fuß, Perlring 14 Kugeln, 8 Rippen, Kugel); Helm höher (yStirn 0,26 × Höhe), Vorderschirm VORN [0, 1.15, 0.05, 0.45, 0.3] → Augen frei; Kette von den Rosetten an den Wangen entlang unter das Kinn
- Vergleich mit Seitenansicht Berlin 1898 (helm/04): Kreuzblatt-Arme standen vorn ab (gerade Körper auf gewölbter Kuppel) → als anliegende Streifen neu (breit 1,6 cm, rund auslaufend, Niete); Nackenschirm war lange spitze Klinge → steil und rund (HINTEN [π, 1.25, 0.045, 1.5, 1])
- Messwerte: Fleckprüfung Einheit 39: 0 Kerne in 8 Blicken; 60 Bilder/s (Blickpunkt 6); Konsole ohne Fehler (nur ERR_EMPTY_RESPONSE vom eigenen Bildempfänger)
- Bilder: Scratchpad helmvergleich/v-seite2.jpg (Original | Aufnahme), m-neu2.jpg (vorn, 32°, hinten, oben)
- Restunterschiede: Original-Kinnriemen Leder (bewusst Kette), Hinterkopf unter dem Helm hautfarben (Kopf bleibt)
- offen / nächster Schritt: Nutzer nimmt Helm ab → check.py, Rundgang, Gespräch, Firefox, /abschluss

## 01:50 Helm: alle 7 Schwachstellen (Nutzer: „Alle Punkte“, weitere Ausnahme-Runde Helm)
- Dateien: helm.js – Glocke kompakter (yTop Scheitel + 2,8 cm statt 4,5; Kuppel ab yMax − 6 cm; Seiten 7 % eingezogen); Vorderschirm kürzer/steiler/runder VORN [0, 1.15, 0.042, 0.62, 0.55]; Nackenschirm [π, 1.1, 0.034, 1.2, 1] mit Metallrand (beide Ränder fest 24/18 Spalten); Nackenhaar-Schale (Haarmaterial, optionaler 4. Parameter `haar`); Spitze nach Seitenansicht 1898: Fuß + Perlring, Kragen mit 4 Luftlöchern (je Seite eins, zwei wirkten wie Augen), gerippte Zwiebel, Hals, Knopf; Namenszug kräftiger (Rohr 2,7–3,6 mm) und größer, Krone mit Perlen und Reichsapfel; Kreuzblatt-Arm vorn kürzer (u ≤ 0,17, sonst in der Krone); Kette: Schuppen dichter (6,2 mm), flacher, Kippung 0,28, Lederband darunter; Rosetten kleiner (Kokarde 1,7 cm) mit Haken
- personen.js: eigenes Material `silber` für die Helmbeschläge (0xc9d0d8, Rauheit 0,08, envMapIntensity 1,25), Aufruf `baueHelm(kMess, leder, silber, haar)`
- Messwerte: Fleckprüfung Einheit 39: 0 Kerne in 8 Blicken; 60,3 Bilder/s; Konsole fehlerfrei (außer ERR_EMPTY_RESPONSE vom Bildempfänger)
- Bilder: Scratchpad helmvergleich/v-seite4.jpg, m-neu4.jpg (vorn, 32°, hinten, oben, Spielerblick 1,6 m)
- offen / nächster Schritt: Abnahme durch Nutzer; Silberglanz in Firefox prüfen lassen

## 02:40 Runde 3 Körper (Nutzer: „Punkte 1–3“ – Beine/Hose, Haltung, Ärmelaufschlag; über 2/2 hinaus)
- Dateien: personen.js – `hosenbein(…, falten)`: Querfalten Kniekehle, Zugfalten vorn Oberschenkel, Stauchung über dem Stiefel (schräge Ringe), Innenseite dunkler, Täler dunkler (userData.farbe); volle Stufe 16 × 44 Teilungen, sparsam ohne Falten; Standbein rechts schräg unter dem Körper (Fuß x −0,074), Spielbeinhüfte 2 cm tiefer, Spielbein Knie [0.125, 0.49, 0.115], Fuß [0.19, 0, 0.125]
- Haltung: rechte Hand vor der Brust zwischen den Knopfreihen (Gartenlaube 1891, Künstlerpose): Handgelenk [−0,149 | 1,26 | 0,148], Finger nach innen, Daumen oben, Ellbogen [−0,345 | 1,302 | −0,04]
- Ärmelpatte (Gruppenfoto 1899, Gartenlaube 1891): Leiste 2 × 7 cm (Klappenfarbe) über dem hellen Aufschlagrand, 2 kleine Knöpfe, Seite des Handrückens
- Fleck: zuerst 13–42 Kerne von vorn/hinten/Seite – Ursache: Umriss des stark angewinkelten rechten Ellbogens (gröberer Ärmel in der sparsamen Stufe) → Arme per `vollStufe(() => arm(…))` in beiden Stufen gleich; Aufschlag/Streifen fest 12 Teilungen
- Messwerte: Fleckprüfung Einheit 39: 0 Kerne in 8 Blicken; 60 Bilder/s; Konsole fehlerfrei (außer Bildempfänger)
- Bilder: Scratchpad helmvergleich/kranich-runde3.jpg (ganz vorn/35°/Seite/hinten, Hand, Ärmel, Stiefel, Knie)
- Befund: Falten im flachen Licht dezent (am deutlichsten die Stauchung), Finger der rechten Hand liegen sichtbar auf der Brust (eingesteckt würde in der sparsamen Stufe flecken)
- offen / nächster Schritt: Abnahme Helm + Körper durch Nutzer → check.py, Rundgang, Gespräch, Firefox, /abschluss

## 03:20 Runde 4 nach PHS-Figur 1898 (Nutzer: „Alle Punkte“; Vergleich v-phs.jpg)
- Dateien: personen.js – ROCK gerade/schmal bis 0,70 m (Saum halbe Breite 0,186 statt 0,205), Schultern breit und gerade (1,45–1,535: 0,216/0,216/0,207); Taillennaht kaum sichtbar (0,9); Knopf-V dx = 0,045 + 0,088·(i/5)^1,15, Rockkante mitgezogen; Hose weit (0,08 … 0,065 … 0,07) bis 0,075 m über dem Stiefel, Farbe 0x1b1f2d; Ärmel weiter (Radien 0,055/0,052/0,049), Schultern x ±0,186 y 1,5, Schulterkugel 0,062/0,034/0,062; Kragen mit hellen Litzen vorn (je Seite 2 Streifen 3 × 0,65 cm, fest gebaut); Aufschlag zweiter heller Streifen (breites Band)
- helm.js: Abstand Glocke–Kopf 0,016 statt 0,009 (breiter); Kette näher am Gesicht (quer 0,86/0,8/0,76)
- Messwerte: Fleckprüfung Einheit 39: 0 Kerne in 8 Blicken; Bildschleife des Browsers gedrosselt (rAF 1/s, Fenster im Hintergrund) – Bildzeit gemessen 4,9 ms (20 Bilder, Blickpunkt 6: 104 Aufrufe, 64 392 Dreiecke) → Bildrate beim Rundgang neu messen
- Bilder: Scratchpad helmvergleich/v-phs2.jpg (PHS | Kranich), w-rest.jpg
- offen / nächster Schritt: Abnahme durch Nutzer → check.py, Rundgang mit Bildrate, Gespräch, Firefox, /abschluss

## 03:50 Runde 5 nach PHS-Figur 1898 (Nutzer: „alle Punkte“; neu: keine Rundengrenze, Auftrag endet, wenn Kranich gelungen ist)
- Dateien: personen.js – ROCK kaum tailliert (0,92–1,13: 0,189/0,188/0,191), Saum vorn tiefer (0,16) – der vorgestellte linke Oberschenkel drückte durch den Rock (Saum wirkte schräg), Spielbein-Knie z 0,085, Fuß [0.185, 0, 0.11]; Knöpfe kleiner (0,0088) und matt silbergrau (eigenes Material `knopfMat`, auch Ärmelpatte); Kragen höher (1,605–1,665, Rand 1,662, Litzen 1,626/1,645); Schulteransatz x ±0,172 y 1,505, Schulterkugel flacher (0,058/0,03/0,06), linker Ellbogen dichter am Rumpf [0.258, 1.225, −0.07]
- helm.js: Unterkante hinten tiefer (yNacken 0,76 × Höhe), seitlich tiefer (Exponent 0,95 statt 1,2)
- Projektnotiz: Auftragszeile „Runden: keine Grenze … bis gelungen (Nutzer)“
- Messwerte: Fleckprüfung Einheit 39: 0 Kerne in 8 Blicken; 60 Bilder/s; Konsole fehlerfrei (außer Bildempfänger)
- Bilder: Scratchpad helmvergleich/v-phs4.jpg (PHS | Kranich), t-rest.jpg (Saum, 60°, Kopf vorn, Kopf seitlich)
- offen / nächster Schritt: Urteil des Nutzers

## 04:10 Runde 6 Schultern gerade (Nutzer: „die Schultern sind noch nicht gerade“)
- Dateien: personen.js – ROCK oben neu: 1,5: 0,218 | 1,54: 0,215 | 1,565: 0,2 | 1,585: 0,168 | 1,6: 0,12 | 1,612: 0,068 (Schulterlinie fällt vom Kragen zur Kante nur ~5 cm statt ~11); Achselklappen 1,535–1,604, Nummer 1,562–1,582; Ärmelansatz [±0,178 | 1,53 | 0], linker Ellbogen y 1,245
- Messwerte: Fleckprüfung Einheit 39: 0 Kerne in 8 Blicken; 60,3 Bilder/s
- Bilder: Scratchpad helmvergleich/v-phs5.jpg (PHS | Kranich), s-rest.jpg (Schultern vorn, hinten, Seite)
- offen / nächster Schritt: Urteil des Nutzers

## 04:30 Monogramm WR (Nutzer: „auf dem Helm sollte ein Monogramm zu sehen sein“ → Bilder im Recherche-Ordner ansehen → „Ja, WR wie Bild 03“)
- Quellen angesehen: DHM U 545 (um 1900) und U 5750 (1881/90): verschlungenes Schreibschrift-Monogramm unter Krone auf der Adlerbrust, gelesen als „WR“; Allers 1889: Krone mit Schnörkeln, Buchstaben nicht lesbar; Gartenlaube zu klein. Ausschnitte: Scratchpad helmvergleich/monogramm-quellen.jpg
- Dateien: helm.js – Schnörkel-Namenszug ersetzt durch WR (W aus zwei Schlaufen-V mit eingerollten Enden und Mittelschlaufe, R mit Stamm, Bauch, Bein; Rohre 2,2–3 mm, Fläche th ±0,42, u 0,36–0,86), Krone unverändert; Hilfsfunktion `spirale` entfernt
- holmes-quellen.md: Helm-Eintrag (WR = Deutung, für Berlin 1892 nicht belegt)
- Messwerte: Fleckprüfung 0 Kerne in 8 Blicken; 60,3 Bilder/s
- Bilder: Scratchpad helmvergleich/m-wr.jpg (Helm vorn, 30°, Spielerblick)
- offen / nächster Schritt: Urteil des Nutzers

## 05:10 Monogramm überarbeitet (Nutzer: „das geht noch besser“, dann „das richtige Monogramm sieht man auf Bild 01 Gartenlaube und 02 Allers“, „achte vor allem auf die Größe“)
- Zwischenstand (verworfen): feineres, spiegelgleiches WR nach DHM 03 – zu klein gegenüber Bild 01/02
- Bild 01 (Gartenlaube 1891): großes W in Schreibschrift mit Schwung nach rechts, füllt die Front vom Spitzenfuß fast bis zum Schirm; Bild 02 (Allers 1889): Krone direkt unter der Spitze, breites Schnörkelband weit zur Seite
- Dateien: helm.js – Monogrammfläche th ±0,8 (vorher ±0,42), u 0,36–0,86; Rohre 2,4–2,7 mm; W-Mittelspitze höher (y 0,14); einzelnes R im rechten Bogen; Krone direkt unter dem Spitzenfuß (KU 0,285), 1,7-fach breiter; MZ entfernt
- Messwerte: Fleckprüfung 0 Kerne in 8 Blicken; 60,6 Bilder/s
- Bilder: Scratchpad helmvergleich/m5-montage.jpg (Bild 01 | Bild 02 | vorn | Dreiviertel | Spielerblick)
- offen / nächster Schritt: Urteil des Nutzers

## 05:40 Helm glänzend (Nutzer: „passt noch nicht“ zum Monogramm – Vorlage 01 oder 02 offen; „der Helm sollte glänzen und Spiegelungen haben“)
- Material: Glocke Leder (Baedeker 1891, DHM) – Lack nicht belegt; Beschläge silbern (Berlin 1898) vs. Gelbmetall (DHM 1881/90), wie bisher silbern
- Dateien: personen.js – eigenes `lackLeder` (MeshPhysicalMaterial, Farbe 0x050506, Rauheit 0,9, Klarlack 1 / 0,02, envMapIntensity 2) statt Stiefelleder
- Versuche: 0,32/2,2 milchig braun; 0,55/0,9 schwarz, kaum Spiegelung; jetzt echte Spiegelungen sichtbar, aber Raum A (Aufnahmepunkt der Umgebung) beige → wirkt bräunlich
- Messwerte: Renderzeit 0,6 ms/Bild (Bildrate gedrosselt, Fenster im Hintergrund)
- Bilder: Scratchpad helmvergleich/g3-montage.jpg
- offen: eigene Umgebungsaufnahme in Raum B am Kopf (Vorschlag), Monogramm-Vorlage, Urteil

## 06:20 Spiegelung Raum B, Silber, Monogramm-Bänder (Nutzer: „entscheide du“, „auch das Silber sollte spiegeln“, „zusätzliche Effekte aber bitte nur in der höchsten LOD-Stufe“)
- Entscheidung Claude: eigene Spiegelung Raum B; Monogramm-Vorlage Bild 01 (Gartenlaube, breite Bänder)
- Dateien: licht.js – erzeugeUmgebung(…, wurzel, nur); main.js – zweite Aufnahme bei (5,3 | 1,85 | 15,6), Kranich dabei ausgeblendet, nur Materialien mit `userData.eigeneSpiegelung`; personen.js – volle Stufe: Lackleder (Physical, Klarlack, envMapIntensity 1,2; 1,4 gab 2 Kerne hinten) + Helmsilber 0x9aa3ad/0,04/1; sparsame Stufe: einfache Standard-Materialien gleicher Grundfarbe (Leder 0x040405/0,2/1,4), Spiegelung Raum A; helm.js – Monogramm als Bänder (BAND 4,2 mm, BAND_AUS 1,2 mm)
- Messwerte: Fleckprüfung 0 Kerne in 8 Blicken (vorher mit Stiefelleder in der sparsamen Stufe 58–94); 60,3 Bilder/s
- Bilder: Scratchpad helmvergleich/g6-montage.jpg
- offen: Urteil; Monogramm liest sich noch halb als „VR“

## 06:50 Materialien Kranich (Nutzer: „Welche Materialien … verbessert werden?“ → „Alle Punkte“)
- Dateien: neu welt/stoffstruktur.js (Lambert-Erweiterung ohne UV: Wolken ±13 %, Köper ~1,5 mm mit fwidth-Ausblendung, Flaum an Kanten +45 %); personen.js – Materialsätze je Stufe (`m` = matVoll | matSpar, gewählt am Anfang von baueKoerper, gilt auch für vollStufe-Teile): voll = Tuch mit Struktur, Leder/Stahl/Knöpfe als Klone mit `eigeneSpiegelung` (Raum B); Leder neu schwarz blank (0x0b0b0c, 0,22, 1,1; Glanz = Annahme)
- Messwerte: Fleckprüfung 0 Kerne in 8 Blicken; 60 Bilder/s; check.py 0 Fehler
- Bilder: Scratchpad helmvergleich/mat3-montage.jpg (ganz, Rumpf, Seite, Hand)
- offen: Urteil Nutzer (Helm + Materialien); Monogramm „VR“-Lesart

## 07:10 Monogramm lesbar (Nutzer: „liest sich weiterhin halb als VR“)
- Dateien: helm.js – W links (X −1 … 0,4, Mittelspitze bis Y 0,1, Enden oben eingerollt), R rechts daneben (X 0,4 … 1), nur rechter W-Arm berührt R; Zierschlaufen unten entfernt
- Messwerte: Fleckprüfung 0 Kerne in 8 Blicken; Bildrate gedrosselt (1,2, Fenster im Hintergrund) → Renderzeit 2,0 ms/Bild; check.py 0 Fehler
- Bilder: Scratchpad helmvergleich/wr-montage.jpg
- offen: Urteil Nutzer

## 07:30 Monogramm schwungvoll (Nutzer: „naja, geht so“ → „Ja, schwungvoller“)
- Dateien: helm.js – mg mit Schräglage (x + (0,5 − y)·0,22, Breite 0,72); W und R in einem Zug (Anfangsschlaufe links, Bogen vom letzten W-Aufstrich in den R-Stamm, Fußschlaufe); R-Bauch mit Bein und großem eingerolltem Endschwung; Krone KB 2,1
- Messwerte: Fleckprüfung 0 Kerne in 8 Blicken; Renderzeit 0,83 ms/Bild (Bildrate gedrosselt, im Rundgang messen); check.py 0 Fehler
- Bilder: Scratchpad helmvergleich/sw-montage.jpg
- offen: Urteil Nutzer

## 07:55 Monogramm aus Schwellbändern (Nutzer: „naja, geht so“ → Verfahren überdacht → „Schwellbänder hier“)
- Ursache der vielen Runden: gleich dicke Rohre wirken wie Draht; Schreibschrift braucht dick/dünn
- Dateien: helm.js – `schwellband(pkt, staerke)`: Mittellinie als Kurve in (th, u), Breite nach Richtung (Abstrich 5,2 mm halb, Haarstrich 1,2 mm), Querschnitt 4 Punkte (Rand flach, Mitte 1,9 mm hoch), uv-Attribut nur zum Verschmelzen (ohne: mergeGeometries-Fehler, Metall fehlte), Umlauf so, dass die Flächen nach außen zeigen; W+R und R-Bein als Schwellbänder, Krone weiter als Rohre
- Messwerte: Fleckprüfung 0 Kerne in 8 Blicken; 60,2 Bilder/s (1,62 ms/Bild); check.py 0 Fehler
- Bilder: Scratchpad helmvergleich/sb3-montage.jpg
- offen: Urteil Nutzer

## 08:15 Abschlussprüfung (Nutzer: Monogramm „geht so“ → „Ja, abschließen“)
- Rundgang 1–8 + 3a + Dienstmagd (13 Blicke): je 60 Bilder/s, unauffällig; Bilder Scratchpad rundgang/rundgang.jpg
- Gespräch: Kranich anklicken öffnet Gespräch, Frage beantwortet, „Danke“ → „Gespräch beenden“ schließt
- Konsole aktueller Ladevorgang: keine Fehler (Merge-Fehler nur aus Ladevorgang vor uv-Korrektur); Netzwerk nur 127.0.0.1
- offen: Firefox-Prüfung Nutzer, dann /abschluss

## 08:30 Abschluss
- Ergebnis: Kranich neu fertig – Uniform, Helm mit „WR“ aus Schwellbändern, Materialien (nur volle Stufe: Lackleder, Raum-B-Spiegelung, Stoffstruktur); Firefox ok (Nutzer); Commit 23fbdd2
- Prüfung: check.py 0 Fehler; Fleckprüfung 0; Rundgang 13 Blicke je 60 Bilder/s; Gespräch geht
- Restfehler: Monogramm „geht so“ (Nutzer); bewusste Abweichungen siehe holmes-verlauf.md
- Notizen: Projektnotiz 5,0 KB, „Als Nächstes“ D (Stuck, Beschläge), dann Fall 1; Einzelheiten in holmes-verlauf.md
