const { uIOhook } = require('uiohook-napi');

let isUiohookStarted = false;
let hookStartAttempted = false;

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
        
        console.log('[HardwareTracker] 🔧 Initializing...');
        console.log('[HardwareTracker] Status:', { isUiohookStarted, hookStartAttempted });
        
        if (!hookStartAttempted) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        console.log('[HardwareTracker] 📡 Setting up event listeners...');
        
        // Keyboard events
        uIOhook.on('keydown', (e) => {
            if (this.isTracking) {
                this.activityData.keystrokes++;
                this.lastActivityTime = Date.now();
                if (this.activityData.keystrokes % 10 === 0) {
                    console.log('[HardwareTracker] ⌨️  Keystrokes:', this.activityData.keystrokes);
                }
            }
        });

        // Mouse click events
        uIOhook.on('click', (e) => {
            if (this.isTracking) {
                this.activityData.mouseClicks++;
                this.lastActivityTime = Date.now();
                if (this.activityData.mouseClicks % 5 === 0) {
                    console.log('[HardwareTracker] 🖱️  Clicks:', this.activityData.mouseClicks);
                }
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
        
        // Success handler
        uIOhook.on('start', () => {
            console.log('✅ [uIOhook] Native hook started successfully!');
            isUiohookStarted = true;
            hookStartAttempted = true;
        });

        // Error handler
        uIOhook.on('error', (err) => {
            console.error('❌ [uIOhook] CRITICAL ERROR:');
            console.error('   Message:', err.message);
            console.error('   Code:', err.code);
            console.error('   Stack:', err.stack);
            hookStartAttempted = true;
        });
        
        console.log('[HardwareTracker] ✅ Event listeners registered');
    }

    start() {
        console.log('[HardwareTracker] 🚀 start() called');
        console.log('[HardwareTracker] Status:', {
            isTracking: this.isTracking,
            isUiohookStarted,
            hookStartAttempted
        });
        
        if (!this.isTracking) {
            console.log('[HardwareTracker] ▶️  Starting tracking...');
            this.isTracking = true;
            this.lastActivityTime = Date.now();
            
            if (!hookStartAttempted) {
                try {
                    console.log('[HardwareTracker] 🎯 Calling uIOhook.start()...');
                    uIOhook.start();
                    hookStartAttempted = true;
                    console.log('[HardwareTracker] ⏳ Waiting for hook to initialize...');
                } catch (error) {
                    console.error('❌ [HardwareTracker] Exception starting uIOhook:');
                    console.error('   Message:', error.message);
                    console.error('   Stack:', error.stack);
                    hookStartAttempted = true;
                }
            } else {
                console.log('[HardwareTracker] ℹ️  Hook already attempted/started');
            }
        } else {
            console.log('[HardwareTracker] ⚠️  Already tracking');
        }
    }

    stop() {
        if (this.isTracking) {
            console.log('[HardwareTracker] ⏹️  Stopping tracking');
            this.isTracking = false;
        }
    }

    getActivityData() {
        const now = Date.now();
        this.activityData.idleTime = Math.floor((now - this.lastActivityTime) / 1000);
        
        const data = { ...this.activityData };
        
        console.log('[HardwareTracker] 📊 getActivityData:', {
            isUiohookStarted,
            hookStartAttempted,
            isTracking: this.isTracking,
            data
        });
        
        if (!isUiohookStarted && hookStartAttempted) {
            console.warn('⚠️ [HardwareTracker] Hook was attempted but failed to start!');
        }
        
        if (!hookStartAttempted) {
            console.warn('⚠️ [HardwareTracker] Hook has never been started!');
        }
        
        return data;
    }

    resetActivityData() {
        console.log('[HardwareTracker] 🔄 Resetting activity data');
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
