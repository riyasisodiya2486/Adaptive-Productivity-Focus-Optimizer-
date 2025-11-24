const { EventEmitter } = require('events');

class BrowserExtensionBridge extends EventEmitter {
    constructor(extensionId) {
        super();
        this.extensionId = extensionId;
        this.isConnected = false;
        console.log('[BrowserExtensionBridge] Initialized with extension ID:', extensionId);
    }

    startTracking(sessionId, userId, authToken) {
        console.log('[BrowserExtensionBridge] Tracking started');
        this.isConnected = true;
    }

    pauseTracking() {
        console.log('[BrowserExtensionBridge] Tracking paused');
    }

    resumeTracking() {
        console.log('[BrowserExtensionBridge] Tracking resumed');
    }

    stopTracking() {
        console.log('[BrowserExtensionBridge] Tracking stopped');
        this.isConnected = false;
    }

    endSession() {
        console.log('[BrowserExtensionBridge] Session ended');
        this.stopTracking();
    }

    isExtensionConnected() {
        return this.isConnected;
    }
}

module.exports = { BrowserExtensionBridge };
