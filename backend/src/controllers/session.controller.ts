import mongoose from "mongoose";
import { Request, Response } from "express";
import { Session } from "../models/session.model";
import  "../models/recommendations.model";
import { FocusMonitor } from "../services/focusMonitor.service";
import { FocusCalculator } from "../services/focusCalculator.service";


export const startSession = async( req:Request, res:Response) =>{
    try{
        const userId = (req as any).userId;

        const existingSession = await Session.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            status: 'active'
        });

        if(existingSession){
            return res.status(400).json({
                msg: "you already have an active session. please end it first",
                session: existingSession
            })
        }

        const session = await Session.create({
            userId: new mongoose.Types.ObjectId(userId),
            startTime: new Date(),
            type:req.body.type || "work",
            status: 'active',
            focusTimeline: [],
            statistics: {
                totalKeystrokes: 0,
                totalMouseActivity: 0,
                totalIdleTime: 0,
                distractionsCount: 0,
                productiveAppsUsed: [],
                distractingAppsUsed: [],
                totalFocusTime: 0,
                totalDistractionTime: 0 
            },
            recommendations: [],
        });
        FocusMonitor.startMonitoring(session._id.toString(), 5);
        
        return res.json({
            msg: "Session started successfully",
            session
        });
    }catch(err){
        return res.status(500).json({
            msg: "server error"
        })
    }
};

export const endSession = async (req:Request, res:Response)=>{
    const userId = (req as any).userId;
    const sessionId = req.params.id;
    try{
        const session = await Session.findOne({
            _id: sessionId,
            userId: new mongoose.Types.ObjectId(userId)
        });
        if(!session){
            return res.status(404).json({
                msg:"session not found" 
            })
        }

        if (session.status === 'ended') {
            return res.status(400).json({
                msg: "Session already ended"
            });
        }

        FocusMonitor.stopMonitoring(sessionId);

        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / (1000 * 60));

        await FocusCalculator.updateSessionStatistics(sessionId);

        const updated = await Session.findOneAndUpdate(
            {   
                _id: sessionId, 
                userId: new mongoose.Types.ObjectId(userId)},
            {
                endTime,
                duration,
                status: "ended"
            },
            {new: true}
        ).populate('recommendations');

        return res.json({
            msg: "session ended successfully",
            updated
        })
    }catch(err){
        console.log(err);
        return res.status(500).json({
            msg: "server error"
        })
    }

};

export const pauseSession = async(req:Request, res:Response) => {
    try{
        const userId = (req as any).userId;
        const sessionId = req.params.id;

        const session = await Session.findOne({
            _id: sessionId,
            userId: new mongoose.Types.ObjectId(userId),
            status: 'active'
        });

        if(!session){
            return res.status(404).json({
                msg: "active session not found"
            })
        }

        //pause monitoring
        FocusMonitor.stopMonitoring(sessionId);

        const updated = await Session.findByIdAndUpdate(
            sessionId,
            {status: 'paused'},
            {new: true}
        );

        return res.json({
            msg: "session paused successfully",
            session: updated
        })
    }catch(err){
        console.error("Error pausing session:", err);
        return res.status(500).json({
            msg: "Server error"
        });
    }
}

export const resumeSession = async(req:Request, res:Response) => {
    try{
        const userId = (req as any).userId;
        const sessionId = req.params.id;

        const session = await Session.findOne({
            _id: sessionId,
            userId: new mongoose.Types.ObjectId(userId),
            status: 'paused'
        });

        if(!session){
            return res.status(404).json({
                msg: "paused session not found"
            });
        }

        const updated = await Session.findByIdAndUpdate(
            sessionId,
            {status: 'active'},
            {new: true}
        );

        //resume monitoring
        FocusMonitor.startMonitoring(sessionId, 5);

        return res.json({
            msg: "session resumed successfully",
            session: updated
        });
    }catch(err){
        console.error("Error resuming session:", err);
        return res.status(500).json({
            msg: "Server error"
        });
    }
};

export const startBreak = async(req:Request , res:Response) =>{
    try{
        const sessionId = req.params.id;
        const session = await Session.findById(sessionId);
        if(!session) return res.status(404).json({msg: "session not found"});
        if(session.status == 'ended'){
            return res.status(403).json({
                msg: "session already ended"
            })
        }

        session.statistics.totalBreaksTaken = (session.statistics.totalBreaksTaken || 0) + 1;
        await session.save();
        return res.json({
            msg: "break started", 
            breaks: session.statistics.totalBreaksTaken
        })
    } catch(err){
        return res.status(500).json({
            msg: "server error"
        })
    }
};

export const endBreak = async (req:Request, res:Response) => {
    try{
        const sessionId = req.params.id;
        const session = await Session.findById(sessionId);
        if(!session) return res.status(404).json({ msg: "session not found" });
        if(session.status == 'ended'){
            return res.status(403).json({
                msg: "session already ended"
            })
        }

        await session.save();
        return res.json({
            msg: "break ended"
        })
    }catch (err){
        return res.status(500).json({
            msg: "server error" 
        })
    }
};

export const getCurrentSession = async(req:Request, res:Response) => {
    try{
        const userId = (req as any).userId;
        const session = await Session.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            status: 'active'
        }).sort('-startTime');

        if(!session) {
            return res.status(404).json({
                msg: "no active session found"
            })
        }

        return res.json({
            session
        })
    }catch(err){
        console.error("Error getting current session:", err);
        return res.status(500).json({
            msg: "Server error"
        });
    }
}

export const updateFocusScore = async(req:Request, res:Response) =>{
    try{
        const userId = (req as any).userId;
        const sessionId = req.params.id;
        const {focusScore, activityLevel, distractionsDetected} = req.body;

        //validate input
        if(focusScore === undefined || !activityLevel){
            return res.status(400).json({
                msg: "focusScore and activityLevel are required"
            });
        }

        const session = await Session.findOne({
            _id: sessionId,
            userId: new mongoose.Types.ObjectId(userId),
            status: 'active' 
        })

        if (!session) {
            return res.status(404).json({
                msg: "Active session not found"
            });
        }

        //add to focus timeline
        const focusEntry = {
            timestamp: new Date(),
            focusScore: Math.round(focusScore),
            activityLevel,
            distractionDetected: distractionsDetected || false
        };

        session.focusTimeline.push(focusEntry);

        //recalculated avg focus score
        const focusScores = session.focusTimeline.map(entry => entry.focusScore);
        const averageFocus = focusScores.reduce((a,b)=> a+b, 0) / focusScore.length;

        session.statistics.averageFocusScore = Math.round(averageFocus);

        if(!session.statistics.peakFocusScore || focusScore > session.statistics.peakFocusScore) {
            session.statistics.peakFocusScore = Math.round(focusScore);
        }

        if(!session.statistics.lowestFocusScore || focusScore < session.statistics.lowestFocusScore){
            session.statistics.lowestFocusScore = Math.round(focusScore)
        }

        await session.save();

        return res.json({
            msg: "focus score updated",
            currentFocus: focusEntry,
            averageFocus: Math.round(averageFocus)
        })

    }catch(err){
         console.error("Error updating focus score:", err);
        return res.status(500).json({
            msg: "Server error"
        });
    }
}

export const getSessions = async(req:Request, res:Response) => {
    try{
        const userId = (req as any).userId;
        const {limit = 20, skip = 0, status} = req.query;

        const query: any = {userId: new mongoose.Types.ObjectId(userId)};
        if(status){
            query.status = status;
        }

        const session = await Session.find(query)
            .sort("-startedAt")
            .limit(Number(limit))
            .skip(Number(skip))
            .select('-focusTimeline') 

        const total = await Session.countDocuments(query);

        return res.json({
            session,
            total,
            limit: Number(limit),
            skip: Number(skip)
        }); 
    }catch(err){
        return res.status(500).json({
            msg: "server error"
        })
    }
};

export const getSession = async(req:Request, res:Response) =>{
    const userId = (req as any).userId;
    try{
        const session = await Session.findOne({
            _id: req.params.id,
            userId: new mongoose.Types.ObjectId(userId)
        }).populate('recommedations');
        
        if(!session){
            return res.status(404).json({
                msg: "session not found"
            });
        }
        return res.json({
            session
        })
    }catch(err){
        return res.status(500).json({
            msg: "server error"
        })
    }
};

export const updateSession = async(req:Request, res:Response) => {
    const userId = (req as any).userId;
    try{
        //prevent updating critical field
        const {userId: _, stats, focusTimeline,  ...updateData} = req.body;
        const updated = await Session.findOneAndUpdate(
            {_id: req.params.id, 
                userId: new mongoose.Types.ObjectId(userId)
            },
            updateData,
            {new:true, runValidators: true}
        );

        if(!updated){
            return res.status(404).json({
                msg: "session not found"  
            })
        }

        return res.json({
            msg: "session updated successfully",
            session: updated 
        })
    }catch(err){
        return res.status(500).json({
            msg: "server error"
        })
    }
};

export const deleteSession = async(req:Request, res:Response) =>{
    const userId = (req as any).userId;
    try{
        const deleted = await Session.findByIdAndDelete({_id: req.params.id, userId: new mongoose.Types.ObjectId(userId)});
        if(!deleted){
            return res.status(404).json({
                msg: "Session not found"
            });
        };

        //stop monitoring if active
        FocusMonitor.stopMonitoring(req.params.id);

        return res.json({
            msg: "session deleted"
        });
    }catch(err){
        console.log(err);
        return res.status(500).json({
            msg:"server error"
        })
    }
};

export const getSessionStats = async(req:Request, res:Response) =>{
    const userId = (req as any).userId;
    const sessionId = req.params.id;
    try{
       const session = await Session.findOne({
        _id: sessionId,
        userId: new mongoose.Types.ObjectId(userId)
       });
       if(!session){
        return res.status(404).json({
            msg: "session not found" 
        })
       }

       //calculated additional stats
       const focusTimeline = session.focusTimeline;
       const highFocusCount = focusTimeline.filter(f => f.activityLevel === 'high').length;
       const mediumFocusCount = focusTimeline.filter(f => f.activityLevel === 'medium').length;
       const lowestFocusSCount = focusTimeline.filter(f => f.activityLevel === 'low').length;

       return res.json({
        sessionId: session._id,
        duration: session.duration,
        type: session.status,
        statistics: session.statistics,
        focusDistribution: {
            high: highFocusCount,
            medium: mediumFocusCount,
            low: lowestFocusSCount
        },
        focusTimelineLength: focusTimeline.length
       });
    }catch(err){
        return res.status(500).json({
            msg: "server error"
        })
    }
};

export const getUserStats = async (req:Request, res:Response) => {
    const userId = (req as any).userId;

    try{
        const stats = await Session.aggregate([
            {$match: {userId: new mongoose.Types.ObjectId(userId), status: 'ended'}},
            {
                $group: {
                    _id: null,
                    totalSession: {$sum: 1},
                    totalDuration: { $sum: "$duration"},
                    avgFocusScore: {$avg: "$statistics.averageFocusScore" },
                    totalKeystrokes: {$sum: "$statistics.totalKeystrokes"},
                    totalDistractions: {$sum: "$statistics.distractionsCount"}
                }
            }
        ]);

        return res.json(stats.length > 0 ? stats[0] :
        {
            totalSessions: 0,
            totalDuration: 0,
            avgFocusScore: 0,
            totalKeystrokes: 0,
            totalDistractions: 0
        })
    }catch(err){
        console.error("Error getting user stats:", err);
        return res.status(500).json({
            msg: "Server error"
        });
    }
}
