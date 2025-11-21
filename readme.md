# MeasureView + WiScope AD409 🚀


## Overview
This is a  Chrome extension that has two parts. The first part **MeasureView** (which can be opened and used alone or you can choose to open the AD409 microscope control). MeasureView is a well featured but simple to use image Measurement tool that I originally built as a standalone extension and may release it as such as it develops, it can easily be calibrated in any measurement units and used to measure circuit board or other image features where a degree of precision is required.
 The second part **WiScope AD409** is an experimental Wi-fi controller that allows Wi-Fi control of the Andonstar AD409 Inspection/soldering microscope from your PC, Use it to Manage the SD card and change microscope settings, show MJPEG low res preview and initiate/download snapshots/videos and seamless integration with **MeasureView**. I built this because the official AD409 software only supports wired USB connections. This project provides a more flexible, wireless alternative.



 ## ✨ MeasureView Features

- ✅ Zoom and pan images with mouse or keyboard  
- ✅ Load/save images and measurements (JSON or combined image)  
- ✅ Measure distances and angles in px, mm, inches, or custom units (easy calibration with a ruler image)  
- ✅ **Snap-to** and **line lock** features for precise alignment with other measurement points 
- ✅ Move/place measurement endpoints and labels  
- ✅ Multi-language support  

---

## WiScope AD409 notes
 There is limited tech information available online about the **Andonstar AD409** but whilst testing I found out it uses a **Novatek camera and chipset** who also make dash/web cams, with that knowledge I found some of the Wi-Fi command syntax and codes from online sources that are used on some of their webcams. By probing the microscope with a web browser and Wireshark I discovered other AD409 specific Wi-Fi commands that allow control of this microscope, you can find those commands listed in a txt file within this repository if you are interested.
⚠️ **Disclaimer / Warning**
 - Be cautious about using some of those commands as some of them have unknown effects and others (such as initiating a firmware update) may potentially **brick your microscope**  (i.e. corrupt or delete your microscopes own firmware which is not replaceable/available anywhere) . 
- Andonstar may have changed or may decide to change these commands on earlier/later versions of the AD409 than my own, so whilst this software works ok for my AD409, I can make no guarantees it will work ok for your AD409 microscope version, this is a unofficial/unsupported app I wrote for personal use.    

---

## How to enable Microscope Wi-Fi and connect (after installing extension). 
1. Insert a **quality SD card** into the microscope before proceeding.
2. Enable Wi-Fi from the AD409’s menu. The scope’s SSID and password will appear (default password is usually `12345678`).
3. On your PC Wi-Fi 'show available networks' scan for the microscope’s SSID and connect using the password.
4. Connection can be verfied by entering the microscope’s IP address into your browser (default: `http://192.168.1.254` ). The microscopes basic SD card home page should appear.
5. ⚠️ If your PC relies on Wi-Fi for internet access, you may need a second Wi-Fi dongle to connect to both the microscope and the internet simultaneously.
   (note : The AD409 may also have an undocumented Wi-Fi client mode (see known commands.txt) enabling it to scan for and join a Wi-Fi server (e.g., router) but it's unknown how to initiate a connection using this at present.
6. Open the previously installed extension from chromes extension tool bar and 'connect' to scope, optional limit the extensions 'Site access' to only the scopes IP address from chromes extension settings. 
----

## Installation
1. Clone or [Download the latest release](https://github.com/your-username/your-repo-name/releases/latest)
 and Unzip :
2- Open Chrome and go to chrome://extensions/.
3- Enable Developer mode (toggle in the top right).
4- Click Load unpacked and select the Unzipped extension folder you created.
5- Done! 🎉

##Screenshots

### MeasureView Snapshot


![MeasureView ScreenShot](images/MeasureViewScreen.png) 

### WiScope AD409 Snapshot


![WiScope AD409 ScreenShot](images/WiScope AD409 Screen.png) 


Contributing
All Feature requests will be considered. For bug reports, please open an issue.
License
MIT

---

### 🔑 Notes
- Replace `images/popup.png`, `images/options.png`, etc. with the actual filenames of your screenshots.
- Use the **Markdown syntax** (`![Alt text](path)`) for simple inline images.
- Use the **HTML `<img>` tag** if you want to control width or alignment (GitHub supports basic HTML in README files).
- Keep screenshots in a dedicated folder like `images/` or `assets/` so your repo stays tidy.


