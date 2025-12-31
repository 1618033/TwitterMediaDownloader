export { };

async function getViewedUsers(): Promise<string[]> {
  try {
    const result = await chrome.storage.sync.get({ viewedUsers: [] });
    return result.viewedUsers as string[];
  } catch (error) {
    console.error('Error getting viewed users:', error);
    return [];
  }
}

// Keep a live reference that updates
let viewedUsersSet = new Set<string>(await getViewedUsers());

(function () {
  'use strict';

  let lastUrl = location.href;

  function onUrlChange(newUrl: string, _oldUrl: string | null) {
    let hasAdditionalSegments = false;
    let user = null;
    try {
      const urlObj = new URL(newUrl || location.href);
      const pathParts = urlObj.pathname.replace(/^\/+|\/+$/g, '').split('/');

      if (pathParts.length > 1) {
        hasAdditionalSegments = true;
      }
      if (pathParts.length > 0 && pathParts[0]) {
        user = pathParts[0];
      }

      if (user && !hasAdditionalSegments && user != 'home') {
        console.debug('Sending viewed message: ', user);
        chrome.runtime.sendMessage({
          type: 'viewed',
          user: user
        }).catch(err => console.debug('Error sending viewed message:', err));
      }

    } catch (e) {
      console.error('Failed to determine additional URL segments:', e);
    }
  }

  // Create observer for dynamic content changes
  const observer = new MutationObserver(() => {
    if (lastUrl !== location.href) {
      const oldUrl = lastUrl;
      lastUrl = location.href;
      onUrlChange(location.href, oldUrl);
    }
  });

  // Start observing
  observer.observe(document, {
    subtree: true,
    childList: true
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    if (lastUrl !== location.href) {
      const oldUrl = lastUrl;
      lastUrl = location.href;
      onUrlChange(location.href, oldUrl);
    }
  });

  // Override pushState to detect programmatic navigation
  const originalPushState = history.pushState;
  history.pushState = function (data: any, unused: string, url?: string | URL | null) {
    originalPushState.call(this, data, unused, url);
    if (lastUrl !== location.href) {
      const oldUrl = lastUrl;
      lastUrl = location.href;
      onUrlChange(location.href, oldUrl);
    }
  };

  // Override replaceState to detect programmatic navigation
  const originalReplaceState = history.replaceState;
  history.replaceState = function (data: any, unused: string, url?: string | URL | null) {
    originalReplaceState.call(this, data, unused, url);
    if (lastUrl !== location.href) {
      const oldUrl = lastUrl;
      lastUrl = location.href;
      onUrlChange(location.href, oldUrl);
    }
  };

  // Optional: Handle hash changes specifically
  window.addEventListener('hashchange', () => {
    if (lastUrl !== location.href) {
      const oldUrl = lastUrl;
      lastUrl = location.href;
      onUrlChange(location.href, oldUrl);
    }
  });

  // Initial load
  onUrlChange(location.href, null);
})();

// Helper function to mark user links as viewed
function markUserAsViewed(user: string, rootNode?: HTMLElement | Document) {
  const root = rootNode || document;
  const links = root.querySelectorAll<HTMLAnchorElement>(`a[href="/${user}"]:not([tabindex])`);


  links.forEach(link => {
    const spans = link.querySelectorAll('span');
    if (spans.length > 1) {
      const targetSpan = spans[1] as HTMLElement;
      targetSpan.style.textDecoration = 'line-through';
      targetSpan.style.color = 'darkgray';
      
      console.debug(`Marking user ${user} as viewed. Found ${links.length} links`);
      if (rootNode && "setAttribute" in rootNode && typeof rootNode.setAttribute === "function") {
        rootNode.setAttribute("data-tmd", "processed");
      }
    }
  });
}

(function () {
  // Helper function to process all current and future matching elements
  function processElement(rootNode?: HTMLElement | Document) {
    const root = rootNode || document;
    const selector = 'article:not([data-tmd="processed"])';
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));

    nodes.forEach(node => {
      // Mark article as processed to avoid reprocessing

      // Process all viewed users for this article
      for (const user of viewedUsersSet) {
        markUserAsViewed(user, node);
      }

      // // Custom styling (optional - you can remove if not needed)
      // node.style.border = "1px solid #0074D9";
      // node.title = "Processed by extension";

      // // Add badge (optional - you can remove if not needed)
      // if (!node.querySelector('.tmd-badge')) {
      //   const badge = document.createElement('span');
      //   badge.className = 'tmd-badge';
      //   badge.textContent = "✨";
      //   badge.style.marginLeft = '4px';
      //   node.appendChild(badge);
      // }
    });
  }

  // Run on initial load
  processElement();

  // Hook into existing MutationObserver to process dynamically added nodes
  const dynamicShareObserver = new MutationObserver(mutationRecords => {
    for (const mutation of mutationRecords) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (!(node instanceof HTMLElement)) continue;
        processElement(node);
      }
    }
  });

  dynamicShareObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();

chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  processRequestFromBackground(request);
  return true; // Indicates async response
});

function processRequestFromBackground(request: any) {
  switch (request.type) {
    case 'update-viewed':
      updateViewed(request.user);
      break;
  }
}

function updateViewed(user?: string, rootNode?: HTMLElement | Document) {
  console.debug('Update viewed message received for user:', user);

  if (!user) return;

  // Add user to our local set
  viewedUsersSet.add(user);

  // Mark all existing links to this user across the entire page
  markUserAsViewed(user, rootNode);

  // Also reprocess all unprocessed articles (in case new ones appeared)
  const unprocessedArticles = document.querySelectorAll<HTMLElement>('article:not([data-tmd="processed"])');
  unprocessedArticles.forEach(article => {
    markUserAsViewed(user, article);
  });
}