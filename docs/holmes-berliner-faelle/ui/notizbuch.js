// Notizbuch: gefundene Hinweise in der Reihenfolge des Findens, fehlende als „?“.

/**
 * @typedef {import('../fall1/hinweise.js').Hinweis} Hinweis
 */

/**
 * Erstellt Knopf und Notizbuch-Ansicht (HTML über dem Bild).
 * Am PC öffnet und schließt die Taste N das Notizbuch.
 * @param {object} optionen
 * @param {Hinweis[]} optionen.hinweise Alle Hinweise des Falls (für die Gesamtzahl).
 * @param {() => void} optionen.beiOeffnen
 * @param {() => void} optionen.beiSchliessen
 * @returns {{
 *   fuegeHinzu: (id: string) => boolean,
 *   fuegeAussageHinzu: (aussage: { id: string, titel: string, text: string }) => boolean,
 *   hat: (id: string) => boolean,
 *   gefunden: () => string[],
 *   oeffne: () => void,
 *   schliesse: () => void,
 *   istOffen: () => boolean,
 * }}
 */
export function erstelleNotizbuch({ hinweise, beiOeffnen, beiSchliessen }) {
  /** @type {string[]} */
  const gefundenIds = [];
  /** @type {{ id: string, titel: string, text: string }[]} Zeugenaussagen aus Gesprächen */
  const aussagen = [];

  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'notizbuch-knopf';
  knopf.setAttribute('aria-label', 'Notizbuch öffnen');
  document.body.appendChild(knopf);

  const huelle = document.createElement('div');
  huelle.className = 'ueberlagerung';
  huelle.hidden = true;
  huelle.innerHTML = `
    <section class="karte notizbuch" role="dialog" aria-modal="true" aria-labelledby="notizbuch-titel">
      <h2 id="notizbuch-titel" class="karte-titel">Notizbuch</h2>
      <h3 class="notizbuch-abschnitt">Hinweise</h3>
      <ol class="notizbuch-liste"></ol>
      <h3 class="notizbuch-abschnitt">Aussagen</h3>
      <ul class="notizbuch-liste notizbuch-aussagen"></ul>
      <button type="button" class="knopf">Schließen</button>
    </section>`;
  document.body.appendChild(huelle);
  const liste = /** @type {HTMLOListElement} */ (huelle.querySelector('ol.notizbuch-liste'));
  const aussagenListe = /** @type {HTMLUListElement} */ (huelle.querySelector('.notizbuch-aussagen'));
  const schliessenKnopf = /** @type {HTMLButtonElement} */ (huelle.querySelector('.knopf'));

  function aktualisiereKnopf() {
    knopf.textContent = `Notizbuch ${gefundenIds.length}/${hinweise.length}`;
  }

  function zeichneListe() {
    liste.replaceChildren();
    for (const id of gefundenIds) {
      const h = hinweise.find((x) => x.id === id);
      if (!h) continue;
      const eintrag = document.createElement('li');
      const kopf = document.createElement('strong');
      kopf.textContent = h.titel;
      const ort = document.createElement('span');
      ort.className = 'notizbuch-ort';
      ort.textContent = ` – ${h.ort}`;
      const text = document.createElement('p');
      text.textContent = h.text;
      eintrag.append(kopf, ort, text);
      liste.appendChild(eintrag);
    }
    for (let i = gefundenIds.length; i < hinweise.length; i++) {
      const offen = document.createElement('li');
      offen.className = 'notizbuch-offen';
      offen.textContent = '?';
      liste.appendChild(offen);
    }
    aussagenListe.replaceChildren();
    if (aussagen.length === 0) {
      const leer = document.createElement('li');
      leer.className = 'notizbuch-offen';
      leer.textContent = 'Noch keine.';
      aussagenListe.appendChild(leer);
    }
    for (const a of aussagen) {
      const eintrag = document.createElement('li');
      const kopf = document.createElement('strong');
      kopf.textContent = a.titel;
      const text = document.createElement('p');
      text.textContent = a.text;
      eintrag.append(kopf, text);
      aussagenListe.appendChild(eintrag);
    }
  }

  function oeffne() {
    if (!huelle.hidden) return;
    zeichneListe();
    huelle.hidden = false;
    beiOeffnen();
    schliessenKnopf.focus();
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
    hat: (id) => gefundenIds.includes(id),
    gefunden: () => [...gefundenIds],
    oeffne,
    schliesse,
    istOffen: () => !huelle.hidden,
  };
}
