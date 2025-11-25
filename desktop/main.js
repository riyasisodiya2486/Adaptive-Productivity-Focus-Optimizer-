const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { ActivityTracker } = require('./activity/ActivityTracker');
const { uIOhook } = require('uiohook-napi');

let mainWindow;
let activityTracker = null;

const isDev = process.env.NODE_ENV === 'development' || process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);

console.log('[Main] ================================');
console.log('[Main] 🚀 Electron app starting...');
console.log('[Main] Node version:', process.version);
console.log('[Main] Electron version:', process.versions.electron);
console.log('[Main] Platform:', process.platform);
console.log('[Main] ================================\n');

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

    // Always open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        try {
            if (activityTracker) {
                activityTracker.stop(); 
            }
            uIOhook.stop(); 
            console.log('[Main] ✅ Successfully stopped uIOhook on exit.');
        } catch (error) {
            console.error('[Main] ❌ Error stopping uIOhook on exit:', error);
        }
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

// ========== IPC Handlers for Session Control ==========

ipcMain.handle('startSession', async (event, config) => {
    try {
        console.log('\n[Main] ================================');
        console.log('[Main] 🚀 START SESSION REQUEST');
        console.log('[Main] Config:', JSON.stringify(config, null, 2));
        console.log('[Main] ================================\n');
        
        if (activityTracker) {
            console.log('[Main] Stopping existing tracker...');
            await activityTracker.stop(); 
        }
        
        console.log('[Main] Creating new ActivityTracker...');
        activityTracker = new ActivityTracker(config);
        
        console.log('[Main] Starting tracker...');
        await activityTracker.start();
        
        console.log('[Main] ✅ Session started successfully!\n');
        return { success: true, message: 'Session started' };
        
    } catch (error) {
        console.error('\n[Main] ❌ ERROR STARTING SESSION:');
        console.error('[Main] Message:', error.message);
        console.error('[Main] Stack:', error.stack);
        console.error('[Main] ================================\n');
        return { success: false, error: error.message };
    }
});

ipcMain.handle('pauseSession', async () => {
    try {
        console.log('[Main] ⏸️ PAUSE SESSION REQUEST');
        if (activityTracker) {
            await activityTracker.pause();
            console.log('[Main] ✅ Session paused');
        }
        return { success: true, message: 'Session paused' };
    } catch (error) {
        console.error('[Main] ❌ Error pausing session:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('resumeSession', async () => {
    try {
        console.log('[Main] ▶️ RESUME SESSION REQUEST');
        if (activityTracker) {
            await activityTracker.resume();
            console.log('[Main] ✅ Session resumed');
        }
        return { success: true, message: 'Session resumed' };
    } catch (error) {
        console.error('[Main] ❌ Error resuming session:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('endSession', async () => {
    try {
        console.log('[Main] ⏹️ END SESSION REQUEST');
        if (activityTracker) {
            await activityTracker.stop();
            activityTracker = null;
            console.log('[Main] ✅ Session ended');
        }
        return { success: true, message: 'Session ended' };
    } catch (error) {
        console.error('[Main] ❌ Error ending session:', error);
        return { success: false, error: error.message };
    }
});

// ========== IPC Handlers for Activity Data ==========

ipcMain.handle('getActivityDelta', async () => {
    console.log('[Main] 📊 getActivityDelta called');
    try {
        if (!activityTracker) {
            console.warn('[Main] ⚠️ No active tracker!');
            return {
                keystrokes: 0, mouseClicks: 0, mouseMoves: 0, scrolls: 0, idleTime: 0
            };
        }
        const delta = await activityTracker.getDelta();
        console.log('[Main] 📊 Delta:', delta);
        return delta;
    } catch (error) {
        console.error('[Main] ❌ Error getting delta:', error);
        return {
            keystrokes: 0, mouseClicks: 0, mouseMoves: 0, scrolls: 0, idleTime: 0
        };
    }
});

ipcMain.handle('getActivityContext', async (event, isEyeTrackingEnabled) => {
    console.log('[Main] 🎯 getActivityContext called, eyeTracking:', isEyeTrackingEnabled);
    try {
        if (!activityTracker) {
            console.warn('[Main] ⚠️ No active tracker!');
            return {
                activeApp: { name: 'N/A', title: 'N/A', category: 'neutral' },
                browserActivity: null,
                eyeTracking: { enabled: false, gazeX: 0, gazeY: 0, blinkRate: 0, focusedOnScreen: false }
            };
        }
        const context = await activityTracker.getContext(isEyeTrackingEnabled);
        console.log('[Main] 🎯 Context:', JSON.stringify(context, null, 2));
        return context;
    } catch (error) {
        console.error('[Main] ❌ Error getting context:', error);
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
        console.error('[Main] ❌ Error getting session state:', error);
        return { running: false, paused: false };
    }
});

// ========== IPC Handlers for Tracker Customization ==========

ipcMain.handle('addProductiveApp', async (event, appName) => {
    try {
        if (activityTracker) {
            activityTracker.addProductiveApp(appName);
        }
        return { success: true };
    } catch (error) {
        console.error('[Main] ❌ Error adding productive app:', error);
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
        console.error('[Main] ❌ Error adding distraction app:', error);
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
        console.error('[Main] ❌ Error adding productive domain:', error);
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
        console.error('[Main] ❌ Error adding distraction domain:', error);
        return { success: false, error: error.message };
    }
});

console.log('[Main] ✅ All IPC handlers registered\n');
