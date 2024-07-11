function renderHeadings(headings, container) {
    headings.forEach(heading => {
        const li = document.createElement('li');
        li.textContent = `${heading.level === 2 ? 'H2: ' : 'H3: '}${heading.text}`;
        
        if (heading.children.length > 0) {
            const ul = document.createElement('ul');
            renderHeadings(heading.children, ul);
            li.appendChild(ul);
        }

        container.appendChild(li);
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'displayHeadings') {
        const container = document.getElementById('headings-list');
        container.innerHTML = ''; // Clear previous entries
        renderHeadings(message.data, container);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ action: 'requestHeadings' });
});
