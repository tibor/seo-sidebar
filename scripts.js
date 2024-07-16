document.addEventListener('DOMContentLoaded', function () {
    function fillPageData(pageData) {
        console.log('Filling page data:', pageData);
        document.getElementById('page_title').value = pageData.title || '';
        document.getElementById('meta_description').value = pageData.metaDescription || '';
        document.getElementById('meta_robots').value = pageData.metaRobots || '';
        document.getElementById('canonical_url').value = pageData.canonicalUrl || '';
        document.getElementById('canonical_is_same_as_url').innerHTML = pageData.isCanonicalSameAsUrl || '';
        document.getElementById('page_load_time').value = `${(pageData.pageLoadTime || 0).toFixed(2)} ms`;
        document.getElementById('html_node_count').value = pageData.htmlNodeCount || '';
        document.getElementById('h1').value = (pageData.firstH1 || '').replace(/\s+/g, ' ').trim(); // Trim and replace newlines
        document.getElementById('http_status_code').innerHTML = pageData.httpStatusCode || 'N/A';
        document.getElementById('canonical_link_count').textContent = `Canonical Link Count: ${pageData.canonicalLinkCount || 0}`;
        document.getElementById('meta_robots_count').textContent = `Meta Robots Tag Count: ${pageData.metaRobotsCount || 0}`;
        document.getElementById('robots_txt').value = pageData.robotsTxt || '';
        document.getElementById('response_headers').value = pageData.responseHeaders || '';

        document.getElementById('page_title_counts').innerHTML = `Words: ${pageData.titleWordCount || 0}, Characters: ${pageData.titleCharacterCount || 0}`;
        document.getElementById('meta_description_counts').innerHTML = `Words: ${pageData.metaDescriptionWordCount || 0}, Characters: ${pageData.metaDescriptionCharacterCount || 0}`;

        const schemaTypesList = document.getElementById('schema-types-list');
        schemaTypesList.innerHTML = ''; // Clear previous entries
        (pageData.schemaTypes || []).forEach(type => {
            const listItem = document.createElement('li');
            listItem.appendChild(createSchemaTypeElement(type));
            schemaTypesList.appendChild(listItem);
        });

        const headingsList = document.getElementById('headings-list');
        headingsList.innerHTML = ''; // Clear previous entries
        (pageData.headings || []).forEach(heading => {
            const listItem = document.createElement('li');
            listItem.appendChild(createHeadingElement(heading));
            headingsList.appendChild(listItem);
        });

        document.getElementById('internal_links').value = (pageData.links.internalLinks || []).join('\n');
        document.getElementById('external_links').value = (pageData.links.externalLinks || []).join('\n');
        document.getElementById('sitemaps').value = (pageData.sitemaps || []).join('\n');
    }

    function createSchemaTypeElement(type) {
        const element = document.createElement('div');
        element.textContent = type.type;
        if (type.children && type.children.length > 0) {
            const ul = document.createElement('ul');
            type.children.forEach(child => {
                const li = document.createElement('li');
                li.appendChild(createSchemaTypeElement(child));
                ul.appendChild(li);
            });
            element.appendChild(ul);
        }
        return element;
    }

    function createHeadingElement(heading) {
        const element = document.createElement('div');
        element.textContent = heading.text;
        if (heading.children && heading.children.length > 0) {
            const ul = document.createElement('ul');
            heading.children.forEach(child => {
                const li = document.createElement('li');
                li.appendChild(createHeadingElement(child));
                ul.appendChild(li);
            });
            element.appendChild(ul);
        }
        return element;
    }

    function updateSidebarContent() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tabId = tabs[0].id;
            console.log('Updating sidebar content for tab', tabId);
            chrome.storage.local.get(tabId.toString(), function (result) {
                const pageData = result[tabId.toString()];
                if (pageData) {
                    console.log('Page data found for tab', tabId, pageData);
                    fillPageData(pageData);
                } else {
                    console.log('No data found for tab', tabId);
                }
            });
        });
    }

    // Initial content update
    updateSidebarContent();

    var validator_link = document.getElementById('openValidatorLink');
    var rich_result_link = document.getElementById('validateInGoogleRichResult');
    var settings_link = document.getElementById('openSettingsLink');

    validator_link.addEventListener('click', function (event) {
        event.preventDefault();
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var currentTab = tabs[0];
            var currentUrl = currentTab.url;
            window.open('https://validator.schema.org/#url=' + encodeURIComponent(currentUrl), '_blank');
        });
    });

    rich_result_link.addEventListener('click', function (event) {
        event.preventDefault();
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var currentTab = tabs[0];
            var currentUrl = currentTab.url;
            window.open('https://search.google.com/test/rich-results?url=' + encodeURIComponent(currentUrl), '_blank');
        });
    });

    settings_link.addEventListener('click', function (event) {
        event.preventDefault();
        chrome.runtime.openOptionsPage().catch(err => console.error(err));
    });

    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === 'local') {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                const tabId = tabs[0].id;
                if (changes[tabId.toString()]) {
                    console.log('Changes detected for tab', tabId, changes[tabId.toString()]);
                    chrome.storage.local.get(tabId.toString(), function (result) {
                        const pageData = result[tabId.toString()];
                        if (pageData) {
                            console.log('Updated page data for tab', tabId, pageData);
                            fillPageData(pageData);
                        }
                    });
                }
            });
        }
    });

    chrome.tabs.onActivated.addListener(function (activeInfo) {
        console.log('Tab activated', activeInfo);
        updateSidebarContent();
    });

    function downloadJSON(data) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "page_data.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    const nofollowCheckbox = document.getElementById('nofollow-checkbox');
    if (nofollowCheckbox) {
        nofollowCheckbox.addEventListener('change', function () {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'highlightNofollowLinks',
                    shouldHighlight: nofollowCheckbox.checked
                });
            });
        });
    }

    document.getElementById('download-json').addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tabId = tabs[0].id;
            console.log('Downloading JSON for tab', tabId);
            chrome.storage.local.get(tabId.toString(), function (result) {
                const pageData = result[tabId.toString()];
                if (pageData) {
                    downloadJSON(pageData);
                } else {
                    console.log('No data found for tab', tabId);
                }
            });
        });
    });




    document.getElementById('check-url').addEventListener('click', function() {
        const robotsTxt = document.getElementById('robots_txt').value;
        const userAgent = document.getElementById('userAgent').value;
    
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tabId = tabs[0].id;
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (robotsTxt, userAgent) => {
                    const url = new URL(window.location.href); // Get the current URL
    
                    function parseRobotsTxt(robotsTxt) {
                        const lines = robotsTxt.split('\n');
                        const rules = {};
                        let currentUserAgent = '*';
    
                        for (let line of lines) {
                            const commentIndex = line.indexOf('#');
                            if (commentIndex !== -1) {
                                line = line.substring(0, commentIndex);
                            }
    
                            const [key, value] = line.split(':').map(s => s.trim());
    
                            if (key.toLowerCase() === 'user-agent') {
                                currentUserAgent = value;
                                if (!rules[currentUserAgent]) {
                                    rules[currentUserAgent] = [];
                                }
                            } else if (key.toLowerCase() === 'allow' || key.toLowerCase() === 'disallow') {
                                rules[currentUserAgent].push({
                                    type: key.toLowerCase(),
                                    path: value
                                });
                            }
                        }
    
                        return rules;
                    }
    
                    function checkRobotsTxt(robotsTxt, userAgent, path) {
                        const rules = parseRobotsTxt(robotsTxt);
                        console.log('Parsed rules:', rules); // Debugging log
                        const userAgentRules = rules[userAgent] || rules['*'] || [];
                        const disallowRules = userAgentRules.filter(rule => rule.type === 'disallow');
                        const allowRules = userAgentRules.filter(rule => rule.type === 'allow');
    
                        console.log(`Checking path "${path}" for userAgent "${userAgent}"`); // Debugging log
    
                        for (const rule of disallowRules) {
                            console.log(`Disallow rule: "${rule.path}"`); // Debugging log
                            if (rule.path && path.startsWith(rule.path)) {
                                console.log('Matched disallow rule'); // Debugging log
                                return { canCrawl: false, rule: rule };
                            }
                        }
    
                        for (const rule of allowRules) {
                            console.log(`Allow rule: "${rule.path}"`); // Debugging log
                            if (path.startsWith(rule.path)) {
                                console.log('Matched allow rule'); // Debugging log
                                return { canCrawl: true, rule: rule };
                            }
                        }
    
                        return { canCrawl: true, rule: null }; // Default to allow if no disallow rule matches
                    }
    
                    const result = checkRobotsTxt(robotsTxt, userAgent, url.pathname);
    
                    chrome.runtime.sendMessage({
                        action: 'updateResult',
                        canCrawl: result.canCrawl,
                        userAgent: userAgent,
                        rule: result.rule
                    });
                },
                args: [robotsTxt, userAgent]
            });
        });
    });


    // Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateResult') {
        const resultElement = document.getElementById('result');
        if (message.canCrawl) {
            resultElement.innerText = "URL can be crawled by " + message.userAgent;
        } else {
            resultElement.innerText = "URL cannot be crawled by " + message.userAgent + "\nReason: Disallow rule matching path \"" + (message.rule ? message.rule.path : "") + "\"";
        }
    }
});


});
