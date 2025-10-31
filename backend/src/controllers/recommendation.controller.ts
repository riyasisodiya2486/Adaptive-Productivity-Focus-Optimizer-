import { Request, Response } from "express";
import { Recommendation } from "../models/recommendations.model";
import { error } from "console";
import { Session } from "../models/session.model";

export const getLatestRecommendation = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    try{
        const lastest = await Recommendation.findOne({userId}).sort({timestamp: -1});
        if(!lastest){
            return res.status(404).json({
                msg: "no recommendation found"
            })
        }
        res.json({
            lastest
        })
    } catch(err) {
        return res.status(500).json({
            msg: "failed to fetch latest recommendation"
        })
    }
};

export const postRecommendationFeedback = async(req: Request, res: Response) => {
    const userId = (req as any).userId;
    const {recommedationsId, followed, userComment } = req.body;

    if(!recommedationsId){
        return res.status(400).json({
            error: "recommendationId is required"
        })
    }

    try{
        const recommedation = await Recommendation.findOne({
            _id: recommedationsId,
            userId
        })
        if(!recommedation){
            return res.status(404).json({
                error: "recommendation not found"
            })
        }

        recommedation.feedback = {
            followed: followed ?? recommedation.feedback?.followed,
            userComment: userComment ?? recommedation.feedback?.userComment,
            timestamp: new Date(),
        };

        await recommedation.save();

        if(followed) {
            const session = await Session.findById(recommedation.sessionId);
            if(session) {
                session.statistics.recommendationsFollowed = (session.statistics.recommendationsFollowed || 0) + 1;
                await session.save()
            }
        }
        res.json({
            msg: "feedback recorded successfully", 
            recommedation
        })
    }catch(err) {
         res.status(500).json({
            error: err || "Failed to record feedback"
        });
    }
}