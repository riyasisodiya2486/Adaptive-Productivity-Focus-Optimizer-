// preload.js - Fixed to match main.js IPC handlers
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Session management - matches main.js handlers
    startSession: (config) => ipcRenderer.invoke('startSession', config),
    pauseSession: () => ipcRenderer.invoke('pauseSession'),
    resumeSession: () => ipcRenderer.invoke('resumeSession'),
    endSession: () => ipcRenderer.invoke('endSession'),
    getSessionState: () => ipcRenderer.invoke('getSessionState'),
    
    // Activity data retrieval - FIXED to match main.js
    getActivityDelta: () => ipcRenderer.invoke('getActivityDelta'),
    getActivityContext: (eyeTrackingEnabled) => ipcRenderer.invoke('getActivityContext', eyeTrackingEnabled),
    
    // Tracker customization (optional - add to main.js if needed)
    addProductiveApp: (appName) => ipcRenderer.invoke('addProductiveApp', appName),
    addDistractionApp: (appName) => ipcRenderer.invoke('addDistractionApp', appName),
    addProductiveDomain: (domain) => ipcRenderer.invoke('addProductiveDomain', domain),
    addDistractionDomain: (domain) => ipcRenderer.invoke('addDistractionDomain', domain)
});
