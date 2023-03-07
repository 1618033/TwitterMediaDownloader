import 'jquery'

type TweetInfo = {
  owner: string,
  id: string,
  index: number,
  friendlyName: string
};

const downloadIcon = '<g xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-180 11.999625205993652,9.00012493133545)"><path d="M17.53 7.47l-5-5c-.293-.293-.768-.293-1.06 0l-5 5c-.294.293-.294.768 0 1.06s.767.294 1.06 0l3.72-3.72V15c0 .414.336.75.75.75s.75-.336.75-.75V4.81l3.72 3.72c.146.147.338.22.53.22s.384-.072.53-.22c.293-.293.293-.767 0-1.06z"/></g><g><path d="M19.708 21.944H4.292C3.028 21.944 2 20.916 2 19.652V14c0-.414.336-.75.75-.75s.75.336.75.75v5.652c0 .437.355.792.792.792h15.416c.437 0 .792-.355.792-.792V14c0-.414.336-.75.75-.75s.75.336.75.75v5.652c0 1.264-1.028 2.292-2.292 2.292z"/></g></g>'

$(initialize)
chrome.runtime.onMessage.addListener(processRequest)


let observer = new MutationObserver(mutationRecords => {
  for (let mutation of mutationRecords) {
    for (let node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue

      const selector = '[aria-label="Share Tweet"]:not([data-tmd="processed"])'
      let nodes: HTMLElement[] | NodeListOf<Element> = node.matches(selector) ? [node] : []

      nodes = nodes.length ? nodes : node.querySelectorAll(selector)

      for (let elem of nodes) {
        if (!(elem instanceof HTMLElement)) continue
        injectReactDownloadButton(elem)
      }

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


function injectReactDownloadButton(target: HTMLElement) {
  const shareBtn = $(target).parent().parent()
  let container = shareBtn.closest('[role="dialog"]')
  container = container.length ? container : shareBtn.closest('article')
  container.attr('data-tmd', 'container')

  // const isImage = !!$(container).find('img[src^="https://pbs.twimg.com/media"]').length
  const isVideo = !!$(container).find('video').length

  // if (!isVideo && !isImage)
  //   return

  // $(target).addClass('tmd-processed')
  $(target).attr('data-tmd', 'processed')

  const downloadBtn = shareBtn.clone()
  const label = isVideo ? 'Download Video' : 'Download Image'
  downloadBtn.children('div:first-child').attr('aria-label', label)
  downloadBtn.addClass('tmd-download-icon')
  downloadBtn.find('svg').html(downloadIcon)
  downloadBtn.on({
    click: downloadMediaObject,
    mouseenter: function (e) {
      $(e.currentTarget).find('svg').prev().addClass('tmd_download_button_prev')
      $(e.currentTarget).find('svg').prev().parent().parent().addClass('tmd_download_button_parent')
    },
    mouseleave: function (e) {
      $(e.currentTarget).find('svg').prev().removeClass('tmd_download_button_prev')
      $(e.currentTarget).find('svg').prev().parent().parent().removeClass('tmd_download_button_parent')
    }
  })

  shareBtn.before(downloadBtn)
}

function downloadMediaObject(event: JQuery.TriggeredEvent) {
  const tweet = $(event.currentTarget).closest('[data-tmd="container"]')
  const isModal = !!$(event.currentTarget).closest('[role="dialog"]').length
  let videoTags = tweet.find('video')
  let imageTags = tweet.find('img[src^="https://pbs.twimg.com/media"]')
  let tweetInfo: TweetInfo = getTweetInfo('')

  if (isModal) {
    let index = window.location.pathname.split('/').pop()

    if (typeof index === 'undefined')
      return

    if (isModal && imageTags.length)
      imageTags = $(imageTags[+index - 1])

    if (isModal && videoTags.length)
      videoTags = $(videoTags[+index - 1])

    tweetInfo = getTweetInfo(window.location.href)
  } else {
    tweet.find('a').each((index, element) => {
      tweetInfo = getTweetInfo(element.href)
      if (tweetInfo.id)
        return false
    })
  }

  if (!tweetInfo.id)
    return


  if (videoTags.length) {
    downloadVideoObject(tweetInfo, videoTags)
  } else if (imageTags.length) {
    downloadImageObject(tweetInfo, imageTags)
  }

  event.stopPropagation()
}

function getCookie(cname: string) {
  let name = cname + "="
  let decodedCookie = decodeURIComponent(document.cookie)
  let ca = decodedCookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) == ' ') {
      c = c.substring(1)
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length)
    }
  }
  return ""
}

function downloadVideoObject(tweetInfo: TweetInfo, videoTags: JQuery) {
  let idStrs: string[] = []
  let videoSources: string[] = []
  videoTags.each((index, element) => {
    videoSources.push(element.getAttribute('src') || '')
    idStrs.push(getVideoIdStr(element.getAttribute('poster') || ''))
  })

  // noinspection JSIgnoredPromiseFromCall
  chrome.runtime.sendMessage({
    type: 'video',
    tweetId: tweetInfo.id,
    videoSources,
    idStrs,
    readerableFilename: tweetInfo.friendlyName,
    token: getCookie("ct0"),
  })
}

function downloadImageObject(tweetInfo: TweetInfo, imageTags: JQuery) {
  const reName = /(name=)(.*)(&?.*)/g

  imageTags.each((index: number, element: HTMLElement) => {
    let src = element.getAttribute('src') || ''
    if (reName.test(src)) {
      src = src.replace(reName, '$1orig$3')
    } else if (src.includes('?')) {
      src = src + '&name=orig'
    } else {
      src = src + '?name=orig'
    }
    processImageDownload(src, tweetInfo.friendlyName)
  })
}


function processImageDownload(src: string, friendlyName: string) {
  // noinspection JSIgnoredPromiseFromCall
  chrome.runtime.sendMessage({
    type: 'image',
    friendlyName: friendlyName,
    url: src
  })
}

function getVideoIdStr(poster: string): string {
  const re = /https:\/\/[A-z.]*\/ext_tw_video_thumb\/(\d*)\/pu/g
  const matches = re.exec(poster)
  return matches ? matches[1] : ''
}


function getTweetInfo(url: string): TweetInfo {
  const re = /https:\/\/[A-z.]*?\/(\w*)\/status\/(\d+)(\/\w+)?(\/(\d+))?/g
  const matches = re.exec(url) ?? []
  let ret = {
    owner: matches[1] ?? '',
    id: matches[2] ?? '',
    index: +matches[5] ?? -1,
    friendlyName: ''
  }
  ret.friendlyName = `${ret.owner}-${ret.id}` + (ret.index > -1 ? `-${ret.index}` : '')

  if (!ret.id)
    console.error('Unable to get tweet information, URL:', url)

  return ret
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
      ({viewedList}) => {
        for (const user in viewedList) {
          $(rootNode || document).find(`a[href="/${user}"]`).find('span:eq(1)').css({
            textDecoration: 'line-through',
            color: 'darkgray'
          })
        }
      }
    )
  }
}