// i18next language initialization 
async function i18n_init() {
  // get language from our dropdown or chromes current language or english as fallback
 
 const browserLang = chrome.i18n.getUILanguage().split('-')[0]; // Turns "en-US" into "en"
 const currentLanguage = localStorage.getItem('language') || browserLang || 'en';
 

  await i18next
    .use(i18nextHttpBackend)
    .init({
      lng: currentLanguage,
      fallbackLng: 'en',
	  supportedLngs: ['en', 'fr', 'es', 'de', 'it', 'nl', 'ja', 'zh', 'pt', 'pl', 'hi', 'tr', 'ro', 'ru', 'uk'],
      nonExplicitSupportedLngs: true, // treat en-US as en or fr-CA as fr

      backend: {
        loadPath: 'locales/{{lng}}/translation_scope.json'
      }
    });

  // Set the language selector to the current language
  if (document.getElementById('langSelector')) {
    document.getElementById('langSelector').value = currentLanguage;
  }
  updateContent();
}

function updateContent() {
	restoreButtonLabelsFromSession();
  // Translate elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = i18next.t(el.getAttribute('data-i18n'));
  });
  // Translate elements with data-i18n-title attribute
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', i18next.t(el.getAttribute('data-i18n-title')));
  });
  
  // Re-populate dropdowns with translated text, preserving selected value
  const photoSelect = document.getElementById("photoResSelect");
  const videoSelect = document.getElementById("videoResSelect");
  if (photoSelect && videoSelect) {
    populateDropdown("photoResSelect", photoRes, photoSelect.value);
    populateDropdown("videoResSelect", videoRes, videoSelect.value);
  }
}

  // Resolution options (now using translation keys for labels)
  const photoRes = [
    { val: "0", label: "photoRes_0"},
    { val: "1", label: "photoRes_1" },
    { val: "2", label: "photoRes_2" },
    { val: "3", label: "photoRes_3" },
    { val: "4", label: "photoRes_4" },
    { val: "5", label: "photoRes_5" },
    { val: "6", label: "photoRes_6" },
    { val: "7", label: "photoRes_7" },
    { val: "8", label: "photoRes_8" },
    { val: "9", label: "photoRes_9" },
    { val: "10", label: "photoRes_10" }
  ];

  const videoRes = [
    { val: "0", label: "videoRes_0" },
    { val: "1", label: "videoRes_1" },
    { val: "5", label: "videoRes_5" },
    { val: "6", label: "videoRes_6" },
    { val: "8", label: "videoRes_8" },
    { val: "9", label: "videoRes_9" },
    { val: "10", label: "videoRes_10" }
  ];
  
 
 // Modified to translate the label
  function populateDropdown(selectId, options, defaultVal) {
    const select = document.getElementById(selectId);
    select.innerHTML = "";
    options.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.val;
      option.textContent = i18next.t(opt.label); // Translate the label key
      if (opt.val === defaultVal) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }
  
  // Instantly restore button labels from current session storage to prevent size flicker 
  // on page refresh which would happen if we let button text = new session text.
function restoreButtonLabelsFromSession() {
  const keys = ['modeButtonText', 'recordButtonText', 'previewButtonHTML'];
  chrome.storage.session.get(keys, (result) => {
    
      document.getElementById("modeBtn").textContent = result.modeButtonText ?? i18next.t('toggleMode');
      document.getElementById("recordBtn").textContent = result.recordButtonText ?? i18next.t('videoRecord');
      document.getElementById("previewBtn").innerHTML = result.previewButtonHTML ?? i18next.t('preview');
    
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // restore labels from session to prevent flicker
  //restoreButtonLabelsFromSession();

  // Initialize i18next for other elements
  await i18n_init();

  // --- Modal (Settings) Logic ---
  const settingsBtn = document.getElementById("settingsBtn");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const refreshBtn =  document.getElementById("refreshBtn");
  const dateStampToggle = document.getElementById("dateStampToggle");
  const previewBtn = document.getElementById("previewBtn");
  // Get language selector and viewer button from the modal
  const langSelector = document.getElementById("langSelector");
  const viewerBtn = document.getElementById("viewerBtn");
  const aboutBtn = document.getElementById("aboutBtn");
  const aboutModal = document.getElementById("aboutModal");
  const closeAboutBtn = document.getElementById("closeAboutBtn");
  
  const urlParams = new URLSearchParams(window.location.search);
  const tabIdString = urlParams.get('tabId');
  const microscopeTabId = parseInt(tabIdString, 10);
  const PREVIEW_RES_PHOTO = "640 x 480";
  const PREVIEW_RES_VIDEO = "640 x 368";
  
  let lastVideoResValue = null;
  let isPreviewShowing = false;
  
   startup();
  
  // Add language selector listener
  langSelector.addEventListener('change', (e) => {
    const newLang = e.target.value;
    localStorage.setItem('language', newLang);
    // Change language and then update all UI text
    i18next.changeLanguage(newLang).then(updateContent);
  });

  // Add viewer button listener
  viewerBtn.addEventListener("click", () => {
    const currentLanguage = localStorage.getItem('language') || 'en';
    const viewerUrl = chrome.runtime.getURL(`viewer.html?lang=${currentLanguage}`);
    chrome.tabs.create({ url: viewerUrl });
  });

  settingsBtn.addEventListener("click", () => {
    settingsModal.showModal();
    // Ask the content script to resize the iframe to fit the modal
    // Increased height for language selector, viewer button, about button
    chrome.runtime.sendMessage({ command: "resizeIframe", height: "490px" });
	closeSettingsBtn.focus(); // Manually set the focus so ip input dont get it on open
  });

  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.close();
    // Ask the content script to shrink the iframe back to normal
    chrome.runtime.sendMessage({ command: "resizeIframe", height: "78px" });
  });
  
  // Preview Window Logic, may decided against preview, not very usefull feature really.
      
  // Preview button 
  previewBtn.addEventListener("click", async () => {
    	
    isPreviewShowing = !isPreviewShowing;
    const baseURL = getBaseURL();
    // The MJPEG stream is typically at port 8080
   const mjpegURL = baseURL.replace(/:[0-9]+$/, "") + ":8192";
    
    // 2. Send message directly to the stored Tab ID
    chrome.runtime.sendMessage({
      command: "togglePreview",
      show: isPreviewShowing,
      srcUrl: isPreviewShowing ? mjpegURL : ""
    });
	// Get the current mode to pass to the update function
    const isVideoMode = await getSessionValue('modeState') ?? true;
	updatePreviewButtonLabel(isPreviewShowing, isVideoMode);
	
  });


  // Code ( Helpers, Listeners) 

 
   
  function getBaseURL() {
    // This function can now be synchronous again as we'll load the IP at the start
    return localStorage.getItem("scopeIP") || "http://192.168.1.254";
  }

  // Utility: Update Connect Button State
  // Modified to use i18next for translation
  function updateConnectButtonState(state) {
    // state can be 'disconnected', 'connecting', 'connected'
    const connectBtn = document.getElementById("connectBtn");
    switch (state) {
      case 'connected':
        connectBtn.textContent = `✅ ${i18next.t('connected')}`;
        break;
      case 'connecting':
        connectBtn.textContent = `⏳ ${i18next.t('connecting')}`;
        break;
      case 'disconnected':
      default:
        connectBtn.textContent = `🔌 ${i18next.t('connect')}`;
        break;
    }
	// SAVE THE NEW STATE TO .session (but don't save 'connecting')
    if (state === 'connected' || state === 'disconnected') {
      chrome.storage.session.set({ connectionStatus: state });
    }
  }
   
   // A function to load state from session storage
  function loadAndApplySettings() {
    const keys = ["photoRes", "videoRes", "dateStamp", "connectionStatus" , "modeState", "previewState"];
    // USE .session INSTEAD OF .local
    chrome.storage.session.get(keys, (result) => {
      console.log("Loaded settings from session storage:", result);

      // Populate dropdowns with last saved value, or a default
      const photoDefault = result.photoRes || "7";
      const videoDefault = result.videoRes || "6";
      populateDropdown("photoResSelect", photoRes, photoDefault);
      populateDropdown("videoResSelect", videoRes, videoDefault);
      lastVideoResValue = videoDefault;

      // Set the date stamp toggle
      dateStampToggle.checked = result.dateStamp || false;

      // Restore the connection button's state
      updateConnectButtonState(result.connectionStatus || 'disconnected');
	  
	  // Restore mode  button statuses if  its not null 
	  updateModeButtonLabel(result.modeState ?? true);
	  updatePreviewButtonLabel(result.previewState || false, result.modeState);
	  
	  // Restore preview status if true we will need recall preview button
	  if (result.previewState) previewBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
	  
    });
  }
  
  //  Utility: get a chrome session storage value
  function getSessionValue(key) {
     return new Promise(resolve => {
       chrome.storage.session.get([key], result => {
         resolve(result[key]);
       });
    });
  }
  
  // update preview button label
  // Modified to use i18next for translation
  function updatePreviewButtonLabel(previewState, isVideoMode) {
    const previewBtn = document.getElementById("previewBtn");
    const mainText = previewState ? i18next.t('hidePreview') : i18next.t('showPreview');
    // Select the correct resolution based on the microscope's mode
    const resolutionText = isVideoMode ? PREVIEW_RES_VIDEO : PREVIEW_RES_PHOTO;

    // Use innerHTML to format the button's content
    const buttonHTML = `
    ${mainText}
    <br>
    <span class="preview-resolution">${resolutionText}</span>
  `;
  previewBtn.innerHTML = buttonHTML;
  chrome.storage.session.set({ 
    previewState: previewState,
    previewButtonHTML: buttonHTML // Save the full HTML
  });
 } 
  
   // Utility: update mode button label
   // Modified to use i18next for translation
  function updateModeButtonLabel(modeState) {
  const modeBtn = document.getElementById("modeBtn");
  const buttonText = modeState ? i18next.t('currentModeVideo') : i18next.t('currentModePhoto');
  modeBtn.textContent = buttonText;
  chrome.storage.session.set({ 
    modeState: modeState,
    modeButtonText: buttonText // Save the full text
  });
}

  // Utility: update record button label
  // Modified to use i18next for translation
  function updateRecordButtonLabel(isRecording) {
  const recordBtn = document.getElementById("recordBtn");
  const buttonText = isRecording ? `🔴 ${i18next.t('recording')}` : i18next.t('videoRecord');
  recordBtn.textContent = buttonText;
  chrome.storage.session.set({ 
    isRecording: isRecording,
    recordButtonText: buttonText // Save the full text
  });
}

  // Utility: show temporary flash message
  // Modified to accept a translation KEY instead of a literal message
  function showFlashMessage(messageKey, position = { top: 50, left: "50%" }) {
    let flashEl = document.createElement("div");
    flashEl.textContent = i18next.t(messageKey); // Translate the key
    flashEl.style.position = "fixed";
    flashEl.style.top = typeof position.top === "number" ? position.top + "px" : position.top;
    flashEl.style.left = typeof position.left === "number" ? position.left + "px" : position.left;
    flashEl.style.background = "rgba(0,0,0,0.8)";
    flashEl.style.color = "#fff";
    flashEl.style.padding = "6px 12px";
    flashEl.style.borderRadius = "4px";
    flashEl.style.zIndex = "9999";
    flashEl.style.whiteSpace = "nowrap"; // keeps text in one line
    document.body.appendChild(flashEl);

    setTimeout(() => {
        flashEl.remove();
    }, 1500);
  }
  
  // Get current mode status of scope returns null fail or 0 unknown , 1 video,2 recording,3 photo
  async function getModeStatus() { 
    try {
        const data = await sendCommandAndGetData("cmd=3014&par=0");
        isRecording = data && data.map && parseInt(data.map["2001"] || "0", 10) === 1;
		if (isRecording===1)  { 
		   updateRecordButtonLabel(isRecording);
		   updateModeButtonLabel(true);
		   return 2; 
		}  
		
		const modeStatus = await sendCommandAndGetStatus("cmd=2017&par=0");

        if (modeStatus === -13) {
          // Currently in video mode 
          updateModeButtonLabel(true);
		  return 1;
		}
		 if (modeStatus === -22) {
           // Currently in photo mode 
           updateModeButtonLabel(false);
		   return 3;
      } else {
        console.warn("Unknown mode status:", modeStatus);
        return 0;
      }

    } catch (err) {
      console.error("Failed to get mode:", err);
	  return null
    }
  }

  function sendMessageToBackground(path, command) {
    const baseURL = getBaseURL();
    const url = `${baseURL}/?custom=1&${path}`;
    chrome.runtime.sendMessage({ url, command });
  }

  // Helper to send command (like 3014) and receive a multiple status map
  function sendCommandAndGetData(cmdString) {
    return new Promise((resolve, reject) => {
      const baseURL = getBaseURL();
      const url = `${baseURL}/?custom=1&${cmdString}`;
      chrome.runtime.sendMessage({ url, command: cmdString }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response && response.success) {
          resolve(response.data); // keep full object (map or single)
        } else {
          reject(new Error("No valid response from background"));
        }
      });
    });
  }

  // Helper to both send a command and wait for the parsed status from background.js
  function sendCommandAndGetStatus(cmdString) {
    return new Promise((resolve, reject) => {
      const baseURL = getBaseURL();
      const url = `${baseURL}/?custom=1&${cmdString}`;
      chrome.runtime.sendMessage({ url, command: cmdString }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response && response.success) {
          resolve(response.data.status ? parseInt(response.data.status, 10) : null);
        } else {
          reject(new Error("No valid response from background"));
        }
      });
    });
  }

  //  Fetch  Intitial statuses from scope and popupulate dropdowns
  async function getScopeRes() {
    updateConnectButtonState('connecting'); // Set to connecting
    let videoDefault = "6";
	let photoDefault = "7";
	let isActuallyRecording = false;
	
    try {
      const data = await sendCommandAndGetData("cmd=3014&par=0");
      updateConnectButtonState('connected'); // Set to connected on success
    
        if (data.map) {
          photoDefault = data.map["1002"] || "7";
          videoDefault = data.map["2002"] || "6";
          populateDropdown("photoResSelect", photoRes, photoDefault);
          populateDropdown("videoResSelect", videoRes, videoDefault);
		    
          // Remember last safe known value
          lastVideoResValue = videoDefault;

          isActuallyRecording = parseInt(data.map["2001"] || "0", 10) === 1;
		  updateRecordButtonLabel(isActuallyRecording);
		  
        } else {
          populateDropdown("photoResSelect", photoRes, photoDefault);
          populateDropdown("videoResSelect", videoRes, videoDefault);
		  updateConnectButtonState('disconnected');
          lastVideoResValue = "6";
        }
		
		 chrome.storage.session.set({ videoRes: videoDefault });
	     chrome.storage.session.set({ photoRes: photoDefault });
		 return isActuallyRecording;
      
      }catch(err) {
        updateConnectButtonState('disconnected'); // Set to disconnected on failure
        console.error("Failed to get initial scope statuses:", err);
        populateDropdown("photoResSelect", photoRes, "7");
        populateDropdown("videoResSelect", videoRes, "6");
        lastVideoResValue = "6";
		// If we fail to connect, assume not recording
        updateRecordButtonLabel(false);
		return false;
     }
  }  
  
  
 // Initializaition function 
  async function startup() {
     updateConnectButtonState('disconnected'); // Set initial button state
      
     const isRecording = await getScopeRes();
	 if (isRecording) updateModeButtonLabel(true);
	 else await getModeStatus();
     loadAndApplySettings();
  } 
  
  // Event listeners 
  
  // about button
  
   aboutBtn.addEventListener("click", () => {
      aboutModal.showModal();
   });

   closeAboutBtn.addEventListener("click", () => {
     aboutModal.close();
   });
  
    
  // date stamp
  dateStampToggle.addEventListener("change", () => {
    const dateStamp = dateStampToggle.checked;
    const dateCmd = dateStamp ? "cmd=2008&par=1" : "cmd=2008&par=0";
    sendMessageToBackground(dateCmd, 'dateStamp');
	chrome.storage.session.set({ dateStamp: dateStamp });
  });
  
  // external preview control 
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // This allows content.js to tell us to turn the preview off
    if (message.command === "disablePreview") {
	  if (isPreviewShowing) {
	        previewBtn.click(); //click the button to turn it off
      }
    }
    // turn the preview back on wont work because its disabled .
    else if (message.command === "enablePreview") {
      if (!isPreviewShowing) {
        previewBtn.click(); 
      }
    }
  });
  
  // Photo Resolution change 
  document.getElementById("photoResSelect").addEventListener("change", async (event) => {
    const photoVal = event.target.value;
	sendMessageToBackground(`cmd=1002&par=${photoVal}`, 'photoRes');
	
	//If we are in photo mode and selecting or leaving the 16:9 resoltuion
	// then switch to video mode and then back to photo to remove the foldover glitch
	try {
	  const modeState = await getModeStatus();
	  if (modeState === 3) { 
	     if (photoVal === "8" || await getSessionValue("photoRes") === "8") {
			await sendCommandAndGetStatus("cmd=3001&par=1");
            await sendCommandAndGetStatus("cmd=3001&par=0");
			refreshBtn.click();
         }
	  } 
	chrome.storage.session.set({ photoRes: photoVal });
		
	// if (isPreviewShowing) refreshBtn.click(); does not help with 16:9 foldover problem
	} catch (err) {
      console.error("Failed to change photo resolution:", err);
      
    }
  });

  // Video Resolution change 
  const videoSelectEl = document.getElementById("videoResSelect");
  videoSelectEl.addEventListener("change", async (event) => {
	  
    const newValue = event.target.value;

    // re-check current recording status and mode cannot be changed in photo mode or during recording . 
	//videoSelect.disabled = true;  to disable it altogether.
    try {
	  const modeState = await getModeStatus();
	  // if in photo mode set dropdown value to last value if it was not null .
	  if (modeState === 3) { 
        event.target.value = lastVideoResValue ?? event.target.value; 
        showFlashMessage("unavailableInPhotoMode", { top: 180, left: 300 });
        return;
	  }

      if (modeState=== 2) {
		  showFlashMessage("unavailableDuringRecording", { top: 180, left: 300 });
		  console.warn("Blocked video resolution change: device is recording.");
        // Revert to last known safe value
        event.target.value = lastVideoResValue ?? event.target.value;
        return;
      }
       
      if (modeState=== 1) {	   
        lastVideoResValue = newValue;
        chrome.storage.session.set({ videoRes: newValue });
        sendMessageToBackground(`cmd=2002&par=${newValue}`, 'videoRes');
		// Preview sometimes freezes on vid res change, it's buggy firmware.
		//Maybe why Adonstar dropped thier Wi-fi features.
        if (isPreviewShowing) refreshBtn.click(); 
        return;
      }
	  
	  showFlashMessage("notConnected", { top: 180, left: 300 });
	  event.target.value = lastVideoResValue ?? event.target.value;
	  
    } catch (err) {
      console.error("Failed to verify recording status before resolution change:", err);
      // Revert to last known safe value on error
      event.target.value = lastVideoResValue ?? event.target.value;
    }
  });

    
  // Mode button 
  document.getElementById("modeBtn").addEventListener("click", async () => {
    try {
	  let newIsVideoMode = true;
      // Step 1: Stop any current recording
    await sendCommandAndGetStatus("cmd=2001&par=0");
      isRecording = false;  
      updateRecordButtonLabel(isRecording);
      // Step 2: Check current mode
      const modeStatus = await sendCommandAndGetStatus("cmd=2017&par=0");

      if (modeStatus === -13) {
        // Currently in video mode → switch to photo
        newIsVideoMode = false;
        await sendCommandAndGetStatus("cmd=3001&par=0");
        updateModeButtonLabel(false);
      } else if (modeStatus === -22) {
        // Currently in photo mode → switch to video
        newIsVideoMode = true;
        await sendCommandAndGetStatus("cmd=3001&par=1");
        updateModeButtonLabel(true);
		
		
      } else {
        console.warn("Unknown mode status:", modeStatus);
        return;
      }
     
	// After mode change, update the preview button's resolution text
    updatePreviewButtonLabel(isPreviewShowing, newIsVideoMode); 
	
    } catch (err) {
      console.error("Failed to toggle mode:", err);
    }
	// refresh the page if preview was showing .
	if (isPreviewShowing) {
		  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          chrome.tabs.reload(tabs[0].id);
          });
	}		  
 });

  // Connect button 
  document.getElementById("connectBtn").addEventListener("click", () => {
      const url = getBaseURL();
      // Its main job is now to refresh the status.
      getScopeRes();
      
      // As a fallback, if we're not on the microscope page, go there.
	  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs.length > 0 && !tabs[0].url.startsWith(url)) {
              chrome.tabs.update(tabs[0].id, {url: url});
          }
    });
  });

  //  Navigation buttons 
  document.getElementById("homeBtn").addEventListener("click", () => {
    const homeURL = getBaseURL();
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.update(tabs[0].id, {url: homeURL});
    });
  });
  
  document.getElementById("backBtn").addEventListener("click", () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.goBack(tabs[0].id);
    });
  });

  document.getElementById("refreshBtn").addEventListener("click", () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.reload(tabs[0].id);
    });
  });
 
   // Record button 
  let isRecording = false;
  document.getElementById("recordBtn").addEventListener("click", async () => {
    try {
	  const modeState = await getSessionValue('modeState');
	  if (!modeState) {
		  showFlashMessage("unavailableInPhotoMode");
		  return;
	  }
      const data = await sendCommandAndGetData("cmd=3014&par=0");
      isRecording = data && data.map && parseInt(data.map["2001"] || "0", 10) === 1;
      isRecording = !isRecording;
	  
      //if we where previously not recording then start, if we where already recording then stop .
      const par = isRecording ? 1 : 0;
      await sendCommandAndGetStatus(`cmd=2001&par=${par}`);
      updateRecordButtonLabel(isRecording);
    } catch (err) {
      console.error("Failed to toggle recording:", err);
    }
  });

    // Snapshot button 
  document.getElementById("snapshotBtn").addEventListener("click", async () => {
    try {
      let status = await sendCommandAndGetStatus("cmd=2017&par=1");

      if (status === 0 || status === 1) {
        showFlashMessage("videoSnapshotTaken");
		refreshBtn.click();
        return;
      }
       // in photo mode
      if (status === -22) {
        await sendCommandAndGetStatus("cmd=1001&par=0");
		// preview will dissapear,so we need to recall it.
		if (isPreviewShowing) {
			isPreviewShowing = false;
			previewBtn.click();
        }
			
        showFlashMessage("snapshotTaken");
		refreshBtn.click();
        return;
      }
         // in video mode but not currently recording change to photo mode to take snapshot 
      if (status === -13) {
        let modeStatus = await sendCommandAndGetStatus("cmd=3001&par=0");
        while (modeStatus !== 0) {
          await new Promise(r => setTimeout(r, 300));
          modeStatus = await sendCommandAndGetStatus("cmd=3001&par=0");
		  updateModeButtonLabel(false);
        }
        updateModeButtonLabel(false);
        let snapStatus = await sendCommandAndGetStatus("cmd=1001&par=0");
        while (snapStatus !== 0) {
          await new Promise(r => setTimeout(r, 300));
          snapStatus = await sendCommandAndGetStatus("cmd=1001&par=0");
        }

        //await sendCommandAndGetStatus("cmd=3001&par=1"); // decided to stay in photo mode
        showFlashMessage("snapshotTaken");
		refreshBtn.click();
        return;
      }

      console.warn("Unhandled snapshot status:", status);

    } catch (err)
	{
      console.error("Snapshot sequence failed:", err);
    }
  });

});