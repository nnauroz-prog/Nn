// === RSS Feed Configuration ===
// Verlaessliche deutsche Pflege- und Gesundheitsquellen
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

const PROXY_URL = 'https://api.allorigins.win/raw?url=';

// === Mobile Menu ===
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// === Header Scroll Effect ===
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 50
        ? '0 2px 16px rgba(0,0,0,0.08)'
        : 'none';
});

// === Newsletter ===
function handleSubscribe(event) {
    event.preventDefault();
    const email = event.target.querySelector('input').value;
    alert('Vielen Dank! Sie erhalten unsere PflegeNews bald an: ' + email);
    event.target.reset();
}

// === RSS Feed Fetching ===
async function fetchRSSFeed(feedConfig) {
    try {
        const response = await fetch(PROXY_URL + encodeURIComponent(feedConfig.url));
        if (!response.ok) throw new Error('Feed nicht erreichbar');
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');

        const items = xml.querySelectorAll('item');
        const articles = [];

        items.forEach((item, index) => {
            if (index >= 5) return; // Max 5 Artikel pro Quelle

            const title = item.querySelector('title')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const content = item.querySelector('content\\:encoded, encoded')?.textContent || '';

            // HTML-Tags aus der Beschreibung entfernen fuer die Vorschau
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = description;
            const cleanDescription = tempDiv.textContent || tempDiv.innerText || '';

            // Volltext fuer Modal
            const fullDiv = document.createElement('div');
            fullDiv.innerHTML = content || description;
            const fullText = fullDiv.innerHTML;

            articles.push({
                title: title.trim(),
                link: link.trim(),
                description: cleanDescription.trim(),
                fullContent: fullText,
                date: pubDate ? formatDate(pubDate) : 'Aktuell',
                rawDate: pubDate ? new Date(pubDate) : new Date(),
                source: feedConfig.source,
                category: feedConfig.category
            });
        });

        return articles;
    } catch (error) {
        console.warn('Fehler beim Laden von ' + feedConfig.source + ':', error);
        return [];
    }
}

function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('de-DE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

function createNewsCard(article, isFeatured) {
    const card = document.createElement('article');
    card.className = 'news-card' + (isFeatured ? ' featured' : '');

    card.innerHTML =
        '<div class="news-badge">' + escapeHtml(article.category) + '</div>' +
        '<h3>' + escapeHtml(article.title) + '</h3>' +
        '<p>' + escapeHtml(truncate(article.description, 180)) + '</p>' +
        '<div class="news-meta">' +
            '<span class="news-date">' + escapeHtml(article.date) + '</span>' +
            '<span class="news-category">' + escapeHtml(article.source) + '</span>' +
        '</div>';

    card.addEventListener('click', () => openArticle(article));
    return card;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trimEnd() + '...';
}

// === Article Modal ===
function openArticle(article) {
    const modal = document.getElementById('article-modal');
    document.getElementById('modal-badge').textContent = article.category;
    document.getElementById('modal-title').textContent = article.title;
    document.getElementById('modal-date').textContent = article.date;
    document.getElementById('modal-source').textContent = 'Quelle: ' + article.source;

    // Artikelinhalt anzeigen
    const bodyEl = document.getElementById('modal-body');
    if (article.fullContent && article.fullContent.trim().length > 50) {
        bodyEl.innerHTML = sanitizeHtml(article.fullContent);
    } else {
        bodyEl.innerHTML = '<p>' + escapeHtml(article.description) + '</p>';
    }

    const linkEl = document.getElementById('modal-link');
    linkEl.href = article.link;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('article-modal');
    modal.hidden = true;
    document.body.style.overflow = '';
}

function sanitizeHtml(html) {
    // Nur sichere Tags erlauben
    const div = document.createElement('div');
    div.innerHTML = html;

    // Skripte und unsichere Elemente entfernen
    div.querySelectorAll('script, iframe, object, embed, form, input, style').forEach(el => el.remove());

    // Inline-Event-Handler entfernen
    div.querySelectorAll('*').forEach(el => {
        for (const attr of [...el.attributes]) {
            if (attr.name.startsWith('on') || attr.name === 'style') {
                el.removeAttribute(attr.name);
            }
        }
    });

    return div.innerHTML;
}

// Modal-Events
document.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
document.querySelector('.modal-close')?.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// === Load All News ===
async function loadNews() {
    const grid = document.getElementById('news-grid');
    const loading = document.getElementById('news-loading');

    // Alle Feeds parallel laden
    const results = await Promise.allSettled(
        RSS_FEEDS.map(feed => fetchRSSFeed(feed))
    );

    // Artikel zusammenfuehren und nach Datum sortieren
    let allArticles = [];
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            allArticles = allArticles.concat(result.value);
        }
    });

    allArticles.sort((a, b) => b.rawDate - a.rawDate);

    // Loading ausblenden
    if (loading) loading.style.display = 'none';

    if (allArticles.length === 0) {
        grid.innerHTML = '<p class="loading">Nachrichten konnten nicht geladen werden. Bitte versuchen Sie es spaeter erneut.</p>';
        return;
    }

    // Artikel anzeigen (max 12)
    const displayArticles = allArticles.slice(0, 12);
    displayArticles.forEach((article, index) => {
        grid.appendChild(createNewsCard(article, index === 0));
    });
}

// Beim Laden der Seite News abrufen
loadNews();
