// variables for the filter
let protocol = "";
let port = "";
let ipSource = "";
let ipDestination = "";
let direction = "";
let filter = "";

// bridge setup
let bridge = false; // flag to check if the bridge is set up

// for the setup of the bridge
/**
 * Sets up a network bridge using the `brctl` command.
 * 
 * This function checks if a bridge named `br0` already exists. If it does, it checks if `eth0` and `eth1` are part of the bridge.
 * If the bridge does not exist or does not contain `eth0` and `eth1`, it creates the bridge and adds the interfaces.
 * 
 * @async
 * @function setupBridge
 * @returns {Promise<void>} A promise that resolves when the bridge setup is complete.
 * @throws Will throw an error if there is an issue executing the commands to set up the bridge.
 */
async function setupBridge() {
    let bridgeInfo = await Neutralino.os.execCommand('brctl show');
    if (bridgeInfo.stdOut.includes('br0')) {
        console.log('Bridge br0 already exists.');
        if (bridgeInfo.stdOut.includes('eth0') && bridgeInfo.stdOut.includes('eth1')) {
            console.log('Bridge br0 already contains eth0 and eth1.');
            return;
        } else {
            console.log('Bridge br0 exists but does not contain eth0 and eth1.');
        }
    } else {
        try {
            await Neutralino.os.execCommand('sudo brctl addbr br0');
            await Neutralino.os.execCommand('sudo brctl addif br0 eth0 eth1');
            await Neutralino.os.execCommand('sudo ifconfig eth0 up');
            await Neutralino.os.execCommand('sudo ifconfig eth1 up');
            let info = await Neutralino.os.execCommand('sudo ifconfig br0 up');
            console.log(info.stdOut);
            bridge = true; // set the bridge flag to true
        } catch (error) {
            console.error("Error setting up bridge:", error);
        }
    }
}



/**
 * Moves the cursor to the end of the text in the textarea with the id 'outPutTextArea'.
 * If the element is not found, logs an error to the console.
 */
function moveCursorToEnd() {
    const input = document.getElementById('outPutTextArea');
    if (input) {
        const length = input.value.length;
        // Focus on the input
        input.focus();
        // Set the cursor to the end
        input.setSelectionRange(length, length);
    } else {
        console.error("Element with id 'outPutTextArea' not found.");
    }
}

// get the network interfaces available on the system and display them in a dropdown list 
/**
 * Asynchronously retrieves the list of network interfaces and updates the HTML select element with the available interfaces.
 * 
 * This function uses the Neutralino.os.execCommand to execute a command that fetches the network interface names.
 * Depending on the operating system, the command can be adjusted (e.g., 'wmic nic get name' for Windows or 'ls /sys/class/net' for Linux).
 * 
 * The function processes the output of the command, filters out any empty lines or headers, and then populates a select element
 * with the network interface names as options.
 * 
 * @async
 * @function getNetworkInterfaces
 * @returns {Promise<void>} A promise that resolves when the network interfaces have been successfully retrieved and the select element updated.
 */
async function getNetworkInterfaces() {
    let info = await Neutralino.os.execCommand('ls /sys/class/net');
    //let info = await Neutralino.os.execCommand('wmic nic get name');
    console.log(info.stdOut);
    let interfaces = info.stdOut.split('\n').filter(line => line.trim() !== '' && line.trim() !== 'Name').map((iface) => {
        return `<option value="${iface.trim()}">${iface.trim()}</option>`;
    });
    interfaces.push('<option value="bridge">bridge</option>');
    document.getElementById('interface').innerHTML = interfaces.join('');

    document.getElementById('interface').addEventListener('change', async (event) => {
        if (event.target.value === 'bridge') {
            await setupBridge();
        }
    });
}


async function getConnectedDevices() {
    let interfacesInfo = await Neutralino.os.execCommand('ip -o -4 addr list | awk \'{print $2, $4}\'');
    console.log(interfacesInfo.stdOut);
    let ip = interfacesInfo.stdOut.split('\n').filter(line => line.includes('eth0') || line.includes('eth1'));

    document.getElementById("ipDevice1").innerHTML = "eth0 : No device connected";
    document.getElementById("ipDevice2").innerHTML = "eth1 : No device connected";

    ip.forEach((line) => {
        if (line.includes('eth0')) {
            document.getElementById("ipDevice1").innerHTML = line;
        }
        if (line.includes('eth1')) {
            document.getElementById("ipDevice2").innerHTML = line;
        }
    });
}

/**
 * Updates the filter values based on the input fields in the document.
 * Retrieves the values from the input fields with IDs 'protocol', 'port', 'ipSource', 'ipDestination', and 'direction',
 * and then calls the buildFilter function to apply the updated filter.
 */
function updateFilter() {
    protocol = document.getElementById('protocol').value;
    port = document.getElementById('port').value;
    ipSource = document.getElementById('ipSource').value;
    ipDestination = document.getElementById('ipDestination').value;
    direction = document.getElementById('direction').value;

    buildFilter();
}

/**
 * Builds a filter string based on the provided protocol, port, source IP, destination IP, and direction.
 * The filter string is constructed in the following order:
 * - Protocol
 * - Port
 * - Source IP
 * - Destination IP
 * - Direction (source or destination)
 * 
 * The resulting filter string is set to the value of the HTML element with the ID 'filter'.
 * 
 * @global
 * @function buildFilter
 * @param {string} [protocol] - The protocol to be included in the filter (e.g., "tcp", "udp").
 * @param {number} [port] - The port number to be included in the filter.
 * @param {string} [ipSource] - The source IP address to be included in the filter.
 * @param {string} [ipDestination] - The destination IP address to be included in the filter.
 * @param {string} [direction] - The direction of the traffic to be included in the filter ("src" or "dst").
 */
function buildFilter() {
    filter = "";

    if (protocol) {
        filter += protocol + " ";
    }
    if (port) {
        filter += "port " + port + " ";
    }
    if (ipSource) {
        filter += "src host " + ipSource + " ";
    }
    if (ipDestination) {
        filter += "dst host " + ipDestination + " ";
    }

    // Ensure direction is added correctly
    if (direction) {
        if (direction === "src" && ipSource) {
            filter += "and src ";
        } else if (direction === "dst" && ipDestination) {
            filter += "and dst ";
        }
    }

    // Remove any trailing "and src" or "and dst"
    filter = filter.trim();
    if (filter.endsWith("and src") || filter.endsWith("and dst")) {
        filter = filter.substring(0, filter.lastIndexOf("and")).trim();
    }

    //console.log("Filter: " + filter);

    document.getElementById('filter').value = filter;
}

/**
 * Applies the current filter to the application.
 * 
 * This function updates the filter, displays an alert with the applied filter,
 * and sets the value of the HTML elements with IDs 'filterP' and 'filter' to the filter value.
 * 
 * @function
 */
function applyFilter() {
    updateFilter();
    alert("Filter applied: " + filter);
    document.getElementById('filterP').value = filter;
    document.getElementById('filter').value = filter;

}


/**
 * Opens a folder dialog for the user to select an output file and sets the selected path
 * to the value of the HTML element with the id 'output'.
 *
 * @async
 * @function chooseOutputFile
 * @returns {Promise<void>} A promise that resolves when the folder dialog is closed and the path is set.
 */
async function chooseOutputFile() {
    let entry = await Neutralino.os.showFolderDialog('Select output file', {
        defaultPath: '/home/user/app/capture'
    });
    if (entry) {
        document.getElementById('output').value = entry;
    }
}


let tcpdumpProcess = null;

/**
 * Starts the tcpdump process to capture network packets.
 * If a tcpdump process is already running, it stops the process first.
 * 
 * The command to start tcpdump is constructed based on the form inputs:
 * - `output`: The directory where the capture file will be saved.
 * - `interface`: The network interface to capture packets from.
 * - `filter`: (Optional) A filter to apply to the tcpdump command.
 * 
 * The capture file is saved in two locations:
 * - A backup directory (`../backup/`) with a timestamped filename.
 * - The specified output directory with a timestamped filename.
 * 
 * The command is displayed in the `cmdPreview` element and the output is shown in the `outPutTextArea` element.
 * The button label is updated to 'Stop' when the process starts and 'Start Recording' when the process stops.
 * 
 * @async
 * @function startTcpdump
 * @returns {Promise<void>} A promise that resolves when the tcpdump process is started or stopped.
 */
async function startTcpdump() {
    if (tcpdumpProcess) {
        await stopTcpdump();
        return;
    }

    const form = document.getElementById('tcpdumpForm');
    const output = form.elements['output'].value;
    const iface = form.elements['interface'].value;
    const filter = form.elements['filter'].value;
    //let command = 'sudo tcpdump -i eth0 -w - | sudo tee capture.pcap | tcpdump -r -';
    //let command = 'sudo tcpdump -i eth0 -w - | sudo tee backup/capture1.pcap | sudo tee ../test/capture2.pcap | sudo tcpdump -r -';
    let now = new Date();
    let year = now.getFullYear();
    let month = String(now.getMonth() + 1).padStart(2, '0');
    let day = String(now.getDate()).padStart(2, '0');
    let hours = String(now.getHours()).padStart(2, '0');
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    let timestamp = `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;

    console.log(`Capture file will be saved as capture_${timestamp}.pcap`);

    let command = '';

    if (filter) {
        command = 'sudo tcpdump -i ' + iface + ' -w - ' + filter + ' | sudo tee ../backup/capture_' + timestamp + '.pcap | sudo tee ' + output + '/capture_'+ iface +'_'+ timestamp + '.pcap | sudo tcpdump -C 1000 -r -';
    } else {
        command = 'sudo tcpdump -i ' + iface + ' -w - | sudo tee ../backup/capture_' + timestamp + '.pcap | sudo tee ' + output + '/capture_'+ iface +'_' + timestamp + '.pcap | sudo tcpdump -C 1000 -r -';
    }
    
    // Start the tcpdump process
    tcpdumpProcess = await Neutralino.os.spawnProcess(command);
    document.getElementById('outPutTextArea').value += command + '>>>> \n';

    // set the button label to stop
    const button = document.getElementById('tcpdumpButton');
    button.textContent = 'Stop';

    //  TODO show command preview  
    document.getElementById('cmdPreview').innerHTML = `${command}`;

    // show packet
    Neutralino.events.on('spawnedProcess', (evt) => {
        if (tcpdumpProcess && tcpdumpProcess.id === evt.detail.id) {
            let outputLength = document.getElementById('outPutTextArea').value.length;
            if (outputLength > 1024) {
                document.getElementById('outPutTextArea').value = "";
            }

            switch (evt.detail.action) {
                case 'stdOut':
                    //console.log(evt.detail.data);
                    document.getElementById('outPutTextArea').value += evt.detail.data;
                    break;
                case 'stdErr':
                    //console.error(evt.detail.data);
                    document.getElementById('outPutTextArea').value += evt.detail.data;
                    break;
                case 'exit':
                    console.warn(`command exit code: ${evt.detail.data}`);
                    document.getElementById('outPutTextArea').value += evt.detail.data;
                    tcpdumpProcess = null;

                    //set button in start
                    button.textContent = 'Start Recording';
                    break;
            }
            moveCursorToEnd();
        }
    });
}


/**
 * Stops the tcpdump process if it is running.
 * 
 * This function checks if the `tcpdumpProcess` is defined. If it is, it sends a kill command to stop the process,
 * sets `tcpdumpProcess` to null, updates the button text to 'Start Recording', and logs a warning message indicating
 * that the tcpdump process has been stopped.
 * 
 * @async
 * @function stopTcpdump
 * @returns {Promise<void>} A promise that resolves when the tcpdump process has been stopped.
 */
async function stopTcpdump() {
    if (tcpdumpProcess) {
        console.warn('stop')
        await Neutralino.os.execCommand(`kill ${tcpdumpProcess.pid}`);
        tcpdumpProcess = null;
        const button = document.getElementById('tcpdumpButton');
        button.textContent = 'Start Recording';
        console.warn('tcpdump process stopped');
        if (bridge) {
            // remove the bridge if it was created
            try {
                await Neutralino.os.execCommand('sudo ifconfig br0 down');
                await Neutralino.os.execCommand('sudo brctl delbr br0');
                console.warn('Bridge br0 removed');
                bridge = false; // reset the bridge flag
            } catch (error) {
                console.error("Error removing bridge:", error);
            }
        }
    }
}



/**
 * Asynchronously retrieves files from the backup folder, filters them to include only files,
 * and populates the history table with the file details.
 * 
 * The function reads the directory contents of the backup folder, filters out directories,
 * and then extracts the date and name from each file's name. It then creates a new row in the
 * history table for each file, displaying the date, name, and a button to save the file.
 * 
 * @async
 * @function getFileFromBackupFolder
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
async function getFileFromBackupFolder() {
    let backupFolder = '../backup';
    let files = await Neutralino.filesystem.readDirectory(backupFolder);

    let fileList = files.filter(file => file.type === 'FILE').map(file => file.entry);
    console.warn('Backup files:', fileList);

    // Get file details including creation/modification date
    let fileDetails = await Promise.all(fileList.map(async (file) => {
        let stats = await Neutralino.filesystem.getStats(`${backupFolder}/${file}`);
        return {
            name: file,
            date: new Date(stats.modifiedAt).toLocaleString()
        };
    }));

    // Sort files by date (most recent first)
    fileDetails.sort((a, b) => new Date(b.date) - new Date(a.date));

    let historyTable = document.getElementById('historyTable');
    let tbody = document.getElementById('historyTable').getElementsByTagName('tbody')[0];
    tbody.innerHTML = "";
    fileDetails.forEach(file => {
        let row = historyTable.insertRow();
        let cell1 = row.insertCell(0);
        let cell2 = row.insertCell(1);
        let cell3 = row.insertCell(2);
        let cell4 = row.insertCell(3);

        cell1.innerHTML = file.date;
        cell2.innerHTML = file.name.split('_')[0];
        let save = `<button onclick="copyFileToUserFolder('${file.name}')"><img src="icons/save.png" alt="More" style="width: 18px; height: 18px;"></button>`;
        cell3.innerHTML = save;
        let remove = `<button onclick="removeFile('${file.name}')"><img src="icons/delete.png" alt="More" style="width: 18px; height: 18px;"></button>`;
        cell4.innerHTML = remove;
    });
}

/**
 * Copies a specified file to a user-selected folder.
 *
 * This function opens a folder selection dialog for the user to choose a destination folder.
 * If a folder is selected, it attempts to copy the specified file from the backup directory
 * to the selected folder. Logs the result of the operation to the console.
 *
 * @async
 * @function copyFileToUserFolder
 * @param {string} file - The name of the file to be copied.
 * @returns {Promise<void>} - A promise that resolves when the file copy operation is complete.
 */
async function copyFileToUserFolder(file) {
    let entry = await Neutralino.os.showFolderDialog('Select destination folder', {});

    if (entry) {
        try {
            await Neutralino.filesystem.copy(`../backup/${file}`, `${entry}/${file}`);
            console.log(`File ${file} copied to ${entry}`);
        } catch (error) {
            console.error("Error copying file:", error);
        }
    } else {
        console.error("No destination folder selected.");
    }
}


/**
 * Asynchronously removes a file from the backup directory.
 *
 * @param {string} file - The name of the file to be removed.
 * @returns {Promise<void>} A promise that resolves when the file is removed.
 * @throws Will throw an error if the file removal fails.
 */
async function removeFile(file) {
    try {
        await Neutralino.os.execCommand('sudo rm ../backup/' + file)
        console.log(`File ${file} removed`);
        await getFileFromBackupFolder();
    } catch (error) {
        console.error("Error removing file:", error);
    }

}


// More options
/**
 * Toggles the full-screen mode of the application window.
 * 
 * This function checks the current full-screen status of the window using
 * `Neutralino.window.isFullScreen()`. If the window is in full-screen mode,
 * it exits full-screen mode using `Neutralino.window.exitFullScreen()`.
 * Otherwise, it sets the window to full-screen mode using `Neutralino.window.setFullScreen()`.
 * 
 * @async
 * @function toggleFullScreen
 * @returns {Promise<void>} A promise that resolves when the full-screen mode is toggled.
 * @throws {Error} Throws an error if there is an issue toggling the full-screen mode.
 */
async function toggleFullScreen() {
    try {
        let isFullScreen = await Neutralino.window.isFullScreen();
        if (isFullScreen) {
            await Neutralino.window.exitFullScreen();
        } else {
            await Neutralino.window.setFullScreen();
        }
    } catch (err) {
        console.error(`Error toggling full-screen mode: ${err.message} (${err.name})`);
    }
}

/**
 * Reboots the Raspberry Pi (RPI) by executing the 'sudo reboot' command.
 * 
 * This function uses the Neutralino library to execute the reboot command.
 * If an error occurs during the execution, it logs the error message to the console.
 * 
 * @async
 * @function rebootRPI
 * @returns {Promise<void>} A promise that resolves when the command execution is complete.
 * @throws Will log an error message to the console if the command execution fails.
 */
async function rebootRPI() {
    try {
        await Neutralino.os.execCommand('sudo reboot');
    } catch (err) {
        console.error(`Error rebooting RPI: ${err.message} (${err.name})`);
    }
}

/**
 * Asynchronously turns off the Raspberry Pi by executing the 'sudo poweroff' command.
 * 
 * @async
 * @function turnOffRPI
 * @returns {Promise<void>} A promise that resolves when the command is executed.
 * @throws {Error} If there is an error executing the command.
 */
async function turnOffRPI() {
    try {
        await Neutralino.os.execCommand('sudo poweroff');
    } catch (err) {
        console.error(`Error turning off RPI: ${err.message} (${err.name})`);
    }
}

/**
 * Asynchronously restarts the application.
 * 
 * This function attempts to restart the application using the Neutralino framework.
 * If an error occurs during the restart process, it logs the error message to the console.
 * 
 * @async
 * @function restartApp
 * @returns {Promise<void>} A promise that resolves when the application has been restarted.
 * @throws {Error} If there is an issue with restarting the application.
 */
async function restartApp() {
    try {
        await Neutralino.app.restartProcess({ args: '--restarted' });
    } catch (err) {
        console.error(`Error restarting app: ${err.message} (${err.name})`);
    }
}

/**
 * Asynchronously opens the file explorer to the specified directory.
 * 
 * This function attempts to execute the command to open the file explorer
 * to the '../backup' directory. If an error occurs during the execution
 * of the command, it logs the error message to the console.
 * 
 * @async
 * @function accessFileExplorer
 * @returns {Promise<void>} A promise that resolves when the command execution is complete.
 * @throws {Error} If there is an issue executing the command to open the file explorer.
 */
async function accessFileExplorer() {
    try {
        await Neutralino.os.execCommand('xdg-open ../backup');
    } catch (err) {
        console.error(`Error opening file explorer: ${err.message} (${err.name})`);
    }
}


/**
 * Opens a terminal using the Neutralino OS execCommand.
 * If an error occurs while attempting to open the terminal, it logs the error message to the console.
 * 
 * @async
 * @function accessTerminal
 * @returns {Promise<void>} A promise that resolves when the terminal is successfully opened.
 * @throws {Error} Throws an error if there is an issue opening the terminal.
 */
async function accessTerminal() {
    try {
        await Neutralino.os.execCommand('lxterminal');
    } catch (err) {
        console.error(`Error opening terminal: ${err.message} (${err.name})`);
    }
}


/**
 * Prompts the user with a confirmation message to shut down the Raspberry Pi (RPI).
 * If the user confirms, it executes the shutdown command.
 * If the user cancels, the function returns without performing any action.
 * 
 * @async
 * @function extractSD
 * @returns {Promise<void>} A promise that resolves when the shutdown command is executed or the function returns.
 * @throws {Error} Throws an error if there is an issue executing the shutdown command.
 */
async function extractSD() {
    let result = await Neutralino.os.showMessageBox('Confirmation', 'Are you sure you want to shut down the RPI?', 'YES_NO');
    if (result === 'NO') {
        return;
    } else {
        try {
            await Neutralino.os.execCommand('sudo shutdown -h now');
        } catch (err) {
            console.error(`Error extracting SD card: ${err.message} (${err.name})`);
        }
    }
}


//==========================================
// Neutralino setup
//==========================================
/*
    Function to set up a system tray menu with options specific to the window mode.
    This function checks if the application is running in window mode, and if so,
    it defines the tray menu items and sets up the tray accordingly.
*/
function setTray() {
    // Tray menu is only available in window mode
    if (NL_MODE != "window") {
        console.log("INFO: Tray menu is only available in the window mode.");
        return;
    }

    // Define tray menu items
    let tray = {
        icon: "/resources/icons/trayIcon.png",
        menuItems: [
            { id: "VERSION", text: "Get version" },
            { id: "SEP", text: "-" },
            { id: "QUIT", text: "Quit" }
        ]
    };

    // Set the tray menu
    Neutralino.os.setTray(tray);
}

/*
    Function to handle click events on the tray menu items.
    This function performs different actions based on the clicked item's ID,
    such as displaying version information or exiting the application.
*/
function onTrayMenuItemClicked(event) {
    switch (event.detail.id) {
        case "VERSION":
            // Display version information
            Neutralino.os.showMessageBox("Version information",
                `Neutralinojs server: v${NL_VERSION} | Neutralinojs client: v${NL_CVERSION}`);
            break;
        case "QUIT":
            // Exit the application
            Neutralino.app.exit();
            break;
    }
}

/*
    Function to handle the window close event by gracefully exiting the Neutralino application.
*/
function onWindowClose() {
    Neutralino.app.exit();
}

// Initialize Neutralino
Neutralino.init();

// Register event listeners
Neutralino.events.on("trayMenuItemClicked", onTrayMenuItemClicked);
Neutralino.events.on("windowClose", onWindowClose);

// Conditional initialization: Set up system tray if not running on macOS
if (NL_OS != "Darwin") { // : Fix https://github.com/neutralinojs/neutralinojs/issues/615
    setTray();
}


