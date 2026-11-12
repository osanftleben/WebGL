export const meta = {
  name: 'alle-projekte-pruefen',
  description: 'Prüft alle WebGL-Projekte gleichzeitig (Check, Regeln, Versionen) und liefert eine Statustabelle',
}

phase('Projekte ermitteln')
const liste = await agent(
  'Führe `python .claude/scripts/check.py --uebersicht` im Projektordner aus und gib die Namen aller Projekte ' +
    '(erste Spalte der Übersicht) sowie die vollständige Ausgabe zurück. Ändere keine Dateien.',
  {
    label: 'Übersicht',
    schema: {
      type: 'object',
      required: ['projekte', 'ausgabe'],
      properties: {
        projekte: { type: 'array', items: { type: 'string' } },
        ausgabe: { type: 'string' },
      },
    },
  },
)

if (!liste || liste.projekte.length === 0) {
  return 'Keine Projekte gefunden (oder Übersicht fehlgeschlagen).'
}

phase(`${liste.projekte.length} Projekte prüfen`)
const ergebnisse = await pipeline(liste.projekte, (projekt) =>
  agent(
    `Prüfe das WebGL-Projekt docs/${projekt}/ kurz gegen CLAUDE.md und .claude/rules/. ` +
      `Berücksichtige diese Check-Ausgabe (nur Zeilen zu diesem Projekt sind relevant):\n${liste.ausgabe}\n\n` +
      `Ändere keine Dateien. Gib Status und die wichtigsten Probleme zurück.`,
    {
      label: projekt,
      schema: {
        type: 'object',
        required: ['projekt', 'status', 'probleme'],
        properties: {
          projekt: { type: 'string' },
          status: { type: 'string', enum: ['ok', 'warnung', 'fehler'] },
          probleme: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  ),
)

const zeilen = ergebnisse.map((e, i) =>
  e
    ? `| ${e.projekt} | ${e.status} | ${e.probleme.slice(0, 3).join('; ') || '–'} |`
    : `| ${liste.projekte[i]} | ? | Prüfung fehlgeschlagen |`,
)
return ['| Projekt | Status | Wichtigste Punkte |', '|---|---|---|', ...zeilen].join('\n')
