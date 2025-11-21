// content.js

// To prevent script from running multiple times in the same frame
if (!window.hasRunAd409Script) {
  window.hasRunAd409Script = true;

  const TOOLBAR_ID = "ad409-toolbar-iframe";
  let lastPreviewUrl = null; // remember the preview state
  
  // Helper function to get this tab's ID from the background script
  function getMyTabId() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ command: "registerTab" }, (response) => {
        resolve(response.tabId);
      });
    });
  }
  
  //  Main function that runs when the script is injected.
  async function initialize() {
    // only create the toolbar if we are in the frame with the file explorer.
    if (document.getElementById('folderlabel')) {
      console.log(`AD409: SUCCESS! Found 'folderlabel'. This is the correct frame.`);
	  //get tab id first
	  const myTabId = await getMyTabId();
	  const contentWrapper = wrapOriginalContent();
	  chrome.runtime.sendMessage({ command: "registerTab" });
      createToolbar(contentWrapper);
      injectDeletionUI(); // Add the multi-delete feature
	  sortFileTableByDate()
      interceptUploads(); // Add the upload sanitization feature
	  
      // Listen for commands from the background script to resize the iframe
      chrome.runtime.onMessage.addListener((message) => {
        if (message.command === "resizeIframe") {
          resizeToolbar(message.height);
        } else if (message.command === "togglePreview") {
		  lastPreviewUrl = message.show ? message.srcUrl : null;	
          togglePreviewPane(message.show, message.srcUrl);
        }
     });
	 
	 	  
	 //   Send command to popup.js to disable preview when not focused or visible, 
      // to save wifi bandwidth when the user switches away from this tab 
     
      document.addEventListener('visibilitychange', () => {
        // Check if the page is now hidden
        if (document.hidden) {
          // Only act if the preview is supposed to be on
          if (lastPreviewUrl) {
            console.log("AD409: Page hidden, disabling preview.");
            chrome.runtime.sendMessage({ command: "disablePreview" });
          }
        } else {
          // The page is visible again
          if (lastPreviewUrl) {
            console.log("AD409: Page visible, re-enabling preview.");
            chrome.runtime.sendMessage({ command: "enablePreview" });
          }
        }
      });
    }
  }
   
  const ORIGINAL_CONTENT_WRAPPER_ID = 'ad409-original-content';

  function wrapOriginalContent() {
    const wrapper = document.createElement('div');
    wrapper.id = ORIGINAL_CONTENT_WRAPPER_ID;

    // Move all direct children of <body> into the new wrapper
    while (document.body.firstChild) {
      wrapper.appendChild(document.body.firstChild);
    }
    // Add the wrapper to the body
    document.body.appendChild(wrapper);
	return wrapper;
  }
  
  function createToolbar(container, tabId) {
    if (document.getElementById(TOOLBAR_ID)) return; // Don't create duplicates

    const toolbar = document.createElement("iframe");
    toolbar.id = TOOLBAR_ID;
    toolbar.src = chrome.runtime.getURL(`popup.html?tabId=${tabId}`);
    toolbar.style.width = "720px";
    toolbar.style.height = "78px"; // Initial height
    toolbar.style.border = "none";
    toolbar.style.marginBottom = "5px";
    toolbar.style.transition = "height 0.01s ease-in-out"; // Smooth resize
    container.prepend(toolbar);
  }

  function resizeToolbar(newHeight) {
    const toolbar = document.getElementById(TOOLBAR_ID);
    if (toolbar) {
      toolbar.style.height = newHeight;
    }
  }
  
  // TWO-PANE LAYOUT AND PREVIEW LOGIC 
  const RIGHT_PANE_ID = 'ad409-right-pane';
  const SEPARATOR_ID = 'ad409-separator';

  function togglePreviewPane(show, srcUrl) {
    if (show) {
      setupTwoPaneLayout(srcUrl);
    } else {
      teardownTwoPaneLayout();
    }
  }

  function setupTwoPaneLayout(srcUrl) {
    const leftPane = document.getElementById(ORIGINAL_CONTENT_WRAPPER_ID);
    if (!leftPane || document.getElementById('ad409-flex-container')) return;

    // 1. Create a new flex container
    const flexContainer = document.createElement('div');
    flexContainer.id = 'ad409-flex-container';
    flexContainer.style.cssText = 'display: flex; height: 100%;';

    // 2. Move the original content (leftPane) inside the new container
    leftPane.parentElement.insertBefore(flexContainer, leftPane);
    flexContainer.appendChild(leftPane);

    // 3. Create the separator and right pane
    const separator = document.createElement('div');
    separator.id = SEPARATOR_ID;

    const rightPane = document.createElement('div');
    rightPane.id = RIGHT_PANE_ID;

    const streamImg = document.createElement('img');
    streamImg.src = srcUrl;
    rightPane.appendChild(streamImg);
	
    // 4. Add the separator and right pane to the flex container
    flexContainer.appendChild(separator);
    flexContainer.appendChild(rightPane);
	
    // 5. Apply the necessary CSS styles (to the panes, not the body)
    leftPane.style.cssText = 'width: 720px; flex-shrink: 0; overflow: auto;';
    rightPane.style.cssText = 'flex-grow: 1; overflow: hidden; padding-left: 5px; display: flex; align-items: center; justify-content: center;';
	streamImg.style.cssText = 'max-width: 100%; max-height: 100%; object-fit: contain;';
    separator.style.cssText = 'width: 5px; background: #ccc; cursor: col-resize; flex-shrink: 0;';

    // 6. Make the separator draggable
    makeSeparatorDraggable(separator, leftPane);
  }

  function teardownTwoPaneLayout() {
    const flexContainer = document.getElementById('ad409-flex-container');
    const leftPane = document.getElementById(ORIGINAL_CONTENT_WRAPPER_ID);

    if (flexContainer && leftPane) {
      // 1. Move the original content back out to be a direct child of the body
      flexContainer.parentElement.insertBefore(leftPane, flexContainer);
      
      // 2. Remove the flex container (which holds the right pane and separator)
      flexContainer.remove();
      
      // 3. Reset the styles on the original content wrapper
      leftPane.style.cssText = '';
    }
  }

  function makeSeparatorDraggable(separator, leftPane) {
    separator.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = leftPane.offsetWidth;

      const doDrag = (moveEvent) => {
        const newWidth = startWidth + moveEvent.clientX - startX;
        if (newWidth > 400) {
          leftPane.style.width = `${newWidth}px`;
        }
      };

      const stopDrag = () => {
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
      };

      document.addEventListener('mousemove', doDrag);
      document.addEventListener('mouseup', stopDrag);
    });
  }
  
   
  
  function sortFileTableByDate() {
    const fileTable = document.querySelector('#body table');
    if (!fileTable) return;

    // Get all rows from the table
    const rows = Array.from(fileTable.querySelectorAll('tr'));

 
	  
	  // Separate the header row
    const headerRow = rows.shift(); 
    
    // A much more reliable way to find file rows: look for the unique delete link.
    const fileRows = rows.filter(row => row.querySelector('a[href*="?del=1"]'));
    
    // Get any other rows that are not file rows (like the separator)
    const otherRows = rows.filter(row => !row.querySelector('a[href*="?del=1"]'));

    // Sort the file rows
    fileRows.sort((a, b) => {
      // The date is in the third column (index 2) of the original table structure.
      const dateTextA = a.querySelectorAll('td')[3].textContent;
      const dateTextB = b.querySelectorAll('td')[3].textContent;
      
      // Convert "YYYY/MM/DD HH:MM:SS" to a comparable Date object
      const dateA = new Date(dateTextA);
      const dateB = new Date(dateTextB);
      
      // Sort descending (newest first)
      return dateB - dateA;
    });

    // Clear the table's current content
    while (fileTable.firstChild) {
      fileTable.removeChild(fileTable.firstChild);
    }
    
    // Re-add the rows in the correct order: header, sorted files, then footer
    fileTable.appendChild(headerRow);
    fileRows.forEach(row => fileTable.appendChild(row));
    otherRows.forEach(row => fileTable.appendChild(row));
 }


  // MULTI-DELETE FUNCTIONALITY 
  function injectDeletionUI() {
    const fileTable = document.querySelector('#body table');
    if (!fileTable) return; // Exit if no file table found

    // 1. Create the 'Delete Selected' button
    const deleteBtn = document.createElement('button');
	deleteBtn.textContent = ` ${chrome.i18n.getMessage("deleteSelectedFiles")}`;
	
	deleteBtn.style.marginTop = '10px';
    deleteBtn.style.marginBottom = '10px';
    deleteBtn.style.backgroundColor = '#B59DE2';
    deleteBtn.style.borderColor = '#BCCACE';
    fileTable.before(deleteBtn); // Place button before the table

    // 2. Add 'Select All' checkbox to the table header
    const headerRow = fileTable.querySelector('tr');
    const selectAllHeader = document.createElement('th');
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllHeader.appendChild(selectAllCheckbox);
    headerRow.prepend(selectAllHeader);

    // 3. Add individual checkboxes to each file row
    const fileRows = fileTable.querySelectorAll('tr');
    fileRows.forEach((row, index) => {
      if (index === 0) return; // Skip header row

      const deleteLink = row.querySelector('a[href*="?del=1"]');
      if (deleteLink) {
        // Create checkbox and cell
        const checkboxCell = row.insertCell(0);
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'file-checkbox';
        // Store the URL we need to call for deletion
        checkbox.dataset.deleteUrl = deleteLink.href;
        checkboxCell.appendChild(checkbox);

        // Hide the original 'Remove' link to avoid confusion
        deleteLink.style.display = 'none';
      }
    });

    // 4. Add event listener for 'Select All'
    selectAllCheckbox.addEventListener('change', () => {
      const allFileCheckboxes = document.querySelectorAll('.file-checkbox');
      allFileCheckboxes.forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
      });
    });

    // 5. Add event listener for the 'Delete Selected' button
    deleteBtn.addEventListener('click', async () => {
      const checkedBoxes = document.querySelectorAll('.file-checkbox:checked');
      if (checkedBoxes.length === 0) {
        (chrome.i18n.getMessage("alertNoFilesSelected"));
        return;
      }

      if (!confirm(chrome.i18n.getMessage("confirmDelete", String(checkedBoxes.length)))) {
      return;
      }

      deleteBtn.disabled = true;
      let deleteCount = 0;

      for (const box of checkedBoxes) {
        try {
          const response = await fetch(box.dataset.deleteUrl);
          if (response.ok) {
            // Success! Remove the row from the page
            box.closest('tr').remove();
            deleteCount++;
          } else {
            console.error(`Failed to delete ${box.dataset.deleteUrl}. Status: ${response.status}`);
          }
        } catch (error) {
          console.error(`Error deleting ${box.dataset.deleteUrl}:`, error);
        }
      }
          
      deleteBtn.disabled = false;
      selectAllCheckbox.checked = false; // Uncheck 'Select All'
    });
  }
   
   //  UPLOAD INTERCEPTION FUNCTIONALITY 
  function interceptUploads() {
    // A helper function to attach our custom logic to a form
    const attachUploadInterceptor = (form) => {
      if (!form) return;

      form.addEventListener('submit', async (event) => {
        // Stop the form from submitting the default way
        event.preventDefault();

        const fileInput = form.querySelector('input[type="file"]');
        if (!fileInput || fileInput.files.length === 0) {
          alert(chrome.i18n.getMessage("alertPleaseSelectFile"));
          return;
        }

        const originalFile = fileInput.files[0];
        // Sanitize the filename by replacing spaces with underscores to get around the ad409 firmware bug 
		//that prevents the scope from deleteing filenames containing spaces. 
        const noSpaceFilename = originalFile.name.replace(/ /g, '_');

        // If the name was changed, confirm with the user
        if (noSpaceFilename !== originalFile.name) {
          if (!confirm(chrome.i18n.getMessage("confirmRename", noSpaceFilename ))) {
            return; // User cancelled the upload
          }
        }

        // Create a new FormData object to send our modified file
        const formData = new FormData();
        // append the file with the new, sanitized filename
        formData.append(fileInput.name, originalFile, noSpaceFilename);

        // Provide feedback to the user
        const submitButton = form.querySelector('input[type="submit"]');
        const originalButtonText = submitButton.value;
        submitButton.value = chrome.i18n.getMessage("uploading");
        submitButton.disabled = true;

        try {
          // Manually submit the form data using fetch
          const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            alert(chrome.i18n.getMessage("alertUploadSuccess"));
            window.location.reload(); // Reload the page to see the new file
          } else {
            alert(chrome.i18n.getMessage("alertUploadFailed", `${response.status} ${response.statusText}`));
          }
        } catch (error) {
          alert(chrome.i18n.getMessage("alertUploadError", error.message));
          console.error('Upload failed:', error);
        } finally {
          // Restore the button to its original state
          submitButton.value = originalButtonText;
          submitButton.disabled = false;
        }
      });
    };

    // Find both upload forms on the page and attach the interceptor
    attachUploadInterceptor(document.querySelector('form[name="frm"]'));
    attachUploadInterceptor(document.querySelector('form[name="frm2"]'));
  }
  

  document.addEventListener("click", function(e) {
    // Find the nearest <a> or <img> ancestor
    let el = e.target;
    while (el && el !== document.body) {
      if (el.tagName === "A" && !el.href.includes('?del=1')) {
        const isImage = /\.jpe?g$/i.test(el.href);
        const isVideo = /\.mp4$/i.test(el.href);

        // Check if the link is for an image OR a video
        if (isImage || isVideo) {
          // For both file types, disable the preview to free up bandwidth
          chrome.runtime.sendMessage({ command: "disablePreview" });
          
		  //  Image-specific action 
          if (isImage) {
            // For images, we stop the browser and open our custom viewer
            e.preventDefault();
            e.stopPropagation();
            chrome.runtime.sendMessage({ imageUrl: el.href });
            return; // Exit the loop
          }

          // For MP4 files, we do nothing else. The browser will proceed
          // with the default download/play action after this code runs.
        }
      }
      if (el.tagName === "IMG" && /\.jpe?g$/i.test(el.src)) {
        e.preventDefault();
        e.stopPropagation();
		chrome.runtime.sendMessage({ command: "disablePreview" });
        chrome.runtime.sendMessage({ imageUrl: el.src });
        return;
      }
      el = el.parentElement;
    }
  }, true);

  // Run the initialization logic.
  initialize();
}