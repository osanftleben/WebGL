export const meta = {
  name: 'review-alles',
  description: 'Shader-, Performance- und Code-Review eines WebGL-Projekts gleichzeitig, danach ein gemeinsamer Bericht',
}

// Aufruf: /review-alles <projektordner>   (z. B. /review-alles sonnensystem)
const projekt = typeof args === 'string' ? args.trim() : (args && args.projekt) || ''

if (!projekt) {
  return 'Bitte den Projektordner angeben, z. B. /review-alles sonnensystem (Liste: python .claude/scripts/projekte.py liste).'
}

// Benannte Subagenten lassen sich laut Doku nicht direkt aufrufen –
// deshalb arbeitet jeder Agent nach der Anleitung aus der jeweiligen Agenten-Datei.
const pruefungen = [
  {
    name: 'Shader',
    auftrag: `Lies .claude/agents/shader-reviewer.md und arbeite genau nach dieser Anleitung für das Projekt docs/${projekt}/. Ändere keine Dateien.`,
  },
  {
    name: 'Performance',
    auftrag: `Lies .claude/agents/performance-pruefer.md und arbeite genau nach dieser Anleitung für das Projekt docs/${projekt}/. Ändere keine Dateien.`,
  },
  {
    name: 'Code',
    auftrag:
      `Prüfe den JavaScript- und HTML-Code von docs/${projekt}/ gegen die Regeln in CLAUDE.md und .claude/rules/ ` +
      `(javascript.md, html.md, lib.md): Lesbarkeit, JSDoc, Fehlerbehandlung beim Laden, relative Pfade, Import-Map. ` +
      `Ändere keine Dateien. Antworte auf Deutsch mit höchstens 7 Befunden (Datei:Zeile, Problem, Vorschlag).`,
  },
]

phase(`Review von ${projekt}`)
const berichte = await pipeline(pruefungen, (p) => agent(p.auftrag, { label: p.name }))

phase('Zusammenfassung')
const teile = pruefungen.map((p, i) => `### ${p.name}\n${berichte[i] ?? '(kein Ergebnis)'}`).join('\n\n')
const gesamt = await agent(
  `Fasse diese drei Review-Berichte zum WebGL-Projekt "${projekt}" auf Deutsch zusammen. ` +
    `Doppelte Befunde zusammenführen, nach Wichtigkeit sortieren, höchstens 10 Punkte, ` +
    `je mit Datei:Zeile und Vorschlag. Ändere keine Dateien.\n\n${teile}`,
  { label: 'Zusammenfassung' },
)

return gesamt
