export interface IElectronAPI {
    startSession: (config: {
        userId: string;
        sessionId: string;
        backendUrl: string;
        authToken: string;
        updateInterval?: number;
        browserExtensionId?: string;
    }) => Promise<{ success: boolean; sessionId?: string; state?: string; error?: string }>;
    pauseSession: () => Promise<{ success: boolean; state?: string; error?: string }>;
    resumeSession: () => Promise<{ success: boolean; state?: string; error?: string }>;
    endSession: () => Promise<{ success: boolean; state?: string; error?: string }>;
    getSessionState: () => Promise<{ state: string }>;
    
    // Activity data retrieval (REQUIRED for focusMode.tsx)
    getActivityDelta: () => Promise<{
        keystrokes: number;
        mouseClicks: number;
        mouseMoves: number;
        scrolls: number;
        idleTime: number;
    }>;
    getActivityContext: (eyeTrackingEnabled: boolean) => Promise<{
        activeApp: {
            name: string;
            title: string;
            category: 'productive' | 'distraction' | 'neutral';
        };
        browserActivity?: {
            url: string;
            title: string;
            domain: string;
            category: 'productive' | 'distraction' | 'neutral';
        };
        eyeTracking?: {
            enabled: boolean;
            gazeX: number;
            gazeY: number;
            blinkRate: number;
            focusedOnScreen: boolean;
        };
    }>;
    
    // Category customization
    addProductiveApp: (appName: string) => Promise<{ success: boolean }>;
    addDistractionApp: (appName: string) => Promise<{ success: boolean }>;
    addProductiveDomain: (domain: string) => Promise<{ success: boolean }>;
    addDistractionDomain: (domain: string) => Promise<{ success: boolean }>;
}

declare global {
    interface Window {
        electron?: IElectronAPI;
    }
}

export {};