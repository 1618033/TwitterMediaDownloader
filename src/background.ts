import DownloadFilenameSuggestion = chrome.downloads.DownloadFilenameSuggestion
import DownloadItem = chrome.downloads.DownloadItem
// import AreaName = chrome.storage.AreaName
// import StorageChange = chrome.storage.StorageChange

let friendlyNameList: { [key: string]: string; } = {}
const fileNameRegex = /([\w,\s-.]+\.[A-Za-z]{2,4}$)/

chrome.runtime.onMessage.addListener(processRequest)

// chrome.storage.onChanged.addListener(updateVisited);

// function updateVisited(changes: {[p: string]: StorageChange}, namespace: AreaName) {
//   for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
//     console.log(
//       `Storage key "${key}" in namespace "${namespace}" changed.`,
//       `Old value was "${oldValue}", new value is "${newValue}".`
//     );
//   }
// }

function chromeDownloadRenamer(item: DownloadItem, suggest: (suggestion?: DownloadFilenameSuggestion) => void) {
  if (!item.byExtensionId && item.byExtensionId !== chrome.runtime.id) {
    return
  }

  if (!Object.keys(friendlyNameList).length) {
    return
  }

  let result = fileNameRegex.exec(item.filename)
  const filename = result ? result[1] : 'filename'
  const suggestFilename = friendlyNameList[filename] || item.filename
  const replacedFilePath = item.filename.replace(fileNameRegex, suggestFilename)
  delete friendlyNameList[filename]

  suggest({filename: replacedFilePath, conflictAction: "uniquify"})

  if (!Object.keys(friendlyNameList).length) {
    chrome.downloads.onDeterminingFilename.removeListener(chromeDownloadRenamer)
  }
}

function processBlobVideo(id: string, idStrs: string[], friendlyName: string, token: string) {
  // noinspection JSIgnoredPromiseFromCall
  processComplexMp4Video(id, idStrs, friendlyName, token)
}

async function processComplexMp4Video(id: string, idStrs: string[], friendlyName: string, token: string) {
  let pageUrl = "https://api.twitter.com/1.1/statuses/show.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&trim_user=false&include_ext_media_color=true&id=" + id
  let mp4Urls = await getMp4Url(pageUrl, idStrs, token)

  for (let key in mp4Urls) {
    let url = mp4Urls[key]
    downloadMp4Video(url, friendlyName)
  }
}


function getMp4Url(url: string, idStrs: string[], token: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    let init: RequestInit = {
      headers: {
        "Accept": '*/*',
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:62.0) Gecko/20100101 Firefox/62.0",
        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        "x-csrf-token": token,
      },
      credentials: 'include',
      referrer: 'https://mobile.twitter.com'
    }
    fetch(url, init)
      .then((response) => {
        if (response.status === 200) {
          response.json().then((json) => {
            let urls = []
            for (let key in json.extended_entities.media) {
              let video = json.extended_entities.media[key]

              if (!idStrs.find(el => el === video.id_str))
                continue

              let mp4Variants = video.video_info.variants.filter((variant: { [key: string]: any; }) => variant.content_type === 'video/mp4')
              mp4Variants = mp4Variants.sort((a: { [key: string]: any; }, b: { [key: string]: any; }) => (b.bitrate - a.bitrate))

              if (mp4Variants.length)
                urls.push(mp4Variants[0].url)

            }

            resolve(urls)
          })
        } else {
          reject({
            status: response.status,
            statusText: response.statusText
          })
        }
      })
      .catch((err) => {
        reject({
          error: err
        })
      })
  })
}

function fileExtension(url: string) {
  const splited = url.split('.')
  return splited[splited.length - 1].split('?')[0]
}

function downloadMp4Video(url: string, friendlyName: string) {
  chrome.storage.sync.get({
    friendlyName: false
  }).then((items) => {
    let options: any = {
      url: url,
      saveAs: false,
    }

    if (items.friendlyName) {
      options.filename = friendlyName + '.' + fileExtension(url)
    }

    // noinspection JSIgnoredPromiseFromCall
    chrome.downloads.download(options)
  })
}

function downloadImage(url: string, friendlyName: string) {
  chrome.storage.sync.get({
    friendlyName: false
  }).then((items) => {
    const uploadedImageQuery = /https:\/\/pbs.twimg.com\/media\/(.*)?\?.*/g
    const extensionAttributeQuery = /[?&]format=([^&]+)/g

    const nameMatches = uploadedImageQuery.exec(url) || ''
    const formatMatches = extensionAttributeQuery.exec(url)

    let options: any = {
      url: url,
      saveAs: false,
      filename: ''
    }

    let filename = 'no_title'
    const format = formatMatches ? formatMatches[1] : 'jpg'

    if (nameMatches.length) {
      filename = nameMatches[1]
    }

    if (!!items.friendlyName) {
      if (!!chrome.downloads.onDeterminingFilename) {
        friendlyNameList[`${filename}.${format}`] = `${friendlyName}.${format}`

        if (!!chrome.downloads.onDeterminingFilename && !isRenamerActivated()) {
          chrome.downloads.onDeterminingFilename.addListener(chromeDownloadRenamer)
        }
      }
      filename = friendlyName
    }

    options.filename = `${filename}.${format}`

    chrome.downloads.download(options)
      .then((_downloadItem) => {
        if (!Object.keys(friendlyNameList).length) {
          chrome.downloads.onDeterminingFilename.removeListener(chromeDownloadRenamer)
        }
      })
  })
}


function isRenamerActivated() {
  return chrome.downloads.onDeterminingFilename.hasListener(chromeDownloadRenamer)
}


function processRequest(request: any) {
  switch (request.type) {
    case 'video':
      processVideoSource(request)
      break
    case 'image':
      downloadImage(request.url, request.friendlyName)
      break
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

function processVideoSource({
                              videoSources,
                              tweetId,
                              readerableFilename,
                              idStrs,
                              token
                            }: { videoSources: string[]; tweetId: string; readerableFilename: string; tweetSelector: string; idStrs: string[]; token: string; }) {

  if (videoSources[0].includes('blob')) {
    if (!!tweetId) {
      processBlobVideo(tweetId, idStrs, readerableFilename, token)
    }
  } else if (videoSources[0].includes('ext_tw_video')) {
    downloadMp4Video(videoSources[0], readerableFilename)
  } else {
    downloadMp4Video(videoSources[0], readerableFilename)
    // processGifVideo(videoSources[0], readerableFilename)
  }
}
