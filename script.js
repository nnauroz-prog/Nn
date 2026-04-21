(function () {
    'use strict';

    // Mobile Menu
    var toggle = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.nav-links');
    if (toggle && nav) {
        toggle.addEventListener('click', function () {
            nav.classList.toggle('active');
        });
        var links = nav.querySelectorAll('a');
        for (var i = 0; i < links.length; i++) {
            links[i].addEventListener('click', function () {
                nav.classList.remove('active');
            });
        }
    }

    // Date display
    var dateEl = document.getElementById('current-date');
    if (dateEl) {
        var today = new Date();
        dateEl.textContent = today.toLocaleDateString('de-DE', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        });
    }

    // Scroll Animations
    var animEls = document.querySelectorAll('.animate-on-scroll');
    if (animEls.length && 'IntersectionObserver' in window) {
        var animObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    animObs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        animEls.forEach(function (el) { animObs.observe(el); });
    } else {
        animEls.forEach(function (el) { el.classList.add('is-visible'); });
    }

    // Animated Counters
    var counters = document.querySelectorAll('.counter-value');
    if (counters.length && 'IntersectionObserver' in window) {
        var counterObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    counterObs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        counters.forEach(function (el) { counterObs.observe(el); });
    }

    function animateCounter(el) {
        var target = parseInt(el.getAttribute('data-target'), 10);
        var duration = 1500;
        var start = null;
        function step(ts) {
            if (!start) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // Back to Top
    var btt = document.querySelector('.back-to-top');
    if (btt) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 600) {
                btt.classList.add('visible');
            } else {
                btt.classList.remove('visible');
            }
        });
        btt.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Cookie Banner
    var cookie = document.querySelector('.cookie-banner');
    var cookieBtn = document.querySelector('.cookie-accept');
    if (cookie && cookieBtn) {
        if (localStorage.getItem('cookie-accepted')) {
            cookie.style.display = 'none';
        }
        cookieBtn.addEventListener('click', function () {
            localStorage.setItem('cookie-accepted', '1');
            cookie.style.display = 'none';
        });
    }

    // FAQ Accordion
    var faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(function (item) {
        var question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', function () {
                faqItems.forEach(function (other) {
                    if (other !== item) other.classList.remove('open');
                });
                item.classList.toggle('open');
            });
        }
    });

    // Active Nav Highlighting
    var navLinks = document.querySelectorAll('.nav-links a');
    var sections = document.querySelectorAll('section[id]');
    if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
        var navObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var id = entry.target.getAttribute('id');
                    navLinks.forEach(function (l) {
                        l.classList.remove('active');
                        if (l.getAttribute('href') === '#' + id) l.classList.add('active');
                    });
                }
            });
        }, { rootMargin: '-40% 0px -60% 0px' });
        sections.forEach(function (s) { navObs.observe(s); });
    }
})();
