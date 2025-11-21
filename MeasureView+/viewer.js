

// Function to update all text elements in the UI
function updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const optionsAttr = el.getAttribute('data-i18n-options');
        const options = optionsAttr ? JSON.parse(optionsAttr) : {};

        if (key.startsWith('[title]')) {
            const titleKey = key.substring(7);
            el.setAttribute('title', i18next.t(titleKey));
        } else {
            el.innerHTML = i18next.t(key, options);
        }
    });
    // Update dynamic elements not covered by data-i18n attributes
    keyHelp = i18next.t('keyHelp');
    document.getElementById("keyHelperBar").textContent = keyHelp;
    populateHotkeys(); // Repopulate hotkey list with new language
    drawOverlay(); // Redraw measurements with potentially new unit names
}


// Function to initialize i18next with a specific language
function initializeI18next(lang) {
    i18next
        .use(i18nextHttpBackend)
        .init({
            lng: lang,
            fallbackLng: 'en',
            supportedLngs: ['en', 'fr', 'es', 'de', 'it', 'nl', 'ja', 'zh', 'pt', 'pl', 'hi', 'tr', 'ro', 'ru', 'uk'],
            load: 'languageOnly', // treat en-US as en or fr-CA as fr
            backend: {
                loadPath: 'locales/{{lng}}/translation.json'
            }
        }).then(function(t) {
            updateUI(); // Initial UI update
			// Manually update the calibration modal dropdown now that translations are ready
            const calibUnitsSelect = document.getElementById('calib-units');
            if (calibUnitsSelect) {
                calibUnitsSelect.querySelector('option[value="mm"]').textContent = i18next.t('unit_mm');
                calibUnitsSelect.querySelector('option[value="inch"]').textContent = i18next.t('unit_in');
                calibUnitsSelect.querySelector('option[value="px"]').textContent = i18next.t('unit_px');
                calibUnitsSelect.querySelector('option[value="custom"]').textContent = i18next.t('unit_custom');
            }
        });
}

// Determine the initial language and then initialize
const params = new URLSearchParams(window.location.search);
const langFromUrl = params.get('lang');

if (langFromUrl) {
    // If language is specified in the URL, use it immediately
    initializeI18next(langFromUrl);
} else {
    // Otherwise, try to get it from chrome.storage asynchronously
    chrome.storage.local.get('viewerLanguage', (result) => {
        const langFromStorage = result.viewerLanguage || 'en'; // Default to 'en' if not found
        initializeI18next(langFromStorage);
    });
}

// Language selector event listener
const languageSelect = document.getElementById('languageSelect');
languageSelect.addEventListener('change', (event) => {
    const newLang = event.target.value;
    chrome.storage.local.set({ viewerLanguage: newLang }); // Save the user's choice
    i18next.changeLanguage(newLang).then(t => {
        updateUI();
        // also update the calibration modal dropdown if it exists
        const calibUnitsSelect = document.getElementById('calib-units');
        if (calibUnitsSelect) {
            calibUnitsSelect.querySelector('option[value="mm"]').textContent = i18next.t('unit_mm');
            calibUnitsSelect.querySelector('option[value="inch"]').textContent = i18next.t('unit_in');
            calibUnitsSelect.querySelector('option[value="px"]').textContent = i18next.t('unit_px');
            calibUnitsSelect.querySelector('option[value="custom"]').textContent = i18next.t('unit_custom');
        }
    });
});

// After i18next initializes, set the dropdown to the correct language
i18next.on('initialized', () => {
    languageSelect.value = i18next.language;
});

const img = document.getElementById("img");
const container = document.getElementById("container");
const resolutionEl = document.getElementById("resolution");
const modeEl = document.getElementById("mode");
const measurementEl = document.getElementById("measurement");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
// Disable interpolation
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
img.style.imageRendering = "pixelated"; // for rendering as well as drawing, "auto" for smoothed


// DOM elements for settings,file, and help modals
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const fileBtn = document.getElementById('fileBtn');
const fileModal = document.getElementById('fileModal');
const closeFileBtn = document.getElementById('closeFileBtn');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');
const hotkeyUl = document.getElementById('hotkey-list');
const lineColorPicker = document.getElementById('lineColorPicker');
const textColorPicker = document.getElementById('textColorPicker');
const solidTextBackgroundCheckbox = document.getElementById('solidTextBackgroundCheckbox');
const textBgColorPicker = document.getElementById('textBgColorPicker');
const highlightColorPicker = document.getElementById('highlightColorPicker');
const fontSizeInput = document.getElementById('fontSizeInput');
const scaleWithZoom = document.getElementById('scaleWithZoom');
const lineWidthInput = document.getElementById('lineWidthInput');
const saveCsvBtn = document.getElementById('saveCsvBtn');
const saveImgBtn = document.getElementById('saveImgBtn');
const loadImageInput = document.getElementById('loadImageInput');
const endStyleSelect = document.getElementById('endStyleSelect');
const arrowSolidCheckbox = document.getElementById('arrowSolidCheckbox');
const brightnessSlider = document.getElementById('brightnessSlider');
const contrastSlider = document.getElementById('contrastSlider');
const normalizeBtn = document.getElementById('normalizeBtn'); 
const pixelInterpolationCheckbox = document.getElementById('pixelInterpolationCheckbox');
let keyHelp = "C - Calibrate : M - Measure : A - Angle :   S - Snap to : V,H - line lock : Del - delete : ESC - Clear All : I - inches <-> mm : Tab - Fit";

// Logic to handle loading an image from sessionStorage or URL params
const imageFromStorage = sessionStorage.getItem('imageToLoad');
const filenameFromStorage = sessionStorage.getItem('imageFilename');

if (imageFromStorage) {
  img.src = imageFromStorage;
  if (filenameFromStorage) {
    document.getElementById("filenameDisplay").textContent = filenameFromStorage;
  }
   // when the user navigates away to prevent memory leaks.
 
   // Clean up after loading
  sessionStorage.removeItem('imageToLoad');
  sessionStorage.removeItem('imageFilename');
} else {
    const params = new URLSearchParams(window.location.search);
    const src = params.get("src");
  if (src) {
    img.src = src;
    const decoded = decodeURIComponent(src);
    const filename = decoded.split(/[\\/]/).pop();
    document.getElementById("filenameDisplay").textContent = filename;
  } else {
    //  This now loads when no other image is found.
    // Used chrome.runtime.getURL() to get the correct path to the image in icons folder.
    img.src = chrome.runtime.getURL('icons/placeholder.png');
    document.getElementById("filenameDisplay").textContent = i18next.t('placeholderImg');
           
  }
}


window.addEventListener('beforeunload', (event) => {
  //  Wanr user of the "unsaved work" when closing tab
  if (measurements.length > 0 || angles.length > 0) {
    event.preventDefault(); // prevent leave site 
    event.returnValue = ''; // trigger browsers default confirmation warning
  }

  //  Logic to prevent memory leaks from blob URLs 
  if (img.src.startsWith('blob:')) {
    URL.revokeObjectURL(img.src);
  }
});

document.getElementById("keyHelperBar").textContent = keyHelp;

const storage = chrome.storage.local; // use chrome local storage
const CALIBRATION_KEY = 'viewerCalibrations';
const MAX_CALIBRATIONS = 15;
const SETTINGS_KEY = 'viewerSettings'; //new settings storage key

let scale = 1;
let originX = 0;
let originY = 0;
let isDragging = false; // is dragging background
let startX, startY;

let mode = "view"; // view | calibrate | measure
let firstClick = null;
let secondClick = null; // To hold the second calibration click
let calibrationFactor = null;
let unitName = "mm";

let mousePos = { x: 0, y: 0 }; // image coords for cursor
let measurements = []; // store completed measurements

let angles = []; // store completed angle measurements
let anglePoints = []; // temporary storage for the 3 clicks
let nextId = 1;        // unique ID counter
let lastCreated = null; // { type: 'measurement'|'angle', id }

let selectedItem = null; //  { type, id }
let hoverItem = null;    // for hover highlight
let isDraggingLabel = false; // true when moving a measurement's label
let isDraggingEndpoint = false; // true when moving a measurement's endpoint
let draggedEndpoint = null; // { type, id, point: 'p1'|'p2'|'vertex'|'p3' }
let snapEnabled = false;
const SNAP_THRESHOLD = 25; // Snap distance in screen pixels
const LABEL_SNAP_THRESHOLD = 6; // Screen pixels for label to snap to its line
let hKeyIsDown = false;
let vKeyIsDown = false;

let tickAdjust = 1; // used to adjust tick/arrows px size with resolution after image has loaded

img.addEventListener("load", () => {
  tickAdjust = img.naturalHeight / 1536;
  console.log("tickAdjust updated:", tickAdjust);
});

//Settings variables with default values
let lineColor = "#00ffff";        //cyan
let textColor = "#ffffff";       //default white
let solidTextBackground = true; // default to on
let textBgColor = "#202020";     // default to almost black
let highlightColor = "#80ff00"; // light green
let fontSize = 21;
let lineWidth = 1;
let endStyle = "line"; // default tick style
let arrowSolid = true; 
let flScale = true;  // default  enable  scale with zoom for fonts,linewidth
let scaleFactor = 1
let labOffset = 6    // initial measurments label offset in px
let brightness = 100; // default brightness in percent
let contrast = 100;   // default contrast 
let pixelInterpolation = false; // default to off (pixelated)

const contextMenu = document.createElement('div');
contextMenu.id = 'customContextMenu';
document.body.appendChild(contextMenu);



//Add styles for the context menu to the document's head.
const contextMenuStyle = document.createElement('style');
contextMenuStyle.innerHTML = `
  #customContextMenu {
    display: none;
    position: fixed;
    z-index: 10000;
    background-color: #333;
    border: 1px solid #555;
    border-radius: 5px;
    padding: 5px 0;
    font-family: sans-serif;
    font-size: 14px;
    color: white;
    min-width: 150px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  }
  #customContextMenu div {
    padding: 8px 15px;
    cursor: pointer;
  }
  #customContextMenu div:hover {
    background-color: #555;
  }
`;
document.head.appendChild(contextMenuStyle);

img.addEventListener("load", () => {
  resolutionEl.textContent = `${img.naturalWidth} × ${img.naturalHeight} px `;
  fitToWindow(); // Fit image to window on load
});

function fitToWindow() {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    if (!imgWidth || !imgHeight) return;

    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;

    // Use the smaller scale factor to ensure the whole image fits
    scale = Math.min(scaleX, scaleY);
	measurementEl.innerText = i18next.t('measurementZoom', { val: scale.toFixed(2) });

    // Center the image
    originX = (containerWidth - imgWidth * scale) / 2;
    originY = (containerHeight - imgHeight * scale) / 2;

    updateTransform();
    drawOverlay();
}
   // Applies filters to viewing background img only, no change to img
   // data and does not apply to lines/labels overlay.
function updateImageFilters() {
    img.style.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
   }
   
   function updateImageRendering() {
    img.style.imageRendering = pixelInterpolation ? "auto" : "pixelated";
	ctx.imageSmoothingEnabled = pixelInterpolation;
    ctx.webkitImageSmoothingEnabled = pixelInterpolation;
    ctx.mozImageSmoothingEnabled = pixelInterpolation;
}

   
// Function to create and manage the calibration modal, note - display: none; for first call.
function createCalibrationModal() {
    // Create modal elements
    const modal = document.createElement('div');
    modal.id = 'calibration-modal';
    modal.style.cssText = `
        display: none; position: fixed; top: 0%; left: 70%; transform: translate(-50%, 0%);
        background-color: #333; color: white; padding: 20px; border-radius: 8px; z-index: 1000;
        border: 1px solid #555; font-family: sans-serif; text-align: left; width: 380px;
    `;

    modal.innerHTML = `
        <h3 style="text-align: center; margin-top: 0;" data-i18n="calib_title">Calibration</h3>
        <p id="calib-instructions" data-i18n="calib_instructions_select">Select two points, then enter the real-world distance.</p>
        <div>
            <label for="calib-distance" data-i18n="calib_distance">Distance:</label>
            <input type="number" id="calib-distance" style="width: 80px;">
            <select id="calib-units">
                <option value="mm">mm</option>
                <option value="inch">in</option>
                <option value="px">px</option>
                <option value="custom">custom</option>
            </select>
            <input type="text" id="calib-custom-unit" placeholder="unit" style="display: none; width: 60px; margin-left: 5px;">
        </div>
        <p id="calib-pixel-dist" style="font-size: 12px; min-height: 18px;"></p>
        <div style="text-align: center;">
            <button id="calib-ok" data-i18n="calib_use_session">Use for this session only</button>
        </div>

        <div style="margin-top: 15px; border-top: 1px solid #555; padding-top: 10px;">
            <label for="calib-name" data-i18n="calib_save_new">Save New Calibration:</label>
            <input type="text" id="calib-name" placeholder="e.g., 10x Lens , Distance - top" style="width: 180px;">
            <button id="calib-save" data-i18n="calib_save_btn">Save</button>
        </div>

        <div style="margin-top: 10px; border-top: 1px solid #555; padding-top: 10px;">
            <label for="calib-list" data-i18n="calib_manage">Manage Saved:</label>
            <select id="calib-list" style="max-width: 180px;"></select>
            <button id="calib-load" data-i18n="calib_load_btn">Load</button>
            <button id="calib-delete" style="background-color: #a11;" data-i18n="calib_delete_btn">Delete</button>
        </div>

        <div style="margin-top: 20px; text-align: center;">
            <button id="calib-cancel" data-i18n="closeBtn">Close</button>
        </div>
    `;
    document.body.appendChild(modal);

    const distanceInput = document.getElementById('calib-distance');
    const unitsSelect = document.getElementById('calib-units');
    const customUnitInput = document.getElementById('calib-custom-unit');
    const instructions = document.getElementById('calib-instructions');

    //  Event listener to handle unit selection changes 
   unitsSelect.addEventListener('change', (e) => {
        const selectedUnit = e.target.value;
        customUnitInput.style.display = selectedUnit === 'custom' ? 'inline-block' : 'none';
        distanceInput.disabled = selectedUnit === 'px';
        instructions.textContent = selectedUnit === 'px'
            ? i18next.t('calib_instructions_px')
            : i18next.t('calib_instructions_select');
    });

    function populateCalibrationList() {
        storage.get(CALIBRATION_KEY, (result) => {
            const calibrations = result[CALIBRATION_KEY] || [];
            const selectEl = document.getElementById('calib-list');
            selectEl.innerHTML = ''; // Clear existing options
            if (calibrations.length === 0) {
                const option = document.createElement('option');
                option.textContent = i18next.t('calib_noSaved');
                option.disabled = true;
                selectEl.appendChild(option);
            } else {
                calibrations.forEach(cal => {
                    const option = document.createElement('option');
                    option.value = cal.name;
                    option.textContent = cal.name;
                    selectEl.appendChild(option);
                });
            }
        });
    }
	
   // Run once on creation to have the list ready.
    populateCalibrationList();

    // Attach listeners to modal buttons
    document.getElementById('calib-ok').addEventListener('click', () => applyCalibration());
    document.getElementById('calib-save').addEventListener('click', saveNewCalibration);
    document.getElementById('calib-load').addEventListener('click', loadSelectedCalibration);
    document.getElementById('calib-delete').addEventListener('click', deleteSelectedCalibration);
    document.getElementById('calib-cancel').addEventListener('click', cancelCalibration);

    function applyCalibration(onLoad = false) {
        if (!onLoad) { // Don't validate points if loading a saved value
            let selectedUnit = unitsSelect.value;
            if (selectedUnit === 'px') {
                calibrationFactor = 1;
                unitName = 'px';
                alert(i18next.t('alert_calibrationSetPx'));
                exitCalibrationMode();
                return;
            }
            if (!firstClick || !secondClick) {
                alert(i18next.t('alert_selectTwoPoints'));
                return;
            }
            const realDistance = parseFloat(distanceInput.value);
            if (isNaN(realDistance) || realDistance <= 0) {
                alert(i18next.t('alert_enterDistance'));
                return;
            }

            const dx = secondClick.x - firstClick.x;
            const dy = secondClick.y - firstClick.y;
            const pixelDistance = Math.sqrt(dx * dx + dy * dy);
            calibrationFactor = realDistance / pixelDistance;

            if (selectedUnit === 'custom') {
                unitName = customUnitInput.value || 'units';
            } else {
                unitName = selectedUnit;
            }
            alert(i18next.t('alert_calibrationSet'));
        }
        exitCalibrationMode();
    }   

   function saveNewCalibration() {
        let selectedUnit = unitsSelect.value;
        if (selectedUnit === 'px') {
            alert(i18next.t('alert_cannotSavePx'));
            return;
        }
        if (!firstClick || !secondClick) {
            alert(i18next.t('alert_selectTwoPoints'));
            return;
        }
        const realDistance = parseFloat(distanceInput.value);
        if (isNaN(realDistance) || realDistance <= 0) {
            alert(i18next.t('alert_enterDistance'));
            return;
        }
        const name = document.getElementById('calib-name').value.trim();
        if (!name) {
            alert(i18next.t('alert_enterName'));
            return;
        }

        const dx = secondClick.x - firstClick.x;
        const dy = secondClick.y - firstClick.y;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);
        const newFactor = realDistance / pixelDistance;
        const newUnit = selectedUnit === 'custom' ? (customUnitInput.value || 'units') : selectedUnit;

        const newCalibration = {
            name: name,
            factor: newFactor,
            unit: newUnit,
            imgHeight: img.naturalHeight // Store for future adjustments
        };

         storage.get(CALIBRATION_KEY, (result) => {
            let calibrations = result[CALIBRATION_KEY] || [];
            if (calibrations.find(c => c.name.toLowerCase() === name.toLowerCase())) {
                if (!confirm(i18next.t('confirm_overwrite', { name: name }))) {
                    return;
                }
                calibrations = calibrations.filter(c => c.name.toLowerCase() !== name.toLowerCase());
            }

            if (calibrations.length >= MAX_CALIBRATIONS) {
                alert(i18next.t('alert_storageFull', { max: MAX_CALIBRATIONS }));
                return;
            }

            calibrations.push(newCalibration);
            storage.set({ [CALIBRATION_KEY]: calibrations }, () => {
                alert(i18next.t('alert_calibSaved', { name: name }));
                populateCalibrationList();
                document.getElementById('calib-name').value = '';
                // Set the newly saved calibration as active
                calibrationFactor = newCalibration.factor;
                unitName = newCalibration.unit;
                exitCalibrationMode();
            });
        });
    }    
        
   function loadSelectedCalibration() {
        const selectEl = document.getElementById('calib-list');
        const selectedName = selectEl.value;
        if (!selectedName || selectEl.options[selectEl.selectedIndex].disabled) {
            alert(i18next.t('alert_selectToLoad'));
            return;
        }

        storage.get(CALIBRATION_KEY, (result) => {
            const calibrations = result[CALIBRATION_KEY] || [];
            const cal = calibrations.find(c => c.name === selectedName);
            if (cal) {
                // if image taken at same distance and by the same microscope lens then we can reuse 
				// the stored calibrationfactor if only image resolution/aspect ratio is changed
		        // since real image height does not vary if only resolution or aspect ratio is changed
                // to reuse calibration we take into account any change in Resolution.
                calibrationFactor = cal.factor * (cal.imgHeight / img.naturalHeight);
                unitName = cal.unit;
                alert(i18next.t('alert_calibLoaded', { name: cal.name }));
                applyCalibration(true);
            } else {
                alert(i18next.t('alert_calibNotFound'));
            }
        });
    }
        
    function deleteSelectedCalibration() {
        const selectEl = document.getElementById('calib-list');
        const selectedName = selectEl.value;
        if (!selectedName || selectEl.options[selectEl.selectedIndex].disabled) {
            alert(i18next.t('alert_selectToDelete'));
            return;
        }

        if (confirm(i18next.t('confirm_deleteCalib', { name: selectedName }))) {
            storage.get(CALIBRATION_KEY, (result) => {
                let calibrations = result[CALIBRATION_KEY] || [];
                calibrations = calibrations.filter(c => c.name !== selectedName);
                storage.set({ [CALIBRATION_KEY]: calibrations }, () => {
                    alert(i18next.t('alert_calibDeleted', { name: selectedName }));
                    populateCalibrationList();
                });
            });
        }
    }

    function cancelCalibration() {
        exitCalibrationMode();
    }
    
    function exitCalibrationMode() {
        modal.style.display = 'none';
        firstClick = null;
        secondClick = null;
        mode = "view";
        modeEl.textContent = i18next.t('mode_view');
        container.style.cursor = "grab";
        document.getElementById('calib-pixel-dist').textContent = "";
        drawOverlay();
    }
}

//  create and inject the modal on script load ready for later when it's made visible
createCalibrationModal();

// Function to save settings to chrome storage
function saveSettings() {
    const settings = {
        lineColor,
        textColor,
		solidTextBackground,
        textBgColor,
        highlightColor,
        fontSize,
		flScale,     //scale font and linewidth with zoom setting
        lineWidth,
		endStyle,   // tick style
		arrowSolid,
		brightness,
        contrast,
		pixelInterpolation,
    };
    storage.set({ [SETTINGS_KEY]: settings });
}

// Function to load settings from chrome storage
function loadSettings() {
    storage.get(SETTINGS_KEY, (result) => {
        const savedSettings = result[SETTINGS_KEY];
        if (savedSettings) {
            lineColor = savedSettings.lineColor || '#ff0000';
            textColor = savedSettings.textColor || '#00ffff';
			solidTextBackground = savedSettings.solidTextBackground ?? true;
            textBgColor = savedSettings.textBgColor || '#000000';
            highlightColor = savedSettings.highlightColor || '#00ffff';
			endStyle = savedSettings.endStyle || "line";
			arrowSolid = savedSettings.arrowSolid ?? true;
            fontSize = savedSettings.fontSize || 21;
			flScale = savedSettings.flScale ?? true;
            lineWidth = savedSettings.lineWidth || 1;
			brightness = savedSettings.brightness || 100;
            contrast = savedSettings.contrast || 100;
			pixelInterpolation = savedSettings.pixelInterpolation ?? false;
        }
        // Update UI elements in the modal
        lineColorPicker.value = lineColor;
        textColorPicker.value = textColor;
		solidTextBackgroundCheckbox.checked = solidTextBackground;
        textBgColorPicker.value = textBgColor;
        highlightColorPicker.value = highlightColor;
		endStyleSelect.value = endStyle;
		arrowSolidCheckbox.checked = arrowSolid;
        fontSizeInput.value = fontSize;
        scaleWithZoom.checked = flScale;
        lineWidthInput.value = lineWidth;
		brightnessSlider.value = brightness;
        contrastSlider.value = contrast;
        updateImageFilters(); // Apply loaded filters
		updateImageRendering();
        drawOverlay();
    });
}

// Function to handle saving measurements to a CSV file
async function saveCSV() {
    let csvContent = [
        i18next.t('csv_type'), i18next.t('csv_id'), i18next.t('csv_value'), i18next.t('csv_unit'),
        i18next.t('csv_p1x'), i18next.t('csv_p1y'), i18next.t('csv_p2x'), i18next.t('csv_p2y'),
        i18next.t('csv_vertex_x'), i18next.t('csv_vertex_y'), i18next.t('csv_label_x'), i18next.t('csv_label_y')
    ].join(',') + '\r\n';

    measurements.forEach(m => {
        const dx = m.p2.x - m.p1.x;
        const dy = m.p2.y - m.p1.y;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);
        const realDistance = pixelDistance * (calibrationFactor || 1);
        const places = getDecimalPlaces();
        const value = realDistance.toFixed(places);
        
        const row = ["Measurement", m.id, value, unitName, m.p1.x.toFixed(2), m.p1.y.toFixed(2), m.p2.x.toFixed(2), m.p2.y.toFixed(2), "", "", m.labelPos.x.toFixed(2), m.labelPos.y.toFixed(2)].join(",");
        csvContent += row + "\r\n";
    });

    angles.forEach(a => {
        const value = a.angle.toFixed(1);
        const row = ["Angle", a.id, value, i18next.t('unit_degrees'), a.p1.x.toFixed(2), a.p1.y.toFixed(2), a.p3.x.toFixed(2), a.p3.y.toFixed(2), a.vertex.x.toFixed(2), a.vertex.y.toFixed(2), a.labelPos.x.toFixed(2), a.labelPos.y.toFixed(2)].join(",");
        csvContent += row + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8,' });

    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'measurements.csv',
            types: [{
                description: 'CSV Files',
                accept: { 'text/csv': ['.csv'] },
            }],
        });

        const writableStream = await fileHandle.createWritable();
        await writableStream.write(blob);
        await writableStream.close();

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Could not save file:', err);
        } else {
            console.log('User cancelled the save dialog.');
        }
    }
}

//Function to save measurement data to a JSON file with a native "Save As" dialog.
async function saveMeasurementsJSON() {
    const dataToSave = {
        measurements: measurements,
        angles: angles,
    };

    const jsonString = JSON.stringify(dataToSave, null, 2); // The '2' makes the file human-readable
    const blob = new Blob([jsonString], { type: 'application/json' });

    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'measurements.json',
            types: [{
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] },
            }],
        });
        const writableStream = await fileHandle.createWritable();
        await writableStream.write(blob);
        await writableStream.close();
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Could not save JSON file:', err);
        } else {
            console.log('User cancelled the save dialog.');
        }
    }
}

// Function to load measurement data from a JSON file with a native "Open" dialog.
async function loadMeasurementsJSON() {
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] },
            }],
            multiple: false,
        });

        const file = await fileHandle.getFile();
        const contents = await file.text();
        const data = JSON.parse(contents);

        if (data.measurements && Array.isArray(data.measurements) && data.angles && Array.isArray(data.angles)) {
            measurements = data.measurements;
            angles = data.angles;
            // Ensure nextId is higher than any loaded ID to prevent conflicts
            const maxId = Math.max(...measurements.map(m => m.id), ...angles.map(a => a.id), 0);
            nextId = maxId + 1;

            drawOverlay();
            alert(i18next.t('alert_loadedData', {
                mCount: measurements.length,
                aCount: angles.length
            }));
        } else {
            alert(i18next.t('alert_invalidFile'));
        }

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Could not load JSON file:', err);
        } else {
            console.log('User cancelled the open dialog.');
        }
    }
}

// Function to save the image with measurements drawn on it
async function saveImageWithData() {
    const tempCanvas = document.createElement('canvas');
    if (!img.naturalWidth || !img.naturalHeight) {
        alert(i18next.t('alert_imgNotLoaded'));
        return;
    }
    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;
    const tempCtx = tempCanvas.getContext('2d');
	let outOfBounds = 0;
    let unSnapped = 0 ;
	// Disable interpolation 
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.webkitImageSmoothingEnabled = false;
    tempCtx.mozImageSmoothingEnabled = false;
	//  CSS property  to the browser to use a nearest-neighbor algorithm.
    tempCanvas.style.imageRendering = 'pixelated';

	// Force-reset the canvas transformation matrix to its default state.
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);
	

    /* 1.  apply filters then draw a copy our img on tempcanvas , once the
	lines/labels become part of the image then they will be effected by the
	brightness/contrast (unlike the original) setting, so in order ot reproduce
	the appearance of original I need to apply Br/Co to image (but not to labels) 
	before saving  */
	
    
	tempCtx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
	tempCtx.drawImage(img, 0, 0);
	tempCtx.filter = 'none'; /* else line colours wont match
	orginal , when loading this image whatever brightness and contrast setting was 
    applied when saved will become the new 'midpoint' setting */ 
    
    // if required this is more robust than relying on the tracked 'scale' variable.
    //const preciseScale = img.getBoundingClientRect().width / img.naturalWidth;
	
	/* We will be drawing on a canvas that is the same size of the original image 
	(unzoomed scale = 1) so we need to draw onto it without applying any scaling . */
	
	
	// decided it's best to always to save as if scale txt with zoom was checked, so forced true for now . keeping original lines  as reminder what I was doing previously.
	fitToWindow();
    const finalFontSize = flScale || true ? fontSize : fontSize / scale; 
    const finalLineWidth = flScale || true ? lineWidth : lineWidth / scale;
    
   
    // Helper function to draw lines directly on the new canvas 
    const drawLineOnCanvas = (ctx, p1, p2, color, lWidth, isAngle = false, drawTickAtStart = true, drawTickAtEnd = true) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lWidth;
        ctx.beginPath();
                
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return;
        const nx = dx / length;
        const ny = dy / length;
		
		//  Check if we need to shorten the line for solid arrowheads 
        if (endStyle === 'arrow-line' && arrowSolid && !isAngle) {
		     // calculate amount to shorten line by
            const shortenAmount = lWidth / Math.tan(Math.PI / 6);

            if (shortenAmount * 2 < length) {
                const nx = dx / length;
                const ny = dy / length;
                const finalP1 = { x: p1.x + nx * shortenAmount, y: p1.y + ny * shortenAmount };
                const finalP2 = { x: p2.x - nx * shortenAmount, y: p2.y - ny * shortenAmount };
                ctx.moveTo(finalP1.x, finalP1.y);
                ctx.lineTo(finalP2.x, finalP2.y);
            }
        } else {
            // Draw the line normally
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();	
			
		if (!isAngle && endStyle !== "none" ) { // Draw ticks for measurements	
            const px = -ny;
            const py = nx;
            let tickLength = 0;
            if (endStyle === "line") {
                tickLength = (6 * tickAdjust + 1.7 * lineWidth) /2;
            } else if (endStyle === "line-medium" || endStyle === "arrow-line") {
                tickLength = (28 * tickAdjust + 1.7 * lineWidth) /2;
            }
            ctx.lineWidth = lineWidth < 6.5 ? lineWidth : 6.5 ;

           if (drawTickAtStart) {
                ctx.beginPath();
                ctx.moveTo(p1.x - px * tickLength, p1.y - py * tickLength);
                ctx.lineTo(p1.x + px * tickLength, p1.y + py * tickLength);
                ctx.stroke();
            }
            
            // Wrap end tick drawing in a condition
            if (drawTickAtEnd) {
                ctx.beginPath();
                ctx.moveTo(p2.x - px * tickLength, p2.y - py * tickLength);
                ctx.lineTo(p2.x + px * tickLength, p2.y + py * tickLength);
                ctx.stroke();
            }
			
			// draw arrows when saving if style is arrow-line
            if (endStyle === 'arrow-line') {
				ctx.fillStyle = lineColor; // use line settings colors for fill
                const headlen = 14 * tickAdjust + lineWidth * 1.7 ;
                const angle = Math.atan2(dy, dx);
				const anglePlus = angle + Math.PI / Math.max(4, (8-lineWidth/5));     // arrow spread angle 
                const angleMinus = angle - Math.PI / Math.max(4, (8-lineWidth/5));
                if (lineWidth > 4) ctx.linewidth = Math.min(5, lineWidth) ; //limit to 5px
				
                if (drawTickAtEnd) {
                  ctx.beginPath();
                  ctx.moveTo(p2.x, p2.y); // tip of arrow
		          ctx.lineTo(
                  p2.x - headlen * Math.cos(angleMinus),
                  p2.y - headlen * Math.sin(angleMinus)
                  );
		          if (!arrowSolid) ctx.moveTo(p2.x, p2.y);
                  ctx.lineTo(
                  p2.x - headlen * Math.cos(anglePlus),
                  p2.y - headlen * Math.sin(anglePlus)
                  );
		          if (!arrowSolid) ctx.stroke(); //open arrowhead
		          else {
                    ctx.closePath();
                    ctx.fill(); // solid arrowhead
		          }
		        }
                
            // Arrowhead at the start point (p1)
            if (drawTickAtStart) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y); // tip of arrow
              ctx.lineTo(
              p1.x + headlen * Math.cos(angleMinus),
              p1.y + headlen * Math.sin(angleMinus)
              );
	          if (!arrowSolid) ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(
              p1.x + headlen * Math.cos(anglePlus),
              p1.y + headlen * Math.sin(anglePlus)
              );
              if (!arrowSolid) ctx.stroke();
	          else {
                ctx.closePath();
                ctx.fill(); // solid arrowhead
	          }
            }  
			ctx.fillStyle = textColor; // restore text color 
         }
	  }	 
    };
    
    // Helper function to draw labels on the new canvas 
    const drawLabelOnCanvas = (ctx, pos, text, fSize, centered = false) => {   
	    ctx.font = `${fSize}px sans-serif`;
		if (fontSize < 1) return; // Don't draw if too small 
    	
	   //  Draw solid background if enabled 
       if (solidTextBackground) {
           const metrics = ctx.measureText(text);
           const textWidth = metrics.width;
           // Use font size for height for consistency
           const textHeight = finalFontSize;
           const padding = 4 ; // Add some padding around the text

           const rectWidth = textWidth + padding * 3;
           const rectHeight = textHeight + padding * 2;
           let rectX, rectY;

           if (centered) {
              rectX = pos.x - rectWidth / 2;
              rectY = pos.y - rectHeight / 2;
          } else {
              // "start" text alignment
              rectX = pos.x - padding;
              rectY = pos.y - rectHeight / 2;
          }
		  // Better looking background with rounded corners
          // Define the corner radius, ensuring it's not too large for the box
          const cornerRadius = Math.min(8 , rectWidth / 2, rectHeight / 2);
		
	    	// Draw the rounded rectangle path then fill it
         ctx.beginPath();
         ctx.moveTo(rectX + cornerRadius, rectY);
         ctx.arcTo(rectX + rectWidth, rectY,   rectX + rectWidth, rectY + rectHeight, cornerRadius);
         ctx.arcTo(rectX + rectWidth, rectY + rectHeight, rectX, rectY + rectHeight, cornerRadius);
         ctx.arcTo(rectX, rectY + rectHeight, rectX, rectY, cornerRadius);
         ctx.arcTo(rectX, rectY, rectX + rectWidth, rectY, cornerRadius);
         ctx.closePath();
         ctx.fillStyle = textBgColor;
         ctx.fill();
       }
       if (centered) {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
        } else {
            ctx.textAlign = "start";
            ctx.textBaseline = "middle";
        }
		outOfBounds += isLabelOutOfBounds(ctx, pos.x, pos.y, text, fSize, img.naturalWidth, img.naturalHeight);
		ctx.fillStyle = textColor;
		ctx.fillText(text, pos.x , pos.y);
	 };

    // 2. Draw all saved measurements
    measurements.forEach(m => {
                
        const dx = m.p2.x - m.p1.x;
        const dy = m.p2.y - m.p1.y;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);
        const realDistance = pixelDistance * (calibrationFactor || 1);
        const places = getDecimalPlaces();
        const label = `${realDistance.toFixed(places)} ${unitName}`;
	    let snapped = m.isLabelSnapped;
		if (snapped) { 
		   tempCtx.font = `${finalFontSize}px sans-serif`;
            const textMetrics = tempCtx.measureText(label);
            const lineAngle = Math.atan2(dy, dx);
            // in image coordinates, gap calculation 
            const gapImagePx = Math.abs(textMetrics.width * Math.cos(lineAngle)) + Math.abs(finalFontSize * Math.sin(lineAngle)) + 10;
            const lineLengthImagePx = Math.sqrt(dx * dx + dy * dy);

            if (gapImagePx >= lineLengthImagePx) {
                snapped = false;
                unSnapped++; // the counter for alert popup
            }
        }
		     
	  if (snapped) {  // go ahead draw gapped line
            const lineLengthImagePx = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / lineLengthImagePx;
            const ny = dy / lineLengthImagePx;
            const lineAngle = Math.atan2(dy, dx);
            const gapImagePx = Math.abs(tempCtx.measureText(label).width * Math.cos(lineAngle)) + Math.abs(finalFontSize * Math.sin(lineAngle)) + 10;

            const gapStart = { x: m.p1.x + nx * (lineLengthImagePx / 2 - gapImagePx / 2), y: m.p1.y + ny * (lineLengthImagePx / 2 - gapImagePx / 2) };
            const gapEnd = { x: m.p1.x + nx * (lineLengthImagePx / 2 + gapImagePx / 2), y: m.p1.y + ny * (lineLengthImagePx / 2 + gapImagePx / 2) };
            
            drawLineOnCanvas(tempCtx, m.p1, gapStart, lineColor, finalLineWidth, false, true, false);
            drawLineOnCanvas(tempCtx, gapEnd, m.p2, lineColor, finalLineWidth, false, false, true);
        } else {    
            drawLineOnCanvas(tempCtx, m.p1, m.p2, lineColor, finalLineWidth);
        }

		drawLabelOnCanvas(tempCtx, m.labelPos, label, finalFontSize, snapped);
    });	
		
	
    // 3. Draw all saved angles
    angles.forEach(a => {
        //  Use the dynamic scaled sizes
        drawLineOnCanvas(tempCtx, a.vertex, a.p1, lineColor, finalLineWidth, true);
        drawLineOnCanvas(tempCtx, a.vertex, a.p3, lineColor, finalLineWidth, true);
        
        tempCtx.strokeStyle = textColor;
        tempCtx.lineWidth = finalLineWidth;
        let startAngle = Math.atan2(a.p1.y - a.vertex.y, a.p1.x - a.vertex.x);
        let endAngle = Math.atan2(a.p3.y - a.vertex.y, a.p3.x - a.vertex.x);
        if (startAngle < 0) startAngle += Math.PI * 2;
        if (endAngle < 0) endAngle += Math.PI * 2;
        let diff = endAngle - startAngle;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        const anticlockwise = diff < 0;
        tempCtx.beginPath();
        // The arc radius is in image pixels, so it doesn't need scaling only res adjust
        tempCtx.arc(a.vertex.x, a.vertex.y, 35 * tickAdjust, startAngle, endAngle, anticlockwise);
        tempCtx.stroke();
		
        // draw the angle labels
		const label = `${a.angle.toFixed(1)}°`;
        drawLabelOnCanvas(tempCtx, a.labelPos, label, finalFontSize, true);
    });
	     // checking for out of bounds and unsnapped labels 
	 let warningMessages = [];	 
	 if (outOfBounds > 0) {
        warningMessages.push(i18next.t('saveWarning_clipped', { count: outOfBounds }));
    }
    if (unSnapped > 0) {
        warningMessages.push(i18next.t('saveWarning_unsnapped', { count: unSnapped }));
    }

    if (warningMessages.length > 0) {
        const messageText = warningMessages.join("\n- ");
        if (!confirm(i18next.t('saveWarning_confirm', { messages: messageText }))) {
            return;
        }
    }
    // 4. Trigger download with Save As dialog wiht dynamic format 
	const originalFilename = document.getElementById("filenameDisplay").textContent || 'image.png';
    const originalExtension = originalFilename.split('.').pop().toLowerCase();

    let mimeType, suggestedExtension, description;

    // Determine the output format based on the original file's extension
    if (originalExtension === 'jpg' || originalExtension === 'jpeg') {
        mimeType = 'image/jpeg';
        suggestedExtension = '.jpeg';
        description = 'JPEG Image';
    } else {
        // Default to PNG for .png files or any other format for lossless quality
        mimeType = 'image/png';
        suggestedExtension = '.png';
        description = 'PNG Image';
    }
     const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, mimeType, 0.9)); // Quality setting is ignored for PNG
	 // Get the original filename without its extension
     const baseFilename = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || 'image_with_measurements';
     try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: `${baseFilename}_with_measurements${suggestedExtension}`,
            types: [{
                description: description,
                accept: { [mimeType]: [suggestedExtension] },
            }],
        });
        const writableStream = await fileHandle.createWritable();
        await writableStream.write(blob);
        await writableStream.close();
    } catch (err) {
        if (err.name !== 'AbortError') { 
            console.error('Could not save image:', err);
            alert(i18next.t('alert_notSaved'));
        }
    }
}

// Setup all event listeners for the settings modal
function setupSettingsModal() {
    settingsBtn.addEventListener('click', () => {
		 // Hide other modals if open
        fileModal.style.display = 'none';
		helpModal.style.display = 'none';
        settingsModal.style.display = settingsModal.style.display === 'block' ? 'none' : 'block';
    });
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
        saveSettings(); // Save settings when closing
    });

    lineColorPicker.addEventListener('input', (e) => { lineColor = e.target.value; drawOverlay(); });
    textColorPicker.addEventListener('input', (e) => { textColor = e.target.value; drawOverlay(); });
	solidTextBackgroundCheckbox.addEventListener('mousedown', e => e.preventDefault()); // prevent checkbox stealing the keyboard input after clicking .
    solidTextBackgroundCheckbox.addEventListener('change', (e) => { solidTextBackground = e.target.checked; drawOverlay(); });
    textBgColorPicker.addEventListener('input', (e) => { textBgColor = e.target.value; drawOverlay(); });
    highlightColorPicker.addEventListener('input', (e) => { highlightColor = e.target.value; drawOverlay(); });
	fontSizeInput.addEventListener('input', (e) => { let val = parseInt(e.target.value, 10);
      fontSize = isNaN(val) ? 21 : val; // fallback to default if invalid
	  if (fontSize>150) {
	    fontSize = 150;
	    fontSizeInput.value = fontSize; // update modal display incase we clamped
	  }
      drawOverlay();
    });


    lineWidthInput.addEventListener('input', (e) => { let val = parseFloat(e.target.value);
	  lineWidth = isNaN(val) ? 1 : val;
	  if (lineWidth>50) {
	    lineWidth = 50;
	    lineWidthInput.value = lineWidth;
	  }
	  drawOverlay();
    });

    // Prevent just THIS checkbox from stealing keyboard input from main
    scaleWithZoom.addEventListener('mousedown', e => { e.preventDefault(); });
	scaleWithZoom.addEventListener('change', (e) => { flScale = e.target.checked; drawOverlay(); });

	endStyleSelect.addEventListener('change', (e) => { endStyle = e.target.value; drawOverlay(); });
    arrowSolidCheckbox.addEventListener('mousedown', e => { e.preventDefault(); }); 
    arrowSolidCheckbox.addEventListener('change', (e) => { arrowSolid = e.target.checked; drawOverlay(); }); 

	 brightnessSlider.addEventListener('input', (e) => {
        brightness = parseInt(e.target.value, 10);
        updateImageFilters();
    });

    contrastSlider.addEventListener('input', (e) => {
        contrast = parseInt(e.target.value, 10);
        updateImageFilters();
    });
    
	normalizeBtn.addEventListener('click', () => {
        // Reset variables
        brightness = 100;
        contrast = 100;
        brightnessSlider.value = brightness;
        contrastSlider.value = contrast;
        updateImageFilters();
    });
	
	pixelInterpolationCheckbox.addEventListener('mousedown', e => {e.preventDefault(); });
	pixelInterpolationCheckbox.addEventListener('change', (e) => {
        pixelInterpolation = e.target.checked;
        updateImageRendering();
    });
    
}

function setupFileModal() {
    fileBtn.addEventListener('click', () => {
        // Hide other modals if open
        settingsModal.style.display = 'none';
		helpModal.style.display = 'none';
        // Toggle file modal
        fileModal.style.display = fileModal.style.display === 'block' ? 'none' : 'block';
    });
    closeFileBtn.addEventListener('click', () => {
        fileModal.style.display = 'none';
    });
    
    saveCsvBtn.addEventListener('click', saveCSV);
    saveImgBtn.addEventListener('click', saveImageWithData);

	const saveMeasurementsBtn = document.getElementById('saveMeasurementsBtn');
    const loadMeasurementsBtn = document.getElementById('loadMeasurementsBtn');

    saveMeasurementsBtn.addEventListener('click', saveMeasurementsJSON);
    loadMeasurementsBtn.addEventListener('click', loadMeasurementsJSON);

	const loadImageBtn = document.getElementById('loadImageBtn');
    //  Replaced the old file input logic with the modern File System Access API
    // to solve the "window.open blocked" security issue while still opening in a new tab.
    loadImageBtn.addEventListener('click', async () => {
        try {
            // This API must be called from a user-initiated event (like a click)
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Images',
                    accept: { 'image/*': ['.png', '.gif', '.jpeg', '.jpg', '.bmp', '.webp', '.svg'] },
                }],
                multiple: false,
            });

            const file = await fileHandle.getFile();
            const blobUrl = URL.createObjectURL(file);

            // Store the necessary data for the new tab to access
            sessionStorage.setItem('imageToLoad', blobUrl);
            sessionStorage.setItem('imageFilename', file.name);

            // Open the viewer in a new tab. This is now allowed because it's
            // part of the trusted event flow initiated by the user's click.
            window.open(window.location.href.split('?')[0], '_blank');

            fileModal.style.display = 'none'; // Close file modal after opening

        } catch (err) {
            // This catch block will run if the user closes the file picker dialog.
            // We can safely ignore the AbortError.
            if (err.name !== 'AbortError') {
                console.error('Error opening file picker:', err);
            }
        }
    });
}

function populateHotkeys() {
    if (hotkeyUl) {
      hotkeyUl.innerHTML = ''; // Clear any existing
      const hotkeys = i18next.t('keyHelp').split(' : ');
      hotkeys.forEach(item => {
        const parts = item.split(' - ');
        if (parts.length === 2) {
          const li = document.createElement('li');
          li.innerHTML = `<code>${parts[0]}</code> - ${parts[1]}`;
          hotkeyUl.appendChild(li);
        }
      });
	   // Manually add a help-only item (not in keyHelp string)
       const extraLi = document.createElement('li');
       extraLi.innerHTML = `<code> → ← ↑ ↓</code> - ${i18next.t('panImage')}`;
       hotkeyUl.appendChild(extraLi);
      }
}

function setupHelpModal() {
	const aboutLink = document.getElementById('aboutLink');
    const aboutPopup = document.getElementById('aboutPopup');
    const closeAboutPopup = document.getElementById('closeAboutPopup');
    helpBtn.addEventListener('click', () => {
        // Hide other modals
        fileModal.style.display = 'none';
        settingsModal.style.display = 'none';
        // Toggle help modal
        helpModal.style.display = helpModal.style.display === 'block' ? 'none' : 'block';
    });
    closeHelpBtn.addEventListener('click', () => {
        helpModal.style.display = 'none';
    });
    aboutLink.addEventListener('click', () => {
        aboutPopup.style.display = 'block';
    });
    closeAboutPopup.addEventListener('click', () => {
        aboutPopup.style.display = 'none';
    });
    
}


// Call initialization functions
loadSettings();
setupSettingsModal();
setupFileModal();
setupHelpModal();

/* Restore calibration if it exists across tabs in this browser session. leave for now 
  if (localStorage.getItem("calibrationFactor")) {
   calibrationFactor = parseFloat(localStorage.getItem("calibrationFactor"));
}*/

calibrationFactor = 1;
            unitName = 'px';  //make pixels our default on load

function resizeOverlay() {
  overlay.width = container.clientWidth;
  overlay.height = container.clientHeight;
  drawOverlay(); // Redraw on resize
}
window.addEventListener("resize", resizeOverlay);
resizeOverlay();

// get my line colour and text colour for the measurment function
// Removed old color picker listeners, they are now in setupSettingsModal()

// adds enough dec places to so that minUnit to diplay in mm = 2 pixels  
function getDecimalPlaces() {
  if (!calibrationFactor || unitName === 'px') return 0; // default to 0 places for pixels
  let minUnit = calibrationFactor * 1; // 2  pixels 
  let places = 0;
  while (minUnit < 1 && places < 10) {
    minUnit *= 10;
    places++;
  }
  return places;
}

//Helper functions to push measurements,angles and there individual id into the storage arrays.
function addMeasurement(data) {
  const id = nextId++;
  measurements.push({ id, ...data, isLabelSnapped: false });
  lastCreated = { type: "measurement", id };
  
}
function addAngle(data) {
  const id = nextId++;
  angles.push({ id, ...data });
  lastCreated = { type: "angle", id };
}


//Helper functions for Select detection 

/**
 * Calculate shortest distance from a mouse point to the nearest line 
 * Used to detect if mouse is "near" a measurement line or angle leg 
 from any point along it's entire length*/
function distanceToSegment(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}


 /* Find the nearest measurement or angle point for the snap feature or end drag 
    Returns null or { type, id, point, x, y } if none are within the threshold.
 */
function findNearestPoint(currentPos) {
  let closest = null;
  let minDistance = Infinity;
  const thresholdInImageCoords = SNAP_THRESHOLD / scale;

  const allPoints = [];

  // Collect measurement endpoints exclude the current point from snap list if its being dragged
  measurements.forEach(m => {
    if (isDraggingEndpoint && draggedEndpoint.type === 'measurement' && draggedEndpoint.id === m.id) {
      if (draggedEndpoint.point !== 'p1') {
        allPoints.push({ type: 'measurement', id: m.id, point: 'p1', x: m.p1.x, y: m.p1.y });
      }
      if (draggedEndpoint.point !== 'p2') {
        allPoints.push({ type: 'measurement', id: m.id, point: 'p2', x: m.p2.x, y: m.p2.y });
      }
    } else {
      allPoints.push(
        { type: 'measurement', id: m.id, point: 'p1', x: m.p1.x, y: m.p1.y },
        { type: 'measurement', id: m.id, point: 'p2', x: m.p2.x, y: m.p2.y }
      );
    }
  });

  // Collect angle endpoints same as measurments
  angles.forEach(a => {
    if (isDraggingEndpoint && draggedEndpoint.type === 'angle' && draggedEndpoint.id === a.id) {
      if (draggedEndpoint.point !== 'p1') {
        allPoints.push({ type: 'angle', id: a.id, point: 'p1', x: a.p1.x, y: a.p1.y });
      }
      if (draggedEndpoint.point !== 'vertex') {
        allPoints.push({ type: 'angle', id: a.id, point: 'vertex', x: a.vertex.x, y: a.vertex.y });
      }
      if (draggedEndpoint.point !== 'p3') {
        allPoints.push({ type: 'angle', id: a.id, point: 'p3', x: a.p3.x, y: a.p3.y });
      }
    } else {
      allPoints.push(
        { type: 'angle', id: a.id, point: 'p1', x: a.p1.x, y: a.p1.y },
        { type: 'angle', id: a.id, point: 'vertex', x: a.vertex.x, y: a.vertex.y },
        { type: 'angle', id: a.id, point: 'p3', x: a.p3.x, y: a.p3.y }
      );
    }
  });

  // Find nearest within threshold
  for (const candidate of allPoints) {
    if (firstClick && candidate.x === firstClick.x && candidate.y === firstClick.y) continue;

    const d = Math.hypot(currentPos.x - candidate.x, currentPos.y - candidate.y);
    if (d < minDistance && d < thresholdInImageCoords) {
      minDistance = d;
      closest = candidate;
    }
  }

  return closest; // null or { type, id, point, x, y }
}

/*
   Find and return the first measurement or angle it finds under the mouse
   returns { type, id } or null
 */
function findItemAtMouse(mx, my) {
  const threshold = 12 / scale ; // px tolerance in image coords

  for (let m of measurements) {
    if (distanceToSegment(mx, my, m.p1.x, m.p1.y, m.p2.x, m.p2.y) <= threshold) {
      return { type: "measurement", id: m.id };
    }
  }
  for (let a of angles) {   //first point
    if (distanceToSegment(mx, my, a.vertex.x, a.vertex.y, a.p1.x, a.p1.y) <= threshold) {
      return { type: "angle", id: a.id };
    }   ///second point
    if (distanceToSegment(mx, my, a.vertex.x, a.vertex.y, a.p3.x, a.p3.y) <= threshold) {
      return { type: "angle", id: a.id };
    }
  }
  return null;
}
 // see if any endpoint is near mouse returns first point it finds { type, id , m.id and p1 or p2 end } or null
function findEndpointAtMouse(mx, my) {
    const threshold =  SNAP_THRESHOLD / scale; // 25px tolerance in image coords

    for (const m of measurements) {
        if (Math.hypot(mx - m.p1.x, my - m.p1.y) <= threshold) return { type: 'measurement', id: m.id, point: 'p1' };
        if (Math.hypot(mx - m.p2.x, my - m.p2.y) <= threshold) return { type: 'measurement', id: m.id, point: 'p2' };
    }
    for (const a of angles) {
        if (Math.hypot(mx - a.p1.x, my - a.p1.y) <= threshold) return { type: 'angle', id: a.id, point: 'p1' };
        if (Math.hypot(mx - a.vertex.x, my - a.vertex.y) <= threshold) return { type: 'angle', id: a.id, point: 'vertex' };
        if (Math.hypot(mx - a.p3.x, my - a.p3.y) <= threshold) return { type: 'angle', id: a.id, point: 'p3' };
    }
    return null;
}


// Recalculates the angle value of an angle object after a point has moved.
 
function recalculateAngle(angle) {
    const { p1, vertex, p3 } = angle;
    const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
    const v2 = { x: p3.x - vertex.x, y: p3.y - vertex.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    if (mag1 > 0 && mag2 > 0) {
        angle.angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
    } else {
        angle.angle = 0; // Or NaN, depending on desired behavior for zero-length legs
    }
}

function deleteItem(item) {
  if (!item) return;
  if (item.type === "measurement") measurements = measurements.filter(m => m.id !== item.id);
  else if (item.type === "angle") angles = angles.filter(a => a.id !== item.id);
  drawOverlay();
}

//helper function to convert mm-inches when i key pressed
function toggleUnits() {
  if (unitName === "mm") {
    unitName = "in";
	calibrationFactor /=  25.4;
  }  else if (unitName === "in") {
    unitName = "mm";
	calibrationFactor *=  25.4;
  }
  drawOverlay(); // refresh overlay with new units
}

 //Helper function for drawing arc in angle mode
function drawSmallestArcAndGetMid(ctx, vertex, p1, p3, radius, scale = 1, originX = 0, originY = 0) {
  let startAngle = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
  let endAngle = Math.atan2(p3.y - vertex.y, p3.x - vertex.x);

  // Normalize to 0–2π
  if (startAngle < 0) startAngle += Math.PI * 2;
  if (endAngle < 0) endAngle += Math.PI * 2;

  // Smallest signed difference -π..π
  let diff = endAngle - startAngle;
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;

  const anticlockwise = diff < 0;
  const scaledRadius = radius * tickAdjust * scale;  //scale the arc radius and adjust for image res
  ctx.lineWidth = lineWidth * scaleFactor
  // Draw the smallest arc
  ctx.beginPath();
  ctx.arc(
    vertex.x * scale + originX,
    vertex.y * scale + originY,
    scaledRadius,
    startAngle,
    endAngle,
    anticlockwise
  );
  ctx.stroke();

  // Mid angle along that smallest arc
  let midAngle = startAngle + diff / 2;
  if (midAngle < 0) midAngle += Math.PI * 2;
  if (midAngle >= Math.PI * 2) midAngle -= Math.PI * 2;

  return midAngle;
}


container.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Calculate mouse position in image coordinates before zoom
  const imgXBefore = (mouseX - originX) / scale;
  const imgYBefore = (mouseY - originY) / scale;

  const zoomFactor = 1.1;
  const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
  scale = Math.max(0.05, Math.min(newScale, 1000));  // Set a min max zoom level
  measurementEl.innerText = i18next.t('measurementZoom', { val: scale.toFixed(2) });

  // Calculate where the new origin should be to keep the image point under the mouse
  originX = mouseX - imgXBefore * scale;
  originY = mouseY - imgYBefore * scale;

  updateTransform();
  drawOverlay();
});

img.addEventListener("dragstart", (e) => e.preventDefault());

container.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;

  // record the starting mouse position on mousedown.
  // This prevents a stale position from causing the pan-detection
  // in the click handler to fire incorrectly.
  startX = e.clientX - originX;
  startY = e.clientY - originY;

  // Reset the pan flag. It will only be set to true if we are in view mode.
  isDragging = false;

  // Only start a pan-drag if we are in view mode and not moving an item or not near an end point.
  if (mode === "view" && !isDraggingLabel && !isDraggingEndpoint && !findEndpointAtMouse(mousePos.x, mousePos.y)) {
    isDragging = true;
    container.style.cursor = "grabbing";
  }
});

container.addEventListener("mousemove", (e) => {
  const rect = img.getBoundingClientRect();

  // Clamp mouse position to image bounds ---
  const rawX = (e.clientX - rect.left) / scale;
  const rawY = (e.clientY - rect.top) / scale;
  mousePos.x = Math.max(0, Math.min(rawX, img.naturalWidth));
  mousePos.y = Math.max(0, Math.min(rawY, img.naturalHeight));

  // When moving an endpoint, we are in a temporary measure mode, so check for snap points
  const inEndpointMoveMode = isDraggingEndpoint && mode === 'measure';

  // Apply snap logic if enabled
  if ((mode === 'measure' && !isDraggingEndpoint && snapEnabled) || (inEndpointMoveMode && snapEnabled)) {
    const snappedPoint = findNearestPoint(mousePos);
    if (snappedPoint) {
        mousePos.x = snappedPoint.x;
        mousePos.y = snappedPoint.y;
    }
  }

  // Update endpoint position if it has been picked up
  if (isDraggingEndpoint && draggedEndpoint) {
      const item = draggedEndpoint.type === 'measurement'
          ? measurements.find(m => m.id === draggedEndpoint.id)
          : angles.find(a => a.id === draggedEndpoint.id);
      if (item) {
          // Create a temporary point for drawing that respects axis locks
          const newPos = { ...mousePos };
          if (draggedEndpoint.type === 'measurement') {
              const stationaryPoint = draggedEndpoint.point === 'p1' ? item.p2 : item.p1;
              if (hKeyIsDown && !vKeyIsDown) { // Prioritize H if both are held
                  newPos.y = stationaryPoint.y;
              } else if (vKeyIsDown) {
                  newPos.x = stationaryPoint.x;
              }
          }
          item[draggedEndpoint.point] = newPos;

          if (draggedEndpoint.type === 'angle') {
              recalculateAngle(item);
          }
      }
  }

  // Update label position if dragging
  if (isDraggingLabel && selectedItem) {
    const item = selectedItem.type === 'measurement' ? measurements.find(m => m.id === selectedItem.id) : angles.find(a => a.id === selectedItem.id);
    if (item) item.labelPos = { x: mousePos.x, y: mousePos.y };

	 // Snapping the label Inline with its own measurement line
    if (item && selectedItem.type === 'measurement') {

		 // Calculate line and label length to see if snapping is appropriate
        const dx = item.p2.x - item.p1.x;
        const dy = item.p2.y - item.p1.y;
        const lineLengthImagePx = Math.sqrt(dx * dx + dy * dy);

        // We must generate the label text here to measure it
        const pixelDistance = lineLengthImagePx;
        let realDistance = calibrationFactor ? pixelDistance * calibrationFactor : pixelDistance;
        const places = getDecimalPlaces();
        const labelText = `${realDistance.toFixed(places)} ${unitName}`;

        ctx.font = `${fontSize * scaleFactor}px sans-serif`;
        const textMetrics = ctx.measureText(labelText);
        const labelWidthImagePx = textMetrics.width / scale; // Convert to image coords
		const labelCenterX = mousePos.x + labelWidthImagePx / 2;
        const labelCenterY = mousePos.y
        const lineDist = distanceToSegment(labelCenterX, labelCenterY, item.p1.x, item.p1.y, item.p2.x, item.p2.y);

        const thresholdInImageCoords =  (LABEL_SNAP_THRESHOLD / scale) + 2;
        if (lineDist <= thresholdInImageCoords && canLabelSnap(item,labelText)) {
            item.labelPos.x = (item.p1.x + item.p2.x) / 2;
            item.labelPos.y = (item.p1.y + item.p2.y) / 2;
            item.isLabelSnapped = true;
        } else {
            item.isLabelSnapped = false;
        }
    }
  }

  if (mode === "view") {
    hoverItem = findItemAtMouse(mousePos.x, mousePos.y);
    if (!isDraggingLabel && !isDraggingEndpoint) {
        container.style.cursor = hoverItem ? "pointer" : "grab";
    }
  }

  if (isDragging) {
    originX = e.clientX - startX;
    originY = e.clientY - startY;
    updateTransform();
  }
  drawOverlay();
});

 
container.addEventListener("mouseup", (e) => {
  if (e.button !== 0) return;
  isDragging = false;
  // Don't change cursor if a label/endpoint is being moved, as click will handle it
  if (!isDraggingLabel && !isDraggingEndpoint) {
    container.style.cursor = mode === "view" ? "grab" : "none";
  }
});

 container.addEventListener("mouseleave", () => {
  isDragging = false;
  // Don't change cursor if a label/endpoint is being moved
  if (!isDraggingLabel && !isDraggingEndpoint) {
    container.style.cursor = mode === "view" ? "grab" : "none";
  }
});

// Main handler for the custom context menu
container.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevent the default browser context menu

    contextMenu.innerHTML = ''; // Clear previous items

    // Helper function to create a menu item and attach its action
    const createMenuItem = (text, key) => {
        const item = document.createElement('div');
        item.textContent = text;
        item.addEventListener('click', () => {
            // Dispatch a keyboard event to trigger the existing logic in the keydown handler
            document.dispatchEvent(new KeyboardEvent('keydown', { 'key': key }));
            contextMenu.style.display = 'none'; // Hide menu after click
        });
        contextMenu.appendChild(item);
    };

    // Populate menu based on the current mode
    if (mode === 'measure' || mode === 'angle' || mode === 'calibrate') {
        createMenuItem(i18next.t('context_cancel'), 'Escape');
		if (mode === 'measure') createMenuItem(i18next.t('context_toggleSnap'), 's');
    } else { // 'view' mode
        createMenuItem(i18next.t('context_delete'), 'Delete');
        createMenuItem(i18next.t('context_measure'), 'm');
        createMenuItem(i18next.t('context_angle'), 'a');
        createMenuItem(i18next.t('context_calibrate'), 'c');
        createMenuItem(i18next.t('context_toggleSnap'), 's');
        createMenuItem(i18next.t('context_fit'), 'Tab');
    }

    // Position and show the menu near the cursor
    const { clientX: mouseX, clientY: mouseY } = e;
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Adjust position to prevent menu from going off-screen
    const posX = mouseX + menuWidth > windowWidth ? windowWidth - menuWidth - 5 : mouseX;
    const posY = mouseY + menuHeight > windowHeight ? windowHeight - menuHeight - 5 : mouseY;

    contextMenu.style.top = `${posY}px`;
    contextMenu.style.left = `${posX}px`;
    contextMenu.style.display = 'block';
});

// Hide the context menu when clicking anywhere else on the window
window.addEventListener('click', (e) => {
    // Check if the click was outside the context menu
    if (contextMenu.style.display === 'block' && e.target.offsetParent !== contextMenu) {
        contextMenu.style.display = 'none';
    }
});

// set up the img properties with our pan and zoom coordinates which the browser will
// que up until the event handler has finished its thread and returned, browser will then render the display
function updateTransform() {
  img.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
  // we don't use transition for panning/zooming to make it feel more responsive
  img.style.transition = 'none';
}


   //  CLICK LISTENER 

container.addEventListener("click", (e) => {
    // If a pan drag just finished, don't process a click
    if (Math.abs(e.clientX - (startX + originX)) > 2 || Math.abs(e.clientY - (startY + originY)) > 2) {
        if (!isDraggingEndpoint && !isDraggingLabel) return;
    }

  const rect = img.getBoundingClientRect();
  let x = (e.clientX - rect.left) / scale;
  let y = (e.clientY - rect.top) / scale;
  x = Math.max(0, Math.min(x, img.naturalWidth));
  y = Math.max(0, Math.min(y, img.naturalHeight));

  // Logic for dropping a picked-up item (second click) 
  if (isDraggingEndpoint) {
    const item = draggedEndpoint.type === 'measurement'
        ? measurements.find(m => m.id === draggedEndpoint.id)
        : angles.find(a => a.id === draggedEndpoint.id);

    if (snapEnabled) { // Apply snap to final position
        const snappedPoint = findNearestPoint({x, y});
        if (snappedPoint) {
            x = snappedPoint.x;
            y = snappedPoint.y;
        }
    }
    
    // Apply axis lock to the final position before saving
    if (item && draggedEndpoint.type === 'measurement') {
        const stationaryPoint = draggedEndpoint.point === 'p1' ? item.p2 : item.p1;
        if (hKeyIsDown && !vKeyIsDown) { // Prioritize H if both held
            y = stationaryPoint.y;
        } else if (vKeyIsDown) {
            x = stationaryPoint.x;
        }
    }

    // Update the model with the final (potentially locked) position
    if(item) item[draggedEndpoint.point] = { x, y };
    if(item && draggedEndpoint.type === 'angle') recalculateAngle(item);


    isDraggingEndpoint = false;
    draggedEndpoint = null;
	selectedItem = null;
    mode = "view"; // Return to view mode
    modeEl.textContent = i18next.t('mode_view');
    container.style.cursor = "grab";
    drawOverlay();
    return;
  }
  if (isDraggingLabel) {
    isDraggingLabel = false;
    selectedItem = null;
    container.style.cursor = "grab";
    drawOverlay();
    return;
  }

  //  Logic for picking up an item (first click) 
  if (mode === "view") {
    const endpoint = findNearestPoint({x, y});
    if (endpoint) {
        isDraggingEndpoint = true;
        draggedEndpoint = endpoint;
        selectedItem = { type: endpoint.type, id: endpoint.id };
        mode = "measure"; // Enter temporary measure mode for crosshairs and snap
        modeEl.textContent = snapEnabled ? i18next.t('mode_move_point_snap_on') : i18next.t('mode_move_point');
        container.style.cursor = "none";
        drawOverlay();
        return;
    } 
	// if no end points found then check for any lines near mouse . 
    const itemUnderMouse = findItemAtMouse(x,y);
    if (itemUnderMouse) {
        isDraggingLabel = true;
        selectedItem = itemUnderMouse;
        container.style.cursor = "none";
        drawOverlay();
        return;
    }
    // If nothing was clicked on, clear selection
    selectedItem = null;
    drawOverlay();
    return;
  }

  // Logic for creating new measurements 
  if (mode === 'measure' && snapEnabled) {
      const snappedPoint = findNearestPoint({x, y});
      if (snappedPoint) {
          x = snappedPoint.x;
          y = snappedPoint.y;
      }
  }

   if (mode === "angle") {
    anglePoints.push({ x, y });
    if (anglePoints.length === 3) {
      const [p1, vertex, p3] = anglePoints;
      const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
      const v2 = { x: p3.x - vertex.x, y: p3.y - vertex.y };
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      let angleDeg = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
      let startAngle = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
      let endAngle = Math.atan2(p3.y - vertex.y, p3.x - vertex.x);
      if (startAngle < 0) startAngle += Math.PI * 2;
      if (endAngle < 0) endAngle += Math.PI * 2;
      let diff = endAngle - startAngle;
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      let midAngle = startAngle + diff / 2;
      const labelRadius = 70 * tickAdjust;
      const defLabelX = vertex.x + Math.cos(midAngle) * labelRadius;
      const defLabelY = vertex.y + Math.sin(midAngle) * labelRadius;
      addAngle({ p1, vertex, p3, angle: angleDeg, labelPos: {x: defLabelX, y: defLabelY} });
      anglePoints = [];
      mode = "view";
      modeEl.textContent = i18next.t('mode_view');
      container.style.cursor = "grab";
    }
    drawOverlay();
    return;
  }

  if (mode === "calibrate") {
      if (!firstClick) {
          firstClick = {x, y};
          secondClick = null;
          document.getElementById('calib-pixel-dist').textContent = "";
      } else {
          secondClick = {x, y};
          const dx = secondClick.x - firstClick.x;
          const dy = secondClick.y - firstClick.y;
          const pixelDistance = Math.sqrt(dx * dx + dy * dy);
          document.getElementById('calib-pixel-dist').textContent = i18next.t('calib_pixel_dist', { dist: pixelDistance.toFixed(2) });
      }
  } else if (!firstClick) {
    firstClick = { x, y };
  } else {
    if (mode === "measure") {
		//  apply axis lock to the second point before creating the measurement
        if (hKeyIsDown && !vKeyIsDown) {
            y = firstClick.y;
        } else if (vKeyIsDown) {
            x = firstClick.x;
        }
		 const defLabx = ((firstClick.x + x) / 2) + labOffset ; 
         const defLaby = ((firstClick.y + y) / 2) - fontSize/2 - lineWidth/2 - 10;
         addMeasurement({
           p1: { ...firstClick },
           p2: { x, y },
           labelPos: {x: defLabx, y: defLaby},
         });
      }
      firstClick = null;
      mode = "view";
      modeEl.textContent = i18next.t('mode_view');
      container.style.cursor = "grab";
    }
    drawOverlay();
});

 // KEY DOWN LISTENER

document.addEventListener("keydown", (e) => {
	
  const modal = document.getElementById("calibration-modal");
  
  // Also check for settings modal to prevent keybinds firing when typing in inputs
  if ((modal && modal.contains(e.target)) || (settingsModal && settingsModal.contains(e.target))) {
	  return;
  }
  
  //Handle h and v key down for axis lock and redraw
  let axisKeyPressed = false;
  if (e.key.toLowerCase() === 'h') {
    hKeyIsDown = true;
    axisKeyPressed = true;
  }
  if (e.key.toLowerCase() === 'v') {
    vKeyIsDown = true;
    axisKeyPressed = true;
  }
  if (axisKeyPressed && mode === 'measure' && (firstClick || isDraggingEndpoint)) { 
    drawOverlay();
    return; // Prevent other keybinds like panning from firing while holding lock key
  }
  
   const panSpeed = 50;
  if (e.key === "ArrowUp") { e.preventDefault(); originY += panSpeed; updateTransform(); drawOverlay(); return; }
  if (e.key === "ArrowDown") { e.preventDefault(); originY -= panSpeed; updateTransform(); drawOverlay(); return; }
  if (e.key === "ArrowLeft") { e.preventDefault(); originX += panSpeed; updateTransform(); drawOverlay(); return; }
  if (e.key === "ArrowRight") { e.preventDefault(); originX -= panSpeed; updateTransform(); drawOverlay(); return; }
  // Fit to Window with Tab 
  if (e.key === "Tab") { e.preventDefault(); fitToWindow(); return; }

  if (e.key.toLowerCase() === "c" || mode === "calibrate") {   
  
    //  do not let any keys except C or Delete or esc work whilst in calibration
    if (mode === "calibrate" && e.key.toLowerCase() !== "c" && e.key !== "Delete" && e.key !== "Escape")  return;
	     mode = "calibrate";
         modeEl.textContent = i18next.t('mode_calibrate');
         firstClick = null;
         secondClick = null;
         isDraggingLabel = false;
         selectedItem = null;
		 if (e.key === "Escape") { 
		    mode = "view";  // also use esc to return to view mode
			modeEl.textContent = i18next.t('mode_view');
		    document.getElementById('calibration-modal').style.display = 'none';
            container.style.cursor = "grab";
	        drawOverlay();
		    return;
		 } 
         container.style.cursor = "none";
         // Refresh the list every time modal is opened
         const selectEl = document.getElementById('calib-list');
         storage.get(CALIBRATION_KEY, (result) => {
           const calibrations = result[CALIBRATION_KEY] || [];
           selectEl.innerHTML = '';
            if (calibrations.length === 0) {
               selectEl.innerHTML = `<option disabled>${i18next.t('calib_noSaved')}</option>`;
            } else {
            calibrations.forEach(cal => {
                selectEl.innerHTML += `<option value="${cal.name}">${cal.name}</option>`;
                });
            }
         });
       document.getElementById('calibration-modal').style.display = 'block'; // make the modal active
	   drawOverlay();
       return; 	
  } else if (e.key.toLowerCase() === "m") {
    mode = "measure"; 
    modeEl.textContent = snapEnabled ? i18next.t('mode_measure_snap_on') : i18next.t('mode_measure');
    firstClick = null;
    isDraggingLabel = false;
    selectedItem = null;
    container.style.cursor = "none";
    drawOverlay();
  } else if (e.key === "Escape") {    // clear all measurements: we should prompt to confirm 
    if (mode === "view") {
       if (confirm(i18next.t('confirm_clearAll'))) {  
	     measurements = [];
	     angles = [];
	   }	 
	}   
      mode = "view";  // also use esc to return to view mode
      modeEl.textContent = i18next.t('mode_view');
      firstClick = null;
	  secondClick = null;
      anglePoints = [];      
      isDraggingLabel = false; 
      selectedItem = null;
      // Also hide calibration modal on ESC 
      document.getElementById('calibration-modal').style.display = 'none';
      container.style.cursor = "grab";
	  drawOverlay();
	
  } else if (e.key === "Delete") {
    if (selectedItem || mode === "view" && hoverItem) {
      deleteItem(selectedItem || hoverItem);
	  isDraggingLabel = false; 
      selectedItem = null;
	  container.style.cursor = "grab";

    } else if ((mode === "measure" && firstClick) || (mode === "angle" && anglePoints.length > 0)) {
      // cancel current creation
      firstClick = null;
      anglePoints = [];
      drawOverlay();

    } 

  } else if (e.key.toLowerCase() === "i") {
    toggleUnits();

  } else if (e.key.toLowerCase() === "a") {
    mode = "angle";
    modeEl.textContent = i18next.t('mode_angle');
    anglePoints = [];
    isDraggingLabel = false;
    selectedItem = null;
    container.style.cursor = "none";
    drawOverlay()
  // handle 's' key to toggle snap mode 
  } else if (e.key.toLowerCase() === 's') {
    snapEnabled = !snapEnabled;
	if (mode === 'measure') {
      modeEl.textContent = snapEnabled ? i18next.t('mode_measure_snap_on') : i18next.t('mode_measure');
	}  
    drawOverlay(); // Redraw to show/hide snap indicator
  }
});

document.addEventListener("keyup", (e) => {
    let keyReleased = false;
    if (e.key.toLowerCase() === 'h') {
        hKeyIsDown = false;
        keyReleased = true;
    }
    if (e.key.toLowerCase() === 'v') {
        vKeyIsDown = false;
        keyReleased = true;
    }

    // If an axis lock key was released during a measurement, redraw to un-snap the line.
    if (keyReleased && mode === 'measure' && (firstClick || isDraggingEndpoint)) { // CHANGED
        drawOverlay();
    }
});


function canLabelSnap(m,label) {
   const { p1, p2, labelPos } = m;
   ctx.font = `${fontSize * scaleFactor}px sans-serif`;
   const textMetrics = ctx.measureText(label);
   const textWidthInScreenPx = textMetrics.width;
   const textHeightInScreenPx = fontSize * scaleFactor;
   const padding = 10 * scaleFactor;
   const screenDx = (p2.x - p1.x) * scale;
   const screenDy = (p2.y - p1.y) * scale;
   const lineAngle = Math.atan2(screenDy, screenDx);
   const gapScreenPx = Math.abs(textWidthInScreenPx * Math.cos(lineAngle)) + Math.abs(textHeightInScreenPx * Math.sin(lineAngle)) + padding;
        
   const lineLengthScreenPx = Math.sqrt(screenDx * screenDx + screenDy * screenDy);

        // If the calculated gap is bigger than the line, we can't snap
   const canSnap = gapScreenPx < lineLengthScreenPx ;
   return canSnap ;
}
	
function isLabelOutOfBounds(ctx, x, y, text, fontSize, imageWidth, imageHeight) {
  // Measure text width
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;

  // Estimate text height (fallback if metrics don’t provide it)
  const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
  const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
  const textHeight = ascent + descent;

  // Compute bounding box (centered text assumed)
  const left   = x - textWidth / 2;
  const right  = x + textWidth / 2;
  const top    = y - ascent;
  const bottom = y + descent;

  // Check against image bounds
  return (
    left < 0 ||
    right > imageWidth ||
    top < 0 ||
    bottom > imageHeight
  );
}
 /* alternative Example for using the above  
 ctx.font = `${fontSize * scaleFactor}px sans-serif`;
const label = `${a.angle.toFixed(1)}°`;
const outOfBounds = isLabelOutOfBounds(ctx, label, labelX, labelY, fontSize * scaleFactor, imageWidth, imageHeight);

if (outOfBounds) {
  ctx.fillStyle = "red"; // highlight problem labels or we could just warn user when saving image 
} else {
  ctx.fillStyle = textColor;
}
ctx.fillText(label, labelX, labelY);  */


function clearOverlay() {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
}

function drawLine(p1, p2, label = "", selected = false, hover = false, an = false, drawTickAtStart = true, drawTickAtEnd = true) {
  // Save current style so we can restore it later
  const prevStroke = ctx.strokeStyle;
  const prevWidth = ctx.lineWidth;
  // Change style if selected/hovered
  ctx.strokeStyle = selected || hover ? highlightColor : lineColor; // use settings colors
  ctx.lineWidth = lineWidth * scaleFactor;
  if (selected || hover) ctx.lineWidth = scaleFactor < .75 ? (lineWidth + 1) * scaleFactor : lineWidth +1; //  use settings line width but make highlight thicker if sellected
  if (ctx.lineWidth <= 0.5) ctx.lineWidth = 0.5; // safety check for line width

  // Calculate scaled coordinates
    const x1 = p1.x * scale + originX;
    const y1 = p1.y * scale + originY;
    const x2 = p2.x * scale + originX;
    const y2 = p2.y * scale + originY;

    // Draw the main line
    ctx.beginPath();
       
    // Calculate direction vector of that line
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) { 
	  ctx.strokeStyle = prevStroke;
      ctx.lineWidth = prevWidth;
	  return;
	}
	// get line direction
    const nx = dx / length;
    const ny = dy / length;
	
	//if we are doing solid arrow we need to shorten the main line so it stops inside arrow end
	if (endStyle === 'arrow-line' && arrowSolid && !an) {
	// calculate amount to shorten line to ensure the line's edge meets the arrow's edge perfectly.
       const shortenAmount = ctx.lineWidth / Math.tan(Math.PI / 6);
	   // only shorten if line long is enough
	   if (shortenAmount * 2 < length) {
            const finalX1 = x1 + nx * shortenAmount;
            const finalY1 = y1 + ny * shortenAmount;
            const finalX2 = x2 - nx * shortenAmount;
            const finalY2 = y2 - ny * shortenAmount;
            ctx.moveTo(finalX1, finalY1);
            ctx.lineTo(finalX2, finalY2);
       } else {
            // If the line is too short, don't draw it at all to avoid weird artifacts
       }
	 } else {  
	    // Draw the line normally for all other cases
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
     }
	 ctx.stroke(); 
	 
	if (mode !== "angle" && !an && endStyle !== "none") {   // we dont need ticks for angle mode
	 
    // Get perpendicular vector (rotate 90°)
    const px = -ny;
    const py = nx;

    // Draw perpendicular tick at start adjust lengths for image resolution 
	 let tickLength = 0;
        if (endStyle === "line") {
            tickLength = 6 * tickAdjust + 1.7 * lineWidth;
        } else if (endStyle === "line-medium" || endStyle === "arrow-line") {
            tickLength = 28 * tickAdjust + 1.7 * lineWidth;
        }
	if (tickLength > 0) {
	const scaledTLength = tickLength * scale;
	if ( selected || hover) ctx.lineWidth = Math.min(3, lineWidth + 1) ; //dont scale tick width for hover and selected 
    else ctx.lineWidth = lineWidth < 6.5 ? lineWidth * scaleFactor : 6.5 * scaleFactor; //  use 6.5 px max for ticks 
	 if (ctx.lineWidth <= 0.5) ctx.lineWidth = 0.5; // safety check for tick line width
	 //Draw start tick if enabled
	 if (drawTickAtStart) {
       ctx.beginPath();
       ctx.moveTo(x1 - px * scaledTLength / 2, y1 - py * scaledTLength / 2);
       ctx.lineTo(x1 + px * scaledTLength / 2, y1 + py * scaledTLength / 2);
       ctx.stroke();
    }
     // Draw perpendicular tick at end if enabled
	 if (drawTickAtEnd) {
      ctx.beginPath();
      ctx.moveTo(x2 - px * scaledTLength / 2, y2 - py * scaledTLength / 2);
      ctx.lineTo(x2 + px * scaledTLength / 2, y2 + py * scaledTLength / 2);
      ctx.stroke();
	 }
   } 
      // --- Draw Arrowheads ---
      if (endStyle === 'arrow-line') {
		ctx.fillStyle = selected || hover ? highlightColor : lineColor; // use line settings colors for fill
        const headlen = (14 * tickAdjust + lineWidth*1.7) * scale; // Scaled length of the arrow head diag lines
        const angle = Math.atan2(dy, dx);
        const anglePlus = angle + Math.PI / Math.max(4, (8-lineWidth/5));     // arrow spread angle  make wider with line width 
        const angleMinus = angle - Math.PI / Math.max(4, (8-lineWidth/5));

        if (lineWidth > 4 && !selected && !hover ) ctx.lineWidth = scaleFactor * Math.min(5, lineWidth); //limit arrow heads to 5
        // Arrowhead at the end point (p2)
		if (drawTickAtEnd) {
         ctx.beginPath();
         ctx.moveTo(x2, y2); // tip of arrow
		 ctx.lineTo(
          x2 - headlen * Math.cos(angleMinus),
          y2 - headlen * Math.sin(angleMinus)
          );
		  if (!arrowSolid) ctx.moveTo(x2, y2);
          ctx.lineTo(
          x2 - headlen * Math.cos(anglePlus),
          y2 - headlen * Math.sin(anglePlus)
          );
		  if (!arrowSolid) ctx.stroke(); //open arrowhead
		  else {
            ctx.closePath();
            ctx.fill(); // solid arrowhead
		 }
      }

     // Arrowhead at the start point (p1)
     if (drawTickAtStart) {
      ctx.beginPath();
      ctx.moveTo(x1, y1); // tip of arrow
      ctx.lineTo(
        x1 + headlen * Math.cos(angleMinus),
        y1 + headlen * Math.sin(angleMinus)
      );
	  if (!arrowSolid) ctx.moveTo(x1, y1);
      ctx.lineTo(
      x1 + headlen * Math.cos(anglePlus),
      y1 + headlen * Math.sin(anglePlus)
      );
      if (!arrowSolid) ctx.stroke();
	  else {
      ctx.closePath();
      ctx.fill(); // solid arrowhead
	  }
  }
}

   }
  // Restore previous styles
  ctx.strokeStyle = prevStroke;
  ctx.lineWidth = prevWidth;
 }

 /* Draws a line with a gap in the middle for a label.
  The gap width is determined by the label text. */
function drawLineWithGap(p1, p2, label, selected = false, hover = false) {
    //  Calculate Gap Size 
    ctx.font = `${fontSize * scaleFactor}px sans-serif`;
    const textMetrics = ctx.measureText(label);
    const textWidthInScreenPx = textMetrics.width;
	const textHeightInScreenPx = fontSize * scaleFactor;
    const padding = 10 * scaleFactor; // Add some padding around the text
     // Project the label's bounding box onto the line to find the  gap size needed for label
    const screenDx = (p2.x - p1.x) * scale;
    const screenDy = (p2.y - p1.y) * scale;
    const lineAngle = Math.atan2(screenDy, screenDx);
    const gapScreenPx = Math.abs(textWidthInScreenPx * Math.cos(lineAngle)) + Math.abs(textHeightInScreenPx * Math.sin(lineAngle)) + padding;

    // Convert screen gap size to image coordinate size
    const gapImagePx = gapScreenPx / scale;

    //  Find Gap Points on the Line ---
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lineLengthImagePx = Math.sqrt(dx * dx + dy * dy);

    // Normalized direction vector of the line
    const nx = dx / lineLengthImagePx;
    const ny = dy / lineLengthImagePx;

    const midpoint = {
        x: p1.x + nx * (lineLengthImagePx / 2),
        y: p1.y + ny * (lineLengthImagePx / 2)
    };

    const gapStart = {
        x: midpoint.x - nx * (gapImagePx / 2),
        y: midpoint.y - ny * (gapImagePx / 2)
    };
    const gapEnd = {
        x: midpoint.x + nx * (gapImagePx / 2),
        y: midpoint.y + ny * (gapImagePx / 2)
    };

    // --- 3. Draw the two segments ---
    // The regular drawLine function handles all styling, ticks, and arrows.
    // Draw first segment with tick at p1 only
    drawLine(p1, gapStart, "", selected, hover, false, true, false);
    // Draw second segment with tick at p2 only
    drawLine(gapEnd, p2, "", selected, hover, false, false, true);
}

function drawMeasurement(m, label, selected = false, hover = false) {
  const { p1, p2, labelPos } = m;
  const canSnap = m.isLabelSnapped  // initiall check if snapped
  if ( canSnap && canLabelSnap(m, label)) { //  check if currently snapped and then if can still snap
     //now, draw based on the final decision
    drawLineWithGap(p1, p2, label, selected, hover);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    drawLabelPos(midX, midY, label, true , hover); // Pass a flag to center the text
	m.labelPos.x = midX ;  // we could be dragging endpoint so update snapped label position .
	m.labelPos.y = midY ;
  } else {
    // Otherwise, draw as normal
    drawLine(p1, p2, "", selected, hover);
    drawLabelPos(labelPos.x, labelPos.y, label, false, hover);
  }
  
}


function drawLabelPos(labx, laby, label, centered = false , hover = false) {
    const labelX = ( labx * scale + originX) //+ offset * scaleFactor; chose not to scale offsets treated same as anlges offsets  see drawstored angles  
    const labelY = ( laby * scale + originY) // - offset * scaleFactor;
    const finalFontSize = fontSize * scaleFactor;
    if (fontSize < 1) return; // Don't draw if too small 
    ctx.font = `${finalFontSize}px sans-serif`;
	
	//  Draw solid background if enabled 
    if (solidTextBackground) {
        const metrics = ctx.measureText(label);
        const textWidth = metrics.width;
        // Use font size for height for consistency
        const textHeight = finalFontSize;
        const padding = 4 * scaleFactor; // Add some padding around the text

        const rectWidth = textWidth + padding * 3;
        const rectHeight = textHeight + padding * 2;
        let rectX, rectY;

        if (centered) {
            rectX = labelX - rectWidth / 2;
            rectY = labelY - rectHeight / 2;
        } else {
            // "start" text alignment
            rectX = labelX - padding;
            rectY = labelY - rectHeight / 2;
        }
		// Better looking background with rounded corners
        // Define the corner radius, ensuring it's not too large for the box
        const cornerRadius = Math.min(8 * scaleFactor, rectWidth / 2, rectHeight / 2);
		
		// Draw the rounded rectangle path then fill it
        ctx.beginPath();
        ctx.moveTo(rectX + cornerRadius, rectY);
        ctx.arcTo(rectX + rectWidth, rectY,   rectX + rectWidth, rectY + rectHeight, cornerRadius);
        ctx.arcTo(rectX + rectWidth, rectY + rectHeight, rectX, rectY + rectHeight, cornerRadius);
        ctx.arcTo(rectX, rectY + rectHeight, rectX, rectY, cornerRadius);
        ctx.arcTo(rectX, rectY, rectX + rectWidth, rectY, cornerRadius);
        ctx.closePath();
        ctx.fillStyle = textBgColor;
        ctx.fill();
    }
	   // draw the text
    if (centered) {     // for adjusting text alignment
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
    } else {
        ctx.textAlign = "start";
	    ctx.textBaseline = "middle";
    }
    ctx.fillStyle = hover && !findEndpointAtMouse(mousePos.x, mousePos.y) ? highlightColor : textColor;
    ctx.fillText(label, labelX, labelY);
}
	
    
function drawCrosshair(x, y) {
  const screenX = x * scale + originX;
  const screenY = y * scale + originY;
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(0, screenY); ctx.lineTo(overlay.width, screenY);
  ctx.moveTo(screenX, 0); ctx.lineTo(screenX, overlay.height);
  ctx.stroke();
  ctx.setLineDash([]);
}
function drawOverlay() {
  clearOverlay();
  scaleFactor = flScale ? scale : 1;   // is 'scale label and linewidth with zoom' enabled ? 

  
  // Draw stored measurements 
  measurements.forEach(m => {
    const isSelected = selectedItem?.type === "measurement" && selectedItem.id === m.id;
    const isHover = !isSelected && hoverItem?.type === "measurement" && hoverItem.id === m.id;

    const dx = m.p2.x - m.p1.x;
    const dy = m.p2.y - m.p1.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);

    let realDistance = calibrationFactor ? pixelDistance * calibrationFactor : pixelDistance;
    
    const places = getDecimalPlaces();
    const label = `${realDistance.toFixed(places)} ${unitName}`;
   

    // Pass each measurement point, precalculated label and highlight flags into drawing functions
    drawMeasurement(m, label, isSelected, isHover);
  });

  // Draw stored angles 
  angles.forEach(a => {
    const isSelected = selectedItem && selectedItem.type === "angle" && selectedItem.id === a.id;
    const isHover = hoverItem && hoverItem.type === "angle" && hoverItem.id === a.id;

    // Draw the two legs of the angle with is angle and highlight flags 
    drawLine(a.vertex, a.p1, "", isSelected, isHover, 1);
    drawLine(a.vertex, a.p3, "", isSelected, isHover, 1);

    // Draw arc for angle 
	ctx.strokeStyle = textColor;
	ctx.lineWidth = lineWidth; // use setting line width for arc
    drawSmallestArcAndGetMid(ctx, a.vertex, a.p1, a.p3, 35, scale, originX, originY);
    
    // Draw angle label
	 
    const label = `${a.angle.toFixed(1)}°`; 
	drawLabelPos(a.labelPos.x, a.labelPos.y, label, true, isHover);
  });

  // Draw the calibration measurment
   if (mode === "calibrate") {
      drawCrosshair(mousePos.x, mousePos.y);
      if (firstClick && !secondClick) {
          drawLine(firstClick, mousePos);
		  p2 = mousePos
      } else if (firstClick && secondClick) {
          drawLine(firstClick, secondClick);
		  p2 = secondClick
      }
   if (firstClick && p2) {	  
     const midX = ((firstClick.x + p2.x) / 2);
     const midY = ((firstClick.y + p2.y) / 2);  
     drawLabelPos(midX, midY - fontSize/2 - lineWidth/2 - 10, i18next.t('calibrateLabel'));
   }
   
   // Draw in progress new measurments not yet stored 
  } else if (mode === "measure" ) {
    drawCrosshair(mousePos.x, mousePos.y);
	if (firstClick) {     // if we already have a first click postion then we can track mouse pos and draw
      const p1 = firstClick;
	  // Create a temporary point for drawing that respects axis locks
      const p2 = { ...mousePos };
      if (hKeyIsDown && !vKeyIsDown) { // Prioritize H if both are held
          p2.y = p1.y;
      } else if (vKeyIsDown) {
          p2.x = p1.x;
      }
      drawLine(p1, p2);
     
	  
      // calculate in progress label value
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);
      let realDistance = pixelDistance * (calibrationFactor || 1);
      const places = getDecimalPlaces();
      
	  //calculate label position then draw it 
      const midX = ((p1.x + p2.x) / 2) + labOffset;
      const midY = ((p1.y + p2.y) / 2) - fontSize/2 - lineWidth/2 - 10;
      const label = `${realDistance.toFixed(places)} ${unitName}`;
      drawLabelPos(midX, midY, label);
	  
	}
  //  In-progress drawing for angles 
 } else if (mode === "angle") {
    drawCrosshair(mousePos.x, mousePos.y);
    if (anglePoints.length === 1) {
      drawLine(anglePoints[0], mousePos, "");
    } else if (anglePoints.length === 2) {
      drawLine(anglePoints[0], anglePoints[1], "");
      drawLine(anglePoints[1], mousePos, "");
      // Live angle preview
      const [p1, vertex] = anglePoints, p3 = mousePos;
      const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y }, v2 = { x: p3.x - vertex.x, y: p3.y - vertex.y };
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y), mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      if (mag1 > 0 && mag2 > 0) {
        let angleDeg = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
        // Draw arc preview
        ctx.strokeStyle = textColor;
        ctx.lineWidth = lineWidth; // use settings line width
        const midAngle = drawSmallestArcAndGetMid(ctx, vertex, p1, p3, 35, scale, originX, originY);
		
        // Label preview and show newly created intial placement 
        const labelX = (vertex.x + Math.cos(midAngle) * 70 * tickAdjust);
        const labelY = (vertex.y + Math.sin(midAngle) * 70 * tickAdjust);
        const label = `${angleDeg.toFixed(1)}°`; 
	    drawLabelPos(labelX, labelY, label, true);
      }
    }
  } 
  //  Draw snap point indicator last so it shows over lines and ticks
  if (mode === 'measure' && snapEnabled || mode === "view") {
      const snappedPoint = findNearestPoint(mousePos);
      if (snappedPoint) {
          const screenX = snappedPoint.x * scale + originX;
          const screenY = snappedPoint.y * scale + originY;
          ctx.strokeStyle = highlightColor; 
          ctx.lineWidth = 2;
          ctx.beginPath();
          // Draw a circle with a screen radius 6 or that is always wider than zoomed tick width .
		  const radius = (6 * tickAdjust + 2)  * scaleFactor
          ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
          ctx.stroke();
      }
  }
}