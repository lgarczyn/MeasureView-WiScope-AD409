// background.js


let microscopeTabId = null;
const SCRIPT_ID = "ad409-dark-mode"; // Unique ID for the registered script

// Helper to register the CSS . Part of fix to suppres white flash of Unstyled Content when page refreshed 
async function registerDarkMode(baseURL) {
  const pattern = baseURL.replace(/\/$/, "") + "/*";
  
  try {
    // distinct ID allows us to update it if the IP changes
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] }).catch(() => {});
    
    await chrome.scripting.registerContentScripts([{
      id: SCRIPT_ID,
      matches: [pattern],
      css: ["dark_mode.css"], // References the css file
      runAt: "document_start", // Crucial: To prevent white flash runs Before the page renders
      allFrames: true
    }]);
    console.log(`Dark mode registered for ${pattern}`);
  } catch (err) {
    console.error("Failed to register dark mode script:", err);
  }
}

// Initialize the Context Menu AND Dark Mode Registration
chrome.runtime.onInstalled.addListener(async () => {
  const baseURL = await getScopeIP();

    // Register context menu
    const pattern = baseURL.replace(/\/$/, "") + "/*";

    chrome.contextMenus.create({
      id: "open-in-viewer", // A unique ID for this menu item
      title: chrome.i18n.getMessage("contextMenuTitle"), // The text that will appear
      contexts: ["image", "link"], // make it appear only when you right-click an image or link
      documentUrlPatterns: [pattern], // only show on our device’s pages
	  targetUrlPatterns: [
        "*://*/*.jpg",
        "*://*/*.JPG",
        "*://*/*.jpeg",
        "*://*/*.JPEG",
        "*://*/*.png",
        "*://*/*.PNG",
        "*://*/*.gif",
        "*://*/*.GIF"
      ]
     });
	await registerDarkMode(baseURL);
  });

// Ensure registration persists on browser startup
chrome.runtime.onStartup.addListener(async () => {
    const baseURL = await getScopeIP();
    await registerDarkMode(baseURL);
});

//  Watch for IP changes 
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.scopeIP) {
    const newIP = changes.scopeIP.newValue;
    console.log("IP Changed in storage. Re-registering Dark Mode for:", newIP);
    registerDarkMode(newIP);
    
    // Optional: Update context menu patterns too if you want strict matching there
    
  }
});

// Listen for a click on  context menu item.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // check if the clicked menu item is the one we created.
  if (info.menuItemId === "open-in-viewer") {
    // Determine the image URL. Use linkUrl for links, srcUrl for images.
    const imageUrl = info.linkUrl || info.srcUrl;
    // Proceed only if we found a URL and it looks like an image.
    //if (imageUrl && /\.jpe?g($|\?)/i.test(imageUrl)) {
	const baseURL = await getScopeIP();

    // Only act if the clicked image URL starts with the scope base
    if (imageUrl && imageUrl.startsWith(baseURL)&&
      /\.(jpe?g|png|gif)$/i.test(imageUrl)) {
	  chrome.tabs.sendMessage(tab.id, { command: "disablePreview" }); //save wifi BW when downloading
      const viewerUrl = chrome.runtime.getURL(`viewer.html?src=${encodeURIComponent(imageUrl)}`);
      chrome.tabs.create({ url: viewerUrl });
    }
  }
});

// Helper function to get the stored IP address
async function getScopeIP() {
  const data = await chrome.storage.local.get(["scopeIP"]);
  return data.scopeIP || "http://192.168.1.254";
}



// Listen for when any tab finishes loading
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // We only care when the tab is completely loaded and has a URL
  if (!tab.url) {
    return;
  }
  if (changeInfo.status === 'complete') {
    const scopeIP = await getScopeIP();
	const url = tab.url.toLowerCase();

    // inject into the new page if it is microscope and not an direct image file .		
    if (url.startsWith(scopeIP) && !url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
      
        // Force the tab title
        chrome.scripting.executeScript({
        target: { tabId },
        func: () => { document.title = "WiScope AD409"; }
      });
   
      // Inject the content.js script into the microscope page
      chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        files: ['content.js']
      }, () => {
        // After injecting, send a command to SHOW the UI automatically.
        chrome.tabs.sendMessage(tabId, { command: "showUI" });
      });
    }
  }
});


// Listen for messages from content.js to open jpg in viewer
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	
	// 1. Handles resizing the iframe for the settings modal
    if (message.command === "resizeIframe") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, message);
            }
        });
        // No response needed, don't return true
    }

    // 2. Handles opening a JPG in the custom viewer
    else if (message.imageUrl) {
        chrome.tabs.create({
            url: chrome.runtime.getURL(`viewer.html?src=${encodeURIComponent(message.imageUrl)}`)
        });
        // No response needed, so don't return true
    }

    // 3. Handles fetching XML data from the microscope (this is asynchronous)
    else if (message.command && message.url) {
        fetch(message.url)
            .then(response => response.text())
            .then(xmlText => {
                const cmdMatches = [...xmlText.matchAll(/<Cmd>(.*?)<\/Cmd>/g)].map(m => m[1]);
                const statusMatches = [...xmlText.matchAll(/<Status>(.*?)<\/Status>/g)].map(m => m[1]);
                let result;
                if (cmdMatches.length > 1) {
                    const statusMap = {};
                    for (let i = 0; i < cmdMatches.length; i++) {
                        if (cmdMatches[i]) statusMap[cmdMatches[i]] = statusMatches[i] || null;
                    }
                    result = { map: statusMap };
                } else {
                    result = { cmd: cmdMatches[0] || null, status: statusMatches[0] || null };
                }
                sendResponse({ success: true, data: result });
            })
            .catch(error => {
                console.error(`Failed to fetch command ${message.command}:`, error);
                sendResponse({ success: false, error: error.message });
            });

        //  Return true here because fetch() is asynchronous.
        // This keeps the message channel open until sendResponse() is called.
        return true;
    }
	
	// 4. Handles the preview toggle command from the POPUP
	 
	else if (message.command === "togglePreview") {
		// attempt to find the microscope tab and forwards the message.
        const handleTogglePreview = async () => {
            // If we have a stored tab ID, try to use it.
        if (microscopeTabId) {
            try {
                    await chrome.tabs.get(microscopeTabId);
                    chrome.tabs.sendMessage(microscopeTabId, message);
                    return; // Success!
                } catch (e) {
                    // The tab ID was stale (for various reasons). Clear it and try to find a new one.
                    console.warn("Stale microscope tab ID. Attempting to re-register.");
                    microscopeTabId = null;
                }
       }
	   // If we don't have a valid tab ID, try to find it.
       const scopeIP = await getScopeIP();
       const tabs = await chrome.tabs.query({ url: `${scopeIP}/*` });

       if (tabs.length > 0) {
           // We found a matching tab. Register it and send the message.
           microscopeTabId = tabs[0].id; // Use the first one found
           console.log("Re-registered microscope tab ID:", microscopeTabId);
           chrome.tabs.sendMessage(microscopeTabId, message);
       } else {
           // still can't find it, then log the error.
           console.error("Could not toggle preview: Microscope tab ID is not registered and could not be found.");
      }
   };

        handleTogglePreview(); // Execute the async logic.
        return; // No need to return true as not using sendResponse here.
}
	// 5. Handles registering the content script's tab ID
    else if (message.command === "registerTab") {
        microscopeTabId = sender.tab.id;
        sendResponse({ tabId: sender.tab.id });
        console.log("Microscope tab registered with ID:", sender.tab.id);
		return;
    }
	
	// 6. Handles forwarding preview commands from content.js to popup.js
    else if (message.command === "disablePreview" || message.command === "enablePreview") {
        // Re-broadcast the message. The listener in popup.js will now hear it.
        chrome.tabs.sendMessage(sender.tab.id, message);
        // No response needed, so we don't return true
    }
});