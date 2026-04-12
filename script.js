// === Krankenkassen RSS Feeds (via presseportal.de) ===
var RSS_FEEDS = [
    {
        url: 'https://www.presseportal.de/rss/pm_8304.rss2',
        source: 'BARMER'
    },
    {
        url: 'https://www.presseportal.de/rss/pm_6910.rss2',
        source: 'Techniker Krankenkasse'
    },
    {
        url: 'https://www.presseportal.de/rss/pm_8697.rss2',
        source: 'AOK Bundesverband'
    },
    {
        url: 'https://www.presseportal.de/rss/pm_50313.rss2',
        source: 'DAK Gesundheit'
    },
    {
        url: 'https://www.presseportal.de/rss/pm_76022.rss2',
        source: 'Knappschaft'
    }
];

var PROXIES = [
    function(url) { return 'https://corsproxy.io/?' + encodeURIComponent(url); },
    function(url) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url); },
    function(url) { return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url); }
];

// === Mobile Menu ===
var menuToggle = document.querySelector('.menu-toggle');
var navLinks = document.querySelector('.nav-links');
menuToggle.addEventListener('click', function() { navLinks.classList.toggle('active'); });
navLinks.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() { navLinks.classList.remove('active'); });
});

// === Header Scroll ===
var headerEl = document.querySelector('header');
window.addEventListener('scroll', function() {
    headerEl.style.boxShadow = window.scrollY > 30 ? '0 2px 12px rgba(0,0,0,0.15)' : 'none';
});

// === Helpers ===
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncate(text, max) {
    if (text.length <= max) return text;
    return text.substring(0, max).trimEnd() + '...';
}

function formatDate(dateStr) {
    try {
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch(e) { return dateStr; }
}

function sanitizeHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('script,iframe,object,embed,form,input,style').forEach(function(el) { el.remove(); });
    div.querySelectorAll('*').forEach(function(el) {
        [].slice.call(el.attributes).forEach(function(attr) {
            if (attr.name.startsWith('on') || attr.name === 'style') el.removeAttribute(attr.name);
        });
    });
    return div.innerHTML;
}

// === News Item (classic list style) ===
function createNewsItem(article, isFeatured) {
    var item = document.createElement('div');
    item.className = 'news-item' + (isFeatured ? ' news-item-featured' : '');
    item.innerHTML =
        '<div class="news-item-source">' + escapeHtml(article.source) + '</div>' +
        '<h3>' + escapeHtml(article.title) + '</h3>' +
        '<p>' + escapeHtml(truncate(article.description, 200)) + '</p>' +
        '<div class="news-item-date">' + escapeHtml(article.date) + '</div>';
    item.addEventListener('click', function() { openArticle(article); });
    return item;
}

// === Article Modal ===
function openArticle(article) {
    document.getElementById('modal-source-line').textContent = article.source;
    document.getElementById('modal-title').textContent = article.title;
    document.getElementById('modal-date').textContent = article.date;

    var bodyEl = document.getElementById('modal-body');
    if (article.fullContent && article.fullContent.trim().length > 50) {
        bodyEl.innerHTML = sanitizeHtml(article.fullContent);
    } else {
        bodyEl.innerHTML = '<p>' + escapeHtml(article.description) + '</p>';
    }

    document.getElementById('modal-link').href = article.link;
    document.getElementById('article-modal').hidden = false;
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
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });

// === RSS Fetching ===
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
        } catch(e) { continue; }
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
            if (index >= 4) return;

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
                source: feedConfig.source
            });
        });

        return articles;
    } catch(e) {
        console.warn('Fehler bei ' + feedConfig.source + ':', e);
        return [];
    }
}

// === Fallback Articles ===
var FALLBACK_ARTICLES = [
    {
        title: 'Pflegereform: Krankenkassen fordern nachhaltige Finanzierung',
        description: 'Die grossen deutschen Krankenkassen mahnen eine nachhaltige Finanzierung der Pflegeversicherung an. Ohne strukturelle Reformen drohen weitere Beitragserhoehungen fuer die Versicherten.',
        fullContent: '<p>Die grossen deutschen Krankenkassen mahnen eine nachhaltige Finanzierung der Pflegeversicherung an. Ohne strukturelle Reformen drohen weitere Beitragserhoehungen fuer die Versicherten.</p><p>Vertreter von Barmer, Techniker Krankenkasse und AOK betonten, dass die steigenden Ausgaben in der Pflege langfristig nur durch eine Kombination aus Effizienzsteigerungen und solider Finanzierung aufgefangen werden koennten.</p>',
        link: '#', date: 'Aktuell', rawDate: new Date(), source: 'BARMER'
    },
    {
        title: 'Studie: Immer mehr Menschen nutzen digitale Gesundheitsanwendungen',
        description: 'Laut einer aktuellen Erhebung der Techniker Krankenkasse steigt die Nutzung von Gesundheits-Apps und digitalen Angeboten in der Pflege deutlich an.',
        fullContent: '<p>Laut einer aktuellen Erhebung der Techniker Krankenkasse steigt die Nutzung von Gesundheits-Apps und digitalen Angeboten in der Pflege deutlich an. Besonders bei der Medikamentenverwaltung und der Kommunikation mit Pflegediensten setzen Versicherte zunehmend auf digitale Loesungen.</p><p>Die Krankenkasse sieht darin eine Chance, die Versorgungsqualitaet zu verbessern und Pflegende zu entlasten.</p>',
        link: '#', date: 'Aktuell', rawDate: new Date(Date.now() - 86400000), source: 'Techniker Krankenkasse'
    },
    {
        title: 'AOK-Pflegereport: Arbeitsbedingungen in der Pflege muessen sich verbessern',
        description: 'Der aktuelle Pflegereport des AOK Bundesverbands zeigt: Die Arbeitsbedingungen in der Pflege sind weiterhin belastend. Die Kasse fordert verbindliche Personaluntergrenzen.',
        fullContent: '<p>Der aktuelle Pflegereport des AOK Bundesverbands zeigt: Die Arbeitsbedingungen in der Pflege sind weiterhin belastend. Ueberstunden, hohe koerperliche Belastung und emotionaler Stress praegen den Berufsalltag vieler Pflegekraefte.</p><p>Der AOK Bundesverband fordert verbindliche Personaluntergrenzen und bessere Verguetungsstrukturen, um den Beruf attraktiver zu machen und dem Fachkraeftemangel entgegenzuwirken.</p>',
        link: '#', date: 'Aktuell', rawDate: new Date(Date.now() - 172800000), source: 'AOK Bundesverband'
    },
    {
        title: 'DAK-Gesundheitsreport: Pflegende Angehoerige staerker unterstuetzen',
        description: 'Der DAK-Gesundheitsreport macht deutlich, dass pflegende Angehoerige haeufiger unter gesundheitlichen Problemen leiden. Die Kasse fordert bessere Entlastungsangebote.',
        fullContent: '<p>Der DAK-Gesundheitsreport macht deutlich, dass pflegende Angehoerige haeufiger unter gesundheitlichen Problemen leiden als der Durchschnitt der Bevoelkerung. Besonders Rueckenschmerzen, Schlafprobleme und psychische Belastungen treten vermehrt auf.</p><p>Die DAK Gesundheit fordert den Ausbau von Entlastungsangeboten wie Kurzzeitpflege, Verhinderungspflege und Beratungsleistungen, um pflegende Angehoerige besser zu unterstuetzen.</p>',
        link: '#', date: 'Aktuell', rawDate: new Date(Date.now() - 259200000), source: 'DAK Gesundheit'
    },
    {
        title: 'Knappschaft erweitert Praeventionsprogramme fuer Pflegebedürftige',
        description: 'Die Knappschaft baut ihre Praeventionsangebote aus. Neue Programme sollen Pflegebeduerftigkeit verhindern oder hinauszuzoegern helfen.',
        fullContent: '<p>Die Knappschaft baut ihre Praeventionsangebote deutlich aus. Neue Programme zur Sturzpraevention, Ernaehrungsberatung und Bewegungsfoerderung sollen dazu beitragen, Pflegebeduerftigkeit zu verhindern oder hinauszuzoegern.</p><p>Die Angebote richten sich sowohl an aeltere Versicherte als auch an bereits pflegebeduertige Menschen in ambulanter und stationaerer Versorgung.</p>',
        link: '#', date: 'Aktuell', rawDate: new Date(Date.now() - 345600000), source: 'Knappschaft'
    }
];

// === Main Load ===
async function loadNews() {
    var grid = document.getElementById('news-grid');
    var loading = document.getElementById('news-loading');

    // Sofort Fallback anzeigen
    loading.style.display = 'none';
    FALLBACK_ARTICLES.forEach(function(article, index) {
        grid.appendChild(createNewsItem(article, index === 0));
    });

    // Live-Feeds im Hintergrund laden
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

        if (liveArticles.length > 0) {
            liveArticles.sort(function(a, b) { return b.rawDate - a.rawDate; });
            grid.innerHTML = '';
            liveArticles.slice(0, 15).forEach(function(article, index) {
                grid.appendChild(createNewsItem(article, index === 0));
            });
        }
    } catch(e) {
        console.warn('Live-Feeds nicht verfuegbar:', e);
    }
}

loadNews();
