const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { ActivityTracker } = require('./activity/ActivityTracker');

let mainWindow;
let activityTracker = null;

const isDev = process.env.NODE_ENV === 'development' || process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
        }
    });

    const startUrl = isDev
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, '../dist/index.html')}`;
    mainWindow.loadURL(startUrl);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

// ========== IPC Handlers for Session Control ==========

ipcMain.handle('startSession', async (event, config) => {
    try {
        console.log('[Main] Starting session with config:', config);
        if (activityTracker) {
            await activityTracker.stop(); // Clean up previous session
        }
        activityTracker = new ActivityTracker(config);
        await activityTracker.start();
        return { success: true, message: 'Session started' };
    } catch (error) {
        console.error('[Main] Error starting session:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('pauseSession', async () => {
    try {
        if (activityTracker) await activityTracker.pause();
        return { success: true, message: 'Session paused' };
    } catch (error) {
        console.error('[Main] Error pausing session:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('resumeSession', async () => {
    try {
        if (activityTracker) await activityTracker.resume();
        return { success: true, message: 'Session resumed' };
    } catch (error) {
        console.error('[Main] Error resuming session:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('endSession', async () => {
    try {
        if (activityTracker) await activityTracker.stop();
        activityTracker = null;
        return { success: true, message: 'Session ended' };
    } catch (error) {
        console.error('[Main] Error ending session:', error);
        return { success: false, error: error.message };
    }
});

// ========== IPC Handlers for Activity Data ==========

ipcMain.handle('getActivityDelta', async () => {
    try {
        if (!activityTracker) {
            return {
                keystrokes: 0, mouseClicks: 0, mouseMoves: 0, scrolls: 0, idleTime: 0
            };
        }
        const delta = await activityTracker.getDelta();
        return delta;
    } catch (error) {
        console.error('[Main] Error getting activity delta:', error);
        return {
            keystrokes: 0, mouseClicks: 0, mouseMoves: 0, scrolls: 0, idleTime: 0
        };
    }
});

ipcMain.handle('getActivityContext', async (event, isEyeTrackingEnabled) => {
    try {
        if (!activityTracker) {
            return {
                activeApp: { name: 'N/A', title: 'N/A', category: 'neutral' },
                browserActivity: null,
                eyeTracking: { enabled: false, gazeX: 0, gazeY: 0, blinkRate: 0, focusedOnScreen: false }
            };
        }
        const context = await activityTracker.getContext(isEyeTrackingEnabled);
        return context;
    } catch (error) {
        console.error('[Main] Error getting activity context:', error);
        return {
            activeApp: { name: 'N/A', title: 'N/A', category: 'neutral' },
            browserActivity: null,
            eyeTracking: { enabled: false, gazeX: 0, gazeY: 0, blinkRate: 0, focusedOnScreen: false }
        };
    }
});

ipcMain.handle('getSessionState', async () => {
    try {
        if (!activityTracker) {
            return { running: false, paused: false };
        }
        return activityTracker.getState();
    } catch (error) {
        console.error('[Main] Error getting session state:', error);
        return { running: false, paused: false };
    }
});
console.log('[Main] Electron main process started');


// ========== IPC Handlers for Tracker Customization ==========

ipcMain.handle('addProductiveApp', async (event, appName) => {
    try {
        if (activityTracker) {
            activityTracker.addProductiveApp(appName);
        }
        return { success: true };
    } catch (error) {
        console.error('[Main] Error adding productive app:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('addDistractionApp', async (event, appName) => {
    try {
        if (activityTracker) {
            activityTracker.addDistractionApp(appName);
        }
        return { success: true };
    } catch (error) {
        console.error('[Main] Error adding distraction app:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('addProductiveDomain', async (event, domain) => {
    try {
        if (activityTracker) {
            activityTracker.addProductiveDomain(domain);
        }
        return { success: true };
    } catch (error) {
        console.error('[Main] Error adding productive domain:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('addDistractionDomain', async (event, domain) => {
    try {
        if (activityTracker) {
            activityTracker.addDistractionDomain(domain);
        }
        return { success: true };
    } catch (error) {
        console.error('[Main] Error adding distraction domain:', error);
        return { success: false, error: error.message };
    }
});

console.log('[Main] Electron main process started');
