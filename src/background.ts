// Add these type definitions at the top of the file
interface ViewedList {
  [key: string]: number;
}

// interface StorageSyncData {
//   markViewed?: boolean;
// }

// interface StorageLocalData {
//   viewedList?: ViewedList;
// }

// export { };

// let friendlyNameList: { [key: string]: string } = {};
// const fileNameRegex = /([\w,\s-.]+\.[A-Za-z]{2,4}$)/;

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  processRequestFromContent(request);
  sendResponse({ received: true }); // Acknowledge receipt
  return false; // Synchronous response
});

function processRequestFromContent(request: any) {
  switch (request.type) {
    case 'viewed':
      processViewed(request.user);
      break;
  }
}

function notifyTabsAboutViewedUser(user: string): void {
  chrome.tabs.query(
    { url: ['*://x.com/*', '*://twitter.com/*', '*://mobile.twitter.com/*'] },
    (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'update-viewed',
            user
          }).catch((err) => {
            // Silently handle errors for tabs that can't receive messages
            console.debug('Could not send message to tab:', tab.id, err.message);
          });
        }
      }
    }
  );
}

async function addViewedUser(user: string): Promise<void> {
  try {
    const result = await chrome.storage.sync.get({ viewedUsers: [] });
    const viewedUsersArray = result.viewedUsers as string[];
    const viewedUsersSet = new Set(viewedUsersArray);

    if (!viewedUsersSet.has(user)) {
      viewedUsersSet.add(user);
      const updatedArray = Array.from(viewedUsersSet);

      await chrome.storage.sync.set({ viewedUsers: updatedArray });
      console.debug(`Added user: ${user}. Total: ${updatedArray.length}`);

      notifyTabsAboutViewedUser(user);
    } else {
      console.debug('User already added:', user);
    }
  } catch (error) {
    console.error('Error adding viewed user:', error);
  }
}

function processViewed(user: string) {
  console.debug('Viewed message received', user);
  addViewedUser(user);

  // chrome.storage.sync.get(
  //   {
  //     markViewed: false,
  //   },
  //   (result) => {
  //     const { markViewed } = result as StorageSyncData;
  //     if (!markViewed) return;

  //     chrome.storage.sync.get(
  //       {
  //         viewedList: {}
  //       },
  //       (result) => {
  //         const { viewedList } = result as StorageLocalData;
  //         if (!viewedList || viewedList[user]) return;

  //         viewedList[user] = 1;
  //         console.debug('viewedList[user]:', user);
  //         console.debug('result:', result);

  //         chrome.storage.sync.set({ viewedList }, () => {
  //           // Query only x.com and twitter.com tabs
  //           chrome.tabs.query(
  //             { url: ['*://x.com/*', '*://twitter.com/*', '*://mobile.twitter.com/*'] },
  //             (tabs) => {
  //               for (const tab of tabs) {
  //                 if (tab.id) {
  //                   console.debug('Sending message about:', user);

  //                   chrome.tabs.sendMessage(tab.id, {
  //                     type: 'update-viewed',
  //                     user
  //                   }).catch((err) => {
  //                     // Silently handle errors for tabs that can't receive messages
  //                     console.debug('Could not send message to tab:', tab.id, err);
  //                   });
  //                 }
  //               }
  //             }
  //           );
  //         });
  //       }
  //     );
  //   }
  // );
}

/*
async function clearViewedUsers(): Promise<void> {
  try {
    await chrome.storage.sync.set({ viewedUsers: [] });
    console.debug('Cleared all viewed users');
  } catch (error) {
    console.error('Error clearing viewed users:', error);
  }
}

async function getViewedUsersSet(): Promise<Set<string>> {
  try {
    const result = await chrome.storage.sync.get({ viewedUsers: [] });
    const viewedUsersArray = result.viewedUsers as string[];
    return new Set(viewedUsersArray);
  } catch (error) {
    console.error('Error getting viewed users set:', error);
    return new Set();
  }
}
*/