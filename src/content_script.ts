import 'jquery'

// Add these type definitions
interface ViewedList {
  [key: string]: number;
}

interface StorageLocalData {
  viewedList?: ViewedList;
}

$(initialize)
chrome.runtime.onMessage.addListener(processRequest)
// ... rest of code


let observer = new MutationObserver(mutationRecords => {
  for (let mutation of mutationRecords) {
    for (let node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue

      const selector = '[aria-label="Share post"]:not([data-tmd="processed"])'
      let nodes: HTMLElement[] | NodeListOf<Element> = node.matches(selector) ? [node] : []
      nodes = nodes.length ? nodes : node.querySelectorAll(selector)

      updateViewed(undefined, node)
    }
  }
})

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
})

function initialize() {
  let urlParts = window.location.pathname.split('/')
  let user = urlParts[1] ?? ''
  let prevUrl: string = window.location.href

  if (urlParts.length == 2) {
    // noinspection JSIgnoredPromiseFromCall
    chrome.runtime.sendMessage({
      type: 'viewed',
      user
    })
    console.debug('Sending viewed message', user)
  }

  setInterval(() => {
    const currUrl = window.location.href
    if (currUrl != prevUrl) {
      prevUrl = currUrl
      urlParts = currUrl.split('/')
      user = urlParts[3] ?? ''

      if (urlParts.length == 4) {

        // noinspection JSIgnoredPromiseFromCall
        chrome.runtime.sendMessage({
          type: 'viewed',
          user: user
        })
        console.debug('URL changed. Sending viewed message', user)
      }
    }
  }, 60)
}

function processRequest(request: any) {
  switch (request.type) {
    case 'update-viewed':
      updateViewed(request.user)
      break
  }
}

function updateViewed(user?: string, rootNode?: HTMLElement) {
  if (user) {
    $(rootNode || document).find(`a[href="/${user}"]`).find('span:eq(1)').css({
      textDecoration: 'line-through',
      color: 'darkgray'
    })
  } else {
    chrome.storage.local.get(
      {
        viewedList: {}
      },
      (result) => {
        const { viewedList } = result as StorageLocalData
        if (viewedList) {
          for (const user in viewedList) {
            $(rootNode || document).find(`a[href="/${user}"]`).find('span:eq(1)').css({
              textDecoration: 'line-through',
              color: 'darkgray'
            })
          }
        }
      }
    )
  }
}
