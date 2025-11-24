import { Activity } from "../models/activity.model";
import { Session } from "../models/session.model";


export class DatabaseMonitor {
    
    // Check if db size is approaching limits
    static async checkHealthStatus(): Promise<{
        status: 'healthy' | 'warning' | 'critical';
        message: string;
        metrics: any;
    }>{
        const now = Date.now();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

        const [
            totalActivities,
            activitesLast24h,
            activitiesLastWeek,
            totalSessions,
            activeSessions,
        ] = await Promise.all([
            Activity.countDocuments(),
            Activity.countDocuments({timestamp: {$gte: oneDayAgo}}),
            Activity.countDocuments({timestamp: {$gte: oneWeekAgo}}),
            Session.countDocuments(),
            Session.countDocuments({status: 'active'})    
        ]);

        const metrics = {
            totalActivities,
            activeSessions,
            activitesLast24h,
            activitiesLastWeek,
            totalSessions,
            avgActivitiesPerDay: Math.round(activitiesLastWeek / 7)
        };

        // Health check 
        if(totalActivities > 10000000) {
            return {
                status: 'critical',
                message: 'Database size critical. Immediate cleanup required.',
                metrics
            }
        }

        if(totalActivities > 5000000) {
            return {
                status: 'warning',
                message: 'Database size approaching limits. Schedule cleanup soon.',
                metrics
            };
        }

        return {
            status: 'healthy',
            message: 'database health is good',
            metrics
        };
    }

    static async logMetrics(): Promise<void> {
        const health = await this.checkHealthStatus();
        console.log('[db monitor]', health.status.toUpperCase(), '-', health.message);
        console.log('[db monitor] Metrics:', health.metrics)
    }
}