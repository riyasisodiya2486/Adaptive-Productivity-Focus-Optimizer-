import { Request, Response } from "express"
import { Activity } from "../models/activity.model";
import { Session } from "../models/session.model";

export const logActivity = async(req:Request, res:Response) => {
    try{
        const userId = (req as any).userId;
        if(!req.body.sessionId){
            return res.status(400).json({
                msg: "sessionId is required"
            });
        }
        const session = await Session.findOne({
            _id: req.body.sessionId,
            userId,
            status: {$in: ['active', 'paused']}
        });

        if(!session){
            return res.status(404).json({
                msg: "Active or paused session not found" 
            })
        }
        const activity = await Activity.create({
            ...req.body,
            userId,
            timeStamp: req.body.timeStamp || new Date()
        });

        return res.json({
            msg: "Activity logged successfully",
            activity
        });
    }catch(err){
        res.status(500).json({
            msg: "Server error"
        })
    }
};

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

export const getActivities = async(req:Request, res:Response) =>{
    try{
        const userId = (req as any).userId;
        const {sessionId, start, end, limit = 100, skip = 0} = req.query;
        const match: any = {userId};

        if(sessionId) {
            match.sessionId = sessionId;
        }

        if(start || end){
            match.timestamp = {};
            if(start) match.timestamp.$gte = new Date(start as string);
            if(end) match.timestamp.$lte = new Date(end as string);
        }

        const activities = await Activity.find(match)
            .sort("-timestamp")
            .limit(Number(limit))
            .skip(Number(skip));

        const total = await Activity.countDocuments(match);
        
        return res.json({
            total,
            activities,
            limit: Number(limit),
            skip: Number(skip)
        });
    }catch(err){
        res.status(500).json({
            msg: "server error"
        })
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

