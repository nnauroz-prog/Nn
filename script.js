// PflegeInfo - Informationsportal
// Minimales Script: mobile Navigation + Datumsanzeige

(function () {
    'use strict';

    // Datum in der Dateline
    var dateEl = document.getElementById('current-date');
    if (dateEl) {
        try {
            var today = new Date();
            dateEl.textContent = today.toLocaleDateString('de-DE', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        } catch (e) {
            dateEl.textContent = '';
        }
    }

    // Mobile Menue
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
})();
