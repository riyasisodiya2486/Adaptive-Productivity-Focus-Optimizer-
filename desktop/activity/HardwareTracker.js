const { uIOhook } = require('uiohook-napi');

class HardwareTracker {
    constructor() {
        this.activityData = {
            keystrokes: 0,
            mouseClicks: 0,
            mouseMoves: 0,
            scrolls: 0,
            idleTime: 0
        };
        
        this.isTracking = false;
        this.lastMouseMoveTime = 0;
        this.lastActivityTime = Date.now();
        
        console.log('[HardwareTracker] Initializing...');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard events
        uIOhook.on('keydown', (e) => {
            if (this.isTracking) {
                this.activityData.keystrokes++;
                this.lastActivityTime = Date.now();
            }
        });

        // Mouse click events
        uIOhook.on('click', (e) => {
            if (this.isTracking) {
                this.activityData.mouseClicks++;
                this.lastActivityTime = Date.now();
            }
        });

        // Mouse move events (throttled)
        uIOhook.on('mousemove', (e) => {
            if (this.isTracking) {
                const now = Date.now();
                if (now - this.lastMouseMoveTime > 100) {
                    this.activityData.mouseMoves++;
                    this.lastMouseMoveTime = now;
                    this.lastActivityTime = now;
                }
            }
        });

        // Scroll/wheel events
        uIOhook.on('wheel', (e) => {
            if (this.isTracking) {
                this.activityData.scrolls++;
                this.lastActivityTime = Date.now();
            }
        });
    }

    start() {
        if (!this.isTracking) {
            console.log('[HardwareTracker] Starting...');
            this.isTracking = true;
            this.lastActivityTime = Date.now();
            try {
                uIOhook.start();
            } catch (error) {
                console.error('[HardwareTracker] Failed to start uiohook:', error);
            }
        }
    }

    stop() {
        if (this.isTracking) {
            console.log('[HardwareTracker] Stopping...');
            this.isTracking = false;
            try {
                uIOhook.stop();
            } catch (error) {
                console.error('[HardwareTracker] Failed to stop uiohook:', error);
            }
        }
    }

    getActivityData() {
        const now = Date.now();
        this.activityData.idleTime = Math.floor((now - this.lastActivityTime) / 1000);
        
        return { ...this.activityData };
    }

    resetActivityData() {
        this.activityData = {
            keystrokes: 0,
            mouseClicks: 0,
            mouseMoves: 0,
            scrolls: 0,
            idleTime: 0
        };
        this.lastActivityTime = Date.now();
    }
}

module.exports = { HardwareTracker };
