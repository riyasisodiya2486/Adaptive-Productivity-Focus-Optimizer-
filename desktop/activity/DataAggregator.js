const axios = require('axios');

class DataAggregator {
    constructor(backendUrl) {
        this.backendUrl = backendUrl || 'http://localhost:5000/api/v1';
        this.authToken = "";
        this.buffer = [];
        this.flushing = false;
        this.flushIntervalMs = 60000;  // 60 seconds
        this.flushTimer = null;
        this.isPaused = false;
        this.failureCount = 0;
        this.maxRetries = 3;

        console.log("[DataAggregator] 🔧 Initialized");
        console.log("[DataAggregator] Backend URL:", this.backendUrl);
        console.log("[DataAggregator] Flush interval:", this.flushIntervalMs / 1000, "seconds");
        
        this.startAutoFlush();
    }

    startAutoFlush() {
        if (this.flushTimer) clearInterval(this.flushTimer);
        
        this.flushTimer = setInterval(async () => {
            if (!this.isPaused && this.buffer.length > 0) {
                console.log("[DataAggregator] ⏱️ Auto-flush triggered");
                await this.flush();
            }
        }, this.flushIntervalMs);
        
        console.log("[DataAggregator] ⏰ Auto-flush started (every " + (this.flushIntervalMs / 1000) + "s)");
    }

    setAuthToken(token) {
        if (!token || token.trim() === "") {
            console.warn("[DataAggregator] ⚠️ Auth token is empty!");
            this.authToken = "";
            return;
        }
        this.authToken = token;
        console.log("[DataAggregator] 🔐 Auth token set ✅");
    }

    addActivity(activity) {
        if (!activity) {
            console.warn("[DataAggregator] ⚠️ Received null/undefined activity");
            return;
        }

        this.buffer.push(activity);
        
        console.log(`[DataAggregator] 📥 Activity added to buffer (size: ${this.buffer.length})`);
        console.log("[DataAggregator] 📊 Activity details:", {
            keystrokes: activity.activityData?.keystrokes || 0,
            mouseClicks: activity.activityData?.mouseClicks || 0,
            app: activity.activeApp?.name || 'unknown',
            category: activity.activeApp?.category || 'neutral'
        });

        // Auto-flush at 60 activities instead of waiting 60 seconds
        if (this.buffer.length >= 60) {
            console.log("[DataAggregator] 🔄 Buffer full (60 activities) - auto-flushing NOW");
            this.flush();
        }
    }

    async flush(force = false) {
        if (this.flushing) {
            console.log("[DataAggregator] ⏳ Already flushing, skipping...");
            return;
        }
        
        if (this.buffer.length === 0) {
            console.log("[DataAggregator] 📭 Buffer empty, nothing to flush");
            return;
        }
        
        if (!this.authToken || this.authToken.trim() === "") {
            console.error("[DataAggregator] ❌ Cannot flush: authToken NOT SET");
            console.error("[DataAggregator] ℹ️ Call setAuthToken() first!");
            return;
        }

        this.flushing = true;

        const activitiesToSend = [...this.buffer];
        const sessionId = activitiesToSend[0]?.sessionId;
        const userId = activitiesToSend[0]?.userId;

        try {
            console.log(`\n[DataAggregator] 🚀 Flushing ${activitiesToSend.length} activities`);
            console.log("[DataAggregator] 📍 Endpoint: POST /activities/batch");
            console.log("[DataAggregator] 🆔 Session ID:", sessionId);
            console.log("[DataAggregator] 👤 User ID:", userId);
            console.log("[DataAggregator] 🔐 Auth: Bearer " + (this.authToken ? this.authToken.substring(0, 20) + "..." : "NONE"));

            // ✅ FIX: Correct endpoint URL
            const endpoint = `${this.backendUrl}/activities/batch`;
            console.log("[DataAggregator] 🌐 Full URL:", endpoint);

            const response = await axios.post(
                endpoint,
                {
                    sessionId,
                    userId,
                    activities: activitiesToSend,
                    count: activitiesToSend.length,
                    timestamp: new Date()
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.authToken}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 15000,
                }
            );

            console.log("[DataAggregator] ✅ Successfully flushed activities!");
            console.log("[DataAggregator] 📦 Response status:", response.status);
            console.log("[DataAggregator] 📦 Response message:", response.data?.message || response.data?.msg || "success");
            console.log("[DataAggregator] 💾 Activities stored:", response.data?.stored || activitiesToSend.length);
            
            this.buffer = [];
            this.failureCount = 0;
            console.log("[DataAggregator] 🗑️ Buffer cleared\n");
            
        } catch (error) {
            this.failureCount++;
            console.error(`\n[DataAggregator] ❌ Flush failed (attempt ${this.failureCount}/${this.maxRetries})`);
            console.error("[DataAggregator] Error code:", error.code);
            console.error("[DataAggregator] Error message:", error.message);
            
            if (error.response) {
                console.error("[DataAggregator] HTTP Status:", error.response.status);
                console.error("[DataAggregator] Response:", JSON.stringify(error.response.data, null, 2));
                
                if (error.response.status === 404) {
                    console.error("[DataAggregator] ❌ 404 NOT FOUND!");
                    console.error("[DataAggregator] ℹ️ Endpoint /api/v1/activities/batch does not exist on backend");
                    console.error("[DataAggregator] ℹ️ Check your backend routes");
                }
                
                if (error.response.status === 401) {
                    console.error("[DataAggregator] ❌ 401 UNAUTHORIZED!");
                    console.error("[DataAggregator] ℹ️ Check your auth token");
                }
                
                if (error.response.status === 400) {
                    console.error("[DataAggregator] ❌ 400 BAD REQUEST!");
                    console.error("[DataAggregator] ℹ️ Check data format - activity fields may be invalid");
                }
            } else if (error.code === 'ECONNREFUSED') {
                console.error("[DataAggregator] 🔌 ECONNREFUSED - Cannot connect to backend");
                console.error("[DataAggregator] ℹ️ Is backend running at", this.backendUrl + "?");
                console.error("[DataAggregator] ℹ️ Try: npm run dev (in backend directory)");
            } else if (error.code === 'ENOTFOUND') {
                console.error("[DataAggregator] 🌐 ENOTFOUND - Invalid hostname");
                console.error("[DataAggregator] ℹ️ Check backend URL:", this.backendUrl);
            } else if (error.code === 'ECONNABORTED') {
                console.error("[DataAggregator] ⏱️ TIMEOUT - Request took too long");
                console.error("[DataAggregator] ℹ️ Backend may be slow or not responding");
            } else if (!error.response && !error.request) {
                console.error("[DataAggregator] 📛 Error:", error.message);
            }
            
            // Retry logic
            if (this.failureCount < this.maxRetries) {
                console.log(`[DataAggregator] 🔄 Keeping buffer for retry (${this.failureCount}/${this.maxRetries})`);
            } else {
                console.error("[DataAggregator] ❌ Max retries exceeded - clearing buffer");
                this.buffer = [];
                this.failureCount = 0;
            }
            
            console.log("");
            
        } finally {
            this.flushing = false;
        }
    }

    pause() {
        this.isPaused = true;
        console.log("[DataAggregator] ⏸️ Paused - no activities will be flushed");
    }

    resume() {
        this.isPaused = false;
        console.log("[DataAggregator] ▶️ Resumed - auto-flush active again");
        
        // Flush immediately if buffer has data
        if (this.buffer.length > 0) {
            console.log(`[DataAggregator] 🚀 Flushing ${this.buffer.length} buffered activities`);
            this.flush();
        }
    }

    async flushAndClose() {
        console.log("[DataAggregator] 🔌 Closing - performing final flush");
        
        if (this.buffer.length > 0) {
            console.log(`[DataAggregator] 📤 Final flush of ${this.buffer.length} activities`);
            await this.flush(true);
        } else {
            console.log("[DataAggregator] 📭 No activities to flush");
        }
        
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
            console.log("[DataAggregator] ⏰ Auto-flush timer stopped");
        }
        
        console.log("[DataAggregator] ✅ Closed\n");
    }

    disconnect() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        this.buffer = [];
        console.log("[DataAggregator] 🔌 Disconnected");
    }

    // Additional helper methods
    getBufferStatus() {
        return {
            size: this.buffer.length,
            isPaused: this.isPaused,
            isFlushing: this.flushing,
            failureCount: this.failureCount
        };
    }

    getBufferSize() {
        return this.buffer.length;
    }

    async testConnection() {
        try {
            console.log("[DataAggregator] 🧪 Testing connection to", this.backendUrl);
            
            const response = await axios.get(
                `${this.backendUrl}/health`,
                {
                    headers: {
                        Authorization: `Bearer ${this.authToken || 'test'}`,
                    },
                    timeout: 5000
                }
            );
            
            console.log("[DataAggregator] ✅ Connection test passed");
            return true;
        } catch (error) {
            console.error("[DataAggregator] ❌ Connection test failed:", error.message);
            
            if (error.code === 'ECONNREFUSED') {
                console.error("[DataAggregator] ℹ️ Backend not running at", this.backendUrl);
            }
            
            return false;
        }
    }
}

module.exports = { DataAggregator };