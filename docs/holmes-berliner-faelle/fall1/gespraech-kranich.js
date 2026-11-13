// Fall 1: Gespräch mit Schutzmann Kranich am Fundort (Texte erfunden, vom Nutzer geprüft).
// Belegt sind nur die Begriffe „Polizeibureau“ (Baedeker 1891) und die Öffnungszeit bis 10 Uhr abends.

/**
 * @typedef {object} Frage
 * @property {string} id
 * @property {string} frage Was Sigerson fragt
 * @property {string} antwort Was die Person antwortet
 * @property {string} [braucht] Kennung eines Hinweises, der vorher gefunden sein muss
 * @property {{ id: string, titel: string, text: string }} [aussage] Eintrag für das Notizbuch
 */

/**
 * @typedef {object} Gespraechsdaten
 * @property {string} name
 * @property {string} begruessung
 * @property {Frage[]} fragen
 * @property {{ frage: string, antwort: string }} abschied
 */

/** @type {Gespraechsdaten} */
export const GESPRAECH_KRANICH = {
  name: 'Schutzmann Kranich',
  begruessung:
    'Da sind Sie ja, Herr Sigerson. Sehen Sie sich ruhig um – nur anrühren dürfen wir nichts, bis der Herr Kommissar kommt.',
  fragen: [
    {
      id: 'finder',
      frage: 'Wer hat den Toten gefunden?',
      antwort:
        'Fräulein Brandt, die Kassiererin, kurz nach halb acht. Sie kam die Treppe heruntergelaufen, ganz weiß im Gesicht, ' +
        'und hat mich von der Straße hereingeholt. Ich hatte Dienst an der Ecke Behrenstraße.',
      aussage: {
        id: 'aussage-finder',
        titel: 'Gefunden von Ida Brandt',
        text: 'Kranich: Die Kassiererin Ida Brandt fand den Toten kurz nach halb acht und holte ihn von der Straße herein.',
      },
    },
    {
      id: 'toter',
      frage: 'Wer ist der Tote?',
      antwort:
        'Emil Wendt, der Wachsbildner des Hauses. Er hat oben in der Werkstatt die Figuren gemacht. ' +
        'Fräulein Brandt sagt, er war ihr Onkel.',
      aussage: {
        id: 'aussage-toter',
        titel: 'Der Tote: Emil Wendt',
        text: 'Kranich: Emil Wendt, Wachsbildner des Hauses, arbeitete in der Werkstatt. Laut Ida Brandt war er ihr Onkel.',
      },
    },
    {
      id: 'kripo',
      frage: 'Ist die Kriminalpolizei unterrichtet?',
      antwort: 'Ich habe einen Jungen zum Polizeibureau geschickt. Herr Kriminalkommissar Dorn wird bald hier sein.',
    },
    {
      id: 'schluessel',
      frage: 'Wer hat Schlüssel zum Haus?',
      antwort:
        'Der Herr Geschäftsführer Lassow, Fräulein Brandt für die Kasse, und die Leute aus der Werkstatt – ' +
        'Wendt und sein Gehilfe Rehfeld. Mehr weiß ich nicht.',
      aussage: {
        id: 'aussage-schluessel',
        titel: 'Schlüssel zum Haus',
        text: 'Kranich: Schlüssel haben Geschäftsführer Lassow, Kassiererin Ida Brandt, Wendt und sein Gehilfe Rehfeld.',
      },
    },
    {
      id: 'abschluss',
      frage: 'Wann wurde gestern abgeschlossen?',
      braucht: 'figur-werkstatt',
      antwort:
        'Um zehn Uhr abends, nach den letzten Besuchern, sagt Herr Lassow. Heute früh war unten alles verschlossen. ' +
        'Wer den Toten heraufgebracht hat, muss einen Schlüssel gehabt haben – oder schon im Haus gewesen sein.',
      aussage: {
        id: 'aussage-abschluss',
        titel: 'Abgeschlossen um zehn Uhr',
        text: 'Kranich: Laut Lassow um zehn Uhr abends abgeschlossen; am Morgen war unten alles verschlossen.',
      },
    },
    {
      id: 'wachs',
      frage: 'Mit welchem Wachs hat Wendt gearbeitet?',
      braucht: 'wachs-fingernaegel',
      antwort:
        'Davon verstehe ich nichts, Herr. Fragen Sie Rehfeld, den Gehilfen. Der war heute früh auch schon da – ' +
        'er wartet unten im Vorraum.',
    },
    {
      id: 'einbruch',
      frage: 'Ist in der Gegend kürzlich eingebrochen worden?',
      braucht: 'wachsplatte',
      antwort:
        'Nicht dass ich wüsste. Aber der Juwelier Albrecht aus der Passage war letzte Woche im Polizeibureau ' +
        'und hat gefragt, ob jemand einen Schlüsselbund abgegeben hat. Er hat ihn dann doch wiedergefunden.',
      aussage: {
        id: 'aussage-albrecht',
        titel: 'Juwelier Albrecht vermisste Schlüssel',
        text: 'Kranich: Juwelier Albrecht (Passage) fragte letzte Woche im Polizeibureau nach einem Schlüsselbund – und fand ihn dann wieder.',
      },
    },
  ],
  abschied: { frage: 'Danke, Schutzmann.', antwort: 'Zu Diensten, Herr Sigerson.' },
};
