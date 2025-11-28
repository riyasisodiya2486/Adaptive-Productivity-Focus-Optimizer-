const activeWin = require('active-win');
const os = require('os');

class WindowTracker {
    constructor() {
        this.productiveApps = new Set([
            'vscode', 'visual studio code', 'intellij', 'pycharm', 
            'sublime', 'atom', 'webstorm', 'eclipse', 'slack', 'teams',
            'notion', 'obsidian', 'terminal', 'iterm', 'cmd', 'powershell',
            'code', 'devtools', 'rider', 'phpstorm', 'clion'
        ]);
        
        this.distractionApps = new Set([
            'netflix', 'youtube', 'facebook', 'twitter', 'instagram',
            'reddit', 'tiktok', 'discord', 'twitch', 'steam', 'spotify',
            'chrome', 'firefox', 'safari', 'edge', 'brave'  // Browsers themselves are neutral, content determines distraction
        ]);
        
        this.productiveDomains = new Set([
            'github.com', 'stackoverflow.com', 'developer.mozilla.org',
            'docs.python.org', 'nodejs.org', 'npmjs.com', 'medium.com',
            'dev.to', 'aws.amazon.com', 'cloud.google.com', 'localhost',
            'react.dev', 'vue.dev', 'angular.io', 'nextjs.org', 'svelte.dev'
        ]);
        
        this.distractionDomains = new Set([
            'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
            'reddit.com', 'tiktok.com', 'twitch.tv', 'netflix.com',
            'hulu.com', 'disneyplus.com', 'linkedin.com/feed', 'pinterest.com'
        ]);

        this.lastActiveApp = null;
        this.failureCount = 0;
        this.maxFailures = 5;

        console.log('[WindowTracker] 🔧 Initialized');
        console.log('[WindowTracker] Platform:', os.platform());
    }

    async getActiveApp() {
        try {
            const window = await activeWin();
            
            if (!window) {
                this.failureCount++;
                console.warn(`[WindowTracker] ⚠️ No active window (failure ${this.failureCount}/${this.maxFailures})`);
                
                // Return cached app if available
                if (this.lastActiveApp) {
                    console.log('[WindowTracker] 📦 Using cached app:', this.lastActiveApp.name);
                    return this.lastActiveApp;
                }
                
                return { 
                    name: 'Unknown', 
                    title: 'No active window', 
                    category: 'neutral' 
                };
            }

            // Reset failure counter on success
            this.failureCount = 0;

            const appName = window.owner?.name?.toLowerCase() || 'unknown';
            const title = window.title || 'Untitled';
            
            let category = 'neutral';
            
            // Check productive apps
            for (const app of this.productiveApps) {
                if (appName.includes(app)) {
                    category = 'productive';
                    break;
                }
            }
            
            // Check distraction apps (only if not productive)
            if (category === 'neutral') {
                for (const app of this.distractionApps) {
                    if (appName.includes(app)) {
                        category = 'distraction';
                        break;
                    }
                }
            }
            
            const result = {
                name: window.owner?.name || 'Unknown',
                title: title,
                category: category,
                pid: window.owner?.processId
            };

            this.lastActiveApp = result;
            
            console.log('[WindowTracker] 🎯 Active app:', {
                name: result.name,
                category: result.category,
                title: result.title.substring(0, 50)
            });

            return result;

        } catch (error) {
            this.failureCount++;
            console.error(`[WindowTracker] ❌ Error getting active window (${this.failureCount}/${this.maxFailures}):`, error.message);
            
            // Log more details for debugging
            if (os.platform() === 'win32') {
                console.error('[WindowTracker] ℹ️ Windows detected - ensure app has admin privileges');
            }
            if (os.platform() === 'linux') {
                console.error('[WindowTracker] ℹ️ Linux detected - active-win may not work reliably');
            }

            // Return cached app if available
            if (this.lastActiveApp) {
                console.log('[WindowTracker] 📦 Using cached app due to error:', this.lastActiveApp.name);
                return this.lastActiveApp;
            }

            return { 
                name: 'Error', 
                title: 'Failed to get window: ' + error.message, 
                category: 'neutral' 
            };
        }
    }

    async getBrowserActivity() {
        try {
            const window = await activeWin();
            
            if (!window) {
                console.log('[WindowTracker] ℹ️ No active window for browser activity');
                return undefined;
            }
            
            const appName = window.owner?.name?.toLowerCase() || '';
            const isBrowser = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'chromium'].some(
                browser => appName.includes(browser)
            );
            
            if (!isBrowser) {
                console.log('[WindowTracker] ℹ️ Active app is not a browser:', appName);
                return undefined;
            }

            const title = window.title || 'Untitled';
            let url = 'unknown';
            let domain = 'unknown';
            let category = 'neutral';
            
            console.log('[WindowTracker] 🌐 Browser window detected, parsing title:', title.substring(0, 80));

            if (title) {
                try {
                    // Strategy 1: Extract URL from title
                    const urlMatch = title.match(/https?:\/\/[^\s]+/);
                    if (urlMatch) {
                        url = urlMatch[0];
                        console.log('[WindowTracker] ✅ Found URL in title:', url);
                        try {
                            const urlObj = new URL(url);
                            domain = urlObj.hostname;
                        } catch (e) {
                            console.log('[WindowTracker] ⚠️ URL parsing failed:', e.message);
                        }
                    } else {
                        // Strategy 2: Extract domain from title (e.g., "GitHub - User")
                        // Most browsers show domain/site name before dash in title
                        const titleParts = title.split('-');
                        if (titleParts.length > 0) {
                            const siteName = titleParts[0].trim().toLowerCase();
                            console.log('[WindowTracker] 🔍 Extracted site name from title:', siteName);
                            
                            // Map common site names to domains
                            const siteNameMap = {
                                'github': 'github.com',
                                'stack overflow': 'stackoverflow.com',
                                'stackoverflow': 'stackoverflow.com',
                                'youtube': 'youtube.com',
                                'facebook': 'facebook.com',
                                'twitter': 'twitter.com',
                                'reddit': 'reddit.com',
                                'linkedin': 'linkedin.com',
                                'netflix': 'netflix.com',
                                'twitch': 'twitch.tv',
                                'gmail': 'gmail.com',
                                'google': 'google.com',
                                'notion': 'notion.so',
                                'slack': 'slack.com',
                                'teams': 'teams.microsoft.com',
                                'discord': 'discord.com'
                            };
                            
                            for (const [name, dom] of Object.entries(siteNameMap)) {
                                if (siteName.includes(name)) {
                                    domain = dom;
                                    console.log('[WindowTracker] ✅ Matched site name to domain:', domain);
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Categorize based on domain
                    if (this.productiveDomains.has(domain)) {
                        category = 'productive';
                        console.log('[WindowTracker] ✅ Domain categorized as productive:', domain);
                    } else if (this.distractionDomains.has(domain)) {
                        category = 'distraction';
                        console.log('[WindowTracker] ⚠️ Domain categorized as distraction:', domain);
                    } else {
                        console.log('[WindowTracker] ℹ️ Domain categorized as neutral:', domain);
                    }
                    
                } catch (e) {
                    console.error('[WindowTracker] ❌ Could not parse browser activity:', e.message);
                }
            }
            
            const result = {
                url: url,
                title: title.substring(0, 200),  // Truncate long titles
                domain: domain,
                category: category
            };

            console.log('[WindowTracker] 📊 Browser activity result:', result);
            return result;

        } catch (error) {
            console.error('[WindowTracker] ❌ Error getting browser activity:', error.message);
            return undefined;
        }
    }

    addProductiveApp(appName) {
        if (appName && appName.trim()) {
            this.productiveApps.add(appName.toLowerCase());
            console.log('[WindowTracker] ✅ Added productive app:', appName);
        }
    }

    addDistractionApp(appName) {
        if (appName && appName.trim()) {
            this.distractionApps.add(appName.toLowerCase());
            console.log('[WindowTracker] ✅ Added distraction app:', appName);
        }
    }

    addProductiveDomain(domain) {
        if (domain && domain.trim()) {
            this.productiveDomains.add(domain.toLowerCase());
            console.log('[WindowTracker] ✅ Added productive domain:', domain);
        }
    }

    addDistractionDomain(domain) {
        if (domain && domain.trim()) {
            this.distractionDomains.add(domain.toLowerCase());
            console.log('[WindowTracker] ✅ Added distraction domain:', domain);
        }
    }

    // Fallback method for when active-win fails
    async getFallbackApp() {
        console.log('[WindowTracker] 🔄 Using fallback (no active window detection)');
        return this.lastActiveApp || {
            name: 'System',
            title: 'Not available',
            category: 'neutral'
        };
    }
}

module.exports = { WindowTracker };
