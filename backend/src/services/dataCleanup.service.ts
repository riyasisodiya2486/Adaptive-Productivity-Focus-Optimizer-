import cron from 'node-cron';
import { deleteOldActivities } from '../controllers/activity.controller';
import { Activity } from '../models/activity.model';
import { Session } from '../models/session.model';


//Service for managing data retention and cleanup, prevent db from being overburdened
export class DataCleanupService {
    private static isScheduled = false;

    //schedule auto cleanup job Runs daily at 2:00 Am by default
    static scheduleCleanup(cronExpression: string = '0 2 * * *'): void {
        if(this.isScheduled) {
            console.log('Data cleanup: cleanup already schedules');
            return;
        }

        cron.schedule(cronExpression, async () => {
            console.log('[data cleanup] running schefuled cleanup...');
            await this.runCleanup();
        });

        this.isScheduled = true;
        console.log(`[Data cleanup] scheduled to run: ${cronExpression}`);
    }

    //run full cleanup process
    static async  runCleanup(): Promise<void> {
        try{
            const results = {
                activitiesDeleted: 0,
                sessionDeleted: 0,
                errors: [] as string[]
            };

            // 1 Delete old raw activity logs
            try{
                results.activitiesDeleted = await this.deleteOldActivities(90);
            }catch(err: any){
                results.errors.push(`Activity deletion failed: ${err.message}`)
            }

            console.log('[Data cleanup] cleanup completed:', results);
        } catch(err){   
            console.log('[Data cleanup] cleanup failed: ', err);
        }
    }

    //delete activities older than specified days (default: 90)
    static async deleteOldActivities(daysOld: number = 90): Promise<number> {
        const cutoffDate = new Date(Date.now() -  daysOld * 24 * 60 * 60 * 1000);

        console.log(`[data cleanup] deleting activites older than ${daysOld} days (before ${cutoffDate.toISOString()})`);
        const result = await Activity.deleteMany({
            timestamp: {$lt: cutoffDate}
        });

        console.log(`[Data Cleanup] Deleted ${result.deletedCount} old activities`);
        return result.deletedCount || 0;

    }
        //archive or compress old session data for session older than 180 days, remove detailed focus timeline but keeping the summary stats 
    static async aggregateOldSessions(daysOld: number = 180): Promise<number> {
            const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

            console.log(`[data cleanup] aggregating sessions older than ${daysOld} days`);

            const oldSessions = await Session.find({
                startTime: { $lt: cutoffDate},
                'focusTimeline.0': {$exists: true}
            });

            let count = 0;
            for(const session of oldSessions) {
                if(session.focusTimeline.length > 10) {
                    const timeline = session.focusTimeline;
                    const focusScores = timeline.map(e => e.focusScore);
                    const maxScore = Math.max(...focusScores);
                    const minScore = Math.min(...focusScores);

                    const peakEntry = timeline.find(e => e.focusScore === maxScore);
                    const lowestEntry = timeline.find(e => e.focusScore === minScore);

                    //keeping only imp entries
                    session.focusTimeline = [
                        timeline, // First entry
                        ...(peakEntry ? [peakEntry] : []),
                        ...(lowestEntry ? [lowestEntry] : []),
                        timeline[timeline.length - 1]//last entry
                    ].filter((peakEntry, index, self)=> 
                        self.findIndex(e => e.timestamp.getTime() === peakEntry.timestamp.getTime()) === index
                    );

                    await session.save();
                    count++;
                }
            }

            console.log(`[Data cleanup] aggregated ${count} old sessions`);
            return count;
        }

        // Get database stats
        static async getDatabaseStats(): Promise<{
            totalActivities: number;
            totalSessions: number;
            oldestActivity: Date | null;
            newestActivity: Date | null;
            estimatedActivitiesSize: string;
            estimatedSessionSize: string;

        }>{

            const [totalActivities, totalSessions] = await Promise.all([
                Activity.countDocuments(),
                Session.countDocuments()
            ]);

            const oldestActivity = await Activity.findOne().sort('timestamp').select('timestamp');
            const newestActivity = await Activity.findOne().sort('-timestamp').select('timestamp');

            //rough size estimation
            const estimatedActivitiesSize = `~${(totalActivities / 1024).toFixed(2)} MB`;
            const estimatedSessionSize = `~${(totalSessions * 5 / 1024).toFixed(2)} MB`;

            return {
                totalActivities,
                totalSessions,
                oldestActivity: oldestActivity?.timestamp || null,
                newestActivity: newestActivity?.timestamp || null,
                estimatedActivitiesSize,
                estimatedSessionSize
            };

        }

        //delete all activities for a specific user
        static async deleteUserData(userId: string): Promise<{
            activitiesDeleted: number;
            sessionsDeleted: number;
        }> {
            const [activitiesResult, sessionsResult] = await Promise.all([
                Activity.deleteMany({ userId }),
                Session.deleteMany({ userId })
            ]);

            return {
                activitiesDeleted: activitiesResult.deletedCount || 0,
                sessionsDeleted: sessionsResult.deletedCount || 0
            };
        }

        //Compact and optimise collection
        static async optimizeDatabase(): Promise<void> {
            try{
                console.log('data cleanup optimizing db collection...');
                const db = Activity.db;

                //compact activities collection
                await db.command({compact: 'activities'});
                console.log('[data cleanup compacted activities collection');

                await db.command({compact: 'sessions'});
                console.log('[data cleanup compacted sessions collection');

            }catch(err){
                 console.error('[Data Cleanup] Database optimization failed:', err);
                throw err;
            }
        }

    }
