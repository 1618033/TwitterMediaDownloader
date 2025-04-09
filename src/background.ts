let friendlyNameList: { [key: string]: string; } = {}
const fileNameRegex = /([\w,\s-.]+\.[A-Za-z]{2,4}$)/

chrome.runtime.onMessage.addListener(processRequest)

function processRequest(request: any) {
  switch (request.type) {
    case 'viewed':
      processViewed(request.user)
      break
  }
}

function processViewed(user: string) {
  console.debug('Viewed message received', user)

  chrome.storage.sync.get(
    {
      markViewed: false,
    },
    ({markViewed}) => {
      if (!markViewed)
        return

      chrome.storage.local.get(
        {
          viewedList: {}
        },
        ({viewedList}) => {
          if (viewedList[user])
            return

          viewedList[user] = 1
          chrome.storage.local.set({viewedList}, () => {
            chrome.tabs.query({},
              (tabs) => {
                for (const tab of tabs) {
                  // noinspection JSIgnoredPromiseFromCall
                  chrome.tabs.sendMessage(tab.id || 0, {
                    type: 'update-viewed',
                    user
                  })
                }
              })
          })
        }
      )

    }
  )

}
