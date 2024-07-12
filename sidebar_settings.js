document.addEventListener('DOMContentLoaded', function () {
    // Apply stored settings only if we're in the main document
    if (window.location.href === chrome.runtime.getURL('sidebar.html')) {
        // This is inside the sidebar, apply the background color only
        chrome.storage.local.get(['sidebarBgColor'], function (result) {
            const sidebar = document.getElementById('sidebar-content');
            if (sidebar) {
                sidebar.style.backgroundColor = result.sidebarBgColor || '#f1f1f1';
            }
        });
    } else {
        // This is the main document, apply the width and margin-left
        chrome.storage.local.get(['sidebarWidth'], function (result) {
            document.body.style.marginLeft = (result.sidebarWidth || 500) + 'px';
        });
    }
});
