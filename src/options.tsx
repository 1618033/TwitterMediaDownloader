import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';

// Add these type definitions
interface ViewedList {
  [key: string]: number;
}

interface StorageSyncData {
  friendlyName?: boolean;
  markViewed?: boolean;
}

interface StorageLocalData {
  viewedList?: ViewedList;
}

const Options = () => {
  const [status, setStatus] = useState<string>("");
  const [markViewed, setMarkViewed] = useState<boolean>(false);
  const [viewedCount, setViewedCount] = useState<number>(0);

  useEffect(() => {
    chrome.storage.sync.get(
      {
        friendlyName: false,
        markViewed: false,
      },
      (result) => {
        const { markViewed } = result as StorageSyncData
        setMarkViewed(markViewed ?? false)
      }
    );

    chrome.storage.local.get(
      {
        viewedList: {}
      },
      (result) => {
        const { viewedList } = result as StorageLocalData
        setViewedCount(Object.keys(viewedList ?? {}).length)
      }
    );
  }, []);

  const saveOptions = () => {
    chrome.storage.sync.set(
      {
        markViewed
      },
      () => {
        setStatus("Options saved.");
        const id = setTimeout(() => {
          setStatus("");
        }, 1000);
        return () => clearTimeout(id);
      }
    );
  };

  const clearViewed = () => {

    chrome.storage.local.set(
      {
        viewedList: {}
      },
      () => {
        setViewedCount(0)
      }
    );
  };


  return (
    <>
      <div style={{padding: '10px 0'}}>
        <label>
          <input type="checkbox" checked={markViewed} style={{marginRight: '10px'}} onChange={() => setMarkViewed(!markViewed)} />
          Mark visited users links: <span style={{color: 'darkgrey', textDecoration: 'line-through'}}>TwitterUser</span>
        </label>
        <div style={{marginLeft: '27px'}}>
          Current count: {viewedCount}
          <button style={{marginLeft: '10px'}} onClick={() => clearViewed()}>Clear visited links</button>
        </div>
      </div>
      <button onClick={saveOptions}>Save</button>
      <div style={{marginLeft: '10px', display: 'inline-block'}}>{status}</div>
    </>
  );
};

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
