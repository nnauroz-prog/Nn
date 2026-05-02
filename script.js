/* ==========================================================================
   Villa Dream Hamburg — Frontend Script
   ========================================================================== */

(() => {
  'use strict';

  const header     = document.getElementById('siteHeader');
  const heroVideo  = document.querySelector('.hero-video');
  const heroVeil   = document.querySelector('.hero-veil');
  const heroImage  = document.querySelector('.hero-image');

  /* ----- Header: scrolled state ----- */
  const onScroll = () => {
    const y = window.scrollY;
    const compact = y > 30;

    if (header) {
      header.classList.toggle('scrolled', compact);
    }
    /* body.is-compact blendet Announce-Bar + Top-Bar aus,
       Header rückt an den oberen Rand */
    document.body.classList.toggle('is-compact', compact);

    /* ---- Cinematic hero fade-out ----
       Video & Veil bleiben fixed, fadern aber raus, je weiter man scrollt.
       Bei 0 sichtbar, bei viewport-Höhe komplett unsichtbar. */
    const vh = window.innerHeight;
    const fade = Math.max(0, Math.min(1, 1 - (y / (vh * 0.95))));
    const scale = 1 + (1 - fade) * 0.08;

    if (heroVideo) {
      heroVideo.style.opacity = fade;
      heroVideo.style.transform = `scale(${scale})`;
    }
    if (heroImage) {
      heroImage.style.opacity = fade;
      heroImage.style.transform = `scale(${scale})`;
    }
    if (heroVeil) {
      // Veil etwas länger sichtbar lassen für sanfteren Übergang
      const veilFade = Math.max(0, Math.min(1, 1 - (y / (vh * 1.05))));
      heroVeil.style.opacity = veilFade;
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ----- Mobile navigation ----- */
  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('primaryNav');

  if (toggle && nav) {
    const closeMenu = () => {
      toggle.classList.remove('is-open');
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };
    const openMenu = () => {
      toggle.classList.add('is-open');
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };
    toggle.addEventListener('click', () => {
      nav.classList.contains('is-open') ? closeMenu() : openMenu();
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) closeMenu();
    });
  }

  /* ----- Reveal on scroll ----- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  /* ----- Smooth anchor scroll with header offset ----- */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const headerH = header ? header.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH + 1;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ----- Footer year ----- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ----- Hero-Video: zuverlässiges Autoplay -----
     Strategie: muted-State auf jeder Ebene (HTML-Attribut, JS-Property,
     volume=0) festschreiben, das Video aktiv laden und bei jedem
     Browser-Loading-Event einen Play-Versuch starten. Keine pause()-
     Calls aus IntersectionObservern — die fechten Autoplay an. */
  if (heroVideo) {
    // Muted hart festschreiben — manche Browser respektieren das HTML-Attribut
    // alleine nicht zuverlässig (z.B. iOS Safari Low Power Mode, Edge).
    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.volume = 0;
    heroVideo.setAttribute('muted', '');
    heroVideo.setAttribute('playsinline', '');
    heroVideo.setAttribute('webkit-playsinline', '');
    // Video soll inline laufen, NICHT in den Vollbild-Player iOSs springen
    heroVideo.playsInline = true;

    const playVideo = () => {
      // Vor jedem Play-Aufruf muted erneut sicherstellen — manche Tools
      // (z.B. Browser-Erweiterungen) setzen das zurück.
      heroVideo.muted = true;
      const promise = heroVideo.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => { /* Wiederholung beim nächsten Event */ });
      }
    };

    // Sofortiger Versuch, sobald das Script läuft
    playVideo();

    // Bei jedem Loading-Meilenstein einen Versuch starten
    ['loadstart','loadedmetadata','loadeddata','canplay','canplaythrough','progress']
      .forEach(ev => heroVideo.addEventListener(ev, playVideo, { passive: true }));

    // Falls der Browser ohne Grund pausiert hat — sofort weitermachen
    heroVideo.addEventListener('pause', () => {
      // Nur wenn das Video noch im Viewport ist (oben auf der Seite)
      if (window.scrollY < window.innerHeight * 0.95) {
        setTimeout(playVideo, 50);
      }
    });

    // Aktiv laden (preload="auto" alleine reicht manchmal nicht)
    try { heroVideo.load(); } catch (e) {}

    // Erste User-Interaktion entsperrt Autoplay in jedem Fall
    const interactionEvents = ['click','touchstart','touchend','scroll','keydown','mousemove','wheel','pointerdown'];
    const onInteraction = () => {
      playVideo();
      interactionEvents.forEach(ev =>
        document.removeEventListener(ev, onInteraction, { passive: true })
      );
    };
    interactionEvents.forEach(ev =>
      document.addEventListener(ev, onInteraction, { once: true, passive: true })
    );

    // Wenn der Tab wieder aktiv wird, Video weiterlaufen lassen
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) playVideo();
    });

    // Wenn das Fenster Fokus bekommt
    window.addEventListener('focus', playVideo);

    // Periodischer Watchdog: alle 1 Sekunde prüfen ob das Video läuft,
    // und falls nicht (und es sollte), erneut starten. Stoppt automatisch
    // nach ein paar erfolgreichen Sekunden.
    let attempts = 0;
    const watchdog = setInterval(() => {
      attempts++;
      if (heroVideo.paused && window.scrollY < window.innerHeight) {
        playVideo();
      }
      if (attempts > 15 || (!heroVideo.paused && heroVideo.currentTime > 1)) {
        clearInterval(watchdog);
      }
    }, 800);
  }
})();
