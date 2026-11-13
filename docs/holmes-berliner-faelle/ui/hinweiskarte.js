// Karte, die nach dem Antippen eines Hinweises erscheint.

/**
 * @typedef {import('../fall1/hinweise.js').Hinweis} Hinweis
 */

/**
 * Erstellt die Hinweiskarte (HTML über dem Bild). Sie ist anfangs versteckt.
 * @param {object} optionen
 * @param {() => void} optionen.beiSchliessen Wird gerufen, wenn die Karte geschlossen wird.
 * @returns {{ zeige: (hinweis: Hinweis, neu: boolean) => void, schliesse: () => void, istOffen: () => boolean }}
 */
export function erstelleHinweiskarte({ beiSchliessen }) {
  const huelle = document.createElement('div');
  huelle.className = 'ueberlagerung';
  huelle.hidden = true;
  huelle.innerHTML = `
    <section class="karte" role="dialog" aria-modal="true" aria-labelledby="karte-titel">
      <p class="karte-ort"></p>
      <h2 id="karte-titel" class="karte-titel"></h2>
      <p class="karte-text"></p>
      <p class="karte-vermerk"></p>
      <button type="button" class="knopf">Weiter</button>
    </section>`;
  document.body.appendChild(huelle);

  const ort = /** @type {HTMLElement} */ (huelle.querySelector('.karte-ort'));
  const titel = /** @type {HTMLElement} */ (huelle.querySelector('.karte-titel'));
  const text = /** @type {HTMLElement} */ (huelle.querySelector('.karte-text'));
  const vermerk = /** @type {HTMLElement} */ (huelle.querySelector('.karte-vermerk'));
  const knopf = /** @type {HTMLButtonElement} */ (huelle.querySelector('.knopf'));

  function schliesse() {
    if (huelle.hidden) return;
    huelle.hidden = true;
    beiSchliessen();
  }

  knopf.addEventListener('click', schliesse);
  // Klick neben die Karte schließt ebenfalls
  huelle.addEventListener('click', (e) => {
    if (e.target === huelle) schliesse();
  });
  window.addEventListener('keydown', (e) => {
    if (!huelle.hidden && (e.key === 'Escape' || e.key === 'Enter')) {
      e.preventDefault();
      schliesse();
    }
  });

  return {
    zeige(hinweis, neu) {
      ort.textContent = hinweis.ort;
      titel.textContent = hinweis.titel;
      text.textContent = hinweis.text;
      vermerk.textContent = neu ? 'Ins Notizbuch übernommen.' : 'Steht bereits im Notizbuch.';
      huelle.hidden = false;
      knopf.focus();
    },
    schliesse,
    istOffen: () => !huelle.hidden,
  };
}
