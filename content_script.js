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

        // Adjust body margin to accommodate the sidebar
        document.body.style.marginLeft = '500px';
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

    // Create URL objects to easily strip off query parameters
    const currentUrlObj = new URL(currentUrl);
    const canonicalUrlObj = new URL(canonicalUrl);

    const currentUrlNoParams = currentUrlObj.origin + currentUrlObj.pathname;
    const canonicalUrlNoParams = canonicalUrlObj.origin + canonicalUrlObj.pathname;

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
        links: collectLinks()
    };

    // Measure page load time
    if (performance.timing.loadEventEnd) {
        pageData.pageLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    } else {
        pageData.pageLoadTime = performance.now();
    }

    // Extract schema.org types
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

    // Get the HTTP status code from storage
    chrome.storage.local.get('httpStatusCode', function (result) {
        pageData.httpStatusCode = result.httpStatusCode || 'N/A';

        // Send the collected page data to the background script
        chrome.runtime.sendMessage({ action: 'collectPageData', data: pageData });
    });

    return pageData;
}

// Function to collect headings and build a nested list structure
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

// Function to extract schema.org types from JSON-LD
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

// Ensure script runs after document is fully loaded
window.onload = function () {
    collectPageData();
};

// Send the collected page data to the background script
chrome.runtime.sendMessage({ action: 'collectPageData', data: collectPageData() });
