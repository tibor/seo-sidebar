// Function to create the sidebar based on user settings
function createSidebar() {
    if (!document.getElementById('persistent-sidebar')) {
        var sidebar = document.createElement('div');
        sidebar.id = 'persistent-sidebar';
        sidebar.style.position = 'fixed';
        sidebar.style.top = '0';
        sidebar.style.left = '0';
        sidebar.style.width = '500px';
        sidebar.style.height = '100vh';
        sidebar.style.backgroundColor = '#f1f1f1';
        sidebar.style.borderRight = '1px solid #ccc';
        sidebar.style.zIndex = '2147483647';

        sidebar.innerHTML = '<iframe src="' + chrome.runtime.getURL('sidebar.html') + '" style="width: 100%; height: 100%; border: none;"></iframe>';
        document.body.appendChild(sidebar);
    }
}

// Function to remove the sidebar if it exists
function removeSidebar() {
    var sidebar = document.getElementById('persistent-sidebar');
    if (sidebar) {
        sidebar.remove();
        document.body.style.marginLeft = '0'; // Reset body margin
    }
}

function getWordCount(text) {
    return text.trim().split(/\s+/).length;
}

function getCharacterCount(text) {
    return text.length;
}

// Check user settings on load
chrome.storage.local.get(['persistentSidebar', 'sidebarState'], function (result) {
    const persistentSidebar = result.persistentSidebar || false;
    const sidebarState = result.sidebarState || 'closed';

    if (persistentSidebar && sidebarState === 'open') {
        createSidebar();
    } else {
        removeSidebar();
    }
});

// Listen for changes in user settings
chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === 'local' && ('persistentSidebar' in changes || 'sidebarState' in changes)) {
        const persistentSidebar = changes.persistentSidebar ? changes.persistentSidebar.newValue : false;
        const sidebarState = changes.sidebarState ? changes.sidebarState.newValue : 'closed';

        if (persistentSidebar && sidebarState === 'open') {
            createSidebar();
        } else {
            removeSidebar();
        }
    }
});

function collectLinks() {
    const internalLinks = [];
    const externalLinks = [];
    const currentHostname = window.location.hostname;

    document.querySelectorAll('a[href]').forEach(link => {
        const linkHostname = new URL(link.href).hostname;

        if (linkHostname === currentHostname) {
            internalLinks.push(link.href);
        } else {
            externalLinks.push(link.href);
        }
    });

    return {
        internalLinks: [...new Set(internalLinks)], // Remove duplicates
        externalLinks: [...new Set(externalLinks)] // Remove duplicates
    };
}

function collectPageData() {
    const canonicalElement = document.querySelector('link[rel="canonical"]');
    const canonicalUrl = canonicalElement ? canonicalElement.getAttribute('href') : '';
    const currentUrl = window.location.href;

    const currentUrlObj = new URL(currentUrl);
    const canonicalUrlObj = new URL(canonicalUrl);

    const currentUrlNoParams = currentUrlObj.origin + currentUrlObj.pathname;
    const canonicalUrlNoParams = canonicalUrlObj.origin + currentUrlObj.pathname;

    const canonicalLinkCount = document.querySelectorAll('link[rel="canonical"]').length;

    const firstH1 = document.querySelector('h1');
    const firstH1Text = firstH1 ? firstH1.textContent : 'No H1 found';

    const title = document.title;
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

    const pageData = {
        title: title,
        titleWordCount: getWordCount(title),
        titleCharacterCount: getCharacterCount(title),
        metaDescription: metaDescription,
        metaDescriptionWordCount: getWordCount(metaDescription),
        metaDescriptionCharacterCount: getCharacterCount(metaDescription),
        metaRobots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
        canonicalUrl: canonicalUrl,
        firstH1: firstH1Text,
        htmlNodeCount: document.getElementsByTagName('*').length,
        pageSize: new Blob([document.documentElement.outerHTML]).size,
        currentUrl: currentUrl,
        isCanonicalSameAsUrl: canonicalUrl ?
            (canonicalUrlNoParams === currentUrlNoParams ? '✔️ Canonical is identical with page URL' : '❌ Canonical is <b>not</b> the same as the page URL') :
            'No canonical defined',
        schemaTypes: [], // Ensure schemaTypes is initialized as an array
        headings: collectHeadings(),
        links: collectLinks(), 
        canonicalLinkCount: canonicalLinkCount,
        metaRobotsCount : document.querySelectorAll('meta[name="robots"]').length
    };

    if (performance.timing.loadEventEnd) {
        pageData.pageLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    } else {
        pageData.pageLoadTime = performance.now();
    }

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(script => {
        try {
            const json = JSON.parse(script.textContent);
            const schemaTree = extractSchemaTypes(json);
            if (schemaTree) {
                pageData.schemaTypes.push(schemaTree);
            }
        } catch (e) {
            console.error('Error parsing JSON-LD:', e);
        }
    });

    // Fetch robots.txt and store page data again with robots.txt content
    chrome.runtime.sendMessage({
        action: 'fetchRobotsTxt',
        url: window.location.origin
    }, function(response) {
        if (response.success) {
            pageData.robotsTxt = response.content;
            const sitemaps = [];
            const sitemapMatches = response.content.match(/Sitemap:\s*(https?:\/\/\S+)/gi);
            if (sitemapMatches) {
                sitemapMatches.forEach(sitemap => {
                    sitemaps.push(sitemap.replace('Sitemap: ', ''));
                });
            }
            pageData.sitemaps = sitemaps;
            chrome.runtime.sendMessage({
                action: 'storePageData',
                data: pageData
            });
        } else {
            console.error('Failed to fetch robots.txt:', response.error);
        }
    });

    chrome.runtime.sendMessage({
        action: 'storePageData',
        data: pageData
    });

    return pageData;
}

function collectHeadings() {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    return buildNestedHeadings(headings);
}

function buildNestedHeadings(headings) {
    const nestedHeadings = [];
    const stack = [];

    headings.forEach(heading => {
        const level = parseInt(heading.tagName[1]);

        const headingNode = {
            text: `${heading.tagName.toLowerCase()}: ${heading.textContent}`,
            level: level,
            children: []
        };

        while (stack.length && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        if (stack.length) {
            stack[stack.length - 1].children.push(headingNode);
        } else {
            nestedHeadings.push(headingNode);
        }

        stack.push(headingNode);
    });

    return nestedHeadings;
}

function extractSchemaTypes(json) {
    if (Array.isArray(json)) {
        return json.map(item => extractSchemaTypes(item)).filter(Boolean);
    } else if (json && typeof json === 'object') {
        const type = json['@type'];
        const children = Object.keys(json)
            .filter(key => json[key] && typeof json[key] === 'object')
            .map(key => extractSchemaTypes(json[key]))
            .filter(Boolean);

        if (type) {
            return { type: type, children: children };
        } else if (children.length > 0) {
            return children;
        }
    }
    return null;
}

function handleUrlChange() {
    setTimeout(() => {
        collectPageData();
    }, 1000); // Delay to ensure the page fully loads
}

window.onload = function () {
    collectPageData();
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'highlightNofollowLinks') {
        highlightNofollowLinks(request.shouldHighlight);
    } else if (request.action === 'urlChanged') {
        handleUrlChange();
    }
});

// Function to highlight or remove highlight from nofollow links
function highlightNofollowLinks(shouldHighlight) {
    const allLinks = document.querySelectorAll('a');
    allLinks.forEach(link => {
        const rel = link.getAttribute('rel');
        if (rel && rel.split(' ').includes('nofollow')) {
            if (shouldHighlight) {
                link.style.textDecoration = 'underline';
                link.style.textDecorationColor = 'red';
                link.style.textDecorationThickness = '3px';
                link.style.backgroundColor = 'rgba(255, 0, 0, 0.4)'; 
            } else {
                link.style.textDecoration = '';
                link.style.textDecorationColor = '';
                link.style.backgroundColor = '';
            }
        }
    });
}

