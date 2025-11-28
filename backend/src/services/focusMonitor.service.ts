import { Session } from "../models/session.model";
import { FocusCalculator } from "./focusCalculator.service";
import { generateAdaptiveRecommendation } from "./recommendation.service";

export class FocusMonitor {
    private static intervals: Map<string, NodeJS.Timeout> = new Map();
    private static focusThreshold = 40;

    // Start monitoring a specific session
    static startMonitoring(sessionId: string, intervalMinutes: number = 5): void {
        this.stopMonitoring(sessionId); // Prevent duplicate intervals

        const intervalMs = intervalMinutes * 60 * 1000;

        const intervalId = setInterval(async () => {
            try {
                const session = await Session.findById(sessionId);
                if (!session || !session.status) {
                    console.log(`[Focus Monitor] Session ${sessionId} not found. Stopping monitoring.`);
                    this.stopMonitoring(sessionId);
                    return;
                }

                if (session.status !== "active") {
                    console.log(`[Focus Monitor] Session ${sessionId} is ${session.status}. Stopping monitoring.`);
                    this.stopMonitoring(sessionId);
                    return;
                }

                // Calculate focus score for the last interval
                const result = await FocusCalculator.calculateFocusScore(
                    sessionId, 
                    session.userId?.toString() || "", 
                    intervalMinutes
                );
                console.log(`[Focus Monitor] Session ${sessionId} - Focus: ${result.focusScore}% [${result.activityLevel}]`);

                // Add to focus timeline
                session.focusTimeline.push({
                    timestamp: new Date(),
                    focusScore: result.focusScore,
                    activityLevel: result.activityLevel,
                    distractionDetected: result.distractionDetected,
                });

                // Update average focus score
                const focusScores = session.focusTimeline.map(entry => entry.focusScore);
                const avgFocus = focusScores.reduce((a, b) => a + b, 0) / focusScores.length;
                session.statistics.averageFocusScore = Math.round(avgFocus);

                // Update peak and lowest scores
                if (!session.statistics.peakFocusScore || result.focusScore > session.statistics.peakFocusScore) {
                    session.statistics.peakFocusScore = result.focusScore;
                }

                if (!session.statistics.lowestFocusScore || result.focusScore < session.statistics.lowestFocusScore) {
                    session.statistics.lowestFocusScore = result.focusScore;
                }

                await session.save();

                // Check if intervention is needed
                if (result.focusScore < this.focusThreshold && result.distractionDetected) {
                    await this.handleLowFocus(sessionId, result);
                }
            } catch (err) {
                console.error(`[Focus Monitor] Error monitoring session ${sessionId}:`, err);
            }
        }, intervalMs);

        this.intervals.set(sessionId, intervalId);
        console.log(`[Focus Monitor] Started monitoring session ${sessionId} (interval: ${intervalMinutes}m)`);
    }

    // Stop monitoring a specific session
    static stopMonitoring(sessionId: string): void {
        const intervalId = this.intervals.get(sessionId);
        if (intervalId) {
            clearInterval(intervalId);
            this.intervals.delete(sessionId);
            console.log(`[Focus Monitor] Stopped monitoring session ${sessionId}`);
        }
    }

    // Stop all active intervals
    static stopAll(): void {
        console.log(`[Focus Monitor] Stopping all monitoring (${this.intervals.size} sessions)...`);
        this.intervals.forEach((intervalId, sessionId) => {
            clearInterval(intervalId);
            console.log(`[Focus Monitor] Stopped monitoring session ${sessionId}`);
        });
        this.intervals.clear();
    }

    // Return list of currently monitored sessions
    static getMonitoredSessions(): string[] {
        return Array.from(this.intervals.keys());
    }

    // Check if a session is being monitored
    static isMonitoring(sessionId: string): boolean {
        return this.intervals.has(sessionId);
    }

    // Handle low focus situation — trigger recommendation & alerts
    private static async handleLowFocus(
        sessionId: string,
        focusResult: { focusScore: number; distractionReasons: string[] }
    ): Promise<void> {
        console.log(`⚠️ [Focus Monitor] Low focus detected for session ${sessionId}`);
        console.log(`   Score: ${focusResult.focusScore}%`);
        console.log(`   Reasons: ${focusResult.distractionReasons.join(", ")}`);

        try {
            const session = await Session.findById(sessionId);
            if (!session) {
                console.warn(`[Focus Monitor] Session ${sessionId} not found when handling low focus.`);
                return;
            }

            // Update statistics and log alert
            session.statistics.distractionsCount = (session.statistics.distractionsCount || 0) + 1;

            if (!Array.isArray((session as any).alerts)) {
                (session as any).alerts = [];
            }

            const alertEntry = {
                timestamp: new Date(),
                type: "low_focus",
                score: focusResult.focusScore,
                reasons: focusResult.distractionReasons,
            };

            (session as any).alerts.push(alertEntry);
            (session as any).hasRecentAlert = true;

            await session.save();

            // --- 2. Generate adaptive recommendation ---
            let lastRecommendation = "";
            if (Array.isArray((session as any).alerts) && (session as any).alerts.length > 0) {
                lastRecommendation = ((session as any).alerts
                    .filter((a: any) => a.type === "low_focus" && a.suggestion)
                    .slice(-1)[0]?.suggestion) || "";
            }

            let suggestion = "Take a short break and refocus.";
            try {
                // ✅ FIX: Handle the object return from generateAdaptiveRecommendation
                const recResult = await generateAdaptiveRecommendation(
                    session.userId?.toString(),
                    session,
                    lastRecommendation
                );

                // Check if result is an object with 'recommendation' property
                if (typeof recResult === 'object' && recResult !== null && 'recommendation' in recResult) {
                    suggestion = (recResult as any).recommendation;
                    console.log(`[Focus Monitor] Recommendation context:`, {
                        focusScore: (recResult as any).context?.focusScore,
                        distractions: (recResult as any).context?.distractions
                    });
                } else if (typeof recResult === 'string') {
                    // Fallback if it's already a string
                    suggestion = recResult;
                }

                console.log(`[Focus Monitor] Suggestion for session ${sessionId}: ${suggestion}`);
            } catch(err) {
                console.error(`[Focus Monitor] Error generating recommendation:`, err);
                suggestion = "Take a short break and refocus.";
            }

            // --- 3. Emit WebSocket event to the user ---
            try {
                if ((globalThis as any).io && session.userId) {
                    (globalThis as any).io.to(session.userId.toString()).emit("low_focus_alert", {
                        sessionId,
                        focusScore: focusResult.focusScore,
                        reasons: focusResult.distractionReasons,
                        suggestion,
                        timestamp: new Date(),
                    });
                    console.log(`[Focus Monitor] Emitted low_focus_alert to user ${session.userId}`);
                }
            } catch (err) {
                console.warn(`[Focus Monitor] WebSocket emit failed:`, err);
            }

            // --- 4. Trigger Electron desktop notification ---
            try {
                if ((globalThis as any).electronBridge) {
                    (globalThis as any).electronBridge.send("low-focus-notification", {
                        title: "Low Focus Detected",
                        body: suggestion,
                        sessionId,
                        timestamp: new Date(),
                    });
                    console.log(`[Focus Monitor] Electron notification sent for session ${sessionId}`);
                }
            } catch (err) {
                console.warn(`[Focus Monitor] Electron bridge notify failed:`, err);
            }

            // --- 5. Log for analytics ---
            console.log(
                `[Focus Monitor] Logged low focus event: user=${session.userId}, session=${sessionId}, score=${focusResult.focusScore}`
            );
        } catch (error) {
            console.error(`[Focus Monitor] Error handling low focus for session ${sessionId}:`, error);
        }
    }

    // Resume monitoring for all active sessions
    static async resumeAllActiveSession(intervalMinutes: number = 5): Promise<void> {
        try {
            const activeSessions = await Session.find({ status: "active" });
            console.log(`[Focus Monitor] Resuming monitoring for ${activeSessions.length} active sessions...`);
            activeSessions.forEach(session => {
                this.startMonitoring(session._id.toString(), intervalMinutes);
            });
        } catch (err) {
            console.error("[Focus Monitor] Error resuming active sessions:", err);
        }
    }

    // Set and get focus threshold
    static setFocusThreshold(threshold: number): void {
        if (threshold < 0 || threshold > 100) throw new Error("Threshold must be between 0 and 100");
        this.focusThreshold = threshold;
        console.log(`[Focus Monitor] Focus threshold set to ${threshold}%`);
    }

    static getFocusThreshold(): number {
        return this.focusThreshold;
    }
}

// --- Graceful shutdown handlers ---
process.on("SIGINT", () => {
    console.log("\n[Focus Monitor] Received SIGINT, cleaning up...");
    FocusMonitor.stopAll();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n[Focus Monitor] Received SIGTERM, cleaning up...");
    FocusMonitor.stopAll();
    process.exit(0);
});