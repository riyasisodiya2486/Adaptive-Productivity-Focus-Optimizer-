const { HardwareTracker } = require('./HardwareTracker');
const { WindowTracker } = require('./WindowTracker');
const { DataAggregator } = require('./DataAggregator');
const { BrowserExtensionBridge } = require('./BrowserExtensionBridge');

class ActivityTracker {
    constructor(config) {
        this.config = {
            updateInterval: 60000,
            useWebSocket: false,
            ...config
        };

        this.hardwareTracker = null;
        this.windowTracker = null;
        this.dataAggregator = null;
        this.extensionBridge = null;
        this.tickTimer = null;
        this.state = 'stopped';
        this.lastBrowserActivity = null;

        console.log('[ActivityTracker] 🔧 Initializing:', {
            userId: config.userId,
            sessionId: config.sessionId,
            updateInterval: this.config.updateInterval,
            backendUrl: config.backendUrl
        });

        this.hardwareTracker = new HardwareTracker();
        this.windowTracker = new WindowTracker();
        this.dataAggregator = new DataAggregator(this.config.backendUrl);
        this.dataAggregator.setAuthToken(this.config.authToken);

        if (this.config.browserExtensionId) {
            this.setupExtensionBridge(this.config.browserExtensionId);
        }
        
        console.log('[ActivityTracker] ✅ Initialized');
    }

    setupExtensionBridge(extensionId) {
        try {
            this.extensionBridge = new BrowserExtensionBridge(extensionId);
            this.extensionBridge.on('browser-activity', (tabData) => {
                this.lastBrowserActivity = tabData;
                console.log('[ActivityTracker] 🌐 Browser activity:', tabData.domain);
            });
            console.log('[ActivityTracker] 🔌 Extension bridge initialized');
        } catch (error) {
            console.error('[ActivityTracker] ❌ Extension bridge failed:', error);
        }
    }

    start() {
        if (this.state === 'running') {
            console.warn('[ActivityTracker] ⚠️ Already running');
            return;
        }

        console.log('[ActivityTracker] 🚀 Starting session:', this.config.sessionId);
        this.state = 'running';
        this.hardwareTracker.start();

        if (this.extensionBridge) {
            try {
                this.extensionBridge.startTracking(
                    this.config.sessionId,
                    this.config.userId,
                    this.config.authToken
                );
            } catch (error) {
                console.error('[ActivityTracker] ❌ Extension start failed:', error);
            }
        }

        if (this.tickTimer) clearInterval(this.tickTimer);

        this.tickTimer = setInterval(() => {
            if (this.state === 'running') {
                this.collectAndQueueActivity();
            }
        }, this.config.updateInterval);

        this.collectAndQueueActivity();
        console.log('[ActivityTracker] ⏰ Periodic collection started');
    }

    pause() {
        if (this.state !== 'running') {
            console.warn('[ActivityTracker] ⚠️ Not running');
            return;
        }

        console.log('[ActivityTracker] ⏸️ Pausing...');
        this.collectAndQueueActivity();
        this.state = 'paused';
        this.hardwareTracker.stop();
        
        if (this.extensionBridge) {
            try {
                this.extensionBridge.pauseTracking();
            } catch (error) {
                console.error('[ActivityTracker] ❌ Extension pause failed:', error);
            }
        }

        this.dataAggregator.pause();
        console.log('[ActivityTracker] ✅ Paused');
    }

    resume() {
        if (this.state !== 'paused') {
            console.warn('[ActivityTracker] ⚠️ Not paused');
            return;
        }

        console.log('[ActivityTracker] ▶️ Resuming...');
        this.state = 'running';
        this.hardwareTracker.start();
        
        if (this.extensionBridge) {
            try {
                this.extensionBridge.resumeTracking();
            } catch (error) {
                console.error('[ActivityTracker] ❌ Extension resume failed:', error);
            }
        }
        
        this.dataAggregator.resume();
        this.collectAndQueueActivity();
        console.log('[ActivityTracker] ✅ Resumed');
    }

    stop() {
        if (this.state === 'stopped') {
            console.warn('[ActivityTracker] ⚠️ Already stopped');
            return;
        }

        console.log('[ActivityTracker] ⏹️ Stopping...');
        this.collectAndQueueActivity();
        this.state = 'stopped';
        this.hardwareTracker.stop();
        
        if (this.extensionBridge) {
            try {
                this.extensionBridge.stopTracking();
            } catch (error) {
                console.error('[ActivityTracker] ❌ Extension stop failed:', error);
            }
        }

        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = null;
        }

        if (this.dataAggregator.flushAndClose) {
            this.dataAggregator.flushAndClose();
        }
        this.dataAggregator.disconnect();
        console.log('[ActivityTracker] ✅ Stopped');
    }

    endSession() {
        if (this.state === 'ended') {
            console.warn('[ActivityTracker] ⚠️ Already ended');
            return;
        }
        
        console.log('[ActivityTracker] 🏁 Ending...');
        this.collectAndQueueActivity();
        this.state = 'ended';
        
        if (this.extensionBridge) {
            try {
                this.extensionBridge.endSession();
            } catch (error) {
                console.error('[ActivityTracker] ❌ Extension end failed:', error);
            }
        }
        
        this.stop();
        console.log('[ActivityTracker] ✅ Ended');
    }

    getState() {
        return this.state;
    }

    async getDelta() {
        try {
            const data = this.hardwareTracker.getActivityData();
            return data || { keystrokes: 0, mouseClicks: 0, mouseMoves: 0, scrolls: 0, idleTime: 0 };
        } catch (error) {
            console.error('[ActivityTracker] ❌ getDelta error:', error);
            return { keystrokes: 0, mouseClicks: 0, mouseMoves: 0, scrolls: 0, idleTime: 0 };
        }
    }

    async getContext(isEyeTrackingEnabled) {
        try {
            const activeApp = await this.windowTracker.getActiveApp();
            let browserActivity = null;

            if (this.lastBrowserActivity) {
                browserActivity = {
                    url: this.lastBrowserActivity.url,
                    title: this.lastBrowserActivity.title,
                    domain: this.lastBrowserActivity.domain,
                    category: this.categorizeDomain(this.lastBrowserActivity.domain)
                };
            } else {
                browserActivity = await this.windowTracker.getBrowserActivity();
            }

            return {
                activeApp,
                browserActivity,
                eyeTracking: {
                    enabled: !!isEyeTrackingEnabled,
                    gazeX: null,
                    gazeY: null,
                    blinkRate: null,
                    focusedOnScreen: null,
                }
            };
        } catch (error) {
            console.error('[ActivityTracker] ❌ getContext error:', error);
            return {
                activeApp: { name: 'N/A', title: 'N/A', category: 'neutral' },
                browserActivity: null,
                eyeTracking: { enabled: false, gazeX: null, gazeY: null, blinkRate: null, focusedOnScreen: null }
            };
        }
    }

    async collectAndQueueActivity() {
        try {
            console.log('[ActivityTracker] 📊 Collecting...');
            
            const hardwareData = this.hardwareTracker.getActivityData();
            const activeApp = await this.windowTracker.getActiveApp();

            let browserActivity;
            if (this.lastBrowserActivity) {
                browserActivity = {
                    url: this.lastBrowserActivity.url,
                    title: this.lastBrowserActivity.title,
                    domain: this.lastBrowserActivity.domain,
                    category: this.categorizeDomain(this.lastBrowserActivity.domain)
                };
            } else {
                browserActivity = await this.windowTracker.getBrowserActivity();
            }

            const distractions = [];
            if (activeApp.category === 'distraction')
                distractions.push(`distraction_app:${activeApp.name}`);
            if (browserActivity && browserActivity.category === 'distraction')
                distractions.push(`distraction_website:${browserActivity.domain}`);
            if (hardwareData.idleTime > 60)
                distractions.push('idle_time_exceeded');

            const payload = {
                userId: this.config.userId,
                sessionId: this.config.sessionId,
                timestamp: new Date(),
                activityData: hardwareData,
                activeApp: activeApp,
                browserActivity: browserActivity,
                eyeTracking: { enabled: false },
                distractionDetected: distractions
            };

            console.log('[ActivityTracker] ✅ Queuing:', {
                keystrokes: payload.activityData.keystrokes,
                clicks: payload.activityData.mouseClicks,
                distractions: distractions.length
            });

            this.dataAggregator.addActivity(payload);
            this.hardwareTracker.resetActivityData();
            this.lastBrowserActivity = null;

        } catch (error) {
            console.error('[ActivityTracker] ❌ Collection error:', error);
        }
    }

    categorizeDomain(domain) {
        if (!domain) return 'neutral';
        
        const productiveDomains = [
            'github.com', 'stackoverflow.com', 'developer.mozilla.org', 
            'docs.python.org', 'nodejs.org'
        ];
        
        const distractionDomains = [
            'youtube.com', 'facebook.com', 'twitter.com', 'x.com',
            'instagram.com', 'reddit.com', 'tiktok.com'
        ];
        
        const lower = domain.toLowerCase();
        
        if (productiveDomains.some(d => lower.includes(d))) return 'productive';
        if (distractionDomains.some(d => lower.includes(d))) return 'distraction';
        
        return 'neutral';
    }

    addProductiveApp(appName) {
        this.windowTracker.addProductiveApp(appName);
    }

    addDistractionApp(appName) {
        this.windowTracker.addDistractionApp(appName);
    }

    addProductiveDomain(domain) {
        this.windowTracker.addProductiveDomain(domain);
    }

    addDistractionDomain(domain) {
        this.windowTracker.addDistractionDomain(domain);
    }
}

module.exports = { ActivityTracker };
