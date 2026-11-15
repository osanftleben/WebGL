// Fall 1: Schlussfolgerungen aus verknüpften Hinweisen (Texte erfunden, Spielhandlung, vom Nutzer geprüft).
// Eine Verknüpfung gilt nur, wenn genau die genannten Kennungen gewählt sind (Reihenfolge egal).
// Weitere Verknüpfungen (z. B. 3 + 4 + 7 mit drei Hinweisen) kommen einfach als neuer Eintrag dazu.

/**
 * @typedef {object} Schlussfolgerung
 * @property {string} id
 * @property {string[]} aus Kennungen der Hinweise, die zusammengehören (2 oder 3)
 * @property {string} titel
 * @property {string} text Sigersons Schluss
 */

/** Höchstzahl gleichzeitig wählbarer Hinweise */
export const MAX_AUSWAHL = 3;

/** @type {Schlussfolgerung[]} */
export const SCHLUSSFOLGERUNGEN = [
  {
    id: 'abdruckwachs-entdeckt',
    aus: ['wachs-fingernaegel', 'wachsplatte'],
    titel: 'Wendt hat das Abdruckwachs entdeckt',
    text:
      'Das dunkle Wachs unter Wendts Nägeln gleicht dem der Platte mit den Schlüsselbärten. ' +
      'Wendt hat diese Platte in den Händen gehabt – er wusste also, dass in seiner Werkstatt heimlich ' +
      'Schlüssel nachgegossen wurden. Wer das tat, hatte Grund, ihn zum Schweigen zu bringen.',
  },
];

/** Sigersons Vermerk bei einer falschen Verknüpfung (der Reihe nach) */
export const FEHLVERSUCH_SAETZE = [
  'Nein. Das eine erklärt das andere nicht.',
  'Hm. Das passt nicht zusammen – ich darf nicht raten.',
  'Daraus folgt nichts. Noch einmal von vorn.',
];

export const SCHON_NOTIERT = 'Das habe ich bereits notiert.';

/**
 * Sucht eine Schlussfolgerung nach ihrer Kennung.
 * @param {string} id
 * @returns {Schlussfolgerung | undefined}
 */
export function findeSchluss(id) {
  return SCHLUSSFOLGERUNGEN.find((s) => s.id === id);
}

/**
 * Sucht die Schlussfolgerung, deren Hinweise genau den gewählten entsprechen.
 * @param {string[]} ids gewählte Kennungen
 * @returns {Schlussfolgerung | undefined}
 */
export function sucheVerknuepfung(ids) {
  const gewaehlt = new Set(ids);
  return SCHLUSSFOLGERUNGEN.find((s) => s.aus.length === gewaehlt.size && s.aus.every((id) => gewaehlt.has(id)));
}
