/* ==========================================================================
   Villa Dream — Passwort-Gate
   Läuft VOR jeder anderen Skript-Logik. Versteckt die Seite bis das
   korrekte Passwort eingegeben wurde.

   SO ÄNDERST DU DAS PASSWORT:
   1. Wähle dein neues Passwort
   2. SHA-256-Hash davon berechnen (z.B. unter https://emn178.github.io/online-tools/sha256.html)
   3. Den Hash unten bei GATE_PASSWORD_HASH einsetzen

   Aktuelles Passwort: villa2026
   ========================================================================== */
(() => {
  'use strict';

  const GATE_PASSWORD_HASH = 'ab76f987014446560f303f80a2a0a5e59865e32882c19ed67d00d3745ee79471';
  const STORAGE_KEY = 'vd-gate-unlocked-2026';

  // Wenn bereits freigeschaltet → nichts tun
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') return;
  } catch (e) { /* localStorage könnte deaktiviert sein */ }

  // Seite vor Anzeige verstecken — wird per CSS in :root sofort gesetzt
  const style = document.createElement('style');
  style.textContent = `
    html.vd-locked body > *:not(.vd-gate) {
      display: none !important;
    }
    .vd-gate {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(ellipse at 30% 20%, rgba(184,153,104,0.12) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(184,153,104,0.08) 0%, transparent 50%),
        linear-gradient(135deg, #1a1816 0%, #0f0e0d 50%, #1a1816 100%);
      color: #fff;
      padding: 2rem;
      animation: vdGateFadeIn 0.6s ease both;
    }
    @keyframes vdGateFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .vd-gate-frame {
      position: absolute;
      inset: 2rem;
      border: 1px solid rgba(212, 189, 149, 0.2);
      pointer-events: none;
    }
    .vd-gate-inner {
      max-width: 440px;
      width: 100%;
      text-align: center;
      position: relative;
      z-index: 2;
    }
    .vd-gate-monogram {
      width: 64px; height: 64px;
      margin: 0 auto 2.5rem;
      border: 1px solid rgba(212, 189, 149, 0.6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.45rem;
      font-style: italic;
      font-weight: 500;
      color: rgba(212, 189, 149, 0.9);
      letter-spacing: 0.05em;
    }
    .vd-gate-eyebrow {
      font-family: 'Inter', sans-serif;
      font-size: 0.66rem;
      letter-spacing: 0.42em;
      text-transform: uppercase;
      color: rgba(212, 189, 149, 0.75);
      margin-bottom: 1.25rem;
    }
    .vd-gate-title {
      font-family: 'Italianno', cursive;
      font-size: clamp(3rem, 8vw, 4.5rem);
      line-height: 1;
      color: rgba(212, 189, 149, 1);
      margin-bottom: 0.5rem;
    }
    .vd-gate-sub {
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      font-weight: 300;
      font-size: 1.15rem;
      color: rgba(255,255,255,0.85);
      margin-bottom: 2.5rem;
      line-height: 1.55;
    }
    .vd-gate-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: center;
    }
    .vd-gate-input {
      width: 100%;
      max-width: 320px;
      padding: 1rem 1.25rem;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(212, 189, 149, 0.35);
      border-radius: 0;
      color: #fff;
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      letter-spacing: 0.18em;
      text-align: center;
      outline: none;
      transition: border-color 0.3s ease, background 0.3s ease;
    }
    .vd-gate-input::placeholder {
      color: rgba(255,255,255,0.35);
      letter-spacing: 0.32em;
      text-transform: uppercase;
      font-size: 0.7rem;
    }
    .vd-gate-input:focus {
      border-color: rgba(212, 189, 149, 0.9);
      background: rgba(255,255,255,0.06);
    }
    .vd-gate-btn {
      padding: 1rem 2.4rem;
      background: rgba(212, 189, 149, 0.95);
      color: #1a1816;
      border: 1px solid rgba(212, 189, 149, 0.95);
      font-family: 'Inter', sans-serif;
      font-size: 0.74rem;
      font-weight: 500;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.35s ease;
    }
    .vd-gate-btn:hover {
      background: #fff;
      border-color: #fff;
    }
    .vd-gate-hint {
      margin-top: 2rem;
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      font-size: 0.95rem;
      color: rgba(255,255,255,0.55);
      max-width: 320px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.5;
    }
    .vd-gate-error {
      margin-top: 1rem;
      min-height: 1.5rem;
      color: #d99393;
      font-family: 'Inter', sans-serif;
      font-size: 0.78rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .vd-gate-error.is-visible {
      opacity: 1;
    }
    .vd-gate-corner {
      position: absolute;
      font-family: 'Inter', sans-serif;
      font-size: 0.6rem;
      letter-spacing: 0.36em;
      text-transform: uppercase;
      color: rgba(212, 189, 149, 0.55);
    }
    .vd-gate-corner--tl { top: 3rem; left: 3rem; }
    .vd-gate-corner--br {
      bottom: 3rem; right: 3rem;
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      letter-spacing: 0.06em;
      text-transform: none;
      color: rgba(212, 189, 149, 0.7);
    }
    @media (max-width: 600px) {
      .vd-gate-frame { inset: 1rem; }
      .vd-gate-corner { display: none; }
    }
  `;
  document.documentElement.appendChild(style);
  document.documentElement.classList.add('vd-locked');

  function buildGate() {
    const gate = document.createElement('div');
    gate.className = 'vd-gate';
    gate.innerHTML = `
      <div class="vd-gate-frame" aria-hidden="true"></div>
      <div class="vd-gate-corner vd-gate-corner--tl">Villa Dream · Hamburg</div>
      <div class="vd-gate-corner vd-gate-corner--br">Est. 2019 · Coming Soon</div>
      <div class="vd-gate-inner">
        <div class="vd-gate-monogram">VD</div>
        <p class="vd-gate-eyebrow">— Privater Vorabblick —</p>
        <h1 class="vd-gate-title">Khosh amadid.</h1>
        <p class="vd-gate-sub">
          Diese Seite ist noch privat.<br/>
          Bitte geben Sie das Zugangswort ein.
        </p>
        <form class="vd-gate-form" id="vdGateForm" autocomplete="off">
          <input
            class="vd-gate-input"
            type="password"
            id="vdGateInput"
            placeholder="Zugangswort"
            autocomplete="off"
            autofocus
            spellcheck="false"
          />
          <button class="vd-gate-btn" type="submit">Eintreten</button>
        </form>
        <p class="vd-gate-error" id="vdGateError">Zugangswort falsch</p>
        <p class="vd-gate-hint">
          Frühbucher und persönlich Eingeladene haben das Wort per E-Mail erhalten.<br/>
          Sonst gerne anfragen.
        </p>
      </div>
    `;
    return gate;
  }

  async function sha256(text) {
    const buf = new TextEncoder().encode(text);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function unlock() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    const gate = document.querySelector('.vd-gate');
    if (gate) {
      gate.style.transition = 'opacity 0.6s ease';
      gate.style.opacity = '0';
      setTimeout(() => {
        document.documentElement.classList.remove('vd-locked');
        gate.remove();
        // Trigger any deferred scroll listeners
        window.dispatchEvent(new Event('scroll'));
      }, 600);
    }
  }

  function mount() {
    const gate = buildGate();
    document.body.appendChild(gate);

    const form  = gate.querySelector('#vdGateForm');
    const input = gate.querySelector('#vdGateInput');
    const error = gate.querySelector('#vdGateError');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pw = input.value.trim();
      if (!pw) return;
      try {
        const h = await sha256(pw);
        if (h === GATE_PASSWORD_HASH) {
          error.classList.remove('is-visible');
          unlock();
        } else {
          error.textContent = 'Zugangswort falsch';
          error.classList.add('is-visible');
          input.value = '';
          input.focus();
        }
      } catch (err) {
        error.textContent = 'Fehler — bitte erneut versuchen';
        error.classList.add('is-visible');
      }
    });
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }
})();
