const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] Loading preload script...');

contextBridge.exposeInMainWorld('electron', {
    // Session management
    startSession: (config) => {
        console.log('[Preload] startSession called with config:', config);
        return ipcRenderer.invoke('startSession', config);
    },
    pauseSession: () => {
        console.log('[Preload] pauseSession called');
        return ipcRenderer.invoke('pauseSession');
    },
    resumeSession: () => {
        console.log('[Preload] resumeSession called');
        return ipcRenderer.invoke('resumeSession');
    },
    endSession: () => {
        console.log('[Preload] endSession called');
        return ipcRenderer.invoke('endSession');
    },
    getSessionState: () => {
        console.log('[Preload] getSessionState called');
        return ipcRenderer.invoke('getSessionState');
    },
    
    // Activity data retrieval
    getActivityDelta: () => {
        console.log('[Preload] getActivityDelta called');
        return ipcRenderer.invoke('getActivityDelta');
    },
    getActivityContext: (eyeTrackingEnabled) => {
        console.log('[Preload] getActivityContext called, eyeTracking:', eyeTrackingEnabled);
        return ipcRenderer.invoke('getActivityContext', eyeTrackingEnabled);
    },
    
    // Tracker customization
    addProductiveApp: (appName) => ipcRenderer.invoke('addProductiveApp', appName),
    addDistractionApp: (appName) => ipcRenderer.invoke('addDistractionApp', appName),
    addProductiveDomain: (domain) => ipcRenderer.invoke('addProductiveDomain', domain),
    addDistractionDomain: (domain) => ipcRenderer.invoke('addDistractionDomain', domain)
});

console.log('[Preload] ✅ Electron APIs exposed to renderer');
