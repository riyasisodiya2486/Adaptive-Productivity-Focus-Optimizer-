const activeWin = require('active-win');

class WindowTracker {
    constructor() {
        this.productiveApps = new Set([
            'vscode', 'visual studio code', 'intellij', 'pycharm', 
            'sublime', 'atom', 'webstorm', 'eclipse', 'slack', 'teams',
            'notion', 'obsidian', 'terminal', 'iterm', 'cmd', 'powershell'
        ]);
        
        this.distractionApps = new Set([
            'netflix', 'youtube', 'facebook', 'twitter', 'instagram',
            'reddit', 'tiktok', 'discord', 'twitch', 'steam', 'spotify'
        ]);
        
        this.productiveDomains = new Set([
            'github.com', 'stackoverflow.com', 'developer.mozilla.org',
            'docs.python.org', 'nodejs.org', 'npmjs.com', 'medium.com',
            'dev.to', 'aws.amazon.com', 'cloud.google.com', 'localhost'
        ]);
        
        this.distractionDomains = new Set([
            'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
            'reddit.com', 'tiktok.com', 'twitch.tv', 'netflix.com',
            'hulu.com', 'disneyplus.com'
        ]);
    }

    async getActiveApp() {
        try {
            const window = await activeWin();
            
            if (!window) {
                return { 
                    name: 'Unknown', 
                    title: 'No active window', 
                    category: 'neutral' 
                };
            }
            
            const appName = window.owner.name.toLowerCase();
            const title = window.title || 'Untitled';
            
            let category = 'neutral';
            
            for (const app of this.productiveApps) {
                if (appName.includes(app)) {
                    category = 'productive';
                    break;
                }
            }
            
            if (category === 'neutral') {
                for (const app of this.distractionApps) {
                    if (appName.includes(app)) {
                        category = 'distraction';
                        break;
                    }
                }
            }
            
            return {
                name: window.owner.name,
                title: title,
                category: category
            };
        } catch (error) {
            console.error('[WindowTracker] Error getting active window:', error);
            return { 
                name: 'Error', 
                title: 'Failed to get window', 
                category: 'neutral' 
            };
        }
    }

    async getBrowserActivity() {
        try {
            const window = await activeWin();
            
            if (!window) return undefined;
            
            const appName = window.owner.name.toLowerCase();
            const isBrowser = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera'].some(
                browser => appName.includes(browser)
            );
            
            if (!isBrowser) return undefined;
            
            const title = window.title || 'Untitled';
            let url = 'unknown';
            let domain = 'unknown';
            let category = 'neutral';
            
            if (title) {
                try {
                    const urlMatch = title.match(/https?:\/\/[^\s]+/);
                    if (urlMatch) {
                        url = urlMatch[0];
                        const urlObj = new URL(url);
                        domain = urlObj.hostname;
                    } else {
                        const domainMatch = title.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
                        if (domainMatch) {
                            domain = domainMatch[0];
                        }
                    }
                    
                    if (this.productiveDomains.has(domain)) {
                        category = 'productive';
                    } else if (this.distractionDomains.has(domain)) {
                        category = 'distraction';
                    }
                } catch (e) {
                    console.log('[WindowTracker] Could not parse URL from title');
                }
            }
            
            return {
                url: url,
                title: title,
                domain: domain,
                category: category
            };
        } catch (error) {
            console.error('[WindowTracker] Error getting browser activity:', error);
            return undefined;
        }
    }

    addProductiveApp(appName) {
        this.productiveApps.add(appName.toLowerCase());
    }

    addDistractionApp(appName) {
        this.distractionApps.add(appName.toLowerCase());
    }

    addProductiveDomain(domain) {
        this.productiveDomains.add(domain.toLowerCase());
    }

    addDistractionDomain(domain) {
        this.distractionDomains.add(domain.toLowerCase());
    }
}

module.exports = { WindowTracker };
