// variables for the filter
let protocol = "";
let port = "";
let ipSource = "";
let ipDestination = "";
let direction = "";
let filter = "";


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
        } catch (error) {
            console.error("Error setting up bridge:", error);
        }
    }
}


/**
 * Moves the cursor to the end of the text in the textarea with the id 'outPutTextArea'.
 * If the element is not found, logs an error message to the console.
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
    //let info = await Neutralino.os.execCommand('wmic nic get name');
    let info = await Neutralino.os.execCommand('ls /sys/class/net');
    console.log(info.stdOut);
    let interfaces = info.stdOut.split('\n').filter(line => line.trim() !== '' && line.trim() !== 'Name').map((iface) => {
        return `<option value="${iface.trim()}">${iface.trim()}</option>`;
    });
    document.getElementById('interface').innerHTML = interfaces.join('');
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
 * Asynchronously retrieves the IP addresses of connected devices from the network interface
 * and updates the HTML elements with the IDs "ipDevice1" and "ipDevice2" with the IP addresses.
 * If no devices are connected, it sets the inner HTML to indicate no devices are connected.
 *
 * @async
 * @function getConnectedDevices
 * @returns {Promise<void>} A promise that resolves when the IP addresses have been retrieved and the HTML elements updated.
 */
async function getConnectedDevices() {
    //TODO : get from network interface we use 
    let info = await Neutralino.os.execCommand(`ip route | grep default | awk '{print $9}'`);
    let ip = info.stdOut.split('\n')

    document.getElementById("ipDevice1").innerHTML = "IP device 1 : No device connected";
    document.getElementById("ipDevice2").innerHTML = "IP device 2 : No device connected";
    if (ip[0]) {
        document.getElementById("ipDevice1").innerHTML = "IP device 1 : " + ip[0];
    }
    if (ip[1]) {
        document.getElementById("ipDevice2").innerHTML = "IP device 2 : " + ip[1];
    }
    //console.log(`Your connected devices: ${info.stdOut}`);
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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    let command = '';
    if (filter) {
        command = 'sudo tcpdump -i ' + iface + ' -w - ' + filter + '| sudo tee ../backup/capture_' + timestamp + '.pcap | sudo tee ' + output + '/capture_' + timestamp + '.pcap | sudo tcpdump -r -';
    } else {
        command = 'sudo tcpdump -i ' + iface + ' -w - | sudo tee ../backup/capture_' + timestamp + '.pcap | sudo tee ' + output + '/capture_' + timestamp + '.pcap | sudo tcpdump -r -';
    }
    // Start the tcpdump process
    tcpdumpProcess = await Neutralino.os.spawnProcess(command);
    document.getElementById('outPutTextArea').value += command + '>>>> \n';

    // set the button label to stop
    const button = document.getElementById('tcpdumpButton');
    button.textContent = 'Stop';

    // show command preview TODO 
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
    let backupFolder = '../backup'; //
    let files = await Neutralino.filesystem.readDirectory(backupFolder);

    let fileList = files.filter(file => file.type === 'FILE').map(file => file.entry);
    console.warn('Backup files:', fileList);

    let historyTable = document.getElementById('historyTable');
    let tbody = document.getElementById('historyTable').getElementsByTagName('tbody')[0];
    tbody.innerHTML = "";
    fileList.forEach(file => {
        let date = file.split('_')[1].split('.')[0];
        let name = file.split('_')[0];
        let row = historyTable.insertRow();
        let cell1 = row.insertCell(0);
        let cell2 = row.insertCell(1);
        let cell3 = row.insertCell(2);
        let cell4 = row.insertCell(3);

        cell1.innerHTML = date;
        cell2.innerHTML = name;
        let save = `<button onclick="copyFileToUserFolder('${file}')"><img src="icons/save.png" alt="More" style="width: 18px; height: 18px;"></button>`;
        cell3.innerHTML = save;
        let remove = `<button onclick="removeFile('${file}')"><img src="icons/delete.png" alt="More" style="width: 18px; height: 18px;"></button>`;
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
if (NL_OS != "Darwin") { // TODO: Fix https://github.com/neutralinojs/neutralinojs/issues/615
    setTray();
}


