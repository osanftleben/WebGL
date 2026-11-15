// Notizbuch: gefundene Hinweise in der Reihenfolge des Findens, fehlende als „?“.
// Hinweise lassen sich antippen (markieren) und zu Schlussfolgerungen verknüpfen.

/**
 * @typedef {import('../fall1/hinweise.js').Hinweis} Hinweis
 * @typedef {import('../fall1/verknuepfungen.js').Schlussfolgerung} Schlussfolgerung
 */

/**
 * @typedef {object} VerknuepfErgebnis
 * @property {'neu' | 'schon' | 'falsch'} art
 * @property {string} text Rückmeldung für den Spieler
 * @property {string} [id] Kennung der (neuen oder schon notierten) Schlussfolgerung
 */

/**
 * Erstellt Knopf und Notizbuch-Ansicht (HTML über dem Bild).
 * Am PC öffnet und schließt die Taste N das Notizbuch.
 * @param {object} optionen
 * @param {Hinweis[]} optionen.hinweise Alle Hinweise des Falls (für die Gesamtzahl).
 * @param {Schlussfolgerung[]} optionen.schlussfolgerungen Alle Schlussfolgerungen des Falls.
 * @param {number} optionen.maxAuswahl Höchstzahl gleichzeitig markierter Hinweise.
 * @param {(ids: string[]) => VerknuepfErgebnis} optionen.beiVerknuepfen Prüft die Auswahl (und trägt eine neue Schlussfolgerung über `fuegeSchlussHinzu` ein).
 * @param {() => void} optionen.beiOeffnen
 * @param {() => void} optionen.beiSchliessen
 * @param {() => void} [optionen.beiNeustart] Wird nach Bestätigung von „Fall neu beginnen“ gerufen.
 * @param {HTMLElement} [optionen.knopfContainer=document.body] Wohin der Notizbuch-Knopf gehängt wird.
 * @returns {{
 *   fuegeHinzu: (id: string) => boolean,
 *   fuegeAussageHinzu: (aussage: { id: string, titel: string, text: string }) => boolean,
 *   fuegeSchlussHinzu: (id: string) => boolean,
 *   hat: (id: string) => boolean,
 *   hatSchluss: (id: string) => boolean,
 *   aussagenIds: () => string[],
 *   gefunden: () => string[],
 *   schluesse: () => string[],
 *   oeffne: () => void,
 *   schliesse: () => void,
 *   istOffen: () => boolean,
 * }}
 */
export function erstelleNotizbuch({
  hinweise,
  schlussfolgerungen,
  maxAuswahl,
  beiVerknuepfen,
  beiOeffnen,
  beiSchliessen,
  beiNeustart,
  knopfContainer = document.body,
}) {
  /** @type {string[]} */
  const gefundenIds = [];
  /** @type {{ id: string, titel: string, text: string }[]} Zeugenaussagen aus Gesprächen */
  const aussagen = [];
  /** @type {string[]} gezogene Schlussfolgerungen in der Reihenfolge des Schließens */
  const schlussIds = [];
  /** @type {string[]} markierte Hinweise (nur solange das Notizbuch offen ist) */
  let auswahl = [];
  /** Zuletzt gezogene Schlussfolgerung, wird einmal hervorgehoben */
  let neuerSchluss = '';

  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'notizbuch-knopf';
  knopf.setAttribute('aria-label', 'Notizbuch öffnen');
  knopfContainer.appendChild(knopf);

  const huelle = document.createElement('div');
  huelle.className = 'ueberlagerung';
  huelle.hidden = true;
  huelle.innerHTML = `
    <section class="karte notizbuch" role="dialog" aria-modal="true" aria-labelledby="notizbuch-titel">
      <h2 id="notizbuch-titel" class="karte-titel">Notizbuch</h2>
      <h3 class="notizbuch-abschnitt">Hinweise</h3>
      <p class="notizbuch-anleitung" hidden>Tippe zwei oder drei Hinweise an, die zusammengehören, und verknüpfe sie.</p>
      <ol class="notizbuch-liste notizbuch-hinweise"></ol>
      <h3 class="notizbuch-abschnitt">Schlussfolgerungen</h3>
      <ul class="notizbuch-liste notizbuch-schluesse"></ul>
      <h3 class="notizbuch-abschnitt">Aussagen</h3>
      <ul class="notizbuch-liste notizbuch-aussagen"></ul>
      <div class="verknuepfen-leiste" hidden>
        <p class="verknuepfen-meldung" aria-live="polite"></p>
        <div class="verknuepfen-knoepfe">
          <button type="button" class="knopf verknuepfen-los">Verknüpfen</button>
          <button type="button" class="knopf-leise verknuepfen-weg">Auswahl aufheben</button>
        </div>
      </div>
      <div class="notizbuch-unten">
        <button type="button" class="knopf">Schließen</button>
        <button type="button" class="knopf-leise neustart">Fall neu beginnen</button>
      </div>
      <div class="neustart-frage" hidden>
        <p>Wirklich neu beginnen? Alle Funde, Aussagen, Schlussfolgerungen und Fragen gehen verloren.</p>
        <button type="button" class="knopf neustart-ja">Ja, neu beginnen</button>
        <button type="button" class="knopf-leise neustart-nein">Abbrechen</button>
      </div>
    </section>`;
  document.body.appendChild(huelle);
  /** @param {string} wahl */
  const teil = (wahl) => /** @type {HTMLElement} */ (huelle.querySelector(wahl));
  const liste = teil('.notizbuch-hinweise');
  const anleitung = teil('.notizbuch-anleitung');
  const schlussListe = teil('.notizbuch-schluesse');
  const aussagenListe = teil('.notizbuch-aussagen');
  const leiste = teil('.verknuepfen-leiste');
  const meldung = teil('.verknuepfen-meldung');
  const losKnopf = /** @type {HTMLButtonElement} */ (teil('.verknuepfen-los'));
  const wegKnopf = /** @type {HTMLButtonElement} */ (teil('.verknuepfen-weg'));
  const schliessenKnopf = /** @type {HTMLButtonElement} */ (teil('.notizbuch-unten .knopf'));
  const neustartKnopf = /** @type {HTMLButtonElement} */ (teil('.neustart'));
  const neustartFrage = teil('.neustart-frage');
  if (!beiNeustart) neustartKnopf.hidden = true;
  neustartKnopf.addEventListener('click', () => {
    neustartFrage.hidden = false;
    /** @type {HTMLButtonElement} */ (neustartFrage.querySelector('.neustart-nein')).focus();
  });
  /** @type {HTMLButtonElement} */ (neustartFrage.querySelector('.neustart-nein')).addEventListener('click', () => {
    neustartFrage.hidden = true;
    neustartKnopf.focus();
  });
  /** @type {HTMLButtonElement} */ (neustartFrage.querySelector('.neustart-ja')).addEventListener('click', () => beiNeustart?.());

  function aktualisiereKnopf() {
    knopf.textContent = `Notizbuch ${gefundenIds.length}/${hinweise.length}`;
  }

  /**
   * Listeneintrag mit Titel und Text.
   * @param {string} titel @param {string} inhalt @param {string} [klasse]
   */
  function eintrag(titel, inhalt, klasse = '') {
    const li = document.createElement('li');
    if (klasse) li.className = klasse;
    const kopf = document.createElement('strong');
    kopf.textContent = titel;
    const text = document.createElement('p');
    text.textContent = inhalt;
    li.append(kopf, text);
    return li;
  }

  /** @param {HTMLElement} ziel @param {string} text */
  function leerEintrag(ziel, text) {
    const leer = document.createElement('li');
    leer.className = 'notizbuch-offen';
    leer.textContent = text;
    ziel.appendChild(leer);
  }

  /** Leiste mit „Verknüpfen“ zeigen, sobald etwas markiert ist oder eine Meldung ansteht. */
  function aktualisiereLeiste() {
    leiste.hidden = auswahl.length === 0 && !meldung.textContent;
    losKnopf.disabled = auswahl.length < 2;
    wegKnopf.hidden = auswahl.length === 0;
    losKnopf.textContent = auswahl.length >= 2 ? `Verknüpfen (${auswahl.length})` : 'Verknüpfen';
    for (const b of liste.querySelectorAll('button.notizbuch-hinweis')) {
      const b2 = /** @type {HTMLButtonElement} */ (b);
      b2.setAttribute('aria-pressed', String(auswahl.includes(b2.dataset.id ?? '')));
    }
  }

  /** @param {string} text */
  function melde(text) {
    meldung.textContent = text;
    aktualisiereLeiste();
  }

  /** @param {string} id */
  function schalteAuswahl(id) {
    if (auswahl.includes(id)) {
      auswahl = auswahl.filter((x) => x !== id);
      melde('');
    } else if (auswahl.length >= maxAuswahl) {
      melde(`Höchstens ${maxAuswahl} Hinweise auf einmal.`);
    } else {
      auswahl.push(id);
      melde(auswahl.length === 1 ? 'Noch mindestens einen Hinweis wählen.' : '');
    }
  }

  function zeichneListe() {
    liste.replaceChildren();
    for (const id of gefundenIds) {
      const h = hinweise.find((x) => x.id === id);
      if (!h) continue;
      const li = document.createElement('li');
      // Der ganze Eintrag ist ein Knopf (Tippen, Klicken, Tastatur); innen nur Inline-Elemente
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'notizbuch-hinweis';
      b.dataset.id = id;
      const kopf = document.createElement('strong');
      kopf.textContent = h.titel;
      const ort = document.createElement('span');
      ort.className = 'notizbuch-ort';
      ort.textContent = ` – ${h.ort}`;
      const text = document.createElement('span');
      text.className = 'notizbuch-text';
      text.textContent = h.text;
      b.append(kopf, ort, text);
      b.addEventListener('click', () => schalteAuswahl(id));
      li.appendChild(b);
      liste.appendChild(li);
    }
    for (let i = gefundenIds.length; i < hinweise.length; i++) leerEintrag(liste, '?');
    anleitung.hidden = gefundenIds.length < 2;

    schlussListe.replaceChildren();
    if (schlussIds.length === 0) leerEintrag(schlussListe, 'Noch keine.');
    for (const id of schlussIds) {
      const s = schlussfolgerungen.find((x) => x.id === id);
      if (s) schlussListe.appendChild(eintrag(s.titel, s.text, id === neuerSchluss ? 'neu' : ''));
    }

    aussagenListe.replaceChildren();
    if (aussagen.length === 0) leerEintrag(aussagenListe, 'Noch keine.');
    for (const a of aussagen) aussagenListe.appendChild(eintrag(a.titel, a.text));
    aktualisiereLeiste();
  }

  losKnopf.addEventListener('click', () => {
    if (auswahl.length < 2) return;
    const ergebnis = beiVerknuepfen([...auswahl]);
    if (ergebnis.art === 'falsch') {
      // Auswahl bleibt stehen, damit man gezielt einen Hinweis tauschen kann
      melde(ergebnis.text);
      return;
    }
    auswahl = [];
    neuerSchluss = ergebnis.id ?? '';
    meldung.textContent = ergebnis.text;
    zeichneListe();
    const ziel = schlussListe.querySelector('li.neu') ?? schlussListe;
    // Oben ausrichten, damit die Leiste unten den neuen Eintrag nicht verdeckt
    ziel.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  wegKnopf.addEventListener('click', () => {
    auswahl = [];
    melde('');
  });

  function oeffne() {
    if (!huelle.hidden) return;
    auswahl = [];
    neuerSchluss = '';
    meldung.textContent = '';
    zeichneListe();
    neustartFrage.hidden = true;
    huelle.hidden = false;
    beiOeffnen();
    // Oben bei den Hinweisen beginnen; der Fokus auf „Schließen“ soll nicht ans Ende blättern
    teil('.notizbuch').scrollTop = 0;
    schliessenKnopf.focus({ preventScroll: true });
  }

  function schliesse() {
    if (huelle.hidden) return;
    huelle.hidden = true;
    beiSchliessen();
  }

  knopf.addEventListener('click', oeffne);
  schliessenKnopf.addEventListener('click', schliesse);
  huelle.addEventListener('click', (e) => {
    if (e.target === huelle) schliesse();
  });
  window.addEventListener('keydown', (e) => {
    const ziel = /** @type {HTMLElement} */ (e.target);
    if (ziel && (ziel.tagName === 'INPUT' || ziel.tagName === 'TEXTAREA')) return;
    if (e.code === 'KeyN') {
      e.preventDefault();
      if (huelle.hidden) oeffne();
      else schliesse();
    } else if (e.key === 'Escape' && !huelle.hidden) {
      e.preventDefault();
      schliesse();
    }
  });

  aktualisiereKnopf();

  return {
    fuegeHinzu(id) {
      if (gefundenIds.includes(id)) return false;
      gefundenIds.push(id);
      aktualisiereKnopf();
      return true;
    },
    fuegeAussageHinzu(aussage) {
      if (aussagen.some((a) => a.id === aussage.id)) return false;
      aussagen.push(aussage);
      return true;
    },
    fuegeSchlussHinzu(id) {
      if (schlussIds.includes(id) || !schlussfolgerungen.some((s) => s.id === id)) return false;
      schlussIds.push(id);
      return true;
    },
    hat: (id) => gefundenIds.includes(id),
    hatSchluss: (id) => schlussIds.includes(id),
    aussagenIds: () => aussagen.map((a) => a.id),
    gefunden: () => [...gefundenIds],
    schluesse: () => [...schlussIds],
    oeffne,
    schliesse,
    istOffen: () => !huelle.hidden,
  };
}
