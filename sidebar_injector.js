(function () {
    chrome.storage.local.get(['sidebarWidth', 'sidebarBgColor'], function (result) {
        if (!document.getElementById('persistent-sidebar')) {
            console.log(result)
            var sidebar = document.createElement('div');
            sidebar.id = 'persistent-sidebar';
            sidebar.style.position = 'fixed';
            sidebar.style.top = '0';
            sidebar.style.left = '0';
            sidebar.style.width = (result.sidebarWidth || 500) + 'px';
            sidebar.style.height = '100vh';
            sidebar.style.backgroundColor = result.sidebarBgColor || '#f1f1f1';
            sidebar.style.borderRight = '1px solid #ccc';
            sidebar.style.zIndex = '9999999'; // Max z-index value
        
            sidebar.style.transform = 'translateZ(0)'; // Create a new stacking context

            sidebar.innerHTML = '<iframe src="' + chrome.runtime.getURL('sidebar.html') + '" style="width: 100%; height: 100%; border: none;"></iframe>';
            document.body.appendChild(sidebar);
            console.log("Sidebar appended to the body.");

            // Adjust body margin to accommodate the sidebar only if not in the sidebar itself
            if (window.location.href !== chrome.runtime.getURL('sidebar.html')) {
                document.body.style.marginLeft = (result.sidebarWidth || 500) + 'px';
                console.log("Body margin adjusted.");
            }
        }
    });
})();
