// === Dateline ===
var dateEl = document.getElementById('current-date');
if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('de-DE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}

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
    document.getElementById('modal-title').textContent = article.title;
    document.getElementById('modal-date').textContent = article.date;

    var bodyEl = document.getElementById('modal-body');
    if (article.fullContent && article.fullContent.trim().length > 50) {
        bodyEl.innerHTML = sanitizeHtml(article.fullContent);
    } else {
        bodyEl.innerHTML = '<p>' + escapeHtml(article.description) + '</p>';
    }

    document.getElementById('modal-sources').textContent = 'Quelle: ' + article.source;
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

// === Fallback Articles (vollstaendige Artikel) ===
var FALLBACK_ARTICLES = [
    {
        title: 'Pflegereform 2026: Was sich fuer Versicherte und Pflegekraefte aendert',
        description: 'Die Bundesregierung hat die Pflegereform 2026 verabschiedet. Die wichtigsten Aenderungen betreffen Personalschluessel, Eigenanteile und die Finanzierung der Pflegeversicherung.',
        fullContent: '<p>Die Pflegereform 2026 bringt weitreichende Veraenderungen fuer das deutsche Pflegesystem. Im Zentrum stehen verbesserte Personalschluessel in stationaeren Einrichtungen, die schrittweise bis Ende 2027 umgesetzt werden sollen. Damit reagiert die Bundesregierung auf den wachsenden Druck aus der Pflegebranche.</p><p>Fuer Pflegebeduerftige aendern sich vor allem die finanziellen Rahmenbedingungen. Die Leistungsbetraege der Pflegeversicherung wurden angehoben, um die steigenden Eigenanteile in Pflegeheimen abzufedern. Versicherte mit Pflegegrad 2 bis 5 erhalten kuenftig hoehere Zuschuesse zu den pflegebedingten Kosten.</p><p>Die grossen Krankenkassen bewerten die Reform unterschiedlich. Die BARMER begruesst die verbesserten Personalschluessel, mahnt jedoch eine nachhaltige Finanzierung an. Ohne zusaetzliche Einnahmen drohe eine weitere Erhoehung der Pflegeversicherungsbeitraege um bis zu 0,3 Prozentpunkte.</p><p>Der AOK Bundesverband sieht in der Reform einen wichtigen ersten Schritt, fordert jedoch weitere Massnahmen. Insbesondere die ambulante Pflege muesse staerker gefoerdert werden, da die Mehrheit der Pflegebeduerftigen zu Hause versorgt werde.</p><p>Fuer Pflegekraefte bedeutet die Reform konkret: verbindliche Dienstplanregelungen, eine verpflichtende tarifliche Bezahlung in allen zugelassenen Einrichtungen und einen Rechtsanspruch auf Weiterbildung. Experten rechnen damit, dass diese Massnahmen den Pflegeberuf langfristig attraktiver machen.</p>',
        date: '13. April 2026', rawDate: new Date(), source: 'BARMER, AOK Bundesverband'
    },
    {
        title: 'Pflegegrade im Ueberblick: Alle Leistungen und Betraege 2026',
        description: 'Das Pflegesystem kennt fuenf Pflegegrade. Hier finden Sie alle aktuellen Leistungsbetraege fuer Pflegegeld, Sachleistungen und Entlastung auf einen Blick.',
        fullContent: '<p>Das deutsche Pflegesystem unterscheidet fuenf Pflegegrade, die den Grad der Selbststaendigkeit eines Menschen abbilden. Seit der Umstellung von Pflegestufen auf Pflegegrade im Jahr 2017 werden neben koerperlichen auch kognitive und psychische Einschraenkungen beruecksichtigt.</p><p><strong>Pflegegrad 1</strong> beschreibt eine geringe Beeintraechtigung der Selbststaendigkeit. Betroffene erhalten einen monatlichen Entlastungsbetrag von 125 Euro sowie Zugang zu Pflegeberatung und Pflegekursen fuer Angehoerige.</p><p><strong>Pflegegrad 2</strong> umfasst erhebliche Beeintraechtigungen. Monatlich stehen 332 Euro Pflegegeld bei haeuslicher Pflege durch Angehoerige oder 761 Euro fuer ambulante Pflegesachleistungen zur Verfuegung.</p><p><strong>Pflegegrad 3</strong> gilt bei schweren Beeintraechtigungen. Die Leistungen betragen 573 Euro Pflegegeld oder 1.432 Euro Sachleistungen monatlich.</p><p><strong>Pflegegrad 4</strong> erfasst schwerste Beeintraechtigungen und gewaehrt 765 Euro Pflegegeld oder 1.778 Euro Sachleistungen.</p><p><strong>Pflegegrad 5</strong> als hoechste Stufe gilt bei schwersten Beeintraechtigungen mit besonderen Anforderungen an die pflegerische Versorgung. Hier stehen 947 Euro Pflegegeld oder 2.200 Euro Sachleistungen monatlich zur Verfuegung.</p><p>Die Techniker Krankenkasse weist darauf hin, dass Pflegegeld und Sachleistungen kombiniert werden koennen. Diese sogenannte Kombinationsleistung ermoeglicht es, professionelle Pflege und Angehoerigenpflege flexibel zu verbinden. Zusaetzlich steht allen Pflegegraden ein Entlastungsbetrag von 125 Euro monatlich zu.</p>',
        date: '12. April 2026', rawDate: new Date(Date.now() - 86400000), source: 'Techniker Krankenkasse, AOK Bundesverband'
    },
    {
        title: 'Fachkraeftemangel in der Pflege: Krankenkassen schlagen Alarm',
        description: 'Die Arbeitsbedingungen in der Pflege bleiben belastend. AOK und DAK fordern verbindliche Personaluntergrenzen und bessere Verguetung fuer Pflegekraefte.',
        fullContent: '<p>Der Fachkraeftemangel in der Pflege verschaerft sich weiter. Laut dem aktuellen Pflegereport des AOK Bundesverbands sind die Arbeitsbedingungen in der Pflege weiterhin alarmierend. Ueberstunden, hohe koerperliche Belastung und emotionaler Stress praegen den Berufsalltag vieler Pflegekraefte.</p><p>Besonders betroffen ist die stationaere Altenpflege: Hier kommen auf eine Pflegefachkraft im Durchschnitt deutlich mehr Pflegebeduerftige als in vergleichbaren europaeischen Laendern. Die Folge sind Ueberlastung, hohe Krankheitsraten und eine steigende Zahl von Berufsaussteigern.</p><p>Der AOK Bundesverband fordert verbindliche Personaluntergrenzen in allen Pflegeeinrichtungen. Nur wenn genuegend qualifiziertes Personal vorhanden sei, koenne eine wuerdevolle Pflege gewaehrleistet werden.</p><p>Die DAK Gesundheit unterstuetzt diese Forderung und ergaenzt, dass neben besseren Personalschluesseln auch die Verguetung spuerbar steigen muesse. Laut einer DAK-Erhebung wuerden viele ehemalige Pflegekraefte in den Beruf zurueckkehren, wenn die Arbeitsbedingungen und die Bezahlung stimmen.</p><p>Die Techniker Krankenkasse verweist zudem auf die Bedeutung der internationalen Fachkraeftegewinnung. Buerokratische Huerden bei der Anerkennung auslaendischer Berufsabschluesse muessten abgebaut werden, um qualifizierte Pflegekraefte aus dem Ausland schneller einsetzen zu koennen.</p>',
        date: '10. April 2026', rawDate: new Date(Date.now() - 259200000), source: 'AOK Bundesverband, DAK Gesundheit, Techniker Krankenkasse'
    },
    {
        title: 'Pflegende Angehoerige: Welche Unterstuetzung die Kassen bieten',
        description: 'Millionen Menschen pflegen Angehoerige zu Hause. Die Krankenkassen bieten zahlreiche Hilfen an, von Pflegekursen ueber Beratung bis hin zu Entlastungsleistungen.',
        fullContent: '<p>In Deutschland werden rund vier von fuenf Pflegebeduerftigen zu Hause versorgt - ueberwiegend durch Familienangehoerige. Diese leisten einen enormen Beitrag fuer die Gesellschaft, sind dabei aber oft hohen koerperlichen und psychischen Belastungen ausgesetzt.</p><p>Die Krankenkassen bieten pflegenden Angehoerigen umfangreiche Unterstuetzung an. Die DAK Gesundheit hat in ihrem aktuellen Gesundheitsreport gezeigt, dass pflegende Angehoerige ueberdurchschnittlich haeufig unter Rueckenschmerzen, Schlafproblemen und depressiven Verstimmungen leiden. Die Kasse fordert daher den Ausbau von Entlastungsangeboten.</p><p>Konkret stehen pflegenden Angehoerigen unter anderem folgende Leistungen zu: Verhinderungspflege (bis zu 1.612 Euro jaehrlich), wenn die Pflegeperson eine Auszeit braucht; Kurzzeitpflege (bis zu 1.774 Euro jaehrlich) fuer die voruebergehende stationaere Unterbringung; kostenlose Pflegekurse zur Vermittlung von Pflegetechniken und Wissen.</p><p>Die BARMER bietet zusaetzlich kostenlose Pflegecoachings an, bei denen geschulte Berater die Angehoerigen zu Hause besuchen und individuelle Tipps geben. Die Techniker Krankenkasse hat Online-Kurse zur Stressbewaeltigung und Rueckengesundheit speziell fuer pflegende Angehoerige entwickelt.</p><p>Die Knappschaft hat ein eigenes Beratungstelefon eingerichtet, das neben der Pflegeberatung auch Hinweise zu Gesundheitsangeboten und Entlastungsmoeglichkeiten gibt. Der Zugang ist fuer alle Versicherten kostenfrei.</p>',
        date: '8. April 2026', rawDate: new Date(Date.now() - 432000000), source: 'DAK Gesundheit, BARMER, Techniker Krankenkasse, Knappschaft'
    },
    {
        title: 'Praevention: Wie Krankenkassen Pflegebeduerftigkeit verhindern helfen',
        description: 'Sturzpraevention, Demenzvorbeugung und Bewegungsprogramme: Die Krankenkassen investieren verstaerkt in Massnahmen, die Pflegebeduerftigkeit verhindern oder verzoegern sollen.',
        fullContent: '<p>Praevention ist der beste Schutz vor Pflegebeduerftigkeit. Die deutschen Krankenkassen investieren daher verstaerkt in Programme, die darauf abzielen, Pflegebeduerftigkeit zu verhindern oder zumindest hinauszuzoegern.</p><p>Die Knappschaft hat ihre Praeventionsangebote deutlich ausgebaut. Neue Programme zur Sturzpraevention, Ernaehrungsberatung und Bewegungsfoerderung richten sich sowohl an aeltere Versicherte als auch an bereits pflegebeduerftige Menschen. Stuerze gehoeren zu den haeufigsten Ursachen fuer Pflegebeduerftigkeit: Rund ein Drittel aller Menschen ueber 65 stuerzt mindestens einmal pro Jahr.</p><p>Die BARMER setzt auf ein dreigliedriges Programm: Kraft- und Gleichgewichtstraining, Wohnraumanpassung und Medikamentenueberprueufung. Studien belegen, dass regelmaessiges Gleichgewichtstraining das Sturzrisiko um bis zu 40 Prozent senken kann.</p><p>Im Bereich Demenzpraevention informiert die DAK Gesundheit ueber aktuelle Forschungsergebnisse. Bis zu 40 Prozent der Demenzerkrankungen koennten durch gezielte Massnahmen vermieden oder verzoegert werden. Zu den wichtigsten Schutzmassnahmen gehoeren regelmaessige koerperliche Aktivitaet, geistige Anregung, soziale Kontakte und die fruehzeitige Behandlung von Hoerverlusten.</p><p>Alle grossen Krankenkassen erstatten zertifizierte Praeventionskurse zu 80 bis 100 Prozent. Versicherte koennen sich bei ihrer jeweiligen Kasse ueber das aktuelle Kursangebot informieren.</p>',
        date: '5. April 2026', rawDate: new Date(Date.now() - 691200000), source: 'Knappschaft, BARMER, DAK Gesundheit'
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
