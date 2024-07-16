let persistentSidebar = false;

chrome.runtime.onInstalled.addListener(() => {
    initializePersistentSidebar();
});

chrome.runtime.onStartup.addListener(() => {
    initializePersistentSidebar();
});

function initializePersistentSidebar() {
    chrome.storage.local.get(['persistentSidebar'], function (result) {
        persistentSidebar = result.persistentSidebar || false;
        if (persistentSidebar) {
            injectSidebarInAllTabs();
        }
    });
}

chrome.action.onClicked.addListener((tab) => {
    persistentSidebar = !persistentSidebar;
    chrome.storage.local.set({ persistentSidebar: persistentSidebar, sidebarState: persistentSidebar ? 'open' : 'closed' });

    if (persistentSidebar) {
        injectSidebar(tab.id);
    } else {
        removeSidebar(tab.id);
    }
});

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
        if (changeInfo.url && isValidUrl(changeInfo.url)) {
            clearPageData(tabId);
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: function () {
                    chrome.runtime.sendMessage({ action: 'urlChanged' });
                }
            });
        }
    });
}

function removeSidebarFromAllTabs() {
    chrome.tabs.query({}, function (tabs) {
        tabs.forEach(tab => {
            if (isValidUrl(tab.url)) {
                removeSidebar(tab.id);
            }
        });
    });
}

function injectSidebar(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content_script.js']
    }, function() {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: function () {
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
                    sidebar.style.transform = 'translateZ(0)'; // Create a new stacking context
                    sidebar.innerHTML = '<iframe src="' + chrome.runtime.getURL('sidebar.html') + '" style="width: 100%; height: 100vh; border: none;"></iframe>';
                    document.body.appendChild(sidebar);
                }
            }
        });
    });
}

function removeSidebar(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function () {
            const sidebar = document.getElementById('persistent-sidebar');
            if (sidebar) {
                sidebar.remove();
                document.body.style.marginLeft = '0';
            }
        }
    });
}

function isValidUrl(url) {
    return url && !url.startsWith('chrome://') && !url.startsWith('about://') && !url.startsWith('chrome-extension://');
}

function clearPageData(tabId) {
    chrome.storage.local.remove(tabId.toString(), function() {
        console.log(`Cleared page data for tab ${tabId}`);
    });
}

// Capture response headers and HTTP status code
chrome.webRequest.onCompleted.addListener(
    function (details) {
        if (details.type === 'main_frame') {
            const tabId = details.tabId.toString();
            console.log(`Capturing response headers for tab ${tabId}`);
            chrome.storage.local.get([tabId], function(result) {
                console.log(`Retrieved data from storage for tab ${tabId}:`, result);
                const pageData = result[tabId] || {};
                pageData.responseHeaders = details.responseHeaders.map(header => `${header.name}: ${header.value}`).join('\n');
                pageData.httpStatusCode = details.statusCode; // Capture HTTP status code here
                pageData.dataCollected = true;
                console.log(`Captured response headers: ${pageData.responseHeaders}`);
                console.log(`Captured HTTP status code: ${pageData.httpStatusCode}`);
                chrome.storage.local.set({ [tabId]: pageData }, function() {
                    console.log(`Stored response headers and status for tab ${tabId}`);
                });
            });
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);

chrome.runtime.onInstalled.addListener(function() {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {schemes: ['http', 'https']},
            })],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'storePageData') {
        const tabId = sender.tab.id.toString();
        const dataToStore = {};
        chrome.storage.local.get([tabId], function(result) {
            const pageData = result[tabId] || {};
            dataToStore[tabId] = { ...pageData, ...request.data, dataCollected: true };
            chrome.storage.local.set(dataToStore, function() {
                console.log('Page data stored for tab', tabId);
            });
        });
    } else if (request.action === 'fetchRobotsTxt') {
        fetch(request.url + '/robots.txt')
            .then(response => response.text())
            .then(text => {
                const dataToStore = {};
                dataToStore['robotsTxt'] = text;
                chrome.storage.local.set(dataToStore, function() {
                    console.log('Robots.txt content stored.');
                });
                sendResponse({ success: true, content: text });
            })
            .catch(error => {
                console.error('Failed to fetch robots.txt:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Indicate that the response is asynchronous
    }
});
