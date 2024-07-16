let persistentSidebar = false;

chrome.sidePanel.setPanelBehavior({openPanelOnActionClick: true})

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
