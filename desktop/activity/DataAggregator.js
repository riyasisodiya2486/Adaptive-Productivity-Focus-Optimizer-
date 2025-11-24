const axios = require('axios');

class DataAggregator {
    constructor(backendUrl) {
        this.backendUrl = backendUrl;
        this.authToken = "";
        this.buffer = [];
        this.flushing = false;
        this.flushIntervalMs = 60000;
        this.flushTimer = null;
        this.isPaused = false; // Add pause state

        console.log("[DataAggregator] Initialized with backend URL:", backendUrl);
        this.startAutoFlush();
    }

    startAutoFlush() {
        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = setInterval(() => {
            // Only flush if not paused
            if (!this.isPaused) {
                this.flush();
            }
        }, this.flushIntervalMs);
    }

    setAuthToken(token) {
        this.authToken = token;
        console.log("[DataAggregator] Auth token set");
    }

    addActivity(activity) {
        this.buffer.push(activity);
        if (this.buffer.length % 10 === 0) {
            console.log(`[DataAggregator] Buffer size: ${this.buffer.length}`);
        }
    }

    async flush(force = false) {
        if (this.flushing) return;
        if (this.buffer.length === 0) return;
        if (!this.authToken) {
            console.warn("[DataAggregator] Cannot flush: authToken not set.");
            return;
        }

        this.flushing = true;

        const activitiesToSend = [...this.buffer];
        const sessionId = activitiesToSend[0]?.sessionId;

        try {
            console.log(`[DataAggregator] Flushing ${activitiesToSend.length} activities...`);

            await axios.post(
                `${this.backendUrl}/activities/batch`,
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

            console.log("[DataAggregator] Batch sent successfully ✔️");
            this.buffer = [];
        } catch (error) {
            console.error("[DataAggregator] Batch send failed (WILL RETRY):", error?.message || error);
        } finally {
            this.flushing = false;
        }
    }

    // NEW: Pause method
    pause() {
        console.log("[DataAggregator] Pausing auto-flush");
        this.isPaused = true;
    }

    // NEW: Resume method
    resume() {
        console.log("[DataAggregator] Resuming auto-flush");
        this.isPaused = false;
    }

    async flushAndClose() {
        await this.flush(true);
        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = null;
        console.log("[DataAggregator] Flushed & closed.");
    }

    disconnect() {
        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = null;
        console.log("[DataAggregator] Disconnected");
    }
}

module.exports = { DataAggregator };
