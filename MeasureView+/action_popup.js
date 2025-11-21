let browserLang;
// i18next initialization 
async function i18n_init() {
  // ... inside i18n_init()
  browserLang = chrome.i18n.getUILanguage().split('-')[0]; // Turns "en-US" into "en"
  console.log("browserLang=:", browserLang );   
  const currentLanguage =  browserLang || 'en';
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
  updateContent();
}

function updateContent() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = i18next.t(key);
  });
}

async function loadIP() {
  const ipInput = document.getElementById("ipInput");
  const data = await chrome.storage.local.get(['scopeIP']);
  ipInput.value = data.scopeIP || "http://192.168.1.254";
}

document.addEventListener("DOMContentLoaded", async () => {
  // Wait for i18next to initialize before running the rest of the script
  await i18n_init();

  const connectBtn = document.getElementById("connectBtn");
  const viewerBtn = document.getElementById("viewerBtn");
  const ipInput = document.getElementById("ipInput");
  const saveIpBtn = document.getElementById("saveIpBtn");

  // Load the saved IP into the input field
  await loadIP();
  
  // Save IP Button 
  saveIpBtn.addEventListener("click", async () => {
    let inputValue = ipInput.value.trim();
    if (!inputValue.startsWith("http")) {
      inputValue = `http://${inputValue}`;
    }
    // Save to both storages for the other scripts
    localStorage.setItem("scopeIP", inputValue);
    await chrome.storage.local.set({ scopeIP: inputValue });
	
	//  logic for chromes  "optional_host_permissions" for user entered ip
	  const newOrigin = `${new URL(inputValue).origin}/*`;

    // Only request permission if it's not the default
    if (newOrigin !== "http://192.168.1.254/*") {
      console.log(`Requesting permission for: ${newOrigin}`);
	  chrome.permissions.request({
          origins: [newOrigin]
      }, (granted) => {
          if (granted) {
              console.log("Permission granted!");
          } else {
              console.log("Permission denied.");
              // TODO: Alert the user that the new IP won't work
          }
      });
    }
    
    // notify user
    saveIpBtn.textContent = i18next.t('saved') || 'Saved!';
    setTimeout(() => {
      saveIpBtn.textContent = i18next.t('save') || 'Save';
    }, 1500);
  });

  // --- Connect to Microscope Button ---
  connectBtn.addEventListener("click", async () => {
    // Get the stored IP address
    const data = await chrome.storage.local.get(['scopeIP']);
    const scopeIP = data.scopeIP || "http://192.168.1.254";
	
   //Find the active tab and navigate it to the microscope's IP
   const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
   if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { url: scopeIP });
      window.close(); // Close the popup
   }
  });

  // --- Open Image Viewer Button ---
  viewerBtn.addEventListener("click", () => {
    const currentLanguage = browserLang || 'en';
    chrome.tabs.create({
      url: chrome.runtime.getURL(`viewer.html?lang=${currentLanguage}`)
    });
    window.close(); // Close the popup
  });
});