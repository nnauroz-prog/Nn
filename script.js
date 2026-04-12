// === RSS Feed Configuration ===
const RSS_FEEDS = [
    {
        url: 'https://www.aerzteblatt.de/rss/feed.htm?id=228',
        source: 'Deutsches Aerzteblatt',
        category: 'Medizin'
    },
    {
        url: 'https://www.bundesgesundheitsministerium.de/ministerium/meldungen.rss',
        source: 'Bundesgesundheitsministerium',
        category: 'Politik'
    },
    {
        url: 'https://www.pflegen-online.de/rss.xml',
        source: 'pflegen-online',
        category: 'Pflege'
    }
];

// Mehrere CORS-Proxies als Fallback
const PROXIES = [
    function(url) { return 'https://corsproxy.io/?' + encodeURIComponent(url); },
    function(url) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url); },
    function(url) { return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url); }
];

// === Mobile Menu ===
var menuToggle = document.querySelector('.menu-toggle');
var navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', function() {
    navLinks.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() {
        navLinks.classList.remove('active');
    });
});

// === Header Scroll Effect ===
var headerEl = document.querySelector('header');
window.addEventListener('scroll', function() {
    headerEl.style.boxShadow = window.scrollY > 50
        ? '0 2px 16px rgba(0,0,0,0.08)'
        : 'none';
});

// === Newsletter ===
function handleSubscribe(event) {
    event.preventDefault();
    var email = event.target.querySelector('input').value;
    alert('Vielen Dank! Sie erhalten unsere PflegeNews bald an: ' + email);
    event.target.reset();
}

// === Helper Functions ===
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trimEnd() + '...';
}

function formatDate(dateStr) {
    try {
        var date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('de-DE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch(e) {
        return dateStr;
    }
}

function sanitizeHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('script, iframe, object, embed, form, input, style').forEach(function(el) { el.remove(); });
    div.querySelectorAll('*').forEach(function(el) {
        var attrs = [].slice.call(el.attributes);
        attrs.forEach(function(attr) {
            if (attr.name.startsWith('on') || attr.name === 'style') {
                el.removeAttribute(attr.name);
            }
        });
    });
    return div.innerHTML;
}

// === News Card Creation ===
function createNewsCard(article, isFeatured) {
    var card = document.createElement('article');
    card.className = 'news-card' + (isFeatured ? ' featured' : '');
    card.innerHTML =
        '<div class="news-badge">' + escapeHtml(article.category) + '</div>' +
        '<h3>' + escapeHtml(article.title) + '</h3>' +
        '<p>' + escapeHtml(truncate(article.description, 180)) + '</p>' +
        '<div class="news-meta">' +
            '<span class="news-date">' + escapeHtml(article.date) + '</span>' +
            '<span class="news-category">' + escapeHtml(article.source) + '</span>' +
        '</div>';
    card.addEventListener('click', function() { openArticle(article); });
    return card;
}

// === Article Modal ===
function openArticle(article) {
    var modal = document.getElementById('article-modal');
    document.getElementById('modal-badge').textContent = article.category;
    document.getElementById('modal-title').textContent = article.title;
    document.getElementById('modal-date').textContent = article.date;
    document.getElementById('modal-source').textContent = 'Quelle: ' + article.source;

    var bodyEl = document.getElementById('modal-body');
    if (article.fullContent && article.fullContent.trim().length > 50) {
        bodyEl.innerHTML = sanitizeHtml(article.fullContent);
    } else {
        bodyEl.innerHTML = '<p>' + escapeHtml(article.description) + '</p>';
    }

    document.getElementById('modal-link').href = article.link;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('article-modal').hidden = true;
    document.body.style.overflow = '';
}

var overlay = document.querySelector('.modal-overlay');
var closeBtn = document.querySelector('.modal-close');
if (overlay) overlay.addEventListener('click', closeModal);
if (closeBtn) closeBtn.addEventListener('click', closeModal);
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
});

// === RSS Fetching with Proxy Fallback ===
async function fetchWithFallback(url) {
    for (var i = 0; i < PROXIES.length; i++) {
        try {
            var proxyUrl = PROXIES[i](url);
            var controller = new AbortController();
            var timeout = setTimeout(function() { controller.abort(); }, 8000);
            var response = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (!response.ok) continue;
            var text = await response.text();
            if (text && text.length > 100) return text;
        } catch(e) {
            continue;
        }
    }
    return null;
}

async function fetchRSSFeed(feedConfig) {
    try {
        var text = await fetchWithFallback(feedConfig.url);
        if (!text) return [];

        var parser = new DOMParser();
        var xml = parser.parseFromString(text, 'text/xml');
        var items = xml.querySelectorAll('item');
        var articles = [];

        items.forEach(function(item, index) {
            if (index >= 5) return;

            var title = (item.querySelector('title') || {}).textContent || '';
            var link = (item.querySelector('link') || {}).textContent || '';
            var description = (item.querySelector('description') || {}).textContent || '';
            var pubDate = (item.querySelector('pubDate') || {}).textContent || '';
            var contentEl = item.querySelector('content\\:encoded, encoded');
            var content = contentEl ? contentEl.textContent : '';

            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = description;
            var cleanDescription = tempDiv.textContent || tempDiv.innerText || '';

            articles.push({
                title: title.trim(),
                link: link.trim(),
                description: cleanDescription.trim(),
                fullContent: content || description,
                date: pubDate ? formatDate(pubDate) : 'Aktuell',
                rawDate: pubDate ? new Date(pubDate) : new Date(),
                source: feedConfig.source,
                category: feedConfig.category
            });
        });

        return articles;
    } catch(e) {
        console.warn('Fehler bei ' + feedConfig.source + ':', e);
        return [];
    }
}

// === Fallback Static Articles ===
var FALLBACK_ARTICLES = [
    {
        title: 'Pflegereform 2026: Neue Entlastungen fuer Pflegekraefte',
        description: 'Die Bundesregierung hat ein umfassendes Massnahmenpaket zur Staerkung der Pflege beschlossen. Bessere Personalschluessel, hoehere Verguetung und mehr Ausbildungsplaetze sollen den Pflegeberuf attraktiver machen.',
        fullContent: '<p>Die Bundesregierung hat ein umfassendes Massnahmenpaket zur Staerkung der Pflege beschlossen. Zu den wichtigsten Massnahmen gehoeren verbesserte Personalschluessel in Pflegeeinrichtungen, eine spuerbare Erhoehung der Verguetung fuer Pflegekraefte sowie die Schaffung zusaetzlicher Ausbildungsplaetze.</p><p>Bundesgesundheitsminister betonte, dass die Pflege eine der zentralen gesellschaftlichen Aufgaben sei und entsprechende Wertschaetzung verdiene. Die neuen Regelungen sollen schrittweise bis Ende 2026 umgesetzt werden.</p>',
        link: '#',
        date: 'Aktuell',
        rawDate: new Date(),
        source: 'PflegeNews',
        category: 'Politik'
    },
    {
        title: 'Fachkraeftemangel in der Pflege: Aktuelle Zahlen und Loesungsansaetze',
        description: 'Deutschland fehlen zehntausende Pflegefachkraefte. Experten fordern bessere Arbeitsbedingungen, faire Bezahlung und gezielte Zuwanderung qualifizierter Fachkraefte.',
        fullContent: '<p>Der Fachkraeftemangel in der Pflege verschaerft sich weiter. Aktuelle Studien zeigen, dass in Deutschland zehntausende Pflegefachkraefte fehlen - Tendenz steigend.</p><p>Experten sehen mehrere Ansatzpunkte: bessere Arbeitsbedingungen, faire Bezahlung, Reduzierung der Buerokratie und gezielte Anwerbung internationaler Fachkraefte. Auch die Digitalisierung kann helfen, Pflegekraefte zu entlasten.</p>',
        link: '#',
        date: 'Aktuell',
        rawDate: new Date(Date.now() - 86400000),
        source: 'PflegeNews',
        category: 'Arbeitswelt'
    },
    {
        title: 'Digitalisierung in der Pflege: Apps und Technologien im Praxistest',
        description: 'Digitale Pflegedokumentation, Telemedizin und smarte Hilfsmittel versprechen Entlastung im Pflegealltag. Ein Ueberblick ueber aktuelle Entwicklungen.',
        fullContent: '<p>Die Digitalisierung haelt Einzug in die Pflege. Elektronische Pflegedokumentation ersetzt zunehmend die Papierakte, Telemedizin ermoeglicht aerztliche Konsultationen aus der Ferne und intelligente Sensorsysteme koennen Stuerze fruehzeitig erkennen.</p><p>Pflegeeinrichtungen berichten von positiven Erfahrungen: Die digitale Dokumentation spart Zeit, und Pflegekraefte koennen sich staerker auf die eigentliche Betreuung konzentrieren.</p>',
        link: '#',
        date: 'Aktuell',
        rawDate: new Date(Date.now() - 172800000),
        source: 'PflegeNews',
        category: 'Digitalisierung'
    },
    {
        title: 'Pflegegrad beantragen: Was Angehoerige wissen muessen',
        description: 'Der Weg zum Pflegegrad kann kompliziert sein. Hier erfahren Sie, wie der Antrag funktioniert, welche Leistungen Ihnen zustehen und worauf Sie achten sollten.',
        fullContent: '<p>Wer einen Pflegegrad beantragen moechte, stellt den Antrag bei der Pflegekasse. Diese beauftragt den Medizinischen Dienst (MD) mit der Begutachtung. Dabei werden sechs Lebensbereiche geprueft: Mobilitaet, kognitive Faehigkeiten, Verhaltensweisen, Selbstversorgung, Umgang mit Krankheit und Alltagsgestaltung.</p><p>Tipp: Fuehren Sie vorab ein Pflegetagebuch und dokumentieren Sie den taeglichen Pflegeaufwand. Das hilft bei der Begutachtung, den tatsaechlichen Pflegebedarf realistisch einzuschaetzen.</p>',
        link: '#',
        date: 'Aktuell',
        rawDate: new Date(Date.now() - 259200000),
        source: 'PflegeNews',
        category: 'Ratgeber'
    },
    {
        title: 'Selbstfuersorge im Pflegeberuf: Tipps gegen Burnout',
        description: 'Pflegekraefte sind hohen Belastungen ausgesetzt. Wie Sie im Berufsalltag auf Ihre eigene Gesundheit achten und einem Burnout vorbeugen koennen.',
        fullContent: '<p>Die physische und psychische Belastung im Pflegeberuf ist enorm. Studien zeigen, dass Pflegekraefte ueberdurchschnittlich haeufig von Burnout betroffen sind.</p><p>Wichtige Massnahmen zur Selbstfuersorge: regelmaessige Pausen einhalten, Grenzen setzen lernen, koerperlichen Ausgleich durch Sport schaffen, soziale Kontakte pflegen und bei Bedarf professionelle Unterstuetzung in Anspruch nehmen. Auch Arbeitgeber stehen in der Pflicht, gesundheitsfoerdernde Strukturen zu schaffen.</p>',
        link: '#',
        date: 'Aktuell',
        rawDate: new Date(Date.now() - 345600000),
        source: 'PflegeNews',
        category: 'Gesundheit'
    },
    {
        title: 'Ambulante Pflege: Vorteile der Versorgung zu Hause',
        description: 'Immer mehr Menschen entscheiden sich fuer ambulante Pflege. Welche Voraussetzungen noetig sind und welche Unterstuetzung es gibt.',
        fullContent: '<p>Die Mehrheit der pflegebeduerftigen Menschen in Deutschland wird zu Hause versorgt - durch Angehoerige, ambulante Pflegedienste oder eine Kombination aus beidem.</p><p>Die ambulante Pflege bietet viele Vorteile: Die vertraute Umgebung foerdert das Wohlbefinden, soziale Kontakte bleiben erhalten und die Versorgung kann individuell angepasst werden. Pflegekassen unterstuetzen die haeusliche Pflege mit Pflegegeld, Sachleistungen und Entlastungsbeitraegen.</p>',
        link: '#',
        date: 'Aktuell',
        rawDate: new Date(Date.now() - 432000000),
        source: 'PflegeNews',
        category: 'Pflege'
    }
];

// === Main Load Function ===
async function loadNews() {
    var grid = document.getElementById('news-grid');
    var loading = document.getElementById('news-loading');

    // Sofort Fallback-Artikel anzeigen
    loading.style.display = 'none';
    FALLBACK_ARTICLES.forEach(function(article, index) {
        grid.appendChild(createNewsCard(article, index === 0));
    });

    // Im Hintergrund Live-Feeds laden
    try {
        var results = await Promise.allSettled(
            RSS_FEEDS.map(function(feed) { return fetchRSSFeed(feed); })
        );

        var liveArticles = [];
        results.forEach(function(result) {
            if (result.status === 'fulfilled' && result.value.length > 0) {
                liveArticles = liveArticles.concat(result.value);
            }
        });

        // Nur ersetzen wenn Live-Artikel vorhanden
        if (liveArticles.length > 0) {
            liveArticles.sort(function(a, b) { return b.rawDate - a.rawDate; });
            grid.innerHTML = '';
            liveArticles.slice(0, 12).forEach(function(article, index) {
                grid.appendChild(createNewsCard(article, index === 0));
            });
        }
    } catch(e) {
        // Fallback bleibt stehen
        console.warn('Live-Feeds konnten nicht geladen werden:', e);
    }
}

loadNews();
