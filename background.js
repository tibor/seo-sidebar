let persistentSidebar = false;

chrome.runtime.onInstalled.addListener(() => {
    initializePersistentSidebar();
});

chrome.runtime.onStartup.addListener(() => {
    initializePersistentSidebar();
});

// Initialize persistent sidebar based on stored settings
function initializePersistentSidebar() {
    chrome.storage.local.get(['persistentSidebar'], function (result) {
        persistentSidebar = result.persistentSidebar || false;
        if (persistentSidebar) {
            injectSidebarInAllTabs();
        }
    });
}

// Toggle persistent sidebar on extension icon click
chrome.action.onClicked.addListener((tab) => {
    persistentSidebar = !persistentSidebar;
    chrome.storage.local.set({ persistentSidebar: persistentSidebar });

    if (persistentSidebar) {
        injectSidebar(tab.id);
    } else {
        removeSidebar(tab.id);
    }
});

// Inject sidebar into all tabs if persistentSidebar is enabled
function injectSidebarInAllTabs() {
    chrome.tabs.query({}, function (tabs) {
        tabs.forEach(tab => {
            if (isValidUrl(tab.url)) {
                injectSidebar(tab.id);
            }
        });
    });

    chrome.tabs.onCreated.addListener((tab) => {
        if (isValidUrl(tab.url)) {
            injectSidebar(tab.id);
        }
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (persistentSidebar && changeInfo.status === 'complete' && isValidUrl(tab.url)) {
            injectSidebar(tabId);
        }
    });
}

// Remove sidebar from all tabs
function removeSidebarFromAllTabs() {
    chrome.tabs.query({}, function (tabs) {
        tabs.forEach(tab => {
            if (isValidUrl(tab.url)) {
                removeSidebar(tab.id);
            }
        });
    });
}

// Inject sidebar into a specific tab
function injectSidebar(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function() {
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
                sidebar.style.zIndex = '9999999'; // Max z-index value
                sidebar.style.overflowY = 'scroll';
                sidebar.style.transform = 'translateZ(0)'; // Create a new stacking context
                
                sidebar.innerHTML = '<iframe src="' + chrome.runtime.getURL('sidebar.html') + '" style="width: 100%; height: 100%; border: none;"></iframe>';
                document.body.appendChild(sidebar);
                console.log("Sidebar appended to the body.");

                // Adjust body margin to accommodate the sidebar
                document.body.style.marginLeft = '500px';
                console.log("Body margin adjusted.");
            }
        }
    });
}


// Remove sidebar from a specific tab
function removeSidebar(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: removeSidebarFunction
    });
}

// Function to remove sidebar from a tab
function removeSidebarFunction() {
    const sidebar = document.getElementById('persistent-sidebar');
    if (sidebar) {
        sidebar.remove();
        document.body.style.marginLeft = '0';
    }
}

// Check if URL is valid for sidebar injection
function isValidUrl(url) {
    return url && !url.startsWith('chrome://') && !url.startsWith('about://') && !url.startsWith('chrome-extension://');
}

// Listen for messages from content_script.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'collectPageData') {
        chrome.storage.local.set({ pageData: message.data });
    }
});

// Intercept response headers for the main document only
chrome.webRequest.onCompleted.addListener(
    function (details) {
        if (details.type === 'main_frame') {
            chrome.storage.local.set({ responseHeaders: details.responseHeaders });

            const hreflangLinks = details.responseHeaders.filter(header => header.name.toLowerCase() === 'link' && /rel="alternate" hreflang=/.test(header.value))
                .map(header => {
                    const match = header.value.match(/hreflang="([^"]+)"\s*;\s*href="([^"]+)"/);
                    return match ? { hreflang: match[1], href: match[2] } : null;
                })
                .filter(link => link !== null);
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);


chrome.webRequest.onCompleted.addListener(
    function (details) {
        if (details.type === 'main_frame') {
            chrome.storage.local.set({ httpStatusCode: details.statusCode });
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);