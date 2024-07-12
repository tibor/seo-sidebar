document.addEventListener('DOMContentLoaded', function () {

    const sidebarWidthInput = document.getElementById('sidebarWidth');
    const sidebarBgColorInput = document.getElementById('sidebarBgColor');

    // Load the current settings and update the input fields
    chrome.storage.local.get(['sidebarWidth', 'sidebarBgColor'], function (result) {
    
        sidebarWidthInput.value = result.sidebarWidth || 500;
        sidebarBgColorInput.value = result.sidebarBgColor || '#f1f1f1';
    });

    sidebarWidthInput.addEventListener('input', function () {
        const width = sidebarWidthInput.value;
        chrome.storage.local.set({ sidebarWidth: width }, function () {
            applySettings();
        });
    });

    sidebarBgColorInput.addEventListener('input', function () {
        const color = sidebarBgColorInput.value;
        chrome.storage.local.set({ sidebarBgColor: color }, function () {
            applySettings();
        });
    });

    function applySettings() {
        chrome.storage.local.get(['sidebarWidth', 'sidebarBgColor'], function (result) {
            chrome.tabs.query({}, function (tabs) {
                tabs.forEach(tab => {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (width, color) => {
                            const sidebar = document.getElementById('persistent-sidebar');
                            if (sidebar) {
                                sidebar.style.width = width + 'px';
                                sidebar.style.backgroundColor = color;
                            }

                            // Apply margin-left only if we're in the main document
                            if (window.location.href !== chrome.runtime.getURL('sidebar.html')) {
                                document.body.style.marginLeft = width + 'px';
                            }
                        },
                        args: [result.sidebarWidth || 500, result.sidebarBgColor || '#f1f1f1']
                    });
                });
            });
        });
    }
});
