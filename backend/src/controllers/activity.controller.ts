import mongoose from "mongoose";
import { Request, Response } from "express"
import { Activity } from "../models/activity.model";
import { Session } from "../models/session.model";


export const logActivityBatch = async(req: Request, res:Response) => {
    try{
        const userId = (req as any).userId;
        const {sessionId, activities} = req.body;

        if(!sessionId){
            return res.status(400).json({
                msg: "sessionId is required"
            });
        }

        if(!Array.isArray(activities)|| activities.length === 0) {
            return res.status(400).json({
                msg: "activities must be a non empty array"
            });
        }

        const session = await Session.findOne({
            _id: sessionId,
            userId,
            status: {$in: ['active', 'paused']}
        });

        if(!session){
            return res.status(404).json({
                msg: "Active or paused session not found"
            })
        }

        //added userid and sessionId to all activities
        const activitiesWithUser = activities.map(activity => ({
            ...activity,
            userId,
            sessionId,
            timestamp: activity.timestamp || new Date()
        }));

        //Batch insert
        const saved = await Activity.insertMany(activitiesWithUser, {
            ordered: false 
        })

        return res.json({
            msg: "Activities logged successfully",
            count: saved.length,
            sessionId
        })
    }catch(err){
        console.log(err);
        return res.status(500).json({
            msg: "server error"
        })
    }
};

export const getActivities = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { limit = 20, skip = 0, start, end } = req.query; // Capture start and end

        const query: any = { 
            userId: new mongoose.Types.ObjectId(userId) 
        };

        // --- 1. Implement Date Range Filtering ---
        if (start || end) {
            const dateFilter: any = {};
            
            // Validate and convert 'start' parameter
            if (start) {
                const startDate = new Date(start as string);
                if (isNaN(startDate.getTime())) {
                    return res.status(400).json({ msg: 'Invalid start date format.' });
                }
                // $gte means Greater Than or Equal To
                dateFilter.$gte = startDate;
            }

            // Validate and convert 'end' parameter
            if (end) {
                const endDate = new Date(end as string);
                if (isNaN(endDate.getTime())) {
                    return res.status(400).json({ msg: 'Invalid end date format.' });
                }
                // $lte means Less Than or Equal To
                dateFilter.$lte = endDate;
            }

            // Apply the timestamp filter to the main query
            if (Object.keys(dateFilter).length > 0) {
                // ASSUMPTION: Your Activity model has a 'timestamp' field
                query.timestamp = dateFilter;
            }
        }
        // --- End Date Range Filtering ---

        const activities = await Activity.find(query as any)
            .sort({ timestamp: -1 }) // Sort by most recent first
            .limit(Number(limit))
            .skip(Number(skip));

        const total = await Activity.countDocuments(query as any);

        return res.json({
            activities,
            total,
            limit: Number(limit),
            skip: Number(skip)
        }); 
    } catch (err) {
        console.error("Error getting activities:", err);
        return res.status(500).json({
            msg: "Server error fetching activities"
        });
    }
};

export const getAppUsageForSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ msg: "Session ID is required" });
    }

    // Determine the logging interval (in seconds)
    const samplingInterval = 5; 

    // Get per-app usage for this session
    const usage = await Activity.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), sessionId: new mongoose.Types.ObjectId(sessionId) } },
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: "$activeApp.name",
          title: { $first: "$activeApp.title" },
          category: { $first: "$activeApp.category" },
          intervals: { $sum: 1 },
        }
      },
      { $sort: { intervals: -1 } }
    ]);

    // Format response: time in seconds and minutes
    const results = usage.map(u => ({
      name: u._id,
      title: u.title,
      category: u.category,
      intervals: u.intervals,
      seconds: u.intervals * samplingInterval,
      minutes: (u.intervals * samplingInterval) / 60,
    }));

    return res.json({ sessionId, appUsage: results });
  } catch (err) {
    console.error("Error computing app usage:", err);
    return res.status(500).json({ msg: "server error" });
  }
};

export const getActivity = async(req:Request, res:Response) => {
    try{
        const userId = (req as any).userId;
        const activity = await Activity.findOne({
            _id: req.params.id,
            userId 
        });

        if(!activity){
            return res.status(404).json({
                msg: "activity not found"
            });
        }
        return res.json({
            activity
        })
    }catch(err){
        console.log(err);
        return res.status(500).json({
            msg: "server error"
        })
    }
}

export const updateActivity = async(req:Request, res:Response) => {
    try{
        const userId = (req as any).userId;
        
        //prevent updating userId and sessionid
        const {userId: _, session: __, ...updateData} = req.body;
        
        const updated = await Activity.findOneAndUpdate(
            {_id: req.params.id, userId},
            updateData,
            {new: true, runValidators: true}
        );

        if(!updated){
            return res.status(404).json({
                msg: "Activity not found"
            })
        }

        return res.json({
            msg: "Activity updated successfully"
        })
    }catch(err){
        console.log(err);
        res.status(500).json({
            msg: "Server error"
        })
    }
};

export const deleteActivity = async(req:Request, res:Response) => {
    try{
        const userId = (req as any).userId;
        const deleted = await Activity.findByIdAndDelete({_id: req.params.id, userId});
        if(!deleted){
            return res.status(404).json({
                msg: "Activity not found"
            })
        }
        return res.json({
            msg: "Activity deleted"
        });
    }catch(err){
        res.status(500).json({
            msg: "Server error"
        });
    }
};

export const deleteOldActivities = async(req:Request, res:Response) =>{
    try{
        const userId = (req as any).userId;
        const {daysOld = 90} = req.query;

        const cutoffDate = new Date(
            Date.now() - Number(daysOld) * 24 * 60 * 1000
        );

        const result = await Activity.deleteMany({
            userId,
            timestamp: {$lt: cutoffDate}
        });

        return res.json({
            msg: `Deleted activities older than ${daysOld} days`,
            deletedCount: result.deletedCount
        });
    }catch(err){
        console.error("Error deleting old activities:", err);
        return res.status(500).json({
            msg: "Server error"
        });
    }
}

export const getActivityStats = async(req:Request, res:Response) => {
    try{
        const userId = (req as any).userId;
        const {sessionId, start, end} = req.query;

        const match: any = {userId};

        if(sessionId) {
            match.sessionId = sessionId;
        }

        if(start || end){
            match.timestamp = {};
             if(start) match.timestamp.$gte = new Date(start as string);
            if(end) match.timestamp.$lte = new Date(end as string);
        }
       
        const stats = await Activity.aggregate([
            {$match: match},
            {
                $group: {
                    _id: null,
                    totalActivities: {$sum: 1},
                    totalKeystrokes: {$sum: "$activityData.keystrokes"},
                    totalMouseClicks: {$sum: "$activityData.mouseClicks"},
                    totalMouseMoves: {$sum: "$activityData.mouseMoves"},
                    totalScrolls: {$sum: "$activityData.scrolls"},
                    totalIdleTime: {$sum: "$activityData.idleTime"},
                    avgFocusScore: {$avg: "$focusScore"},
                    avgBlinkRate: {
                        $avg: {
                            $cond: [
                                "$eyeTracking.enabled",
                                "$eyeTracking.blinkRate",
                                null 
                            ]
                        }},
                    focusedScreenCount: {
                        $sum: {
                            $cond: ["$eyeTracking.focusedOnScreen", 1, 0]
                        }
                    },
                    productiveAppCount: {
                        $sum: {
                            $cond: [{$eq: ["$activeApp.category", "productive"]}, 1, 0]
                        }
                    },
                    distractionAppCount: {
                        $sum: {
                            $cond: [{$eq: ["$activeApp.category", "distraction"]}, 1, 0]
                        }
                    },
                    neutralAppCount: {
                        $sum: {
                            $cond: [{$eq: ["$activeApp.category", "neutral"]}, 1, 0]
                        }
                    },
                    distractionsDetected: {
                        $sum: {
                            $cond: [{$gt: [{ $size: "$distractionDetected"}, 0]}, 1, 0]
                        }
                    }
                }
            }
        ]);
        
        //get unique apps used
        const appsUsed = await Activity.aggregate([
            {$match: match},
            {$group: {_id: "$activeApp.name"}},
            {$match: {_id: {$ne: null}}}
        ]);

        const result = stats[0] || {
            totalActivities: 0,
            totalKeystrokes: 0,
            totalMouseClicks: 0,
            totalMouseMoves: 0,
            totalScrolls: 0,
            totalIdleTime: 0,
            avgFocusScore: 0,
            avgBlinkRate: 0,
            focusedScreenCount: 0,
            productiveAppCount: 0,
            distractionAppCount: 0,
            neutralAppCount: 0,
            distractionsDetected: 0
        };

        result.uniqueApps = appsUsed.length;
        result.apps = appsUsed.map(a => a._id);

        return res.json(result);
    }catch(err){
        console.log(err);
        return res.status(500).json({
            msg: "server error" 
        })
    }
};

export const getActivityTimeline = async(req:Request, res:Response) =>{
    try{
        const userId = (req as any).userId;
        const {sessionId, interval = '5m'} = req.query;
        
        if(!sessionId){
            return res.status(400).json({
                msg: "session is required"
            });
        }

        //determin grouping interval in milliseconds
        let intervalMs: number;
        switch(interval) {
            case '1m': intervalMs = 60 * 1000; break;
            case '5m': intervalMs = 5 * 60 * 1000; break;
            case '10m': intervalMs = 10 * 60 * 1000; break;
            case '15m': intervalMs = 15 * 60 * 1000; break;
            default: intervalMs = 5 * 60 * 1000;
        }

        const timeline = await Activity.aggregate([
            { 
                $match: { 
                    userId,
                    sessionId
                } 
            },
            {
                $group: {
                    _id: {
                        $subtract: [
                            { $toLong: "$timestamp" },
                            { $mod: [{ $toLong: "$timestamp" }, intervalMs] }
                        ]
                    },
                    timestamp: { $first: "$timestamp" },
                    avgFocusScore: { $avg: "$focusScore" },
                    totalKeystrokes: { $sum: "$activityData.keystrokes" },
                    totalMouseActivity: { 
                        $sum: { 
                            $add: [
                                "$activityData.mouseClicks",
                                "$activityData.mouseMoves"
                            ]
                        }
                    },
                    idleTime: { $sum: "$activityData.idleTime" },
                    distractionCount: {
                        $sum: {
                            $cond: [
                                { $gt: [{ $size: "$distractionDetected" }, 0] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { timestamp: 1 } }
        ]);

        return res.json({
            sessionId,
            interval,
            timeline
        });
    }catch(err){
        console.error("Error getting activity timeline:", err);
        return res.status(500).json({
            msg: "Server error"
        });
    }
}


export const getActivityByDateRange = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { start, end } = req.query;

        // 1. Validate and convert dates
        if (!start || !end) {
            return res.status(400).json({ msg: 'Start and end date query parameters are required.' });
        }

        const startDate = new Date(start as string);
        const endDate = new Date(end as string);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ msg: 'Invalid start or end date format.' });
        }

        // 2. Build the query
        const query = {
            userId: new mongoose.Types.ObjectId(userId),
            // Assuming your Activity model has a 'timestamp' or 'date' field
            timestamp: { 
                $gte: startDate, 
                $lte: endDate 
            }
        };

        // 3. Fetch the data (adjust projections and sorting as needed)
        const activities = await Activity.find(query)
            .sort({ timestamp: 1 })
            .select('-__v'); // Exclude the version field

        return res.json({ activities });

    } catch (error) {
        console.error('Error fetching activity data by date range:', error);
        return res.status(500).json({ msg: 'Server error fetching activity data.' });
    }
};
