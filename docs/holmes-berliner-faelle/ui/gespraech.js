// Gesprächsfenster unten im Bild: Antwort der Person und Fragen zum Auswählen.
// Allgemein gehalten, damit es auch für weitere Personen (Kommissar, Verdächtige) taugt.

/**
 * @typedef {import('../fall1/gespraech-kranich.js').Gespraechsdaten} Gespraechsdaten
 * @typedef {import('../fall1/gespraech-kranich.js').Frage} Frage
 */

/**
 * Erstellt das (anfangs versteckte) Gesprächsfenster.
 * @param {object} optionen
 * @param {() => void} optionen.beiAenderung Wird nach Öffnen und Schließen gerufen.
 * @returns {{
 *   starte: (daten: Gespraechsdaten, o: { istFrei: (frage: Frage) => boolean, beiFrage: (frage: Frage) => void }) => void,
 *   schliesse: () => void,
 *   istOffen: () => boolean,
 *   gestellt: () => string[],
 *   setzeGestellt: (ids: string[]) => void,
 * }}
 */
export function erstelleGespraech({ beiAenderung }) {
  /** @type {Set<string>} bereits gestellte Fragen (über alle Gespräche) */
  const gestellteIds = new Set();

  const fenster = document.createElement('section');
  fenster.className = 'gespraech';
  fenster.hidden = true;
  fenster.setAttribute('role', 'dialog');
  fenster.setAttribute('aria-labelledby', 'gespraech-name');
  fenster.innerHTML = `
    <h2 id="gespraech-name" class="gespraech-name"></h2>
    <p class="gespraech-text" aria-live="polite"></p>
    <div class="gespraech-fragen"></div>`;
  document.body.appendChild(fenster);
  const name = /** @type {HTMLElement} */ (fenster.querySelector('.gespraech-name'));
  const text = /** @type {HTMLElement} */ (fenster.querySelector('.gespraech-text'));
  const fragenBox = /** @type {HTMLElement} */ (fenster.querySelector('.gespraech-fragen'));

  /** @type {Gespraechsdaten | null} */
  let daten = null;
  /** @type {{ istFrei: (frage: Frage) => boolean, beiFrage: (frage: Frage) => void } | null} */
  let regeln = null;

  /**
   * Knopf für eine Auswahl anlegen.
   * @param {string} beschriftung @param {() => void} aktion @param {string} [klasse]
   */
  function knopf(beschriftung, aktion, klasse = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `gespraech-frage ${klasse}`.trim();
    b.textContent = beschriftung;
    b.addEventListener('click', aktion);
    fragenBox.appendChild(b);
    return b;
  }

  function zeichneFragen() {
    if (!daten || !regeln) return;
    fragenBox.replaceChildren();
    for (const f of daten.fragen) {
      if (!regeln.istFrei(f)) continue;
      const neu = !gestellteIds.has(f.id);
      knopf(f.frage, () => stelle(f), neu ? '' : 'gestellt');
    }
    const abschied = daten.abschied;
    knopf(abschied.frage, () => {
      text.textContent = abschied.antwort;
      fragenBox.replaceChildren();
      knopf('Gespräch beenden', schliesse).focus();
    }, 'abschied');
    /** @type {HTMLButtonElement | null} */ (fragenBox.querySelector('button'))?.focus();
  }

  /** @param {Frage} f */
  function stelle(f) {
    gestellteIds.add(f.id);
    text.textContent = f.antwort;
    regeln?.beiFrage(f);
    zeichneFragen();
  }

  function schliesse() {
    if (fenster.hidden) return;
    fenster.hidden = true;
    beiAenderung();
  }

  window.addEventListener('keydown', (e) => {
    if (!fenster.hidden && e.key === 'Escape') {
      e.preventDefault();
      schliesse();
    }
  });

  return {
    starte(neueDaten, neueRegeln) {
      daten = neueDaten;
      regeln = neueRegeln;
      name.textContent = neueDaten.name;
      text.textContent = neueDaten.begruessung;
      zeichneFragen();
      fenster.hidden = false;
      beiAenderung();
    },
    schliesse,
    istOffen: () => !fenster.hidden,
    gestellt: () => [...gestellteIds],
    setzeGestellt(ids) {
      for (const id of ids) gestellteIds.add(id);
    },
  };
}
