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

        console.log('[ActivityTracker] Initializing with config:', {
            userId: config.userId,
            sessionId: config.sessionId,
            updateInterval: this.config.updateInterval
        });

        this.hardwareTracker = new HardwareTracker();
        this.windowTracker = new WindowTracker();
        this.dataAggregator = new DataAggregator(this.config.backendUrl);
        this.dataAggregator.setAuthToken(this.config.authToken);

        if (this.config.browserExtensionId) {
            this.setupExtensionBridge(this.config.browserExtensionId);
        }
    }

    setupExtensionBridge(extensionId) {
        this.extensionBridge = new BrowserExtensionBridge(extensionId);
        this.extensionBridge.on('browser-activity', (tabData) => {
            this.lastBrowserActivity = tabData;
            console.log('[ActivityTracker] Received browser activity from extension:', tabData.domain);
        });
        console.log('[ActivityTracker] Browser extension bridge initialized');
    }

    start() {
        if (this.state === 'running') {
            console.warn('[ActivityTracker] Already running');
            return;
        }

        console.log('[ActivityTracker] Starting session:', this.config.sessionId);
        this.state = 'running';
        this.hardwareTracker.start();

        if (this.extensionBridge) {
            this.extensionBridge.startTracking(
                this.config.sessionId,
                this.config.userId,
                this.config.authToken
            );
        }

        if (this.tickTimer) clearInterval(this.tickTimer);

        this.tickTimer = setInterval(() => {
            if (this.state === 'running') {
                this.collectAndQueueActivity();
            }
        }, this.config.updateInterval);

        this.collectAndQueueActivity();
        console.log('[ActivityTracker] Periodic collection started');
    }

    pause() {
        if (this.state !== 'running') {
            console.warn('[ActivityTracker] Not running, cannot pause');
            return;
        }

        console.log('[ActivityTracker] Pausing session');
        this.state = 'paused';
        this.collectAndQueueActivity();
        this.hardwareTracker.stop();
        if (this.extensionBridge) this.extensionBridge.pauseTracking();

        this.dataAggregator.pause();
    }

    resume() {
        if (this.state !== 'paused') {
            console.warn('[ActivityTracker] Not paused, cannot resume');
            return;
        }

        console.log('[ActivityTracker] Resuming session');
        this.state = 'running';
        this.hardwareTracker.start();
        if (this.extensionBridge) this.extensionBridge.resumeTracking();
        
        this.dataAggregator.resume();
        this.collectAndQueueActivity();
    }

    stop() {
        if (this.state === 'stopped') {
            console.warn('[ActivityTracker] Already stopped');
            return;
        }

        console.log('[ActivityTracker] Stopping session');
        this.collectAndQueueActivity();
        this.state = 'stopped';
        this.hardwareTracker.stop();
        if (this.extensionBridge) this.extensionBridge.stopTracking();

        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = null;
        }

        if (this.dataAggregator.flushAndClose) {
            this.dataAggregator.flushAndClose();
        }
        this.dataAggregator.disconnect();
    }

    endSession() {
        if (this.state === 'ended') {
            console.warn('[ActivityTracker] Already ended');
            return;
        }
        console.log('[ActivityTracker] Ending session');
        this.collectAndQueueActivity();
        this.state = 'ended';
        if (this.extensionBridge) this.extensionBridge.endSession();
        this.stop();
    }

    getState() {
        return this.state;
    }

    async getDelta() {
        try {
            const data = this.hardwareTracker.getActivityData();
            return data || { keystrokes: 0, mouseClicks: 0, mouseMoves: 0, scrolls: 0, idleTime: 0 };
        } catch (error) {
            console.error('[ActivityTracker] Error in getDelta:', error);
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
            console.error('[ActivityTracker] Error in getContext:', error);
            return {
                activeApp: { name: 'N/A', title: 'N/A', category: 'neutral' },
                browserActivity: null,
                eyeTracking: { enabled: false, gazeX: null, gazeY: null, blinkRate: null, focusedOnScreen: null }
            };
        }
    }

    async collectAndQueueActivity() {
        try {
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

            this.dataAggregator.addActivity(payload);
            this.hardwareTracker.resetActivityData();
            this.lastBrowserActivity = null;

        } catch (error) {
            console.error('[ActivityTracker] Error collecting/sending activity:', error);
        }
    }

    categorizeDomain(domain) {
        const productiveDomains = ['github.com', 'stackoverflow.com', 'developer.mozilla.org', 'docs.python.org', 'nodejs.org'];
        const distractionDomains = ['youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 'reddit.com', 'tiktok.com'];
        if (productiveDomains.some(d => domain.includes(d))) return 'productive';
        if (distractionDomains.some(d => domain.includes(d))) return 'distraction';
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
