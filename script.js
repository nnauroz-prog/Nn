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

    if (header) {
      if (y > 30) header.classList.add('scrolled');
      else        header.classList.remove('scrolled');
    }

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

  /* ----- Pause video when not in viewport (Performance) ----- */
  if (heroVideo && 'IntersectionObserver' in window) {
    const vio = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        heroVideo.play().catch(() => {});
      } else {
        heroVideo.pause();
      }
    }, { threshold: 0.05 });
    vio.observe(document.querySelector('.hero'));
  }
})();
