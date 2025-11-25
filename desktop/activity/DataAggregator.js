const axios = require('axios');

class DataAggregator {
    constructor(backendUrl) {
        this.backendUrl = backendUrl;
        this.authToken = "";
        this.buffer = [];
        this.flushing = false;
        this.flushIntervalMs = 60000;
        this.flushTimer = null;
        this.isPaused = false;

        console.log("[DataAggregator] 🔧 Initialized with backend URL:", backendUrl);
        this.startAutoFlush();
    }

    startAutoFlush() {
        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = setInterval(() => {
            if (!this.isPaused) {
                this.flush();
            }
        }, this.flushIntervalMs);
        console.log("[DataAggregator] ⏰ Auto-flush started (every 60s)");
    }

    setAuthToken(token) {
        this.authToken = token;
        console.log("[DataAggregator] 🔑 Auth token set:", token ? '✅ Valid' : '❌ Empty');
    }

    addActivity(activity) {
        this.buffer.push(activity);
        console.log(`[DataAggregator] 📝 Activity added. Buffer size: ${this.buffer.length}`);
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
        
        if (!this.authToken) {
            console.warn("[DataAggregator] ⚠️ Cannot flush: authToken not set");
            return;
        }

        this.flushing = true;

        const activitiesToSend = [...this.buffer];
        const sessionId = activitiesToSend[0]?.sessionId;

        try {
            console.log(`[DataAggregator] 🚀 Flushing ${activitiesToSend.length} activities...`);
            console.log(`[DataAggregator] 📍 POST ${this.backendUrl}/activity/batch`);
            console.log(`[DataAggregator] 🆔 Session ID: ${sessionId}`);

            const response = await axios.post(
                `${this.backendUrl}/activity/batch`,
                {
                    sessionId,
                    activities: activitiesToSend,
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.authToken}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 15000,
                }
            );

            console.log("[DataAggregator] ✅ Batch sent successfully!");
            console.log("[DataAggregator] 📊 Response:", response.data);
            this.buffer = [];
            
        } catch (error) {
            console.error("[DataAggregator] ❌ Batch send failed:");
            
            if (error.response) {
                console.error("   📛 Status:", error.response.status);
                console.error("   📛 Message:", error.response.data?.msg || error.response.data?.error);
                console.error("   📛 Data:", JSON.stringify(error.response.data, null, 2));
                
                if (error.response.status === 404) {
                    console.error("   ⚠️ ENDPOINT NOT FOUND! Check backend routes.");
                }
                if (error.response.status === 401) {
                    console.error("   ⚠️ UNAUTHORIZED! Check auth token.");
                }
            } else if (error.request) {
                console.error("   📛 No response from server");
                console.error("   📛 Check if backend is running at:", this.backendUrl);
            } else {
                console.error("   📛 Error:", error.message);
            }
            
            console.warn("[DataAggregator] 🔄 Keeping buffer for retry");
        } finally {
            this.flushing = false;
        }
    }

    pause() {
        console.log("[DataAggregator] ⏸️ Pausing auto-flush");
        this.isPaused = true;
    }

    resume() {
        console.log("[DataAggregator] ▶️ Resuming auto-flush");
        this.isPaused = false;
    }

    async flushAndClose() {
        console.log("[DataAggregator] 🔚 Final flush...");
        await this.flush(true);
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        console.log("[DataAggregator] ✅ Closed");
    }

    disconnect() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        console.log("[DataAggregator] 🔌 Disconnected");
    }
}

module.exports = { DataAggregator };
