// steuerung-v1: sichtbarer Joystick für Touch (reines HTML/CSS, keine Bilddateien).

/**
 * Erstellt die Anzeige eines Joysticks: Ring mit Knopf, erscheint dort,
 * wo der Daumen aufsetzt. Die Anzeige fängt keine Eingaben ab (pointer-events: none).
 *
 * @param {object} [optionen]
 * @param {HTMLElement} [optionen.container=document.body] Element, in das die Anzeige gehängt wird.
 * @param {number} [optionen.radius=60] Radius des Rings in CSS-Pixeln.
 * @returns {{
 *   zeige: (x: number, y: number) => void,
 *   bewege: (dx: number, dy: number) => void,
 *   verstecke: () => void,
 *   entfernen: () => void,
 *   radius: number,
 * }}
 */
export function erstelleJoystickAnzeige({ container = document.body, radius = 60 } = {}) {
  const ring = document.createElement('div');
  const knopf = document.createElement('div');
  const groesse = radius * 2;
  const knopfGroesse = Math.round(radius * 0.9);

  Object.assign(ring.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: `${groesse}px`,
    height: `${groesse}px`,
    marginLeft: `${-radius}px`,
    marginTop: `${-radius}px`,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.45)',
    background: 'rgba(255,255,255,0.08)',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    display: 'none',
    zIndex: '10',
  });
  Object.assign(knopf.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: `${knopfGroesse}px`,
    height: `${knopfGroesse}px`,
    marginLeft: `${-knopfGroesse / 2}px`,
    marginTop: `${-knopfGroesse / 2}px`,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.45)',
    pointerEvents: 'none',
  });
  ring.appendChild(knopf);
  container.appendChild(ring);

  return {
    radius,
    zeige(x, y) {
      ring.style.left = `${x}px`;
      ring.style.top = `${y}px`;
      knopf.style.transform = 'translate(0px, 0px)';
      ring.style.display = 'block';
    },
    bewege(dx, dy) {
      knopf.style.transform = `translate(${dx}px, ${dy}px)`;
    },
    verstecke() {
      ring.style.display = 'none';
    },
    entfernen() {
      ring.remove();
    },
  };
}
