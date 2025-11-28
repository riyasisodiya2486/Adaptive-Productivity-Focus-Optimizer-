import cron from 'node-cron';
import mongoose from 'mongoose';
import { Activity } from '../models/activity.model';
import { Session } from '../models/session.model';

interface DatabaseStats {
    totalActivities: number;
    totalSessions: number;
    oldestActivity: Date | null;
    newestActivity: Date | null;
    estimatedActivitiesSize: string;
    estimatedSessionSize: string;
}

interface UserDataDeletionResult {
    activitiesDeleted: number;
    sessionsDeleted: number;
}

interface CleanupResults {
    activitiesDeleted: number;
    sessionAggregated: number;
    errors: string[];
}

// Service for managing data retention and cleanup, prevent db from being overburdened
export class DataCleanupService {
    private static isScheduled = false;

    /**
     * Schedule auto cleanup job - Runs daily at 2:00 AM by default
     * @param cronExpression Cron expression for scheduling (default: '0 2 * * *' = daily at 2 AM)
     */
    static scheduleCleanup(cronExpression: string = '0 2 * * *'): void {
        if (this.isScheduled) {
            console.log('[DataCleanup] ℹ️ Cleanup already scheduled');
            return;
        }

        cron.schedule(cronExpression, async () => {
            console.log('[DataCleanup] ⏰ Running scheduled cleanup...');
            await this.runCleanup();
        });

        this.isScheduled = true;
        console.log(`[DataCleanup]  Scheduled to run: ${cronExpression}`);
    }

    /**
     * Run full cleanup process
     */
    static async runCleanup(): Promise<CleanupResults> {
        try {
            const results: CleanupResults = {
                activitiesDeleted: 0,
                sessionAggregated: 0,
                errors: []
            };

            // 1. Delete old raw activity logs (older than 90 days)
            try {
                console.log('[DataCleanup] 🗑️ Deleting old activities...');
                results.activitiesDeleted = await this.deleteOldActivities(90);
                console.log(`[DataCleanup]  Deleted ${results.activitiesDeleted} old activities`);
            } catch (err: any) {
                const errorMsg = `Activity deletion failed: ${err.message}`;
                results.errors.push(errorMsg);
                console.error(`[DataCleanup]  ${errorMsg}`);
            }

            // 2. Aggregate old sessions (compress focus timeline)
            try {
                console.log('[DataCleanup] 📊 Aggregating old sessions...');
                results.sessionAggregated = await this.aggregateOldSessions(180);
                console.log(`[DataCleanup]  Aggregated ${results.sessionAggregated} sessions`);
            } catch (err: any) {
                const errorMsg = `Session aggregation failed: ${err.message}`;
                results.errors.push(errorMsg);
                console.error(`[DataCleanup]  ${errorMsg}`);
            }

            console.log('[DataCleanup] 🎉 Cleanup completed:', results);
            return results;
        } catch (err) {
            console.error('[DataCleanup]  Cleanup failed:', err);
            return {
                activitiesDeleted: 0,
                sessionAggregated: 0,
                errors: [`Cleanup failed: ${err}`]
            };
        }
    }

    /**
     * Delete activities older than specified days
     * @param daysOld Number of days to keep (default: 90)
     * @returns Number of deleted activities
     */
    static async deleteOldActivities(daysOld: number = 90): Promise<number> {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

        console.log(`[DataCleanup] 🗑️ Deleting activities older than ${daysOld} days (before ${cutoffDate.toISOString()})`);

        try {
            const result = await Activity.deleteMany({
                timestamp: { $lt: cutoffDate }
            });

            const deletedCount = result.deletedCount || 0;
            console.log(`[DataCleanup]  Deleted ${deletedCount} old activities`);
            return deletedCount;
        } catch (err) {
            console.error('[DataCleanup]  Error deleting activities:', err);
            throw err;
        }
    }

    /**
     * Archive/compress old session data for sessions older than specified days
     * Removes detailed focus timeline but keeps the summary stats and key metrics
     * @param daysOld Number of days to keep (default: 180)
     * @returns Number of aggregated sessions
     */
    static async aggregateOldSessions(daysOld: number = 180): Promise<number> {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

        console.log(`[DataCleanup] 📊 Aggregating sessions older than ${daysOld} days`);

        try {
            const oldSessions = await Session.find({
                startTime: { $lt: cutoffDate },
                'focusTimeline.0': { $exists: true }
            });

            console.log(`[DataCleanup] Found ${oldSessions.length} sessions to aggregate`);

            let count = 0;
            for (const session of oldSessions) {
                if (session.focusTimeline && session.focusTimeline.length > 10) {
                    //  FIX: Cast to any since focusTimeline is mixed type
                    const timeline = session.focusTimeline as any[];
                    const focusScores = timeline.map((e: any) => e.focusScore);
                    const maxScore = Math.max(...focusScores);
                    const minScore = Math.min(...focusScores);

                    const peakEntry = timeline.find((e: any) => e.focusScore === maxScore);
                    const lowestEntry = timeline.find((e: any) => e.focusScore === minScore);

                    // Keep only important entries: first, peak, lowest, last
                    const firstEntry = timeline[0];
                    const lastEntry = timeline[timeline.length - 1];

                    //  FIX: Build array with correct entries
                    const entriesToKeep: any[] = [
                        firstEntry,
                        peakEntry && peakEntry !== firstEntry ? peakEntry : null,
                        lowestEntry && 
                        lowestEntry !== firstEntry && 
                        lowestEntry !== peakEntry ? lowestEntry : null,
                        lastEntry && lastEntry !== firstEntry ? lastEntry : null
                    ];

                    // Filter out nulls and duplicates
                    const reducedTimeline: any[] = entriesToKeep
                        .filter((entry): entry is any => entry !== null && entry !== undefined)
                        .filter(
                            (entry, index, self) =>
                                self.findIndex(
                                    (e: any) =>
                                        e?.timestamp &&
                                        entry?.timestamp &&
                                        e.timestamp.getTime() === entry.timestamp.getTime()
                                ) === index
                        );

                    //  FIX: Assign with correct type
                    session.focusTimeline = reducedTimeline;
                    await session.save();
                    count++;
                }
            }

            console.log(`[DataCleanup]  Aggregated ${count} old sessions`);
            return count;
        } catch (err) {
            console.error('[DataCleanup]  Error aggregating sessions:', err);
            throw err;
        }
    }

    /**
     * Get database statistics and storage estimates
     * @returns Database stats object
     */
    static async getDatabaseStats(): Promise<DatabaseStats> {
        try {
            console.log('[DataCleanup] 📊 Fetching database statistics...');

            const [totalActivities, totalSessions] = await Promise.all([
                Activity.countDocuments(),
                Session.countDocuments()
            ]);

            //  FIX: Use lean() with generic type for safety
            const oldestActivityDoc = await Activity.findOne()
                .sort('timestamp')
                .select('timestamp')
                .lean<{ timestamp: Date }>();

            const newestActivityDoc = await Activity.findOne()
                .sort('-timestamp')
                .select('timestamp')
                .lean<{ timestamp: Date }>();

            // Rough size estimation (very approximate)
            const estimatedActivitiesSize = `~${(totalActivities / 1024).toFixed(2)} MB`;
            const estimatedSessionSize = `~${(totalSessions * 5 / 1024).toFixed(2)} MB`;

            const stats: DatabaseStats = {
                totalActivities,
                totalSessions,
                oldestActivity: oldestActivityDoc?.timestamp || null,
                newestActivity: newestActivityDoc?.timestamp || null,
                estimatedActivitiesSize,
                estimatedSessionSize
            };

            console.log('[DataCleanup]  Database stats retrieved');
            return stats;
        } catch (err) {
            console.error('[DataCleanup]  Error fetching database stats:', err);
            throw err;
        }
    }

    /**
     * Delete all activities and sessions for a specific user (GDPR compliance)
     * @param userId User ID to delete
     * @returns Number of deleted activities and sessions
     */
    static async deleteUserData(userId: string): Promise<UserDataDeletionResult> {
        try {
            console.log(`[DataCleanup] 🗑️ Deleting all data for user: ${userId}`);

            const [activitiesResult, sessionsResult] = await Promise.all([
                Activity.deleteMany({ userId }),
                Session.deleteMany({ userId })
            ]);

            const result: UserDataDeletionResult = {
                activitiesDeleted: activitiesResult.deletedCount || 0,
                sessionsDeleted: sessionsResult.deletedCount || 0
            };

            console.log(`[DataCleanup]  Deleted user data:`, result);
            return result;
        } catch (err) {
            console.error('[DataCleanup]  Error deleting user data:', err);
            throw err;
        }
    }

    /**
     * Compact and optimize database collections
     * This reduces fragmentation and improves query performance
     */
    static async optimizeDatabase(): Promise<void> {
        try {
            console.log('[DataCleanup] 🔧 Optimizing database collections...');

            //  FIX: Cast db to any to access MongoDB command() method
            const db = Activity.db as any;

            // Compact activities collection
            await db.command({ compact: 'activities' });
            console.log('[DataCleanup]  Compacted activities collection');

            // Compact sessions collection
            await db.command({ compact: 'sessions' });
            console.log('[DataCleanup]  Compacted sessions collection');

            console.log('[DataCleanup]  Database optimization completed');
        } catch (err) {
            console.error('[DataCleanup]  Database optimization failed:', err);
            throw err;
        }
    }

    /**
     * Get cleanup service status
     */
    static getStatus(): {
        isScheduled: boolean;
        lastRun?: Date;
    } {
        return {
            isScheduled: this.isScheduled
        };
    }

    /**
     * Manually trigger cleanup (useful for testing)
     */
    static async manualCleanup(): Promise<CleanupResults> {
        console.log('[DataCleanup] 🔄 Manual cleanup triggered');
        return this.runCleanup();
    }
}