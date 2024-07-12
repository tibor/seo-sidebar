document.addEventListener('DOMContentLoaded', function () {
    // Function to fill the form fields with the collected page data
    function fillPageData(pageData) {
        document.getElementById('page_title').value = pageData.title;
        document.getElementById('meta_description').value = pageData.metaDescription;
        document.getElementById('meta_robots').value = pageData.metaRobots;
        document.getElementById('canonical_url').value = pageData.canonicalUrl;
        document.getElementById('canonical_is_same_as_url').innerHTML = pageData.isCanonicalSameAsUrl;
        document.getElementById('page_load_time').value = `${pageData.pageLoadTime.toFixed(2)} ms`;
        document.getElementById('html_node_count').value = pageData.htmlNodeCount;
        document.getElementById('h1').value = pageData.firstH1;
        document.getElementById('http_status_code').value = pageData.httpStatusCode;

        // Update word and character counts
        document.getElementById('page_title_counts').innerHTML = `Words: ${pageData.titleWordCount}, Characters: ${pageData.titleCharacterCount}`;
        document.getElementById('meta_description_counts').innerHTML = `Words: ${pageData.metaDescriptionWordCount}, Characters: ${pageData.metaDescriptionCharacterCount}`;

        const schemaTypesList = document.getElementById('schema-types-list');
        schemaTypesList.innerHTML = ''; // Clear previous entries
        pageData.schemaTypes.forEach(type => {
            const listItem = document.createElement('li');
            listItem.appendChild(createSchemaTypeElement(type));
            schemaTypesList.appendChild(listItem);
        });

        const headingsList = document.getElementById('headings-list');
        headingsList.innerHTML = ''; // Clear previous entries
        pageData.headings.forEach(heading => {
            const listItem = document.createElement('li');
            listItem.appendChild(createHeadingElement(heading));
            headingsList.appendChild(listItem);
        });

        // Fetch and display robots.txt
        fetchRobotsTxt(pageData.currentUrl);

        // Display internal and external links
        document.getElementById('internal_links').value = pageData.links.internalLinks.join('\n');
        document.getElementById('external_links').value = pageData.links.externalLinks.join('\n');

        // Update robots.txt content
        document.getElementById('robots_txt').value = pageData.robotsTxtContent;
    }

    // Recursive function to create nested list elements for schema types
    function createSchemaTypeElement(schemaType) {
        if (Array.isArray(schemaType)) {
            const ul = document.createElement('ul');
            schemaType.forEach(child => {
                const li = document.createElement('li');
                li.appendChild(createSchemaTypeElement(child));
                ul.appendChild(li);
            });
            return ul;
        } else {
            const div = document.createElement('div');
            div.textContent = schemaType.type;
            if (schemaType.children && schemaType.children.length > 0) {
                const ul = document.createElement('ul');
                ul.className = 'nested';
                schemaType.children.forEach(child => {
                    const li = document.createElement('li');
                    li.appendChild(createSchemaTypeElement(child));
                    ul.appendChild(li);
                });
                div.appendChild(ul);
            }
            return div;
        }
    }

    // Recursive function to create nested list elements for headings
    function createHeadingElement(heading) {
        const div = document.createElement('div');
        div.textContent = heading.text;
        if (heading.children && heading.children.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'nested';
            heading.children.forEach(child => {
                const li = document.createElement('li');
                li.appendChild(createHeadingElement(child));
                ul.appendChild(li);
            });
            div.appendChild(ul);
        }
        return div;
    }

    // Get the collected page data from storage and fill the form
    chrome.storage.local.get(['pageData', 'responseHeaders', 'hreflangLinks'], function (result) {
        if (result.pageData) {
            fillPageData(result.pageData);

            // Add event listeners to the download buttons
            document.getElementById('download-json').addEventListener('click', function () {
                downloadJSON(result.pageData);
            });
        }
        if (result.responseHeaders) {
            const responseHeadersText = result.responseHeaders.map(header => `${header.name}: ${header.value}`).join('\n');
            document.getElementById('response_headers').value = responseHeadersText;
        }
    });

    // Fetch robots.txt
    function fetchRobotsTxt(url) {
        try {
            const urlObj = new URL(url);
            const robotsUrl = `${urlObj.origin}/robots.txt`;

            fetch(robotsUrl)
                .then(response => {
                    if (response.ok) {
                        return response.text();
                    }
                    throw new Error('Network response was not ok.');
                })
                .then(text => {
                    document.getElementById('robots_txt').value = text;
                })
                .catch(error => {
                    document.getElementById('robots_txt').value = 'Failed to load robots.txt';
                });
        } catch (e) {
            document.getElementById('robots_txt').value = 'Invalid URL';
        }
    }

    // Get the link element by its ID
    var validator_link = document.getElementById('openValidatorLink');
    var rich_result_link = document.getElementById('validateInGoogleRichResult');
    var settings_link = document.getElementById('openSettingsLink');

    // Add a click event listener to the link
    validator_link.addEventListener('click', function (event) {
        // Prevent the default action of the link
        event.preventDefault();

        // Get the current page URL using chrome.tabs.query
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var currentTab = tabs[0]; // There will be only one result in the array
            var currentUrl = currentTab.url;

            // Open the validator with the current URL in a new tab
            window.open('https://validator.schema.org/#url=' + encodeURIComponent(currentUrl), '_blank');
        });
    });

    // Add a click event listener to the Google Rich Results Validator link
    rich_result_link.addEventListener('click', function (event) {
        // Prevent the default action of the link
        event.preventDefault();

        // Get the current page URL using chrome.tabs.query
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var currentTab = tabs[0]; // There will be only one result in the array
            var currentUrl = currentTab.url;

            // Open the Google Rich Results Test with the current URL in a new tab
            window.open('https://search.google.com/test/rich-results?url=' + encodeURIComponent(currentUrl), '_blank');
        });
    });

    // Add a click event listener to the settings link
    settings_link.addEventListener('click', function (event) {
        event.preventDefault();
        chrome.runtime.openOptionsPage().catch(err => console.error(err));
    });

    // Listen for changes in the storage to update sidebar appearance
    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === 'local') {
            if (changes.sidebarWidth || changes.sidebarBgColor) {
                chrome.storage.local.get(['sidebarWidth', 'sidebarBgColor'], function (result) {
                    const sidebar = document.getElementById('persistent-sidebar');
                    if (sidebar) {
                        sidebar.style.width = (result.sidebarWidth || 500) + 'px';
                        sidebar.style.backgroundColor = result.sidebarBgColor || '#f1f1f1';
                        document.body.style.marginLeft = (result.sidebarWidth || 500) + 'px';
                    }
                });
            }
        }
    });

    // Download data as JSON file
    function downloadJSON(data) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "page_data.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    // Fetch robots.txt and update page data
    fetchRobotsTxt().then(robotsTxtContent => {
        chrome.storage.local.get('pageData', function (result) {
            const pageData = result.pageData || {};
            pageData.robotsTxtContent = robotsTxtContent;
            chrome.storage.local.set({ pageData: pageData }, function () {
                fillPageData(pageData);
            });
        });
    });
});
