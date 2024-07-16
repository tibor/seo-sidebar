(function () {

    function createSidebar() {
        if (!document.getElementById('persistent-sidebar')) {
            var sidebar = document.createElement('div');
            sidebar.id = 'persistent-sidebar';
            sidebar.style.position = 'fixed';
            sidebar.style.top = '0';
            sidebar.style.left = '0';
            sidebar.style.width = '500px'; // Width of the sidebar
            sidebar.style.height = '100vh'; // Initial collapsed height
            sidebar.style.backgroundColor = '#f1f1f1';
            sidebar.style.borderRight = '1px solid #ccc';
            sidebar.style.zIndex = '9999999'; // Max z-index value
            sidebar.style.overflow = 'hidden'; // Hide overflow in collapsed state
            sidebar.style.transform = 'translateZ(0)'; // Create a new stacking context
            sidebar.style.transition = 'height 0.3s ease'; // Smooth height transition
            sidebar.innerHTML = '<iframe src="' + chrome.runtime.getURL('sidebar.html') + '" style="width: 100%; height: 100%; border: none;"></iframe>';
            document.body.appendChild(sidebar);

            // Load saved sidebar position
            chrome.storage.local.get('sidebarLeft', function (result) {
                const sidebarLeft = result.sidebarLeft || '0px';
                sidebar.style.left = sidebarLeft;
            });
        }
    }

    function removeSidebar() {
        const sidebar = document.getElementById('persistent-sidebar');
        if (sidebar) {
            sidebar.remove();
        }
    }

    // Check user settings on load
    chrome.storage.local.get(['sidebarState'], function (result) {
        const sidebarState = result.sidebarState || 'closed';

        if (sidebarState === 'open') {
            createSidebar();
        }
    });

    // Listen for changes in user settings
    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === 'local' && 'sidebarState' in changes) {
            const sidebarState = changes.sidebarState.newValue || 'closed';

            if (sidebarState === 'open') {
                createSidebar();
            } else {
                removeSidebar();
            }
        }
    });
})();
