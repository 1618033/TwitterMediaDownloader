import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

const Options = () => {
  const [status, setStatus] = useState<string>("");
  const [friendlyName, setFriendlyName] = useState<boolean>(false);
  const [markViewed, setMarkViewed] = useState<boolean>(false);
  const [viewedCount, setViewedCount] = useState<number>(0);

  useEffect(() => {
    chrome.storage.sync.get(
      {
        friendlyName: false,
        markViewed: false,
        viewedList: {}
      },
      ({friendlyName, markViewed, viewedList}) => {
        setFriendlyName(friendlyName);
        setMarkViewed(markViewed)
        setViewedCount(Object.keys(viewedList).length)
      }
    );
  }, []);

  const saveOptions = () => {
    chrome.storage.sync.set(
      {
        friendlyName,
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

    chrome.storage.sync.set(
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
      <div>
        More options in the future
      </div>
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
      <div style={{padding: '10px 0'}}>
        <label>
          <input type="checkbox" checked={friendlyName} style={{marginRight: '10px'}} onChange={() => setFriendlyName(!friendlyName)} />
          Save with friendly filename
        </label>
      </div>
      <button onClick={saveOptions}>Save</button>
      <div style={{marginLeft: '10px', display: 'inline-block'}}>{status}</div>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>,
  document.getElementById("root")
);
